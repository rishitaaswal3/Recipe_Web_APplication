'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';

interface IngredientSearchBarProps {
  onSearch: (ingredients: string[]) => void;
  isSearching: boolean;
}

// Common non-edible items and invalid inputs
const NON_EDIBLE_ITEMS = [
  'chair', 'table', 'phone', 'computer', 'laptop', 'pen', 'pencil', 'paper',
  'book', 'car', 'bike', 'shoe', 'clothes', 'shirt', 'pants', 'hat',
  'plastic', 'metal', 'wood', 'glass', 'stone', 'rock', 'sand', 'dirt',
  'phone', 'television', 'tv', 'computer', 'mouse', 'keyboard', 'screen',
  'wallet', 'purse', 'bag', 'backpack', 'bottle', 'cup', 'plate',
  'spoon', 'fork', 'knife', 'tool', 'hammer', 'nail', 'screw',
  'paint', 'brush', 'soap', 'shampoo', 'detergent', 'cleaner',
  'gasoline', 'fuel', 'oil', 'grease', 'chemical', 'poison',
  'medicine', 'pill', 'drug', 'alcohol', 'cigarette', 'tobacco'
];

// Common food-related keywords for validation
const FOOD_KEYWORDS = [
  'meat', 'chicken', 'beef', 'pork', 'fish', 'seafood', 'vegetable', 'fruit',
  'rice', 'wheat', 'flour', 'bread', 'pasta', 'noodle', 'cheese', 'milk',
  'butter', 'oil', 'spice', 'herb', 'sauce', 'curry', 'dal', 'lentil',
  'bean', 'pea', 'potato', 'tomato', 'onion', 'garlic', 'ginger'
];

export default function IngredientSearchBar({ onSearch, isSearching }: IngredientSearchBarProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [invalidItems, setInvalidItems] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    setExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Validate if an item is likely edible
  const isLikelyEdible = (item: string): boolean => {
    const lowerItem = item.toLowerCase().trim();
    
    // Check if it's a known non-edible item
    if (NON_EDIBLE_ITEMS.some(nonEdible => lowerItem.includes(nonEdible))) {
      return false;
    }
    
    // Check if it contains food-related keywords
    const seemsLikeFood = FOOD_KEYWORDS.some(keyword => lowerItem.includes(keyword));
    
    // Allow common single-word ingredients (length > 2 and alphabetic)
    const isSimpleWord = /^[a-z\s]+$/i.test(lowerItem) && lowerItem.length > 2;
    
    return seemsLikeFood || isSimpleWord;
  };

  const addIngredient = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // Check if ingredient already exists
    if (ingredients.includes(trimmedValue.toLowerCase())) {
      setWarning('This ingredient is already added!');
      setTimeout(() => setWarning(null), 3000);
      return;
    }

    // Validate if it's likely edible
    if (!isLikelyEdible(trimmedValue)) {
      setInvalidItems([...invalidItems, trimmedValue]);
      setWarning(`"${trimmedValue}" doesn't seem like a food ingredient. Please enter edible items only.`);
      setTimeout(() => {
        setWarning(null);
        setInvalidItems([]);
      }, 4000);
      setInputValue('');
      return;
    }

    // Add valid ingredient
    const newIngredients = [...ingredients, trimmedValue.toLowerCase()];
    setIngredients(newIngredients);
    setInputValue('');
    setWarning(null);
    inputRef.current?.focus();
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addIngredient();
      } else if (ingredients.length > 0) {
        handleSearch();
      }
    } else if (e.key === 'Backspace' && inputValue === '' && ingredients.length > 0) {
      // Remove last ingredient when backspace is pressed on empty input
      setIngredients(ingredients.slice(0, -1));
    }
  };

  const handleSearch = () => {
    if (ingredients.length > 0) {
      onSearch(ingredients);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Enhanced Search Input with Inline Tags */}
      <div className={`modern-search-wrapper${expanded ? ' expanded' : ''}${ingredients.length > 0 ? ' has-tags' : ''}`}>
        {/* Search Icon */}
        <button
          className="search-icon-btn"
          type="button"
          aria-label="Search"
          onClick={() => {
            if (!expanded) {
              handleIconClick();
            }
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 22L20 20"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Input Container with Tags */}
        <div className="input-tags-container">
          {/* Ingredient Tags Inside Search Bar */}
          {ingredients.map((ingredient, index) => (
            <span
              key={index}
              className="inline-ingredient-tag"
            >
              {ingredient}
              <button
                onClick={() => removeIngredient(index)}
                className="inline-remove-btn"
                aria-label={`Remove ${ingredient}`}
                type="button"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 3L3 9M3 3L9 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            className="modern-input"
            placeholder={ingredients.length === 0 ? "Add ingredients (e.g., tomato, cheese, pasta...)" : "Add more..."}
            aria-label="Add ingredients"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setExpanded(true)}
            onBlur={(e) => {
              // Don't collapse if clicking on a tag or the find button
              if (!e.relatedTarget?.closest('.modern-search-wrapper')) {
                if (!inputValue && ingredients.length === 0) {
                  setExpanded(false);
                }
              }
            }}
          />
        </div>

        {/* Find Button Inside Search Bar */}
        {ingredients.length > 0 && (
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="inline-find-btn"
            type="button"
            aria-label="Find recipes"
          >
            {isSearching ? (
              <svg
                className="animate-spin"
                width="16"
                height="16"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              "Find"
            )}
          </button>
        )}
      </div>

      {/* Warning Message */}
      {warning && (
        <div className="mt-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg backdrop-blur-sm animate-shake">
          <div className="flex items-center gap-2 text-red-200">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium">{warning}</p>
          </div>
        </div>
      )}
    </div>
  );
}
