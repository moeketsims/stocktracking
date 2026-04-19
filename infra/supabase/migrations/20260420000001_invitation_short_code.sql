-- Universal in-person invite codes.
--
-- Adds a short, easy-to-read alphanumeric code alongside the existing long
-- token on user_invitations. Managers read this code to recipients (in
-- person, via WhatsApp, SMS, etc.) so the recipient never has to handle a
-- magic-link email — they just type the code on the login screen.
--
-- Alphabet excludes ambiguous chars (0/O/1/I/L) to make it phone-friendly.
-- Length 6 → 31^6 ≈ 887M combinations, plenty for our usage with 7-day TTL.

ALTER TABLE public.user_invitations
    ADD COLUMN IF NOT EXISTS short_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invitations_short_code
    ON public.user_invitations (short_code)
    WHERE short_code IS NOT NULL;

-- Backfill: generate a short_code for every still-redeemable invitation so
-- managers can immediately surface codes for already-pending invites.
DO $$
DECLARE
    inv RECORD;
    candidate text;
    alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    i int;
    attempts int;
BEGIN
    FOR inv IN
        SELECT id FROM public.user_invitations
        WHERE short_code IS NULL
          AND accepted_at IS NULL
          AND cancelled_at IS NULL
          AND expires_at > now()
    LOOP
        attempts := 0;
        LOOP
            candidate := '';
            FOR i IN 1..6 LOOP
                candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
            END LOOP;
            BEGIN
                UPDATE public.user_invitations
                   SET short_code = candidate
                 WHERE id = inv.id;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                attempts := attempts + 1;
                IF attempts > 5 THEN
                    EXIT; -- give up; row stays code-less, manager can resend
                END IF;
            END;
        END LOOP;
    END LOOP;
END $$;
