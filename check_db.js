import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1]
const envKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(envUrl, envKey)

async function check() {
  const { data, error } = await supabase.from('branding').select('business_name, menu_data, featured_photos, app_config').limit(1)
  console.log(JSON.stringify(data, null, 2))
}
check()
