CREATE TABLE IF NOT EXISTS public.push_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token text NOT NULL,
    platform text DEFAULT 'unknown',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens" ON public.push_tokens
    FOR ALL USING (auth.uid() = user_id);
