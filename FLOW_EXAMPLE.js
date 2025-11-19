// Example of how the ingredient search works

// 1. USER ADDS INGREDIENTS
// User types "tomato" and presses Enter
// User types "cheese" and presses Enter  
// User types "pasta" and presses Enter
// Ingredients array: ["tomato", "cheese", "pasta"]

// 2. USER CLICKS SEARCH BUTTON
// Frontend sends this request to backend:

fetch('http://localhost:8000/search-by-ingredients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ingredients: ["tomato", "cheese", "pasta"],
    top_n: 12,
    max_missing: 3
  })
})

// 3. BACKEND PROCESSES REQUEST
// Python backend:
// - Cleans ingredient names
// - Converts to AI embeddings
// - Compares with 20,000 recipes
// - Calculates similarity scores
// - Returns top 12 matches

// 4. FRONTEND RECEIVES RESPONSE
{
  "success": true,
  "recipes": [
    {
      "title": "Classic Spaghetti Marinara",
      "ingredients": ["pasta", "tomato", "cheese", "basil", "garlic", "olive oil"],
      "present_ingredients": ["pasta", "tomato", "cheese"],
      "missing_ingredients": ["basil", "garlic", "olive oil"],
      "match_score": 0.89,
      "match_percentage": 50,
      "cuisine": "Italian",
      "category": "ITALIAN",
      "image_url": "...",
      "substitutions": {}
    },
    {
      "title": "Tomato Cheese Pasta Bake",
      "ingredients": ["pasta", "tomato", "cheese", "butter"],
      "present_ingredients": ["pasta", "tomato", "cheese"],
      "missing_ingredients": ["butter"],
      "match_score": 0.92,
      "match_percentage": 75,
      "cuisine": "Italian",
      "category": "ITALIAN",
      "image_url": "...",
      "substitutions": {}
    }
    // ... more recipes
  ],
  "total_found": 12,
  "ingredients_searched": ["tomato", "cheese", "pasta"]
}

// 5. FRONTEND DISPLAYS RESULTS
// Shows recipe cards with:
// - Recipe name
// - Match percentage badge (e.g., "75% match")
// - "✓ 3 matching ingredients"
// - "+ 1 additional needed"
// - Category tag
// - Total ingredient count

// 6. USER CLICKS ON RECIPE
// Navigates to recipe detail page: /recipe/[id]
