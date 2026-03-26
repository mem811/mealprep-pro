/* 
# Initial MealPrep Pro Schema
1. New Tables
  - `profiles`: User subscription and basic info
  - `recipes`: Stored culinary creations
  - `meal_slots`: Specific planned meals for the calendar
2. Security
  - Enable RLS on all tables
  - Add policies for user-specific data access
*/

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  plan TEXT DEFAULT 'free',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Recipes Table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  servings INTEGER DEFAULT 2,
  ingredients JSONB DEFAULT '[]'::jsonb,
  instructions TEXT,
  image_url TEXT,
  source_url TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  nutrition JSONB DEFAULT '{"calories": 0, "protein": 0, "carbs": 0, "fat": 0}'::jsonb,
  favorited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own recipes" ON public.recipes FOR ALL USING (auth.uid() = user_id);

-- Meal Slots Table
CREATE TABLE IF NOT EXISTS public.meal_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  slot TEXT NOT NULL, -- Breakfast, Lunch, Dinner, Snacks
  recipe_id UUID REFERENCES public.recipes ON DELETE CASCADE NOT NULL,
  servings_multiplier DECIMAL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.meal_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own meal slots" ON public.meal_slots FOR ALL USING (auth.uid() = user_id);