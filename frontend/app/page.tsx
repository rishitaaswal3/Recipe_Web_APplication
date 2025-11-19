'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from './components/Navbar';
import FeaturedRecipe from './components/FeaturedRecipe';
import IngredientSearchBar from './components/IngredientSearchBar';
import HamsterLoader from './components/HamsterLoader';
import { useScrollAnimation } from './hooks/useScrollAnimation';

interface Recipe {
  title: string;
  ingredients: string[];
  present_ingredients?: string[];
  missing_ingredients?: string[];
  directions?: string;
  match_percentage: number;
  match_score: number;
  image_url: string;
  category: string;
  cuisine?: string;
  region?: string;
  tags?: string;
  link?: string;
  snippet?: string;
  description?: string;
  prep_time?: string;
  cook_time?: string;
  servings?: string;
  course?: string;
  fullRecipe?: any;
}

export default function Home() {
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchedIngredients, setSearchedIngredients] = useState<string[]>([]);
  const [latestRecipes, setLatestRecipes] = useState<Recipe[]>([]);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [resultSource, setResultSource] = useState<'dataset' | 'google' | 'gemini'>('gemini');

  // Intersection Observer for scroll animations
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Observe all scroll-animate elements
    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => {
      if (observerRef.current) {
        observerRef.current.observe(el);
      }
    });
  }, [searchResults, latestRecipes]);

  // Fetch latest recipes on mount
  useEffect(() => {
    fetchLatestRecipes();
  }, []);

  const fetchLatestRecipes = async () => {
    try {
      setLoadingLatest(true);
      const response = await fetch('http://localhost:8000/api/latest');
      const data = await response.json();
      
      if (data.success && data.recipes) {
        console.log('📋 Latest Recipes Categories:', data.recipes.map((r: any) => ({ title: r.title, category: r.category })));
        setLatestRecipes(data.recipes);
      }
    } catch (error) {
      console.error('Error fetching latest recipes:', error);
    } finally {
      setLoadingLatest(false);
    }
  };

  const handleSearch = async (ingredients: string[]) => {
    if (ingredients.length === 0) {
      return;
    }

    setSearching(true);
    setSearched(true);
    setSearchedIngredients(ingredients);

    try {
      // Use Google web search endpoint (global search only)
      const response = await fetch('http://localhost:8000/search-google-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: ingredients,
          top_n: 12,
          max_missing: 3
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.source === 'gemini') {
          // Gemini AI generated recipes - full structured data
          setResultSource(data.source);
          const transformedResults = data.results.map((recipe: any) => {
            console.log('🔍 Gemini Recipe Category:', recipe.title, '→', recipe.category);
            return {
              title: recipe.title,
              ingredients: recipe.ingredients || [],
              directions: Array.isArray(recipe.directions) ? recipe.directions : recipe.directions,
              match_percentage: recipe.match_percentage || 0,
              match_score: 1.0,
              image_url: recipe.image_url || 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800',
              category: recipe.category, // Don't default here - let it be undefined if missing
              cuisine: recipe.cuisine || 'Various',
              region: recipe.region,
              prep_time: recipe.prep_time,
              cook_time: recipe.cook_time,
              servings: recipe.servings,
              course: recipe.course,
              description: recipe.description,
              nutrition: recipe.nutrition,
              matching_count: recipe.matching_count,
              total_count: recipe.total_count,
              present_ingredients: recipe.present_ingredients,
              missing_ingredients: recipe.missing_ingredients,
              // Store complete recipe data for detail page (don't modify directions here)
              fullRecipe: {
                ...recipe,
                source: 'gemini'
              }
            };
          });
          setSearchResults(transformedResults);
        } else if (data.source === 'google') {
          // Google web search results
          setResultSource('google');
          const transformedResults = data.results.map((item: { title: string; image: string | null; snippet: string; link: string }) => ({
            title: item.title,
            ingredients: [],
            directions: item.snippet,
            match_percentage: 100,
            match_score: 1.0,
            image_url: item.image || 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800',
            category: 'WEB',
            cuisine: 'Various',
            link: item.link,
            snippet: item.snippet
          }));
          setSearchResults(transformedResults);
        }
      } else {
        // No results or API not configured
        console.log('Search failed:', data.error);
        setResultSource('google');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching recipes:', error);
      setResultSource('google');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleCategorySearch = async (category: string) => {
    setSearchedIngredients([`Indian ${category}`]);
    setSearched(true);
    setSearching(true);

    try {
      const response = await fetch('http://localhost:8000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: [`Indian ${category}`],
          top_n: 6,
          max_missing: 0
        })
      });

      const data = await response.json();

      if (data.success && data.source === 'gemini') {
        setResultSource(data.source);
        const transformedResults = data.results.map((recipe: any) => {
          console.log('🔍 Category Recipe:', recipe.title, '→', recipe.course);
          return {
            title: recipe.title,
            ingredients: recipe.ingredients || [],
            directions: Array.isArray(recipe.directions) ? recipe.directions : recipe.directions,
            match_percentage: recipe.match_percentage || 0,
            match_score: 1.0,
            image_url: recipe.image_url || 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800',
            category: recipe.category,
            cuisine: recipe.cuisine || 'Indian',
            region: recipe.region,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            course: recipe.course,
            description: recipe.description,
            nutrition: recipe.nutrition,
            matching_count: recipe.matching_count,
            total_count: recipe.total_count,
            present_ingredients: recipe.present_ingredients,
            missing_ingredients: recipe.missing_ingredients,
            fullRecipe: {
              ...recipe,
              source: 'gemini'
            }
          };
        });
        setSearchResults(transformedResults);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching category recipes:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="w-full">
      {/* Navigation Bar */}
      <Navbar />

      {/* Hero Section with Background Video */}
      <section className="hero-section relative w-full overflow-hidden pt-16" style={{ height: '120vh' }}>
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover blur-[3px]"
        >
          <source src="/videos/cook_video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/55"></div>

        {/* Content Overlay */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4" style={{ paddingTop: '0', marginTop: '-80px' }}>
          <div className="text-center max-w-4xl">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white text-center mb-6 drop-shadow-2xl animate-fade-in-down">
              <span className="block">Your Ingredients</span>
              <span className="block">Our Recipes</span>
            </h1>
            <p className="text-xl md:text-2xl text-white text-center mb-12 drop-shadow-xl max-w-2xl mx-auto font-light animate-fade-in-up delay-200">
              Cook smarter. Waste less. Eat better.
            </p>

            {/* Ingredient Search Bar */}
            <div className="animate-fade-in-up delay-300">
              <IngredientSearchBar onSearch={handleSearch} isSearching={searching} />
            </div>

            {/* Category Buttons */}
            <div className="category-buttons mt-25 flex items-center justify-center gap-3 px-4 animate-fade-in-up delay-500">
              <button 
                onClick={() => handleCategorySearch('entrees')}
                className="category-btn category-entrees"
                disabled={searching}
              >
                ENTREES
              </button>
              <button 
                onClick={() => handleCategorySearch('breakfast')}
                className="category-btn category-breakfast"
                disabled={searching}
              >
                BREAKFAST
              </button>
              <button 
                onClick={() => handleCategorySearch('lunch')}
                className="category-btn category-lunch"
                disabled={searching}
              >
                LUNCH
              </button>
              <button 
                onClick={() => handleCategorySearch('desserts')}
                className="category-btn category-desserts"
                disabled={searching}
              >
                DESSERTS
              </button>
              <button 
                onClick={() => handleCategorySearch('drinks')}
                className="category-btn category-drinks"
                disabled={searching}
              >
                DRINKS
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      {searched && (
        <section className="search-results-section bg-gray-900 py-16 px-4">
                      <div className="max-w-7xl mx-auto">
            {searching ? (
              <div className="flex flex-col items-center justify-center py-20">
                <HamsterLoader />
                <p className="text-xl text-gray-300 mt-6">Searching for recipes...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-8 scroll-animate">
                  <div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Search Results</h2>
                    <p className="text-xl text-gray-300 mb-2">
                      Found {searchResults.length} recipes using: {' '}
                      <span className="font-semibold text-orange-400">
                        {searchedIngredients.join(', ')}
                      </span>
                    </p>
                  </div>
                  
                  {/* Removed Source Badge - No AI labels */}
                </div>
                
                <p className="text-md text-gray-400 mb-12 scroll-animate">
                  {resultSource === 'google' 
                    ? 'Showing recipes from across the web matching your ingredients'
                    : 'Showing recipes matching your ingredients'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {searchResults.map((recipe, index) => (
                    <div
                      key={index}
                      className="recipe-card bg-gray-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-700 hover:border-orange-500 scroll-animate"
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={async () => {
                        if (recipe.link && resultSource === 'google') {
                          // Google web results - open in new tab
                          window.open(recipe.link, '_blank');
                        } else if (resultSource === 'gemini' && recipe.fullRecipe) {
                          // Gemini generated recipes - store with unique key based on title
                          const storageKey = `gemini_recipe_${recipe.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
                          console.log('🔥 Storing Gemini recipe with key:', storageKey);
                          console.log('🔥 Recipe title:', recipe.title);
                          console.log('🔥 Full recipe data:', recipe.fullRecipe);
                          
                          // Store in localStorage with recipe-specific key (persists longer)
                          localStorage.setItem(storageKey, JSON.stringify(recipe.fullRecipe));
                          
                          // Verify it's stored
                          const verification = localStorage.getItem(storageKey);
                          console.log('✅ Verification - Data stored:', verification ? 'YES - ' + verification.length + ' chars' : 'NO');
                          
                          // Small delay to ensure localStorage write completes before navigation
                          await new Promise(resolve => setTimeout(resolve, 100));
                          
                          // Navigate with source parameter and storage key
                          router.push(`/recipe/${encodeURIComponent(recipe.title)}?source=gemini&key=${encodeURIComponent(storageKey)}`);
                        } else {
                          // Dataset recipes - normal navigation
                          console.log('Navigating to dataset recipe:', recipe.title);
                          router.push(`/recipe/${encodeURIComponent(recipe.title)}`);
                        }
                      }}
                    >
                      <div className="recipe-card-image h-64 relative">
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23374151" width="800" height="600"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ERecipe Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        {/* Removed card badges - No AI labels */}
                        {recipe.match_percentage > 0 && (
                          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                            {recipe.match_percentage}% match
                          </div>
                        )}
                      </div>
                      <div className="recipe-card-content p-6">
                        <h3 className="text-2xl font-bold text-white mb-3 line-clamp-2">{recipe.title}</h3>
                        
                        {/* Snippet for Google results */}
                        {recipe.snippet && resultSource === 'google' && (
                          <p className="text-sm text-gray-400 mb-4 line-clamp-3">{recipe.snippet}</p>
                        )}
                        
                        {/* Ingredient Match Info for all results with matching data */}
                        {(resultSource === 'gemini' || resultSource === 'dataset') && recipe.present_ingredients && (
                          <div className="mb-4">
                            {recipe.present_ingredients.length > 0 && (
                              <div className="text-sm text-green-400 mb-1">
                                ✓ {recipe.present_ingredients.length} matching ingredients
                              </div>
                            )}
                            {recipe.missing_ingredients && recipe.missing_ingredients.length > 0 && (
                              <div className="text-sm text-orange-400">
                                + {recipe.missing_ingredients.length} additional needed
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {/* Combined Category and Region Tag */}
                          <span className={`px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide ${
                            (() => {
                              const cat = (recipe.category || '').toUpperCase();
                              if (cat.includes('NON') || cat === 'NON-VEG' || cat === 'NON-VEGETARIAN') return 'bg-red-500 text-white';
                              if (cat === 'VEGAN') return 'bg-emerald-600 text-white';
                              if (cat === 'EGGETARIAN' || cat.includes('EGG')) return 'bg-yellow-500 text-white';
                              if (cat === 'VEGETARIAN' || cat === 'VEG') return 'bg-green-500 text-white';
                              return 'bg-gray-500 text-white';
                            })()
                          }`}>
                            {(() => {
                              const cat = (recipe.category || '').toUpperCase();
                              if (cat.includes('NON') || cat === 'NON-VEG' || cat === 'NON-VEGETARIAN') return 'NON-VEG';
                              if (cat === 'VEGAN') return 'VEGAN';
                              if (cat === 'EGGETARIAN' || cat.includes('EGG')) return 'EGGETARIAN';
                              if (cat === 'VEGETARIAN' || cat === 'VEG') return 'VEG';
                              return cat || 'UNKNOWN';
                            })()}
                            {recipe.region && ` • INDIAN (${recipe.region})`}
                          </span>
                          
                          {resultSource === 'dataset' && (
                            <span className="text-sm text-gray-400">
                              {recipe.ingredients.length} ingredients
                            </span>
                          )}
                          {resultSource === 'google' && (
                            <span className="text-xs text-blue-400 flex items-center gap-1">
                              View Recipe
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="mb-6">
                  <svg className="w-24 h-24 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">No recipes found on the web</h2>
                <p className="text-xl text-gray-300 mb-6">
                  We searched the internet for recipes using: <span className="font-semibold text-orange-400">{searchedIngredients.join(', ')}</span>
                </p>
                <div className="max-w-2xl mx-auto bg-gray-800 border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Try these tips:</h3>
                  <ul className="text-left text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>Use common ingredient names (e.g., "chicken" instead of "poultry")</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>Try different combinations or add more ingredients</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>Search with 2-3 main ingredients for better results</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>Make sure ingredients are spelled correctly</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Recipe Section - Show only when no search */}
      {!searched && <FeaturedRecipe />}

      {/* Latest Recipes Section - Show only when no search */}
      {!searched && (
      <section id="services" className="latest-recipes-section bg-gray-900 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 scroll-animate">Latest recipes</h2>
          
          {/* Recipe Cards Grid */}
          {loadingLatest ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="recipe-card bg-gray-800 rounded-3xl overflow-hidden shadow-lg border border-gray-700 animate-pulse">
                  <div className="h-64 bg-gray-700"></div>
                  <div className="p-6">
                    <div className="h-8 bg-gray-700 rounded mb-4"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-20 bg-gray-700 rounded-full"></div>
                      <div className="h-6 w-24 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestRecipes.map((recipe, index) => (
                <div
                  key={index}
                  className="recipe-card bg-gray-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-700 hover:border-orange-500 scroll-animate hover-lift"
                  style={{ animationDelay: `${index * 0.15}s` }}
                  onClick={() => router.push(`/recipe/${encodeURIComponent(recipe.title)}`)}
                >
                  <div className="recipe-card-image h-64 relative overflow-hidden">
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23374151" width="800" height="600"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ERecipe Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <div className="recipe-card-content p-6">
                    <h3 className="text-2xl font-bold text-white mb-4 line-clamp-2">{recipe.title}</h3>
                    
                    {/* Course badge */}
                    {(recipe as any).course && (
                      <div className="text-sm text-gray-400 mb-3">
                        {(recipe as any).course}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                      {/* Combined Category and Region Tag */}
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide ${
                        (() => {
                          const cat = (recipe.category || '').toUpperCase();
                          if (cat.includes('NON') || cat === 'NON-VEG' || cat === 'NON-VEGETARIAN') return 'bg-red-500 text-white';
                          if (cat === 'VEGAN') return 'bg-emerald-600 text-white';
                          if (cat === 'EGGETARIAN' || cat.includes('EGG')) return 'bg-yellow-500 text-white';
                          if (cat === 'VEGETARIAN' || cat === 'VEG') return 'bg-green-500 text-white';
                          return 'bg-gray-500 text-white';
                        })()
                      }`}>
                        {(() => {
                          const cat = (recipe.category || '').toUpperCase();
                          if (cat.includes('NON') || cat === 'NON-VEG' || cat === 'NON-VEGETARIAN') return 'NON-VEG';
                          if (cat === 'VEGAN') return 'VEGAN';
                          if (cat === 'EGGETARIAN' || cat.includes('EGG')) return 'EGGETARIAN';
                          if (cat === 'VEGETARIAN' || cat === 'VEG') return 'VEG';
                          return cat || 'UNKNOWN';
                        })()}
                        {recipe.region && ` • INDIAN (${recipe.region})`}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="time-badge flex items-center text-gray-400 text-sm">
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                          <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2"/>
                        </svg>
                        {(recipe as any).cook_time || `${recipe.ingredients?.length || 0} ingredients`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* Services Section */}
      {!searched && (
      <section className="services-section bg-gray-800 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 scroll-animate">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">What We Offer</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover how our platform makes cooking easier, smarter, and more enjoyable every day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Service 1 - Smart Recipe Search */}
            <div className="service-card bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-600 scroll-animate" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Smart Recipe Search</h3>
              <p className="text-gray-300 leading-relaxed">
                Find perfect recipes based on ingredients you already have. Our intelligent search algorithm matches you with the best options.
              </p>
            </div>

            {/* Service 2 - Reduce Food Waste */}
            <div className="service-card bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-600 scroll-animate" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Reduce Food Waste</h3>
              <p className="text-gray-300 leading-relaxed">
                Use up leftover ingredients before they go bad. Cook smarter and contribute to a more sustainable future.
              </p>
            </div>

            {/* Service 3 - Personalized Recommendations */}
            <div className="service-card bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-600 scroll-animate" style={{ animationDelay: '0.3s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Personalized Recommendations</h3>
            <p className="text-gray-300 leading-relaxed">
              Get recipe suggestions tailored to your preferences, dietary requirements, and cooking skill level.
            </p>
          </div>

          {/* Service 4 - Step-by-Step Guides */}
          <div className="service-card bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-600 scroll-animate" style={{ animationDelay: '0.4s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Step-by-Step Guides</h3>
            <p className="text-gray-300 leading-relaxed">
              Clear, easy-to-follow instructions with cooking times and preparation tips for every recipe.
            </p>
          </div>

          {/* Service 5 - Nutritional Information */}
          <div className="service-card bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-600 scroll-animate" style={{ animationDelay: '0.5s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Nutritional Information</h3>
            <p className="text-gray-300 leading-relaxed">
              Make informed decisions with detailed nutritional breakdowns for every recipe in our database.
            </p>
          </div>

          {/* Service 6 - Save Favorites */}
          <div className="service-card bg-gray-700 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-600 scroll-animate" style={{ animationDelay: '0.6s' }}>
            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Save Favorites</h3>
            <p className="text-gray-300 leading-relaxed">
              Bookmark your favorite recipes and create custom collections for easy access anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
    )}      {/* About Us Section */}
      {!searched && (
      <section id="about" className="about-section bg-gray-900 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="scroll-animate">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">About Us</h2>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                We're passionate about making cooking accessible, sustainable, and enjoyable for everyone. Our mission is to help you make the most of what you have in your kitchen.
              </p>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                Founded by food enthusiasts and tech innovators, our platform combines the love of cooking with smart technology. We believe that great meals start with great ingredients—and you probably have them already!
              </p>
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="stat-box bg-gray-800 border border-gray-700 p-6 rounded-2xl scroll-animate hover-lift" style={{ animationDelay: '0.1s' }}>
                  <div className="text-4xl font-bold text-orange-400 mb-2">10K+</div>
                  <div className="text-gray-300 font-medium">Recipes</div>
                </div>
                <div className="stat-box bg-gray-800 border border-gray-700 p-6 rounded-2xl scroll-animate hover-lift" style={{ animationDelay: '0.2s' }}>
                  <div className="text-4xl font-bold text-purple-400 mb-2">50K+</div>
                  <div className="text-gray-300 font-medium">Users</div>
                </div>
                <div className="stat-box bg-gray-800 border border-gray-700 p-6 rounded-2xl scroll-animate hover-lift" style={{ animationDelay: '0.3s' }}>
                  <div className="text-4xl font-bold text-green-400 mb-2">100K+</div>
                  <div className="text-gray-300 font-medium">Meals Cooked</div>
                </div>
                <div className="stat-box bg-gray-800 border border-gray-700 p-6 rounded-2xl scroll-animate hover-lift" style={{ animationDelay: '0.4s' }}>
                  <div className="text-4xl font-bold text-blue-400 mb-2">95%</div>
                  <div className="text-gray-300 font-medium">Satisfaction</div>
                </div>
              </div>
            </div>

            {/* Right Content - Image/Visual */}
            <div className="relative scroll-animate" style={{ animationDelay: '0.5s' }}>
              <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl h-96 flex items-center justify-center shadow-2xl">
                <div className="text-white text-center p-8">
                  <svg className="w-32 h-32 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="text-3xl font-bold mb-2">Your Kitchen, Our Passion</h3>
                  <p className="text-lg opacity-90">Transforming ingredients into delicious memories</p>
                </div>
              </div>
              {/* Decorative Elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400 rounded-full opacity-50 blur-xl"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-pink-400 rounded-full opacity-50 blur-xl"></div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Column 1 - Brand */}
            <div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                ingrediGo
              </h3>
              <p className="text-gray-400 mb-4">
                Your ingredients, our recipes. Cook smarter, waste less, eat better.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-gradient-to-br hover:from-orange-400 hover:to-red-500 rounded-full flex items-center justify-center transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-gradient-to-br hover:from-purple-400 hover:to-pink-500 rounded-full flex items-center justify-center transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-gradient-to-br hover:from-blue-400 hover:to-blue-600 rounded-full flex items-center justify-center transition-all duration-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2 - Contact Information */}
            <div>
              <h4 className="text-lg font-bold mb-4">Contact Info</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 mt-1 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Graphic Era University, Dehradun, Uttarakhand, India</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:+911234567890" className="hover:text-orange-400 transition-colors">+91 95489 48331</a>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:rishitaaswal03@gmail.com" className="hover:text-orange-400 transition-colors">rishitaaswal03@gmail.com</a>
                </li>
                <li className="flex items-start gap-2 pt-2">
                  <svg className="w-5 h-5 mt-1 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-white">Owner</p>
                    <p>Chef Rishit Aswal </p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Column 3 - Quick Links */}
            <div>
              <h4 className="text-lg font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="/" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">Home</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">Browse Recipes</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">Search by Ingredients</a></li>
                <li><a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">About Us</a></li>
              </ul>
            </div>

            {/* Column 4 - Newsletter */}
            <div>
              <h4 className="text-lg font-bold mb-4">Stay Updated</h4>
              <p className="text-gray-400 mb-4">Subscribe to get weekly recipe inspiration!</p>
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-orange-400 focus:outline-none text-white placeholder-gray-500 transition-colors duration-200"
                />
                <button className="px-4 py-2 bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                © 2025 ingrediGo. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm">
                <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">Terms</a>
                <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors duration-200">Cookies</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
