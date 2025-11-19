'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import Image from 'next/image';

interface Recipe {
  title: string;
  description: string;
  image_url: string;
  ingredients: string[];
  directions: string[] | string;
  prep_time?: string;
  cook_time?: string;
  servings?: string;
  category?: string;
  course?: string;
  cuisine?: string;
  link?: string;
  source?: string;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };
  youtube_video_id?: string;
}

export default function RecipePage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedRecipes, setRelatedRecipes] = useState<any[]>([]);

  useEffect(() => {
    fetchRecipe();
    fetchRelatedRecipes();
  }, [params.id]);

  const fetchRecipe = async () => {
    try {
      const recipeName = decodeURIComponent(params.id as string);
      console.log('📍 Looking for recipe:', recipeName);
      
      // Check if this is a Gemini recipe by looking for source param in URL
      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get('source');
      const storageKey = urlParams.get('key');
      
      console.log('🔍 URL source:', source);
      console.log('🔍 Storage key:', storageKey);
      
      if (source === 'gemini' && storageKey) {
        // This is a Gemini recipe - load from localStorage with specific key
        const geminiStorageKey = `gemini_recipe_${storageKey}`;
        const storedRecipe = localStorage.getItem(geminiStorageKey);
        console.log('🔥 Looking for Gemini recipe with key:', geminiStorageKey);
        console.log('� Found in localStorage:', storedRecipe ? 'YES' : 'NO');
        
        if (storedRecipe) {
          try {
            const parsedRecipe = JSON.parse(storedRecipe);
            console.log('✅ Gemini recipe loaded:', parsedRecipe.title);
            console.log('✅ Full recipe data:', parsedRecipe);
            
            // Clean up localStorage
            localStorage.removeItem(geminiStorageKey);
            
            setRecipe(parsedRecipe);
            setLoading(false);
            return;
            
          } catch (e) {
            console.error('❌ Error parsing Gemini recipe:', e);
            localStorage.removeItem(geminiStorageKey);
          }
        } else {
          console.error('❌ Gemini recipe not found in localStorage!');
        }
      }
      
      console.log('🔍 Not a Gemini recipe, fetching from backend...');
      // Try to fetch by recipe name from our static recipes (dataset)
      const response = await fetch(`http://localhost:8000/api/recipe/${encodeURIComponent(recipeName)}`);
      const data = await response.json();
      
      if (data.success) {
        setRecipe(data.recipe);
      } else {
        // Fallback to featured recipe
        const fallbackResponse = await fetch('http://localhost:8000/api/featured');
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.success) {
          setRecipe(fallbackData.recipe);
        }
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedRecipes = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/search?q=&limit=3');
      const data = await response.json();
      if (data.success) {
        setRelatedRecipes(data.recipes);
      }
    } catch (error) {
      console.error('Error fetching related recipes:', error);
    }
  };

  const parseDirections = (directions: string | string[]) => {
    if (!directions) return [];
    if (Array.isArray(directions)) return directions;
    // Split by numbers followed by period or newlines
    const steps = directions.split(/\d+\.|\\n/).filter(step => step.trim().length > 0);
    return steps;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-96 bg-gray-200 rounded mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold mb-4">Recipe Not Found</h1>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const directions = parseDirections(recipe.directions);

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Left Column - Title and Info */}
          <div>
            {recipe.category && (
              <div className="inline-block px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-semibold mb-4 uppercase tracking-wider">
                {recipe.category}
              </div>
            )}
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {recipe.title}
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              {recipe.description}
            </p>

            {/* Recipe Meta Info */}
            <div className="flex flex-wrap gap-6 mb-8">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Prep</p>
                  <p className="font-semibold text-white">{recipe.prep_time || '15 minutes'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Cook</p>
                  <p className="font-semibold text-white">{recipe.cook_time || '30 minutes'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Serves</p>
                  <p className="font-semibold text-white">{recipe.servings || '4 people'}</p>
                </div>
              </div>
              
              {recipe.course && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Course</p>
                    <p className="font-semibold text-white">{recipe.course}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button 
                onClick={() => document.getElementById('recipe-content')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-full hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
              >
                Jump to recipe
              </button>
              <button 
                onClick={() => router.push('/')}
                className="px-8 py-4 border-2 border-gray-600 text-white font-semibold rounded-full hover:bg-gray-800 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative h-[500px] lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl border border-gray-700">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23374151" width="800" height="600"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ERecipe Image%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div id="recipe-content" className="max-w-7xl mx-auto px-4 py-16">
        
        {/* Ingredients & Nutrition Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-white mb-8">Ingredients</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Ingredients List - Left Side */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
                <ul className="space-y-4">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-orange-400 text-xl mt-1">•</span>
                      <span className="text-lg text-gray-200">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Nutrition Info - Right Side */}
            <div>
              <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-8 shadow-xl sticky top-24">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Nutrition Facts
                </h3>
                <div className="text-white space-y-4">
                  <p className="text-sm opacity-90 pb-4 border-b border-white/20">Per serving</p>
                  
                  {recipe.nutrition ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Calories</span>
                        <span className="text-2xl font-bold">{recipe.nutrition.calories}</span>
                      </div>
                      
                      <div className="pt-4 border-t border-white/20 space-y-3">
                        <div className="flex justify-between">
                          <span>Protein</span>
                          <span className="font-semibold">{recipe.nutrition.protein}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carbohydrates</span>
                          <span className="font-semibold">{recipe.nutrition.carbs}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fat</span>
                          <span className="font-semibold">{recipe.nutrition.fat}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fiber</span>
                          <span className="font-semibold">{recipe.nutrition.fiber}g</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sodium</span>
                          <span className="font-semibold">{recipe.nutrition.sodium}mg</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm opacity-80">Nutrition information not available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Directions & Video Section */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-white mb-8">Directions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Directions - Left Side */}
            <div>
              <div className="space-y-6">
                {directions.length > 0 ? (
                  directions.map((step, index) => (
                    <div key={index} className="flex gap-6">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                        {index + 1}
                      </div>
                      <p className="text-lg text-gray-300 leading-relaxed pt-2">{step.trim()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-lg text-gray-300 leading-relaxed">{typeof recipe.directions === 'string' ? recipe.directions : 'Directions not available.'}</p>
                )}
              </div>
            </div>

            {/* YouTube Video - Right Side */}
            <div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl sticky top-24">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Watch Video
                </h3>
                
                {recipe.youtube_video_id ? (
                  <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${recipe.youtube_video_id}`}
                      title={`${recipe.title} Video Recipe`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <div className="bg-gray-700/50 rounded-xl p-10 text-center">
                    <svg className="w-20 h-20 text-gray-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-400 mb-6 text-lg">No video available</p>
                    <a 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.title + ' recipe')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-8 py-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all font-semibold text-lg"
                    >
                      Search on YouTube
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Share Section */}
        <section className="mb-16 border-t border-b border-gray-200 py-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Share recipe</h3>
            <div className="flex gap-4">
              <button className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
              <button className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </button>
              <button className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
                </svg>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Related Recipes */}
      {relatedRecipes.length > 0 && (
        <div className="bg-pink-50 py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-4xl font-bold text-gray-900 mb-12">Other recipes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedRecipes.map((relatedRecipe, index) => (
                <div key={index} className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                     onClick={() => router.push(`/recipe/${index}`)}>
                  <div className="h-64 bg-gray-200">
                    <img
                      src={relatedRecipe.image_url}
                      alt={relatedRecipe.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-semibold text-pink-600 mb-2 uppercase tracking-wide">
                      {relatedRecipe.category || 'RECIPE'}
                    </p>
                    <h3 className="text-xl font-bold text-gray-900">{relatedRecipe.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Get recipes straight to your inbox!</h2>
          <p className="text-gray-300 mb-8">Subscribe to receive the latest recipes and cooking tips.</p>
          <div className="flex gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-3 rounded-full text-gray-900"
            />
            <button className="px-8 py-3 bg-white text-gray-900 font-semibold rounded-full hover:bg-gray-100 transition-all">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
