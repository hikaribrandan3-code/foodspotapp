-- Add is_template flag to branding table
ALTER TABLE branding ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- Create index for quick template lookup
CREATE INDEX IF NOT EXISTS idx_branding_is_template ON branding(is_template) WHERE is_template = TRUE;
