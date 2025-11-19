# Recipe Images Location Guide

## 📁 Place Your Images Here

This folder contains all recipe images for the application.

### Required Images:

#### Featured Recipes (Auto-rotating every 2 minutes):
1. **butter-chicken.jpg** - Butter Chicken featured recipe
2. **butter-paneer.jpg** - Butter Paneer featured recipe

#### Latest Recipes (6 cards):
3. **paneer-tikka.jpg** - Paneer Tikka (Appetizer)
4. **biryani.jpg** - Biryani (Main Course)
5. **palak-paneer.jpg** - Palak Paneer (Main Course)
6. **masala-dosa.jpg** - Masala Dosa (Breakfast)
7. **chole-bhature.jpg** - Chole Bhature (Main Course)
8. **gulab-jamun.jpg** - Gulab Jamun (Dessert)

### Image Specifications:
- **Format:** JPG, PNG, or WebP
- **Recommended Size:** 800x600 pixels (landscape orientation)
- **Max File Size:** 500KB for optimal loading
- **Aspect Ratio:** 4:3 or 16:9

### Current File Structure:
```
my-next-app/
  public/
    images/
      recipes/
        butter-chicken.jpg          ← Add your image here
        butter-paneer.jpg           ← Add your image here
        paneer-tikka.jpg            ← Add your image here
        biryani.jpg                 ← Add your image here
        palak-paneer.jpg            ← Add your image here
        masala-dosa.jpg             ← Add your image here
        chole-bhature.jpg           ← Add your image here
        gulab-jamun.jpg             ← Add your image here
```

### How It Works:
- **Featured Recipe**: Automatically rotates between Butter Chicken and Butter Paneer every 2 minutes
- **Latest Recipes**: Shows 6 static cards with the images you provide
- Images are loaded from the local `/images/recipes/` folder for faster loading

### Fallback:
If an image is missing, the app will show a gray placeholder with the recipe name.
