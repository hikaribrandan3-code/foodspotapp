import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const envUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1]
const envKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(envUrl, envKey)

async function check() {
  const { data, error } = await supabase.from('branding').select('slug, business_name, menu_data, featured_photos').order('updated_at', { ascending: false }).limit(2)
  if (error) console.error(error)
  else {
    data.forEach(d => {
        console.log("SLUG:", d.slug)
        console.log("MENU_DATA Exists?:", !!d.menu_data)
        if (d.menu_data && d.menu_data.categories) {
            console.log("  Categories:", d.menu_data.categories.length)
            if (d.menu_data.categories[0]) {
              console.log("  First category:", d.menu_data.categories[0].name)
              console.log("  First item:", d.menu_data.categories[0].items[0]?.name)
            }
        }
    })
  }
}
check()
