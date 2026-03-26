/* 
# Add Nutrition Data to Recipes
1. Changes
  - Add `nutrition` JSONB column to `recipes` table to store calories, protein, carbs, and fat.
2. Purpose
  - Allows storing and displaying nutritional information per recipe.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'nutrition'
  ) THEN 
    ALTER TABLE public.recipes ADD COLUMN nutrition JSONB DEFAULT '{"calories": 0, "protein": 0, "carbs": 0, "fat": 0}'::jsonb;
  END IF;
END $$;