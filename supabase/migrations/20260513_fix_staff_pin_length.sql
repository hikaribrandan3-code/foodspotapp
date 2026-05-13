-- Fix staff PIN hash length
-- simpleHash() produces 8-10 character hex strings, but pin was VARCHAR(4)
-- This caused: "value too long for type character varying(4)"

ALTER TABLE public.staff
ALTER COLUMN pin TYPE TEXT;
