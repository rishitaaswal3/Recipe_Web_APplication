'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import HamsterLoader from './HamsterLoader';

interface Recipe {
  title: string;
  description: string;
  image_url: string;
  ingredients: string[];
  directions: string;
  link: string;
  source: string;
}

export default function FeaturedRecipe() {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeaturedRecipe();
  }, []);

  const fetchFeaturedRecipe = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/api/featured');
      const data = await response.json();
      
      if (data.success) {
        setRecipe(data.recipe);
      } else {
        setError(data.error || 'Failed to load recipe');
      }
    } catch (err) {
      setError('Unable to connect to backend. Please make sure the Python server is running.');
      console.error('Error fetching recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="recipe-section flex flex-col md:flex-row w-full bg-[#2d3748]">
        <div className="recipe-image-section w-full md:w-[60%] bg-[#2d3748] p-6 md:p-12 flex items-center justify-center">
          <div className="recipe-image-box w-full max-w-[600px] rounded-2xl flex items-center justify-center" style={{ height: '400px' }}>
            <HamsterLoader />
          </div>
        </div>
        <div className="recipe-info-section w-full md:w-[40%] bg-[#2d3748] p-10 md:p-16 flex flex-col justify-center min-h-[600px]">
          <div className="h-12 bg-[#4a5568] rounded mb-6 animate-pulse"></div>
          <div className="h-32 bg-[#4a5568] rounded mb-8 animate-pulse"></div>
          <div className="h-12 w-40 bg-[#4a5568] rounded-full animate-pulse"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="recipe-section flex flex-col md:flex-row w-full bg-[#2d3748]">
        <div className="recipe-image-section w-full md:w-[60%] bg-[#2d3748] p-6 md:p-12 flex items-center justify-center">
          <div className="recipe-image-box w-full max-w-[600px] bg-[#4a5568] rounded-2xl flex items-center justify-center shadow-2xl" style={{ height: '400px' }}>
            <span className="text-gray-400 text-lg">Recipe Image</span>
          </div>
        </div>
        <div className="recipe-info-section w-full md:w-[40%] bg-[#2d3748] p-10 md:p-16 flex flex-col justify-center min-h-[600px]">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Butter Chicken
          </h2>
          <p className="text-gray-300 text-lg md:text-xl lg:text-2xl mb-8 leading-relaxed">
            A rich and creamy North Indian curry with tender chicken pieces in a tomato-based gravy. 
            This iconic dish is known for its smooth texture and aromatic spices.
          </p>
          <button 
            onClick={() => router.push('/recipe/Butter%20Chicken')}
            className="view-recipe-btn px-10 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl w-fit text-base md:text-lg"
          >
            VIEW RECIPE
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="recipe-section flex flex-col md:flex-row w-full bg-[#2d3748]">
      {/* Left Side - Image Section (60%) */}
      <div className="recipe-image-section w-full md:w-[60%] bg-[#2d3748] p-6 md:p-12 flex items-center justify-center scroll-animate">
        <div className="recipe-image-box w-full max-w-[600px] rounded-2xl overflow-hidden shadow-2xl relative hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]" style={{ height: '400px' }}>
          {recipe?.image_url ? (
            <img 
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder on error
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%232d3748" width="800" height="600"/%3E%3Ctext fill="%23cbd5e0" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ERecipe Image%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-full h-full bg-[#2d3748] flex items-center justify-center">
              <span className="text-gray-400 text-lg">Recipe Image</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Recipe Info Section (40%) */}
      <div className="recipe-info-section w-full md:w-[40%] bg-[#2d3748] p-10 md:p-16 flex flex-col justify-center min-h-[600px] scroll-animate" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in-right">
          {recipe?.title || 'Recipe Title'}
        </h2>
        <p className="text-gray-300 text-lg md:text-xl lg:text-2xl mb-8 leading-relaxed animate-fade-in-right delay-100">
          {recipe?.description || 'A delicious recipe waiting for you!'}
        </p>
        <button 
          onClick={() => router.push(`/recipe/${encodeURIComponent(recipe?.title || 'featured')}`)}
          className="view-recipe-btn px-10 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl w-fit text-base md:text-lg animate-fade-in-up delay-300 hover:scale-105"
        >
          VIEW RECIPE
        </button>
      </div>
    </section>
  );
}
