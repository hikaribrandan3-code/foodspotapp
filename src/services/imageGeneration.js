/**
 * FoodSpot AI Image Generation Service
 * 
 * Tiers:
 * - Free: 20 images/week via GPT Image 1 Mini ($0.005/img)
 * - Pro: Unlimited via Imagen 4 ($0.02/img) or Nano Banana ($0.05/img)
 */

import { supabase } from '../lib/supabaseClient';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Image generation providers
const PROVIDERS = {
  mini: {
    name: 'GPT Image 1 Mini',
    url: 'https://api.openai.com/v1/images/generations',
    model: 'gpt-image-1-mini',
    costPerImage: 0.005,
    quality: 'low' // or 'high' for $0.036
  },
  imagen: {
    name: 'Imagen 4 Fast',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4-fast:generateContent',
    costPerImage: 0.02,
    quality: 'fast'
  },
  nano: {
    name: 'Nano Banana Pro',
    url: 'https://api.apiyi.com/v1/images/generations', // via APIYI
    model: 'gemini-3-pro-image',
    costPerImage: 0.05,
    quality: 'premium'
  }
};

const FREE_TIER_WEEKLY_LIMIT = 20;

/**
 * Generate marketing image for a business
 * @param {string} businessId - Tenant ID
 * @param {string} prompt - Image description
 * @param {object} options - { tier: 'free'|'pro', provider: 'imagen'|'nano' }
 */
export async function generateMarketingImage(businessId, prompt, options = {}) {
  const { tier = 'free', provider = 'mini' } = options;
  
  // 1. Check weekly usage for free tier
  if (tier === 'free') {
    const usage = await getWeeklyUsage(businessId);
    if (usage >= FREE_TIER_WEEKLY_LIMIT) {
      return { 
        error: 'FREE_TIER_EXCEEDED',
        message: '20 images/week limit reached. Upgrade to Pro for unlimited.',
        upgradeUrl: '/owner/billing'
      };
    }
  }
  
  // 2. Generate image
  const startTime = Date.now();
  const result = await callProvider(provider, prompt);
  
  if (result.error) {
    return result;
  }
  
  // 3. Log usage for billing tracking
  await logImageGeneration(businessId, {
    provider,
    cost: PROVIDERS[provider].costPerImage,
    prompt: prompt.slice(0, 100), // Truncate for privacy
    duration: Date.now() - startTime,
    tier
  });
  
  // 4. Update weekly counter (free tier only)
  if (tier === 'free') {
    await incrementWeeklyUsage(businessId);
  }
  
  return {
    url: result.url,
    provider: PROVIDERS[provider].name,
    cost: tier === 'free' ? 0 : PROVIDERS[provider].costPerImage
  };
}

/**
 * Call specific provider API
 */
async function callProvider(provider, prompt) {
  const config = PROVIDERS[provider];
  
  switch (provider) {
    case 'mini':
      return callOpenAI(prompt, config);
    case 'imagen':
      return callImagen(prompt, config);
    case 'nano':
      return callNanoBanana(prompt, config);
    default:
      return { error: 'UNKNOWN_PROVIDER' };
  }
}

/**
 * GPT Image 1 Mini via OpenAI
 */
async function callOpenAI(prompt, config) {
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        prompt: `Marketing image for food business: ${prompt}`,
        n: 1,
        size: '1024x1024',
        quality: 'low' // $0.005 per image
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return { error: 'OPENAI_ERROR', message: data.error.message };
    }
    
    return { url: data.data[0].url };
  } catch (err) {
    return { error: 'NETWORK_ERROR', message: err.message };
  }
}

/**
 * Imagen 4 via Google (placeholder - needs Vertex AI setup)
 */
async function callImagen(prompt, config) {
  // Requires Google Cloud project + Vertex AI enabled
  // Implementation depends on your GCP setup
  return { error: 'NOT_IMPLEMENTED', message: 'Imagen 4 requires GCP setup' };
}

/**
 * Nano Banana Pro via APIYI (placeholder)
 */
async function callNanoBanana(prompt, config) {
  // Requires APIYI API key
  return { error: 'NOT_IMPLEMENTED', message: 'Nano Banana requires APIYI key' };
}

/**
 * Get weekly usage count for a business
 */
async function getWeeklyUsage(businessId) {
  const weekStart = getWeekStart();
  const cacheKey = `img_usage_${businessId}_${weekStart}`;
  
  // Check Supabase first
  const { data, error } = await supabase
    .from('image_usage')
    .select('count')
    .eq('business_id', businessId)
    .eq('week_start', weekStart)
    .single();
  
  if (error || !data) return 0;
  return data.count;
}

/**
 * Increment weekly usage counter
 */
async function incrementWeeklyUsage(businessId) {
  const weekStart = getWeekStart();
  
  const { error } = await supabase.rpc('increment_image_usage', {
    p_business_id: businessId,
    p_week_start: weekStart
  });
  
  if (error) {
    console.error('Failed to increment usage:', error);
  }
}

/**
 * Log generation for admin dashboard
 */
async function logImageGeneration(businessId, details) {
  const { error } = await supabase
    .from('image_generation_logs')
    .insert({
      business_id: businessId,
      provider: details.provider,
      cost_usd: details.cost,
      prompt_preview: details.prompt,
      duration_ms: details.duration,
      tier: details.tier,
      created_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Failed to log generation:', error);
  }
}

/**
 * Get Monday of current week (UTC)
 */
function getWeekStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setUTCDate(diff));
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * Get usage stats for dashboard
 */
export async function getImageStats(businessId) {
  const weekStart = getWeekStart();
  
  const { data: usage } = await supabase
    .from('image_usage')
    .select('count')
    .eq('business_id', businessId)
    .eq('week_start', weekStart)
    .single();
  
  const { data: monthlyCost } = await supabase
    .from('image_generation_logs')
    .select('cost_usd')
    .eq('business_id', businessId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  
  const totalCost = monthlyCost?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0;
  
  return {
    usedThisWeek: usage?.count || 0,
    limit: FREE_TIER_WEEKLY_LIMIT,
    remaining: Math.max(0, FREE_TIER_WEEKLY_LIMIT - (usage?.count || 0)),
    monthlyCost: totalCost.toFixed(2)
  };
}

export { PROVIDERS, FREE_TIER_WEEKLY_LIMIT };
