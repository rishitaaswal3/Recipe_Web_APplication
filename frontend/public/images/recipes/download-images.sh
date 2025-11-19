#!/bin/bash

# Script to download recipe images from Unsplash
# Run this script to automatically get all 8 recipe images

cd "$(dirname "$0")"

echo "📥 Downloading recipe images from Unsplash..."
echo ""

# Featured Recipes
echo "⭐ Downloading Butter Chicken..."
curl -L "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&h=600&fit=crop" -o butter-chicken.jpg

echo "⭐ Downloading Butter Paneer..."
curl -L "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&h=600&fit=crop" -o butter-paneer.jpg

# Latest Recipes
echo "🔥 Downloading Paneer Tikka..."
curl -L "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&h=600&fit=crop" -o paneer-tikka.jpg

echo "🔥 Downloading Biryani..."
curl -L "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&h=600&fit=crop" -o biryani.jpg

echo "🔥 Downloading Palak Paneer..."
curl -L "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&h=600&fit=crop" -o palak-paneer.jpg

echo "🔥 Downloading Masala Dosa..."
curl -L "https://images.unsplash.com/photo-1630383249896-424e482df921?w=800&h=600&fit=crop" -o masala-dosa.jpg

echo "🔥 Downloading Chole Bhature..."
curl -L "https://images.unsplash.com/photo-1626132647523-66f2bf380c9e?w=800&h=600&fit=crop" -o chole-bhature.jpg

echo "🔥 Downloading Gulab Jamun..."
curl -L "https://images.unsplash.com/photo-1589301773859-cb96e5b4c9d4?w=800&h=600&fit=crop" -o gulab-jamun.jpg

echo ""
echo "✅ All images downloaded successfully!"
echo "📁 Location: $(pwd)"
echo ""
ls -lh *.jpg 2>/dev/null || echo "Checking downloaded files..."
