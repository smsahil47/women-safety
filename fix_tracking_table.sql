-- ================================================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- Step 1: Add missing GPS columns to tracking_sessions
ALTER TABLE public.tracking_sessions
    ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION;

-- Step 2: Drop old restrictive policy
DROP POLICY IF EXISTS "Users can manage their own tracking sessions" ON public.tracking_sessions;

-- Step 3: Recreate — owner can do everything
CREATE POLICY "Users can manage their own tracking sessions"
    ON public.tracking_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Step 4: Allow anyone to READ a session by ID (needed for the SMS link page)
DROP POLICY IF EXISTS "Public can view tracking sessions" ON public.tracking_sessions;
CREATE POLICY "Public can view tracking sessions"
    ON public.tracking_sessions FOR SELECT
    USING (TRUE);
