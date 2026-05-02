import { supabase } from "@/integrations/supabase/client";

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

export interface ScanItem {
  name: string;
  category: "recyclable" | "compostable" | "hazardous" | "landfill" | "upcyclable";
  material: string;
  confidence: number;
  disposal_steps: string[];
  upcycle_ideas: string[];
  co2_saved_kg: number;
  water_saved_liters: number;
  credits_awarded: number;
  reduced_credits: boolean;
}

export interface MultiScanResult {
  items: ScanItem[];
  total_credits: number;
  scan_type: "single" | "multi";
}

function hashImage(b64: string): string {
  const len = b64.length;
  const head = b64.slice(0, 500);
  const tail = b64.slice(-500);
  return `${len}:${head.length}:${tail.length}:${btoa(head.slice(0, 80) + tail.slice(0, 80))}`;
}

async function callScanFunction(
  imageBase64: string
): Promise<{ items: any[]; scan_type: "single" | "multi" }> {
  const { data, error } = await supabase.functions.invoke<
    { items: any[]; scan_type: "single" | "multi"; total_credits?: number; error?: string }
  >("scan-waste", {
    body: JSON.stringify({ image: imageBase64 }),
  });

  if (error) {
    console.error("scan-waste function error:", error);
    throw new Error(error.message || "Scan service failed");
  }

  if (!data || ("error" in data && data.error)) {
    throw new Error((data as any)?.error || "Scan service returned no data");
  }

  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    throw new Error("No items detected");
  }

  return {
    items,
    scan_type: data.scan_type || (items.length > 1 ? "multi" : "single"),
  };
}

// ── Main export (all credits / dedup / streak logic unchanged) ───────────────
export async function scanWasteImage(imageBase64: string): Promise<MultiScanResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const imgHash = hashImage(imageBase64);

  // Dedup check: same hash within last 24h for this user
  if (user) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dup } = await supabase
      .from("scan_history")
      .select("id")
      .eq("user_id", user.id)
      .eq("image_hash", imgHash)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    if (dup) {
      throw new Error("You've already scanned this item today");
    }
  }

  // ── AI call via Supabase edge function `scan-waste` ────────
  const visionData = await callScanFunction(imageBase64);
  const items: any[] = visionData.items;
  const scanType: "single" | "multi" =
    visionData.scan_type || (items.length > 1 ? "multi" : "single");
  // ──────────────────────────────────────────────────────────────────────────

  const enriched: ScanItem[] = [];

  if (user) {
    // Time gate: count CC-earning scans per category in last 60min
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("scan_history")
      .select("category, credits_earned")
      .eq("user_id", user.id)
      .gte("created_at", sixtyMinAgo);

    const catCounts: Record<string, number> = {};
    (recent || []).forEach((r: any) => {
      if ((r.credits_earned ?? 0) > 0) {
        catCounts[r.category] = (catCounts[r.category] || 0) + 1;
      }
    });

    let totalAwarded = 0;

    for (const it of items) {
      const cat = String(it.category).toLowerCase();
      const base = baseCredits[cat] ?? 2;
      const count = catCounts[cat] || 0;
      const reduced = count >= 3;
      const credits = reduced ? 0 : base;
      catCounts[cat] = count + 1;
      totalAwarded += credits;

      try {
        await supabase.from("scan_history").insert({
          user_id: user.id,
          item_name: it.name,
          category: cat as any,
          disposal_method: (it.disposal_steps || []).join(" → "),
          material: it.material,
          carbon_saved: Number(it.co2_saved_kg) || 0,
          credits_earned: credits,
          image_hash: imgHash,
          reduced_credits: reduced,
          source: "scan",
        } as any);
      } catch (e) {
        console.warn("Save scan failed", e);
      }

      enriched.push({
        name: it.name,
        category: cat as any,
        material: it.material,
        confidence: it.confidence,
        disposal_steps: it.disposal_steps || [],
        upcycle_ideas: it.upcycle_ideas || [],
        co2_saved_kg: Number(it.co2_saved_kg) || 0,
        water_saved_liters: Number(it.water_saved_liters) || 0,
        credits_awarded: credits,
        reduced_credits: reduced,
      });
    }

    // Update carbon_credits once with totalAwarded
    if (totalAwarded > 0) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("carbon_credits")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (existing) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
          let newStreak = existing.current_streak;
          if (existing.last_scan_date === yesterday) newStreak += 1;
          else if (existing.last_scan_date !== today) newStreak = 1;

          const multiplier =
            newStreak >= 7 ? 3 : newStreak >= 5 ? 2 : newStreak >= 3 ? 1.5 : 1;
          const finalCredits = Math.round(totalAwarded * multiplier);

          await supabase
            .from("carbon_credits")
            .update({
              total_credits: existing.total_credits + finalCredits,
              current_streak: newStreak,
              longest_streak: Math.max(existing.longest_streak, newStreak),
              last_scan_date: today,
            })
            .eq("user_id", user.id);
        }
      } catch (e) {
        console.warn("credits update failed", e);
      }
    }

    return {
      items: enriched,
      total_credits: totalAwarded,
      scan_type: scanType,
    };
  }

  // No user — just return parsed items with base credits
  for (const it of items) {
    const cat = String(it.category).toLowerCase();
    enriched.push({
      name: it.name,
      category: cat as any,
      material: it.material,
      confidence: it.confidence,
      disposal_steps: it.disposal_steps || [],
      upcycle_ideas: it.upcycle_ideas || [],
      co2_saved_kg: Number(it.co2_saved_kg) || 0,
      water_saved_liters: Number(it.water_saved_liters) || 0,
      credits_awarded: baseCredits[cat] ?? 2,
      reduced_credits: false,
    });
  }

  return {
    items: enriched,
    total_credits: enriched.reduce((sum, i) => sum + i.credits_awarded, 0),
    scan_type: scanType,
  };
}