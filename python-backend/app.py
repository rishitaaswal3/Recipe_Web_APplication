import os
import re
import ast
import json
import numpy as np
import pandas as pd
import requests
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer, util
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ----------------------------------------
# CONFIG
# ----------------------------------------
MODEL_NAME = "all-MiniLM-L6-v2"
CSV_PATH = "indian_food.csv"  # Using Indian food dataset
N_LIMIT = 0        # Load all recipes (Indian dataset has 255 recipes)
TOP_N_DEFAULT = 8

# Unsplash API - Sign up at https://unsplash.com/developers (Free!)
# For now using placeholder, replace with your key
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", None)

# Google Custom Search API (optional)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", None)
GOOGLE_CX = os.getenv("GOOGLE_CX", None)

# Google Gemini API (for AI-powered recipe generation)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", None)

print(f"Unsplash API Key loaded: {'✓ Yes' if UNSPLASH_ACCESS_KEY else '✗ No'}")
print(f"Google API Key loaded: {'✓ Yes' if GOOGLE_API_KEY else '✗ No'}")
print(f"Gemini API Key loaded: {'✓ Yes' if GEMINI_API_KEY else '✗ No'}")



print("Loading SentenceTransformer model...")
model = SentenceTransformer(MODEL_NAME)



# ----------------------------------------
# Helper Functions
# ----------------------------------------
def load_recipes(csv_path):
    print(f"Loading recipes from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    if "name" not in df.columns or "ingredients" not in df.columns:
        raise Exception(f"Missing required columns. Found: {df.columns.tolist()}")
    
    print(f"Loaded {len(df)} recipes from dataset")
    
    # Parse ingredients - handle both formats
    def parse_ing(x):
        if isinstance(x, list):
            return x
        if pd.isna(x):
            return []
        try:
            val = ast.literal_eval(x)
            if isinstance(val, (list, tuple)):
                return list(val)
        except:
            # Simple comma-separated parsing (for Indian food dataset)
            return [p.strip() for p in str(x).split(",") if p.strip()]
        return list(val)

    df["ingredients"] = df["ingredients"].apply(parse_ing)
    
    # Handle tags - create from available columns in Indian dataset
    if "course" in df.columns and "flavor_profile" in df.columns:
        # Indian food dataset format
        df["tags"] = df.apply(lambda row: f"{row.get('course', '')}, {row.get('flavor_profile', '')}, {row.get('diet', '')}", axis=1)
        df["cuisine"] = "Indian"  # All recipes are Indian
    else:
        # Original RecipeNLG format
        def parse_tags(x):
            if pd.isna(x):
                return None
            try:
                val = ast.literal_eval(x)
                if isinstance(val, list):
                    return ", ".join(val)
            except:
                pass
            return str(x)
        
        if "tags" in df.columns:
            df["tags"] = df["tags"].apply(parse_tags)
        else:
            df["tags"] = None
        
        # Extract cuisine from tags
        def extract_cuisine(tags_str):
            if pd.isna(tags_str):
                return None
            tags_lower = str(tags_str).lower()
            if "italian" in tags_lower:
                return "Italian"
            elif "mexican" in tags_lower:
                return "Mexican"
            elif "asian" in tags_lower or "chinese" in tags_lower or "japanese" in tags_lower:
                return "Asian"
            elif "indian" in tags_lower:
                return "Indian"
            elif "french" in tags_lower:
                return "French"
            elif "american" in tags_lower:
                return "American"
            return None
        
        df["cuisine"] = df["tags"].apply(extract_cuisine) if "tags" in df.columns else None

    return df


# clean ingredients
UNIT_PAT = r'\b(g|kg|gram|grams|ml|l|cup|cups|tbsp|tsp|ounce|oz|clove|slice)\b'
QUANTITY = r'\d+(/\d+)?'

def clean_ing(s: str) -> str:
    s = str(s).lower()
    s = re.sub(r'\([^)]*\)', ' ', s)
    s = re.sub(UNIT_PAT, ' ', s)
    s = re.sub(QUANTITY, ' ', s)
    s = re.sub(r'[^\w\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def clean_list(lst):
    return [clean_ing(i) for i in lst]


# substitution dictionary
SUBS = {
    "curd": ["yogurt", "dahi"],
    "capsicum": ["bell pepper"],
    "maida": ["all purpose flour", "flour"],
    "paneer": ["cottage cheese", "cheese"],
    "cottage cheese": ["paneer"],
    "coriander": ["cilantro"],
    "cream": ["milk", "malai"],
    "sugar": ["jaggery", "gur"],
    "yogurt": ["curd", "dahi"],
    "dahi": ["yogurt", "curd"],
    "ghee": ["clarified butter", "butter"],
    "clarified butter": ["ghee"],
    "atta": ["whole wheat flour", "wheat flour"],
    "besan": ["gram flour", "chickpea flour"],
    "gram flour": ["besan", "chickpea flour"],
    "jeera": ["cumin", "cumin seeds"],
    "cumin": ["jeera", "cumin seeds"],
    "haldi": ["turmeric", "turmeric powder"],
    "turmeric": ["haldi", "turmeric powder"],
    "dhaniya": ["coriander", "cilantro"],
    "methi": ["fenugreek"],
    "hing": ["asafoetida"],
    "ajwain": ["carom seeds"],
}


def get_sub(i):
    i = clean_ing(i)
    return SUBS.get(i, [])



# ----------------------------------------
# Build Embeddings
# ----------------------------------------
def build_embeddings(df):
    df["clean"] = df["ingredients"].apply(clean_list)
    df["ing_text"] = df["clean"].apply(lambda L: ", ".join(L))

    print("Encoding recipe embeddings (first run only)...")
    emb = model.encode(df["ing_text"].tolist(), convert_to_tensor=True, show_progress_bar=True)

    # Note: Precomputing per-ingredient embeddings for semantic matching is disabled
    # for performance. We'll use faster string matching instead.
    df["ing_embs"] = None
    return df, emb


# ----------------------------------------
# Recommendation Logic
# ----------------------------------------
def recommend(ings, df, emb, top_n=8, max_missing=2):
    user_clean = [clean_ing(i) for i in ings]
    user_text = ", ".join(user_clean)
    # single vector for user's whole ingredient list
    user_vec = model.encode(user_text, convert_to_tensor=True)

    # and also encode each user ingredient separately once (for semantic per-ingredient match)
    if len(user_clean) > 0:
        user_vecs = model.encode(user_clean, convert_to_tensor=True)
    else:
        user_vecs = None

    sims = util.cos_sim(user_vec, emb)[0].cpu().numpy()

    out = []
    for idx, score in enumerate(sims):
        row = df.iloc[idx]
        present, missing, subs_used = [], [], {}

        # Check each recipe ingredient
        for i_r, r in enumerate(row["clean"]):
            found = False
            
            # Direct string matching (most reliable)
            for u in user_clean:
                if r in u or u in r or r == u:
                    present.append(r)
                    found = True
                    break
            
            if found:
                continue
            
            # Check substitutions
            for u in user_clean:
                subs = get_sub(r)
                if u in subs:
                    present.append(r + f"(sub->{u})")
                    subs_used[r] = u
                    found = True
                    break
                # Reverse check - if user entered the substitute
                if r in get_sub(u):
                    present.append(r)
                    found = True
                    break
            
            if not found:
                missing.append(r)

        # Calculate a better score that prioritizes ingredient matches
        present_count = len(present)
        total_count = len(row["clean"])
        
        # Boost score if we have good ingredient matches
        if total_count > 0:
            match_ratio = present_count / total_count
            boosted_score = score * (1 + match_ratio)  # Boost by match ratio
        else:
            boosted_score = score

        # Only include recipes that have at least one matching ingredient
        # or have very high semantic similarity
        if (present_count > 0 or score > 0.5) and len(missing) <= max_missing:
            out.append({
                "name": row["name"],
                "ingredients": row["ingredients"],
                "present": present,
                "missing": missing,
                "score": float(boosted_score),
                "original_score": float(score),
                "match_count": present_count,
                "cuisine": row["cuisine"],
                "tags": row["tags"],
                "substitutions": subs_used
            })

    # Sort by boosted score (prioritizes ingredient matches)
    return sorted(out, key=lambda x: (x["match_count"], x["score"]), reverse=True)[:top_n]



# ----------------------------------------
# Nutrition (simple)
# ----------------------------------------
NUT = {
    "rice": 130, "onion": 40, "tomato": 18, "paneer": 265,
    "ghee": 112, "milk": 42, "yogurt": 59, "curd": 59,
    "flour": 364, "wheat": 340, "potato": 77, "carrot": 41,
    "chicken": 165, "mutton": 294, "fish": 206, "egg": 155,
    "lentil": 116, "dal": 116, "chickpea": 164, "gram": 164
}

def nutrition(lst):
    cals = 0
    for i in lst:
        ii = clean_ing(i)
        for k, v in NUT.items():
            if k in ii:
                cals += v
    return {"calories": cals}



# ----------------------------------------
# Image URL Generation
# ----------------------------------------

# Pre-defined image mappings for common Indian dishes (for accuracy)
RECIPE_IMAGE_MAP = {
    # Popular Indian Dishes with specific Unsplash image IDs
    "paneer tikka": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800",
    "butter chicken": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800",
    "biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800",
    "palak paneer": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800",
    "samosa": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800",
    "dosa": "https://images.unsplash.com/photo-1630383249896-424e482df921?w=800",
    "idli": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800",
    "chole bhature": "https://images.unsplash.com/photo-1626132647523-66f2bf380c9e?w=800",
    "dal makhani": "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800",
    "tandoori chicken": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800",
    "naan": "https://images.unsplash.com/photo-1601050690117-94f5f6fa9e5b?w=800",
    "gulab jamun": "https://images.unsplash.com/photo-1589301773859-cb96e5b4c9d4?w=800",
    "rasgulla": "https://images.unsplash.com/photo-1606313564555-46c1e5a033e1?w=800",
    "jalebi": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800",
    "pav bhaji": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800",
    "vada pav": "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800",
}

def find_local_image_file(recipe_name: str):
    """
    Try to find a local image file for a given recipe name under the Next.js public images folder.
    Returns a URL path (starting with /images/recipes/) if found, else None.
    """
    try:
        # Path relative to this backend directory -> ../frontend/public/images/recipes
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'images', 'recipes'))
        if not os.path.isdir(base_dir):
            return None

        # Normalize the recipe name for matching
        def norm(s: str) -> str:
            s = s.lower()
            s = re.sub(r'[^a-z0-9]', '', s)
            return s

        target = norm(recipe_name)

        # Try explicit candidate filenames first (common patterns)
        exts = ['.jpg', '.jpeg', '.png', '.webp']
        variants = [
            recipe_name.lower().strip(),
            recipe_name.lower().strip().replace(' ', '-'),
            recipe_name.lower().strip().replace(' ', '_'),
            recipe_name.lower().strip().replace(' ', ''),
        ]
        for v in variants:
            for e in exts:
                p = os.path.join(base_dir, f"{v}{e}")
                if os.path.exists(p):
                    return f"/images/recipes/{os.path.basename(p)}"

        # Fallback: scan directory and try fuzzy normalized match
        for fname in os.listdir(base_dir):
            name_no_ext, _ = os.path.splitext(fname)
            if norm(name_no_ext) == target:
                return f"/images/recipes/{fname}"

        # Partial match: filename contains normalized tokens
        for fname in os.listdir(base_dir):
            name_no_ext, _ = os.path.splitext(fname)
            if target in norm(name_no_ext) or norm(name_no_ext) in target:
                return f"/images/recipes/{fname}"

    except Exception as e:
        print(f"Error while resolving local image for {recipe_name}: {e}")
    return None


def search_google_images(query: str, num_results: int = 1):
    """
    Search Google Images for a recipe and return the first image URL.
    Uses Google Custom Search API with filters for high-quality food images.
    Filters: No people, no watermarks, professional food photography only.
    """
    if GOOGLE_API_KEY and GOOGLE_CX:
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                "key": GOOGLE_API_KEY,
                "cx": GOOGLE_CX,
                "q": f"{query} recipe food dish plated -person -people -chef -watermark -logo",
                "searchType": "image",
                "num": num_results,
                "imgSize": "large",
                "imgType": "photo",  # Only photos, not clipart
                "safe": "active",
                "fileType": "jpg,png",
                "imgColorType": "color",  # Color images only
                "rights": "cc_publicdomain,cc_attribute,cc_sharealike"  # Prefer license-free images
            }
            response = requests.get(url, params=params, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("items") and len(data["items"]) > 0:
                    # Filter out images with common watermark domains
                    blocked_domains = ['shutterstock', 'gettyimages', 'istockphoto', 'alamy', 
                                      'dreamstime', 'watermark', '123rf']
                    
                    for item in data["items"]:
                        image_url = item["link"]
                        # Check if URL contains blocked domains
                        if not any(domain in image_url.lower() for domain in blocked_domains):
                            print(f"✓ Found clean recipe image: {image_url[:80]}...")
                            return image_url
                    
                    # If all have watermarks, return first anyway (better than nothing)
                    return data["items"][0]["link"]
        except Exception as e:
            print(f"Error searching Google Images: {e}")
    
    # Fallback: Use Bing Image Search (no API key needed, but less reliable)
    try:
        # Simple approach: construct a Bing image search URL
        # Note: This returns a Bing search page, not direct image
        # For production, use proper Google Custom Search API
        search_query = f"{query} indian food recipe"
        # Using a placeholder approach - returns first Unsplash result
        return None
    except Exception as e:
        print(f"Error in fallback image search: {e}")
    
    return None


def search_youtube_video(recipe_name: str):
    """
    Search YouTube for a recipe video from reputed chefs and cooking channels.
    Filters for professional cooking channels, excludes amateur/low-quality content.
    """
    if GOOGLE_API_KEY:
        try:
            # List of reputed cooking channels to prioritize
            reputed_channels = [
                "Sanjeev Kapoor", "Chef Ranveer Brar", "Kunal Kapur", "Vikas Khanna",
                "Nisha Madhulika", "Hebbars Kitchen", "Kabita's Kitchen", 
                "Food Fusion", "Gordon Ramsay", "Jamie Oliver", "Tasty",
                "Bon Appétit", "Food Network", "Serious Eats", "America's Test Kitchen"
            ]
            
            # Try searching with channel filter first (better quality)
            for attempt in range(2):
                if attempt == 0:
                    # First attempt: Search with reputed chef names
                    search_query = f"{recipe_name} recipe chef professional cooking -review -reaction -vlog"
                else:
                    # Second attempt: Broader search if first fails
                    search_query = f"{recipe_name} recipe how to make professional -mukbang -review -reaction"
                
                url = "https://www.googleapis.com/youtube/v3/search"
                params = {
                    "key": GOOGLE_API_KEY,
                    "q": search_query,
                    "part": "snippet",
                    "type": "video",
                    "maxResults": 5,  # Get top 5 to filter
                    "order": "relevance",
                    "videoDuration": "medium",  # 4-20 minutes (proper cooking tutorials)
                    "videoDefinition": "high",  # HD videos only
                    "regionCode": "IN",  # Prefer Indian content
                    "relevanceLanguage": "en"
                }
                response = requests.get(url, params=params, timeout=5)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("items") and len(data["items"]) > 0:
                        # Filter for reputed channels first
                        for item in data["items"]:
                            channel_title = item["snippet"]["channelTitle"]
                            video_title = item["snippet"]["title"].lower()
                            
                            # Check if from reputed channel
                            is_reputed = any(chef.lower() in channel_title.lower() for chef in reputed_channels)
                            
                            # Filter out unwanted content
                            unwanted_keywords = ['mukbang', 'asmr', 'review', 'reaction', 'vlog', 
                                                'unboxing', 'try', 'eating', 'challenge']
                            has_unwanted = any(keyword in video_title for keyword in unwanted_keywords)
                            
                            if is_reputed or (not has_unwanted and attempt == 0):
                                video_id = item["id"]["videoId"]
                                print(f"✓ Found quality YouTube video: {channel_title} - {item['snippet']['title'][:50]}...")
                                return video_id
                        
                        # If no reputed channel found in first attempt, try second
                        if attempt == 0:
                            continue
                        
                        # Fallback: return first video if no perfect match
                        video_id = data["items"][0]["id"]["videoId"]
                        print(f"✓ Found YouTube video (fallback): {data['items'][0]['snippet']['title'][:50]}...")
                        return video_id
        except Exception as e:
            print(f"Error searching YouTube: {e}")
    
    # Fallback: Return None (will show "No video available" in UI)
    return None


def get_nutrition_info(recipe_name: str, ingredients: list):
    """
    Get estimated nutrition information for a recipe.
    Returns typical Indian recipe nutrition data.
    """
    # Default nutrition values for common Indian dishes
    nutrition_defaults = {
        "calories": 350,
        "protein": 12,
        "carbs": 45,
        "fat": 15,
        "fiber": 6,
        "sodium": 800
    }
    
    # Adjust based on recipe name (simple heuristics)
    recipe_lower = recipe_name.lower()
    
    # High protein dishes
    if any(word in recipe_lower for word in ["paneer", "chicken", "mutton", "fish", "egg", "dal", "rajma"]):
        nutrition_defaults["protein"] = 20
        nutrition_defaults["calories"] = 400
    
    # Rice/Bread heavy dishes
    if any(word in recipe_lower for word in ["biryani", "pulao", "rice", "naan", "roti", "paratha"]):
        nutrition_defaults["carbs"] = 60
        nutrition_defaults["calories"] = 450
    
    # Fried items
    if any(word in recipe_lower for word in ["pakora", "samosa", "bhature", "puri", "tikki"]):
        nutrition_defaults["fat"] = 25
        nutrition_defaults["calories"] = 500
    
    # Sweets
    if any(word in recipe_lower for word in ["gulab", "jamun", "kheer", "halwa", "ladoo", "barfi"]):
        nutrition_defaults["carbs"] = 70
        nutrition_defaults["fat"] = 18
        nutrition_defaults["calories"] = 450
        nutrition_defaults["protein"] = 5
    
    # Light/Healthy dishes
    if any(word in recipe_lower for word in ["salad", "raita", "chutney"]):
        nutrition_defaults["calories"] = 150
        nutrition_defaults["fat"] = 8
        nutrition_defaults["carbs"] = 20
    
    return nutrition_defaults


def add_region_to_recipe(recipe: dict):
    """
    Automatically add region/country information to a recipe based on its cuisine or name.
    Handles both Indian regional cuisines and international dishes.
    """
    cuisine = recipe.get("cuisine", "").lower()
    title = recipe.get("title", "").lower()
    
    # Indian regional mapping
    indian_regions = {
        "north indian": "North India",
        "punjabi": "Punjab",
        "delhi": "Delhi",
        "rajasthani": "Rajasthan",
        "kashmiri": "Kashmir",
        "south indian": "South India",
        "tamil": "Tamil Nadu",
        "kerala": "Kerala",
        "andhra": "Andhra Pradesh",
        "karnataka": "Karnataka",
        "bengali": "West Bengal",
        "kolkata": "West Bengal",
        "maharashtrian": "Maharashtra",
        "mumbai": "Maharashtra",
        "gujarati": "Gujarat",
        "goan": "Goa",
        "hyderabadi": "Telangana",
        "bihari": "Bihar",
        "awadhi": "Uttar Pradesh",
        "lucknow": "Uttar Pradesh",
    }
    
    # International cuisine mapping
    international_regions = {
        "italian": "Italy",
        "chinese": "China",
        "thai": "Thailand",
        "mexican": "Mexico",
        "japanese": "Japan",
        "french": "France",
        "greek": "Greece",
        "spanish": "Spain",
        "american": "USA",
        "korean": "South Korea",
        "vietnamese": "Vietnam",
        "lebanese": "Lebanon",
        "turkish": "Turkey",
        "moroccan": "Morocco",
        "brazilian": "Brazil",
    }
    
    # Check cuisine field first
    for key, region in indian_regions.items():
        if key in cuisine:
            recipe["region"] = region
            return recipe
    
    for key, country in international_regions.items():
        if key in cuisine:
            recipe["region"] = country
            return recipe
    
    # Check title for specific dish keywords
    dish_regions = {
        "biryani": "Hyderabad (Telangana)" if "hyderabadi" in title else "India",
        "dosa": "South India",
        "idli": "South India",
        "uttapam": "South India",
        "sambar": "South India",
        "paneer": "North India",
        "chole": "Punjab",
        "bhature": "Punjab",
        "tikka": "Punjab",
        "tandoori": "Punjab",
        "rogan josh": "Kashmir",
        "dhokla": "Gujarat",
        "thepla": "Gujarat",
        "vada pav": "Maharashtra",
        "pav bhaji": "Maharashtra",
        "misal pav": "Maharashtra",
        "rasgulla": "West Bengal",
        "sandesh": "West Bengal",
        "litti chokha": "Bihar",
    }
    
    for dish, region in dish_regions.items():
        if dish in title:
            recipe["region"] = region
            return recipe
    
    # Default: if cuisine contains "indian" but no specific region
    if "indian" in cuisine and "region" not in recipe:
        recipe["region"] = "India"
    
    return recipe


def search_google_recipes(ingredients: List[str], num_results: int = 8):
    """
    Use Google Custom Search (web) to find recipe pages that match the provided ingredients.
    Returns a list of results with title, link, snippet and an optional thumbnail/image.
    Gracefully returns an empty list if API not configured or on error.
    """
    if not GOOGLE_API_KEY or not GOOGLE_CX:
        print("Google Custom Search API not configured, cannot perform web search.")
        return []

    try:
        query = ""
        if ingredients:
            # Build a helpful query: prioritize pages that mention all ingredients
            joined = " ".join([f'"{ing.strip()}"' for ing in ingredients if ing.strip()])
            query = f"recipes with {joined}"
        else:
            query = "indian recipe"

        # Add a gentle hint to prefer recipe pages
        query += " recipe site:.com OR site:.in OR site:.co.in"

        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": GOOGLE_API_KEY,
            "cx": GOOGLE_CX,
            "q": query,
            "num": num_results,
        }

        resp = requests.get(url, params=params, timeout=6)
        if resp.status_code != 200:
            print(f"Google Custom Search failed: {resp.status_code} {resp.text}")
            return []

        data = resp.json()
        items = data.get("items", [])
        results = []
        for it in items:
            title = it.get("title")
            link = it.get("link")
            snippet = it.get("snippet")
            # Try to find an image from pagemap if present
            pagemap = it.get("pagemap", {})
            img = None
            if pagemap:
                # cse_image or cse_thumbnail commonly available
                if pagemap.get("cse_image") and isinstance(pagemap.get("cse_image"), list):
                    img = pagemap.get("cse_image")[0].get("src")
                elif pagemap.get("cse_thumbnail") and isinstance(pagemap.get("cse_thumbnail"), list):
                    img = pagemap.get("cse_thumbnail")[0].get("src")

            results.append({
                "title": title,
                "link": link,
                "snippet": snippet,
                "image": img,
            })

        return results

    except Exception as e:
        print(f"Error during Google recipe search: {e}")
        return []


def generate_recipes_with_gemini(ingredients: List[str], num_results: int = 6):
    """
    Use Google Gemini AI to generate recipe suggestions based on ingredients.
    Returns structured recipe data with title, ingredients, instructions, and more.
    Note: Reduced default from 8 to 6 recipes to prevent response truncation.
    """
    if not GEMINI_API_KEY:
        print("Gemini API Key not configured")
        return []
    
    try:
        # Limit to max 6 recipes to prevent truncation
        num_results = min(num_results, 6)
        
        # Build the prompt for Gemini
        ingredients_text = ", ".join(ingredients)
        prompt = f"""Generate {num_results} diverse and creative recipes using these ingredients: {ingredients_text}

For each recipe, provide:
1. Recipe name (creative and appealing)
2. Brief description (2-3 sentences explaining the dish, its origin, and taste profile)
3. Complete list of ingredients with measurements
4. Step-by-step cooking instructions (detailed but clear)
5. Preparation time
6. Cooking time
7. Number of servings
8. Cuisine type (e.g., North Indian, South Indian, Italian, Chinese, etc.)
9. Course (Breakfast/Lunch/Dinner/Dessert/Snack/Appetizer)
10. Category: Must be one of - VEGETARIAN, NON-VEGETARIAN, VEGAN, EGGETARIAN
11. Region: For Indian dishes, specify the state/region in this format: "North Indian (Punjab)" or "South Indian (Tamil Nadu)" or "Bengali (West Bengal)"

IMPORTANT RULES:
- For Indian recipes, ALWAYS include the state/region of origin in brackets after cuisine type
- Use proper categories: VEGETARIAN (lacto-vegetarian with dairy), VEGAN (no animal products), NON-VEGETARIAN (meat/fish), EGGETARIAN (vegetarian + eggs)
- Make the description educational - mention the dish's cultural significance or origin story when applicable
- Ensure accurate regional attribution for Indian dishes

Format your response as a valid JSON array with this exact structure:
[
  {{
    "title": "Recipe Name",
    "description": "Educational description mentioning origin, cultural significance, and taste profile",
    "ingredients": ["ingredient 1 with measurement", "ingredient 2 with measurement", ...],
    "directions": ["step 1", "step 2", ...],
    "prep_time": "15 min",
    "cook_time": "30 min",
    "servings": "4 servings",
    "cuisine": "North Indian (Punjab)" or "Italian" or "South Indian (Kerala)",
    "course": "Main Course/Breakfast/Dessert/etc",
    "category": "VEGETARIAN/NON-VEGETARIAN/VEGAN/EGGETARIAN",
    "region": "Punjab" or "Kerala" or "Maharashtra" (for Indian dishes only, otherwise omit)
  }}
]

Important: Return ONLY valid JSON, no additional text or markdown formatting."""

        # Call Gemini API (using gemini-1.5-flash model with v1 API)
        url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 8192,  # Increased from 4096 to prevent truncation
            }
        }
        
        # Retry logic for 503 errors (model overloaded) with longer waits
        max_retries = 5  # Increased to 5 attempts
        import time
        
        for attempt in range(max_retries):
            try:
                # Increase timeout to 60 seconds to give Gemini enough time
                response = requests.post(url, headers=headers, json=payload, timeout=60)
                
                if response.status_code == 503 and attempt < max_retries - 1:
                    # Longer exponential backoff: 5s, 10s, 15s, 20s
                    wait_time = 5 * (attempt + 1)
                    print(f"Gemini overloaded (503), waiting {wait_time}s before retry... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                    
                if response.status_code != 200:
                    print(f"Gemini API failed: {response.status_code} {response.text}")
                    return []
                
                break
            except requests.Timeout:
                if attempt < max_retries - 1:
                    wait_time = 10 * (attempt + 1)  # 10s, 20s, 30s, 40s
                    print(f"Request timeout, waiting {wait_time}s before retry... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                print("Gemini API timeout after all retries")
                return []
        
        data = response.json()
        
        # Extract the generated text
        if "candidates" in data and len(data["candidates"]) > 0:
            generated_text = data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean up markdown code blocks if present
            generated_text = generated_text.strip()
            if generated_text.startswith("```json"):
                generated_text = generated_text[7:]
            if generated_text.startswith("```"):
                generated_text = generated_text[3:]
            if generated_text.endswith("```"):
                generated_text = generated_text[:-3]
            generated_text = generated_text.strip()
            
            # Parse JSON with better error handling
            try:
                recipes = json.loads(generated_text)
            except json.JSONDecodeError as json_err:
                print(f"Failed to parse Gemini response as JSON: {json_err}")
                print(f"Response text (first 1000 chars): {generated_text[:1000]}")
                # Try to salvage partial JSON array
                try:
                    # If it's an incomplete array, try to close it
                    if generated_text.startswith("[") and not generated_text.endswith("]"):
                        # Find the last complete recipe object
                        last_brace = generated_text.rfind("}")
                        if last_brace > 0:
                            salvaged = generated_text[:last_brace + 1] + "]"
                            recipes = json.loads(salvaged)
                            print(f"✓ Salvaged {len(recipes)} recipes from incomplete response")
                        else:
                            return []
                    else:
                        return []
                except:
                    return []
            
            # Add image URLs using Unsplash or Google Image Search
            for recipe in recipes:
                recipe_name = recipe.get("title", "")
                img_url = get_recipe_image_url(recipe_name)
                recipe["image_url"] = img_url
                
                # Add nutrition info
                recipe["nutrition"] = get_nutrition_info(recipe_name, recipe.get("ingredients", []))
                
                # Add YouTube video ID
                youtube_video_id = search_youtube_video(recipe_name)
                recipe["youtube_video_id"] = youtube_video_id
                
                # Calculate matching percentage with user's ingredients
                recipe_ingredients = recipe.get("ingredients", [])
                match_info = calculate_ingredient_match(ingredients, recipe_ingredients)
                recipe["match_percentage"] = match_info["percentage"]
                recipe["matching_count"] = match_info["matching"]
                recipe["total_count"] = match_info["total"]
                recipe["present_ingredients"] = match_info["present"]
                recipe["missing_ingredients"] = match_info["missing"]
            
            print(f"✓ Generated {len(recipes)} recipes with Gemini AI")
            return recipes
        
        return []
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        import traceback
        traceback.print_exc()
        return []


def calculate_ingredient_match(user_ingredients: List[str], recipe_ingredients: List[str]):
    """
    Calculate how well user's ingredients match a recipe's ingredients.
    Returns percentage and lists of present/missing ingredients.
    """
    if not recipe_ingredients:
        return {
            "percentage": 0,
            "matching": 0,
            "total": 0,
            "present": [],
            "missing": []
        }
    
    # Clean user ingredients (lowercase, strip)
    user_clean = [ing.lower().strip() for ing in user_ingredients]
    
    present = []
    missing = []
    
    for recipe_ing in recipe_ingredients:
        # Extract the ingredient name (remove measurements like "2 cups", "500g", etc.)
        recipe_clean = recipe_ing.lower().strip()
        # Remove common measurements and numbers
        recipe_clean = re.sub(r'\d+(\.\d+)?\s*(cups?|tbsp|tsp|g|kg|ml|l|oz|lbs?|pieces?|cloves?|slices?)?', '', recipe_clean).strip()
        recipe_clean = re.sub(r'^(a\s+|an\s+|the\s+)', '', recipe_clean).strip()
        # Remove punctuation at the end
        recipe_clean = re.sub(r'[,\.]$', '', recipe_clean).strip()
        
        # Check if any user ingredient matches
        found = False
        for user_ing in user_clean:
            # Check for partial matches (either direction)
            if user_ing in recipe_clean or recipe_clean in user_ing:
                present.append(recipe_ing)
                found = True
                break
        
        if not found:
            missing.append(recipe_ing)
    
    total = len(recipe_ingredients)
    matching = len(present)
    percentage = round((matching / total) * 100) if total > 0 else 0
    
    return {
        "percentage": percentage,
        "matching": matching,
        "total": total,
        "present": present,
        "missing": missing
    }


def get_recipe_image_url(recipe_name, cuisine=None):
    """
    Get image URL for a recipe using multiple strategies for better accuracy.
    Priority: Local images > Pre-mapped > Google Search > Unsplash API > Foodish API > Fallback
    """
    # First, check for a local image placed in the frontend public folder
    local = find_local_image_file(recipe_name)
    if local:
        return local

    # Strategy 1: Check if we have a pre-mapped image for this recipe
    recipe_lower = recipe_name.lower().strip()
    # Check for exact match or partial match in pre-mapped images
    for key, img_url in RECIPE_IMAGE_MAP.items():
        if key in recipe_lower or recipe_lower in key:
            return img_url
    
    # Strategy 2: Try Google Image Search (if API keys configured)
    if GOOGLE_API_KEY and GOOGLE_CX:
        google_img = search_google_images(recipe_name)
        if google_img:
            print(f"Found Google image for {recipe_name}: {google_img}")
            return google_img
    
    # Strategy 3: Try Unsplash API with optimized query
    try:
        if UNSPLASH_ACCESS_KEY:
            # Build optimized search query
            if cuisine and cuisine.lower() == "indian":
                query = f"{recipe_name} indian food recipe"
            else:
                query = f"{recipe_name} food dish recipe"
            
            url = "https://api.unsplash.com/search/photos"
            params = {
                "query": query,
                "per_page": 1,
                "client_id": UNSPLASH_ACCESS_KEY,
                "orientation": "landscape"
            }
            response = requests.get(url, params=params, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("results") and len(data["results"]) > 0:
                    return data["results"][0]["urls"]["regular"]
    except Exception as e:
        print(f"Error fetching image from Unsplash API: {e}")
    
    # Strategy 4: Use Foodish API (free, real food images)
    try:
        foodish_url = "https://foodish-api.com/api/"
        response = requests.get(foodish_url, timeout=3)
        if response.status_code == 200:
            data = response.json()
            if data.get("image"):
                return data["image"]
    except:
        pass
    
    # Final fallback to Unsplash Source
    recipe_slug = recipe_name[:40].replace(" ", "+")
    if cuisine and cuisine.lower() == "indian":
        return f"https://source.unsplash.com/800x600/?{recipe_slug},indian,food"
    return f"https://source.unsplash.com/800x600/?{recipe_slug},food"


# ----------------------------------------
# Image Prompt
# ----------------------------------------
def make_prompt(name, lst, cuisine):
    main = ", ".join(lst[:4])
    return f"photorealistic image of {name}, made with {main}, {cuisine} cuisine, warm lighting, high detail"



# ----------------------------------------
# FASTAPI SETUP
# ----------------------------------------
app = FastAPI(title="AI Recipe Recommender API", version="1.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# load data at startup
print("Loading dataset...")
df = load_recipes(CSV_PATH)
if N_LIMIT > 0:
    print(f"Limiting to first {N_LIMIT} recipes for performance...")
    df = df.iloc[:N_LIMIT]

df, recipe_emb = build_embeddings(df)
print(f"FastAPI backend ready with {len(df)} recipes.")



# ----------------------------------------
# Request Models
# ----------------------------------------
class IngredientsIn(BaseModel):
    ingredients: List[str]
    top_n: Optional[int] = TOP_N_DEFAULT
    max_missing: Optional[int] = 2


class PromptIn(BaseModel):
    name: str
    ingredients: List[str]
    cuisine: Optional[str] = None



# ----------------------------------------
# ROUTES
# ----------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "recipes_loaded": len(df)}


@app.post("/recommend")
def recommend_api(req: IngredientsIn):
    res = recommend(
        req.ingredients,
        df,
        recipe_emb,
        top_n=req.top_n,
        max_missing=req.max_missing
    )

    for r in res:
        r["nutrition"] = nutrition(r["ingredients"])
        r["image_prompt"] = make_prompt(r["name"], r["ingredients"], r["cuisine"])

    return {"recipes": res}


@app.post("/search-google-recipes")
def search_google_recipes_api(req: IngredientsIn):
    """
    Generate AI-powered recipes using Google Gemini based on provided ingredients.
    Falls back to Google web search if Gemini not configured.
    """
    # Try Gemini AI first (preferred method)
    if GEMINI_API_KEY:
        try:
            ai_recipes = generate_recipes_with_gemini(req.ingredients, num_results=req.top_n)
            if ai_recipes:
                return {"success": True, "source": "gemini", "results": ai_recipes}
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
    
    # Fallback to Google Custom Search if Gemini not available
    if GOOGLE_API_KEY and GOOGLE_CX:
        try:
            web_results = search_google_recipes(req.ingredients, num_results=req.top_n)
            return {"success": True, "source": "google", "results": web_results}
        except Exception as e:
            print(f"Error calling Google Custom Search: {e}")
            return {"success": False, "source": "google", "error": str(e), "results": []}
    
    # No API configured
    print("Neither Gemini nor Google API configured")
    return {"success": False, "source": "none", "error": "No API configured for recipe search", "results": []}



@app.post("/image-prompt")
def img_prompt_api(req: PromptIn):
    return {"prompt": make_prompt(req.name, req.ingredients, req.cuisine)}


@app.post("/search-by-ingredients")
def search_by_ingredients(req: IngredientsIn):
    """
    Search for recipes based on a list of ingredients provided by the user.
    Returns top matching recipes with similarity scores.
    """
    if not req.ingredients or len(req.ingredients) == 0:
        return {"success": False, "error": "No ingredients provided", "recipes": []}
    
    try:
        # Get recommendations using the existing recommend function
        recommendations = recommend(
            req.ingredients,
            df,
            recipe_emb,
            top_n=req.top_n,
            max_missing=req.max_missing
        )
        
        # Format results for frontend
        recipes = []
        for rec in recommendations:
            # Calculate match percentage
            total_ingredients = len(rec["ingredients"])
            present_count = len(rec["present"])
            match_percentage = int((present_count / total_ingredients) * 100) if total_ingredients > 0 else 0
            
            recipe_data = {
                "title": rec["name"],
                "ingredients": rec["ingredients"],
                "present_ingredients": rec["present"],
                "missing_ingredients": rec["missing"],
                "match_score": rec["score"],
                "match_percentage": match_percentage,
                "cuisine": rec["cuisine"],
                "tags": rec["tags"],
                "substitutions": rec.get("substitutions", {}),
                "image_url": get_recipe_image_url(rec["name"], rec.get("cuisine")),
                "category": rec.get("cuisine", "GENERAL").upper() if rec.get("cuisine") else "GENERAL"
            }
            
            # Add region information automatically
            recipe_data = add_region_to_recipe(recipe_data)
            recipes.append(recipe_data)
        
        return {
            "success": True,
            "recipes": recipes,
            "total_found": len(recipes),
            "ingredients_searched": req.ingredients
        }
    
    except Exception as e:
        return {"success": False, "error": str(e), "recipes": []}


@app.get("/api/featured")
def get_featured_recipe():
    """
    Get a rotating featured recipe - alternates between multiple recipes.
    Changes based on minute to ensure variety.
    """
    import datetime
    
    # Rotate featured recipes based on current minute (changes every 2 minutes)
    featured_recipes = [
        {
            "title": "Butter Chicken",
            "description": "A rich and creamy North Indian curry with tender chicken pieces in a tomato-based gravy. This iconic dish originated in Delhi and is known for its smooth texture and aromatic spices, perfect with naan or rice.",
            "image_url": "/images/recipes/butter-chicken.jpg",
            "ingredients": [
                "500g Boneless chicken, cut into pieces",
                "3 tbsp Butter",
                "1 cup Tomato puree",
                "1/2 cup Heavy cream",
                "2 tbsp Ginger-garlic paste",
                "1 tsp Garam masala",
                "1 tsp Kasuri methi (dried fenugreek leaves)",
                "1 tsp Red chili powder",
                "1/2 tsp Turmeric powder",
                "Salt to taste",
                "2 tbsp Oil for cooking",
                "Fresh coriander for garnish"
            ],
            "directions": [
                "Marinate chicken pieces with yogurt, ginger-garlic paste, red chili powder, turmeric, and salt for 30 minutes.",
                "Heat oil in a pan and cook the marinated chicken until golden brown. Set aside.",
                "In the same pan, melt butter and add tomato puree. Cook for 5-7 minutes until oil separates.",
                "Add garam masala, kasuri methi, and salt. Mix well.",
                "Add the cooked chicken pieces and mix to coat with the gravy.",
                "Pour in heavy cream and simmer for 10 minutes on low heat.",
                "Garnish with fresh coriander and serve hot with naan or rice."
            ],
            "prep_time": "20 min",
            "cook_time": "30 min",
            "servings": "4 servings",
            "cuisine": "North Indian (Delhi)",
            "region": "Delhi",
            "course": "Main Course",
            "category": "NON-VEGETARIAN",
            "link": "#",
            "source": "Traditional Indian Recipe"
        },
        {
            "title": "Butter Paneer",
            "description": "A vegetarian delight featuring soft paneer cubes in a rich, creamy tomato-based gravy. This Punjabi favorite is flavored with aromatic spices and finished with butter, making it a perfect choice for paneer lovers.",
            "image_url": "/images/recipes/butter-paneer.jpg",
            "ingredients": [
                "400g Paneer, cut into cubes",
                "3 tbsp Butter",
                "2 large Onions, chopped",
                "1 cup Tomato puree",
                "1/2 cup Heavy cream",
                "2 tbsp Ginger-garlic paste",
                "1 tsp Garam masala",
                "1 tsp Kasuri methi (dried fenugreek leaves)",
                "1 tsp Red chili powder",
                "1/2 tsp Turmeric powder",
                "2 tbsp Cashew paste (optional)",
                "Salt to taste",
                "Fresh coriander for garnish"
            ],
            "directions": [
                "Heat 1 tbsp butter in a pan and lightly fry paneer cubes until golden. Set aside.",
                "In the same pan, melt remaining butter and sauté chopped onions until golden brown.",
                "Add ginger-garlic paste and cook for 2 minutes until raw smell disappears.",
                "Add tomato puree, red chili powder, turmeric, and salt. Cook for 8-10 minutes until oil separates.",
                "Add cashew paste (if using) and mix well for creamy texture.",
                "Add garam masala and kasuri methi. Mix well.",
                "Pour in heavy cream and add fried paneer cubes. Simmer for 5 minutes.",
                "Garnish with fresh coriander and serve hot with naan or roti."
            ],
            "prep_time": "15 min",
            "cook_time": "25 min",
            "servings": "4 servings",
            "cuisine": "North Indian (Punjab)",
            "region": "Punjab",
            "course": "Main Course",
            "category": "VEGETARIAN",
            "link": "#",
            "source": "Traditional Indian Recipe"
        }
    ]
    # Ensure image paths resolve to existing local files if available
    for r in featured_recipes:
        resolved = find_local_image_file(r.get("title", ""))
        if resolved:
            r["image_url"] = resolved

    # Rotate based on current minute (changes every 2 minutes)
    current_minute = datetime.datetime.now().minute
    recipe_index = (current_minute // 2) % len(featured_recipes)
    
    return {
        "success": True,
        "recipe": featured_recipes[recipe_index]
    }


@app.get("/api/latest")
def get_latest_recipes():
    """
    Get static latest recipes - returns top 6 popular Indian dishes with local images.
    """
    static_recipes = [
        {
            "title": "Paneer Tikka",
            "description": "Marinated paneer cubes grilled to perfection with colorful bell peppers and onions.",
            "ingredients": ["250g Paneer cubes", "1 cup Yogurt", "2 tbsp Tandoori masala", "1 Bell pepper", "1 Onion", "2 tbsp Lemon juice", "Salt to taste"],
            "directions": [
                "Cut paneer, bell peppers, and onions into large cubes.",
                "Mix yogurt, tandoori masala, lemon juice, and salt to make marinade.",
                "Marinate paneer and vegetables for 30 minutes.",
                "Thread onto skewers alternating paneer and vegetables.",
                "Grill or bake at 200°C for 15-20 minutes until charred.",
                "Serve hot with mint chutney."
            ],
            "image_url": "/images/recipes/paneer-tikka.jpg",
            "category": "VEGETARIAN",
            "region": "Punjab",
            "course": "Appetizer",
            "prep_time": "15 min",
            "cook_time": "20 min",
            "servings": "3 servings"
        },
        {
            "title": "Biryani",
            "description": "Aromatic basmati rice layered with spiced meat or vegetables, saffron, and fried onions.",
            "ingredients": ["2 cups Basmati rice", "500g Chicken/Mutton", "1 cup Yogurt", "A pinch Saffron", "2 Onions fried", "Fresh mint & coriander", "Whole spices", "Ghee"],
            "directions": [
                "Marinate meat with yogurt and spices for 1 hour.",
                "Parboil rice with whole spices until 70% cooked. Drain.",
                "Cook marinated meat until tender.",
                "Layer rice and meat in a heavy-bottomed pot.",
                "Top with saffron milk, fried onions, mint, and ghee.",
                "Cover and cook on low heat (dum) for 30 minutes.",
                "Serve hot with raita and salad."
            ],
            "image_url": "/images/recipes/biryani.jpg",
            "category": "NON-VEGETARIAN",
            "region": "Hyderabad",
            "course": "Main Course",
            "prep_time": "30 min",
            "cook_time": "45 min",
            "servings": "6 servings"
        },
        {
            "title": "Palak Paneer",
            "description": "Fresh spinach gravy with soft paneer cubes, flavored with aromatic Indian spices.",
            "ingredients": ["400g Spinach", "200g Paneer", "2 Onions", "3 Tomatoes", "1/4 cup Cream", "5 Garlic cloves", "1 tsp Cumin seeds", "Spices"],
            "directions": [
                "Blanch spinach in boiling water for 2 minutes, then blend into smooth puree.",
                "Heat oil, add cumin seeds and sauté onions until golden.",
                "Add garlic, tomatoes, and spices. Cook until soft.",
                "Add spinach puree and cook for 5 minutes.",
                "Add paneer cubes and cream. Simmer for 5 minutes.",
                "Garnish with cream swirl and serve with roti."
            ],
            "image_url": "/images/recipes/palak-paneer.jpg",
            "category": "VEGETARIAN",
            "region": "Punjab",
            "course": "Main Course",
            "prep_time": "15 min",
            "cook_time": "25 min",
            "servings": "4 servings"
        },
        {
            "title": "Masala Dosa",
            "description": "Crispy South Indian crepe filled with spiced potato filling, served with chutney and sambar.",
            "ingredients": ["2 cups Rice", "1 cup Urad dal", "4 Potatoes boiled", "1 tsp Mustard seeds", "Curry leaves", "1/2 tsp Turmeric", "Green chilies", "Oil"],
            "directions": [
                "Soak rice and urad dal separately for 6-8 hours.",
                "Grind to smooth batter, ferment overnight.",
                "For filling: Heat oil, add mustard seeds, curry leaves.",
                "Add mashed potatoes, turmeric, salt. Mix well.",
                "Heat tawa, spread dosa batter thinly in circular motion.",
                "Add potato filling, fold dosa and serve with chutney."
            ],
            "image_url": "/images/recipes/masala-dosa.jpg",
            "category": "VEGETARIAN",
            "region": "Karnataka",
            "course": "Breakfast",
            "prep_time": "8 hours (fermentation)",
            "cook_time": "20 min",
            "servings": "4 servings"
        },
        {
            "title": "Chole Bhature",
            "description": "Spicy chickpea curry served with fluffy deep-fried bread, a popular North Indian combo.",
            "ingredients": ["2 cups Chickpeas soaked", "2 cups Maida", "1/2 cup Yogurt", "3 Tomatoes", "2 Onions", "2 tbsp Chole masala", "Oil for frying"],
            "directions": [
                "Pressure cook soaked chickpeas until soft.",
                "For chole: Sauté onions, add tomatoes and chole masala. Cook well.",
                "Add cooked chickpeas and water. Simmer for 15 minutes.",
                "For bhature: Mix maida, yogurt, salt, and knead soft dough. Rest 2 hours.",
                "Roll into circles and deep fry until puffed and golden.",
                "Serve hot chole with bhature, onions, and pickle."
            ],
            "image_url": "/images/recipes/chole-bhature.jpg",
            "category": "VEGETARIAN",
            "region": "Punjab",
            "course": "Main Course",
            "prep_time": "8 hours (soaking)",
            "cook_time": "40 min",
            "servings": "4 servings"
        },
        {
            "title": "Gulab Jamun",
            "description": "Soft milk-based dumplings soaked in fragrant rose-cardamom sugar syrup.",
            "ingredients": ["1 cup Milk powder", "3 tbsp Maida", "2 tbsp Ghee", "2 cups Sugar", "4 Cardamom pods", "1 tsp Rose water", "Oil for frying"],
            "directions": [
                "Mix milk powder, maida, ghee, and little milk to form soft dough.",
                "Make small smooth balls without cracks.",
                "Heat oil on medium and deep fry balls until golden brown.",
                "For syrup: Boil sugar with water and cardamom until sticky.",
                "Add rose water to syrup.",
                "Soak fried balls in warm syrup for 2 hours before serving."
            ],
            "image_url": "/images/recipes/gulab-jamun.jpg",
            "category": "VEGETARIAN",
            "region": "India",
            "course": "Dessert",
            "prep_time": "10 min",
            "cook_time": "20 min",
            "servings": "6 servings"
        }
    ]
    # Resolve local images for latest recipes when available
    # and add region information automatically
    for r in static_recipes:
        resolved = find_local_image_file(r.get("title", ""))
        if resolved:
            r["image_url"] = resolved
        # Add region tags automatically
        r = add_region_to_recipe(r)
    
    return {
        "success": True,
        "recipes": static_recipes,
        "total": len(static_recipes)
    }


@app.get("/api/search")
def search_recipes(q: str = "", limit: int = 20):
    """
    Search recipes by keyword in recipe name.
    """
    try:
        if not q:
            # Return random recipes if no query
            import random as rnd
            indices = rnd.sample(range(len(df)), min(limit, len(df)))
            results = []
            for idx in indices:
                recipe_row = df.iloc[idx]
                results.append({
                    "title": recipe_row["name"],
                    "ingredients": recipe_row["ingredients"],
                    "image_url": get_recipe_image_url(recipe_row["name"], recipe_row.get("cuisine")),
                    "category": recipe_row.get("cuisine", "GENERAL").upper() if recipe_row.get("cuisine") else "GENERAL"
                })
        else:
            # Search by name
            mask = df["name"].str.contains(q, case=False, na=False)
            filtered_df = df[mask].head(limit)
            results = []
            for _, recipe_row in filtered_df.iterrows():
                results.append({
                    "title": recipe_row["name"],
                    "ingredients": recipe_row["ingredients"],
                    "image_url": get_recipe_image_url(recipe_row["name"], recipe_row.get("cuisine")),
                    "category": recipe_row.get("cuisine", "GENERAL").upper() if recipe_row.get("cuisine") else "GENERAL"
                })
        
        return {
            "success": True,
            "recipes": results,
            "total": len(results)
        }
    except Exception as e:
        return {"success": False, "error": str(e), "recipes": []}


@app.post("/api/search")
def search_recipes_post(req: IngredientsIn):
    """
    Accept POST requests at /api/search to support frontend POST calls.
    Delegates to the Gemini/Google recipe generation endpoint (search_google_recipes_api)
    which prefers Gemini when available and falls back to Google web search.
    """
    try:
        return search_google_recipes_api(req)
    except Exception as e:
        return {"success": False, "error": str(e), "results": []}


@app.get("/api/recipe/{recipe_name}")
def get_recipe_by_name(recipe_name: str):
    """
    Get detailed recipe information by name (for featured and latest recipes).
    """
    import urllib.parse
    recipe_name = urllib.parse.unquote(recipe_name)
    
    # Check if it's one of our static recipes
    all_static = []
    
    # Get featured recipes
    import datetime
    featured_recipes = [
        {
            "title": "Butter Chicken",
            "description": "A rich and creamy North Indian curry with tender chicken pieces in a tomato-based gravy. This iconic dish is known for its smooth texture and aromatic spices, perfect with naan or rice.",
            "image_url": "/images/recipes/butter-chicken.jpg",
            "ingredients": [
                "500g Boneless chicken, cut into pieces",
                "3 tbsp Butter",
                "1 cup Tomato puree",
                "1/2 cup Heavy cream",
                "2 tbsp Ginger-garlic paste",
                "1 tsp Garam masala",
                "1 tsp Kasuri methi (dried fenugreek leaves)",
                "1 tsp Red chili powder",
                "1/2 tsp Turmeric powder",
                "Salt to taste",
                "2 tbsp Oil for cooking",
                "Fresh coriander for garnish"
            ],
            "directions": [
                "Marinate chicken pieces with yogurt, ginger-garlic paste, red chili powder, turmeric, and salt for 30 minutes.",
                "Heat oil in a pan and cook the marinated chicken until golden brown. Set aside.",
                "In the same pan, melt butter and add tomato puree. Cook for 5-7 minutes until oil separates.",
                "Add garam masala, kasuri methi, and salt. Mix well.",
                "Add the cooked chicken pieces and mix to coat with the gravy.",
                "Pour in heavy cream and simmer for 10 minutes on low heat.",
                "Garnish with fresh coriander and serve hot with naan or rice."
            ],
            "prep_time": "20 min",
            "cook_time": "30 min",
            "servings": "4 servings",
            "cuisine": "North Indian",
            "course": "Main Course",
            "category": "NON-VEG"
        },
        {
            "title": "Butter Paneer",
            "description": "A vegetarian delight featuring soft paneer cubes in a rich, creamy tomato-based gravy. Flavored with aromatic spices and finished with butter, this dish is a perfect choice for paneer lovers.",
            "image_url": "/images/recipes/butter-paneer.jpg",
            "ingredients": [
                "400g Paneer, cut into cubes",
                "3 tbsp Butter",
                "2 large Onions, chopped",
                "1 cup Tomato puree",
                "1/2 cup Heavy cream",
                "2 tbsp Ginger-garlic paste",
                "1 tsp Garam masala",
                "1 tsp Kasuri methi (dried fenugreek leaves)",
                "1 tsp Red chili powder",
                "1/2 tsp Turmeric powder",
                "2 tbsp Cashew paste (optional)",
                "Salt to taste",
                "Fresh coriander for garnish"
            ],
            "directions": [
                "Heat 1 tbsp butter in a pan and lightly fry paneer cubes until golden. Set aside.",
                "In the same pan, melt remaining butter and sauté chopped onions until golden brown.",
                "Add ginger-garlic paste and cook for 2 minutes until raw smell disappears.",
                "Add tomato puree, red chili powder, turmeric, and salt. Cook for 8-10 minutes until oil separates.",
                "Add cashew paste (if using) and mix well for creamy texture.",
                "Add garam masala and kasuri methi. Mix well.",
                "Pour in heavy cream and add fried paneer cubes. Simmer for 5 minutes.",
                "Garnish with fresh coriander and serve hot with naan or roti."
            ],
            "prep_time": "15 min",
            "cook_time": "25 min",
            "servings": "4 servings",
            "cuisine": "North Indian",
            "course": "Main Course",
            "category": "VEGETARIAN"
        }
    ]
    
    # Resolve local images
    for r in featured_recipes:
        resolved = find_local_image_file(r.get("title", ""))
        if resolved:
            r["image_url"] = resolved
    
    all_static.extend(featured_recipes)
    
    # Get latest recipes (already detailed in get_latest_recipes)
    latest = get_latest_recipes()
    if latest.get("success"):
        all_static.extend(latest["recipes"])
    
    # Find matching recipe
    for recipe in all_static:
        if recipe["title"].lower() == recipe_name.lower():
            # Add nutrition information
            nutrition = get_nutrition_info(recipe["title"], recipe.get("ingredients", []))
            recipe["nutrition"] = nutrition
            
            # Add YouTube video
            youtube_video_id = search_youtube_video(recipe["title"])
            recipe["youtube_video_id"] = youtube_video_id
            
            return {
                "success": True,
                "recipe": recipe
            }
    
    return {
        "success": False,
        "error": "Recipe not found"
    }



# ----------------------------------------
# RUN SERVER
# ----------------------------------------
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
