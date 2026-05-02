import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a waste classification assistant. Analyze the provided image and identify ALL waste items visible.

Respond ONLY with a valid JSON object — no markdown, no explanation, no backticks. Use this exact shape:

{
  "scan_type": "single" or "multi",
  "items": [
    {
      "name": "string — short item name (e.g. 'Plastic Bottle')",
      "category": "one of: recyclable | compostable | hazardous | landfill | upcyclable",
      "material": "string — primary material (e.g. 'PET Plastic', 'Glass', 'Cardboard')",
      "confidence": number between 0 and 1,
      "disposal_steps": ["step 1", "step 2", "step 3"],
      "upcycle_ideas": ["idea 1", "idea 2"],
      "co2_saved_kg": number,
      "water_saved_liters": number
    }
  ]
}

If multiple distinct waste items are visible, include each as a separate entry in items[].
Set scan_type to "multi" if more than one item is present, otherwise "single".`;

const baseCredits: Record<string, number> = {
  recyclable: 10,
  compostable: 8,
  hazardous: 15,
  landfill: 2,
  upcyclable: 12,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 1024,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: image },
              },
              {
                type: "text",
                text: "Identify and classify all waste items in this image. Return JSON only.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleanContent);
    let items = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : [parsed]);
    items = items.slice(0, 5).map((it: any) => ({
      name: it.name || "Unknown item",
      category: (it.category || "landfill").toLowerCase(),
      material: it.material || "Unknown",
      confidence: Math.round(Number(it.confidence) || 70),
      disposal_steps: Array.isArray(it.disposal_steps) ? it.disposal_steps.slice(0, 3) : ["Dispose of properly"],
      upcycle_ideas: Array.isArray(it.upcycle_ideas) ? it.upcycle_ideas.slice(0, 2) : [],
      co2_saved_kg: Number(it.co2_saved_kg) || 0,
      water_saved_liters: Number(it.water_saved_liters) || 0,
    }));

    const total_credits = items.reduce((sum: number, it: any) => sum + (baseCredits[it.category] ?? 2), 0);

    return new Response(JSON.stringify({
      items,
      total_credits,
      scan_type: items.length > 1 ? "multi" : "single",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-waste error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
