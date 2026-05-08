import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface SignupPayload {
  user_id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const payload: SignupPayload = await req.json();
    const { user_id, email } = payload;

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or email" }),
        { status: 400 }
      );
    }

    // 1. CHECK: Does this user already have a business?
    const { data: existingBusiness } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user_id)
      .limit(1)
      .single();

    if (existingBusiness) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "User already has a business",
          business_id: existingBusiness.id,
        }),
        { status: 200 }
      );
    }

    // 2. CREATE DEMO BUSINESS
    const businessName = `My Restaurant`;
    const businessSlug = `tenant-${user_id.substring(0, 8)}`;

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        name: businessName,
        slug: businessSlug,
        owner_id: user_id,
      })
      .select("id")
      .single();

    if (businessError || !business) {
      console.error("Business creation failed:", businessError);
      return new Response(
        JSON.stringify({ error: "Failed to create business" }),
        { status: 500 }
      );
    }

    const businessId = business.id;

    // 3. CREATE DEFAULT BRANDING
    const defaultConfig = {
      theme: "light",
      primary_color: "#10B981",
      currency: "ARS",
      language: "es",
      timezone: "America/Argentina/Cordoba",
      business_type: "restaurant",
    };

    const { error: brandingError } = await supabase
      .from("branding")
      .insert({
        business_id: businessId,
        slug: businessSlug,
        app_config: defaultConfig,
      });

    if (brandingError) {
      console.error("Branding creation failed:", brandingError);
      // Don't fail — continue with business
    }

    // 4. CREATE DEMO CATEGORIES
    const categories = [
      { name: "Entrantes", sort_order: 0 },
      { name: "Platos Principales", sort_order: 1 },
      { name: "Bebidas", sort_order: 2 },
      { name: "Postres", sort_order: 3 },
    ];

    const { data: createdCategories, error: categoryError } = await supabase
      .from("categories")
      .insert(
        categories.map((cat) => ({
          ...cat,
          business_id: businessId,
        }))
      )
      .select("id, name");

    if (categoryError) {
      console.error("Category creation failed:", categoryError);
    }

    // 5. CREATE DEMO MENU ITEMS (use first category)
    const firstCategoryId = createdCategories?.[0]?.id;

    if (firstCategoryId) {
      const menuItems = [
        {
          name: "Demo Hamburguesa",
          price: 1500, // 15 ARS in cents
          description: "Ejemplo de menú - Edítalo en Settings",
          category_id: firstCategoryId,
          available: true,
        },
        {
          name: "Demo Pizza",
          price: 2000,
          description: "Otro ejemplo - Personaliza tu menú",
          category_id: firstCategoryId,
          available: true,
        },
      ];

      const { error: menuError } = await supabase
        .from("menu_items")
        .insert(
          menuItems.map((item) => ({
            ...item,
            business_id: businessId,
          }))
        );

      if (menuError) {
        console.error("Menu creation failed:", menuError);
      }
    }

    // 6. CREATE DEMO EVENT (optional)
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 7); // Next week

    const { error: eventError } = await supabase
      .from("events")
      .insert({
        business_id: businessId,
        name: "Evento Demo - FoodSpot",
        description: "Tu primer evento de demostración",
        start_date: eventDate.toISOString(),
        status: "draft",
        tiers: JSON.stringify([
          { name: "General", price: 2000, capacity: 100 },
        ]),
      });

    if (eventError) {
      console.error("Event creation failed:", eventError);
    }

    // 7. RETURN SUCCESS
    return new Response(
      JSON.stringify({
        success: true,
        business_id: businessId,
        business_slug: businessSlug,
        message: "Demo tenant created successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
