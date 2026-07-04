import React from 'react'
import { createRoot } from 'react-dom/client'
import './preview.css'
import CoffeeCafeTemplate from './templates/coffee-cafe/CoffeeCafeTemplate.jsx'
import BurgerQsrTemplate from './templates/burger-qsr/BurgerQsrTemplate.jsx'
import BakeryTemplate from './templates/bakery/BakeryTemplate.jsx'

// Standalone preview harness — no Supabase, no TenantContext, no auth.
// Pick a template via ?template=coffee-cafe (defaults to coffee-cafe).
// Add new templates to this map as they're built.
const TEMPLATES = {
  'coffee-cafe': CoffeeCafeTemplate,
  'burger-qsr': BurgerQsrTemplate,
  'bakery': BakeryTemplate,
}

const templateId = new URLSearchParams(window.location.search).get('template') || 'coffee-cafe'
const Template = TEMPLATES[templateId] || CoffeeCafeTemplate

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Template />
  </React.StrictMode>
)
