/* 
# Ensure user_id on meal_slots for RLS

1. Changes
  - Adds `user_id` column to `meal_slots` if it doesn't exist.
  - Links `user_id` to `auth.users` with cascading delete.
  - Enables Row Level Security (RLS) on the table.
  - Adds a policy to allow users to manage only their own meal slots.

2. Security
  - RLS is enabled to prevent cross-user data access.
  - Policy uses `auth.uid()` to verify the owner.
*/

DO $$ 
BEGIN 
    -- 1. Add user_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meal_slots' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.meal_slots ADD COLUMN user_id UUID REFERENCES auth.users ON DELETE CASCADE;
    END IF;

    -- 2. Ensure RLS is enabled
    ALTER TABLE public.meal_slots ENABLE ROW LEVEL SECURITY;

    -- 3. Create or Update Policy
    -- We drop first to ensure we are applying the latest logic
    DROP POLICY IF EXISTS "Users can CRUD own meal slots" ON public.meal_slots;
    
    CREATE POLICY "Users can CRUD own meal slots" ON public.meal_slots
    FOR ALL 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

END $$;