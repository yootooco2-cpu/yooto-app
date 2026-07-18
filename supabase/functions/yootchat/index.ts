import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const INSTRUCTIONS = `
Rôle : Tu es YootChat, l'assistant local de YOOTOO.
Objectif : répondre en français au besoin immédiat de l'utilisateur et recommander au maximum trois commerces parmi les candidats fournis.
Priorités : pertinence, proximité, ouverture connue, qualité des données, caractère local et engagements officiellement prouvés.
Contraintes :
- Utilise uniquement les candidats fournis et conserve exactement leurs identifiants.
- N'invente jamais un commerce, un horaire, une accessibilité, une distance, un engagement ou une information absente.
- Une valeur nulle signifie « information inconnue », jamais « non ».
- Ne garantis jamais l'accessibilité PMR sans preuve.
- Si aucun candidat ne répond réellement au besoin, dis-le clairement et pose au plus une question utile.
- Explique brièvement la recommandation sans révéler de raisonnement interne détaillé.
- Ne montre jamais un score interne brut.
Style : chaleureux, direct et utile, sans discours commercial.
`.trim();

type Geo = { latitude: number; longitude: number };
type Row = {
  id: number | string; name: string | null; category: string | null;
  merchant_type: string | null; accroche: string | null; specialite: string | null;
  city: string | null; address: string | null; latitude: number | null;
  longitude: number | null; opening_hours: unknown; eco_score_v2: number | null;
  google_rating: number | null; photo_url: string | null; cover_photo_url: string | null;
  phone: string | null; website: string | null; est_ess: boolean | null;
  est_bio: boolean | null; presentation_score: number | null;
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });

function plain(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function requestTokens(message: string): string[] {
  const expanded = plain(message)
    .replace(/cles?|porte bloquee|porte claquee/g, " serrurier ")
    .replace(/medicaments?|ordonnance/g, " pharmacie ")
    .replace(/manger|dejeuner|diner|repas/g, " restaurant ")
    .replace(/pain|baguette|croissant/g, " boulangerie ")
    .replace(/producteurs?|circuit court/g, " producteur local ");
  return [...new Set(expanded.split(/[^a-z0-9]+/).filter((x) => x.length >= 3))];
}

function distanceKm(a: Geo, b: Geo): number {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function openNow(raw: unknown): boolean | null {
  if (raw && typeof raw === "object" && "open_now" in raw) {
    const value = (raw as { open_now?: unknown }).open_now;
    return typeof value === "boolean" ? value : null;
  }
  return null;
}

function publishableKey(): string | null {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (typeof keys?.default === "string") return keys.default;
  } catch { /* legacy key below */ }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? null;
}

function outputText(payload: any): string | null {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: HEADERS });
  if (req.method !== "POST") return respond({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("yootchat") ?? Deno.env.get("YOOTCHAT");
    if (!apiKey) return respond({ error: "YOOTCHAT_NOT_CONFIGURED" }, 503);

    const body = await req.json().catch(() => null);
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 800) {
      return respond({ error: "INVALID_MESSAGE", message: "Le message doit contenir entre 1 et 800 caractères." }, 400);
    }

    const rawGeo = body?.location;
    const geo: Geo | null =
      Number.isFinite(rawGeo?.latitude) && Number.isFinite(rawGeo?.longitude) &&
      Math.abs(rawGeo.latitude) <= 90 && Math.abs(rawGeo.longitude) <= 180
        ? { latitude: rawGeo.latitude, longitude: rawGeo.longitude }
        : null;
    const radius = Math.min(30, Math.max(1, Number(body?.radius_km) || 10));
    const city = typeof body?.city === "string" ? body.city.trim().slice(0, 100) : "";

    const url = Deno.env.get("SUPABASE_URL");
    const publicKey = publishableKey();
    if (!url || !publicKey) return respond({ error: "SUPABASE_NOT_CONFIGURED" }, 503);

    const authorization = req.headers.get("Authorization") ?? "";
    const supabase = createClient(url, publicKey, {
      global: authorization ? { headers: { Authorization: authorization } } : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase.from("merchants")
      .select("id,name,category,merchant_type,accroche,specialite,city,address,latitude,longitude,opening_hours,eco_score_v2,google_rating,photo_url,cover_photo_url,phone,website,est_ess,est_bio,presentation_score")
      .eq("is_active", true).eq("status", "active")
      .not("latitude", "is", null).not("longitude", "is", null)
      .limit(geo ? 600 : 250);

    if (geo) {
      const lat = radius / 111;
      const lon = radius / Math.max(20, 111 * Math.cos(geo.latitude * Math.PI / 180));
      query = query.gte("latitude", geo.latitude - lat).lte("latitude", geo.latitude + lat)
        .gte("longitude", geo.longitude - lon).lte("longitude", geo.longitude + lon);
    } else if (city) {
      query = query.ilike("city", city);
    }

    const { data, error } = await query;
    if (error) {
      console.error("YOOTCHAT_MERCHANT_QUERY_FAILED", error.code);
      return respond({ error: "MERCHANT_SEARCH_FAILED" }, 502);
    }

    const wanted = requestTokens(message);
    const ranked = ((data ?? []) as Row[]).map((merchant) => {
      const coordinates = typeof merchant.latitude === "number" && typeof merchant.longitude === "number"
        ? { latitude: merchant.latitude, longitude: merchant.longitude } : null;
      const km = geo && coordinates ? distanceKm(geo, coordinates) : null;
      const haystack = plain([merchant.name, merchant.category, merchant.merchant_type,
        merchant.accroche, merchant.specialite, merchant.city].join(" "));
      const lexical = wanted.reduce((n, token) => n + (haystack.includes(token) ? 1 : 0), 0);
      return { merchant, km, lexical };
    }).filter((x) => x.km === null || x.km <= radius);

    const lexical = [...ranked].filter((x) => x.lexical > 0)
      .sort((a, b) => b.lexical - a.lexical || (a.km ?? 999) - (b.km ?? 999)).slice(0, 25);
    const nearest = [...ranked].sort((a, b) => (a.km ?? 999) - (b.km ?? 999)).slice(0, 15);
    const unique = new Map<string, typeof ranked[number]>();
    [...lexical, ...nearest].forEach((x) => unique.set(String(x.merchant.id), x));
    const shortlist = [...unique.values()].slice(0, 40);

    if (!shortlist.length) {
      return respond({
        answer: "Je n’ai trouvé aucun commerce actif correspondant dans cette zone.",
        recommendations: [],
        follow_up: geo || city ? "Souhaites-tu élargir la zone de recherche ?" : "Dans quelle ville dois-je chercher ?",
        confidence: "low",
      });
    }

    const candidates = shortlist.map(({ merchant, km }) => ({
      id: String(merchant.id), name: merchant.name, category: merchant.category,
      merchant_type: merchant.merchant_type,
      description: merchant.accroche || merchant.specialite || null,
      city: merchant.city, address: merchant.address,
      distance_km: km === null ? null : Number(km.toFixed(2)),
      open_now: openNow(merchant.opening_hours), rating: merchant.google_rating,
      eco_score: merchant.eco_score_v2,
      official_commitments: {
        ess: merchant.est_ess === true ? true : null,
        bio: merchant.est_bio === true ? true : null,
      },
      data_completeness: merchant.presentation_score,
    }));

    const model = Deno.env.get("YOOTCHAT_MODEL") || "gpt-5.6-terra";
    const openai = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model, reasoning: { effort: "low" }, store: false, max_output_tokens: 900,
        instructions: INSTRUCTIONS,
        input: JSON.stringify({
          user_request: message,
          search_context: { location_available: Boolean(geo), city: city || null, radius_km: geo ? radius : null },
          candidates,
        }),
        text: { format: {
          type: "json_schema", name: "yootchat_answer", strict: true,
          schema: {
            type: "object", additionalProperties: false,
            properties: {
              answer: { type: "string" },
              recommendations: { type: "array", maxItems: 3, items: {
                type: "object", additionalProperties: false,
                properties: { merchant_id: { type: "string" }, reason: { type: "string" } },
                required: ["merchant_id", "reason"],
              }},
              follow_up: { type: ["string", "null"] },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["answer", "recommendations", "follow_up", "confidence"],
          },
        }},
      }),
    });

    if (!openai.ok) {
      const requestId = openai.headers.get("x-request-id");
      const upstream = await openai.json().catch(() => ({}));
      const upstreamCode = typeof upstream?.error?.code === "string" ? upstream.error.code : null;
      console.error("YOOTCHAT_OPENAI_FAILED", openai.status, upstreamCode, requestId);
      return respond({ error: "AI_TEMPORARILY_UNAVAILABLE", request_id: requestId }, 502);
    }

    const raw = await openai.json();
    const text = outputText(raw);
    if (!text) return respond({ error: "INVALID_AI_RESPONSE" }, 502);
    const answer = JSON.parse(text);
    const byId = new Map(shortlist.map((x) => [String(x.merchant.id), x]));

    const recommendations = (Array.isArray(answer.recommendations) ? answer.recommendations : [])
      .map((rec: any) => {
        const id = String(rec?.merchant_id ?? "");
        const hit = byId.get(id);
        if (!hit) return null;
        const m = hit.merchant;
        return {
          merchant_id: id, reason: String(rec?.reason ?? ""),
          merchant: {
            id, name: m.name, category: m.category, merchant_type: m.merchant_type,
            city: m.city, address: m.address,
            distance_km: hit.km === null ? null : Number(hit.km.toFixed(2)),
            open_now: openNow(m.opening_hours), rating: m.google_rating,
            photo_url: m.cover_photo_url || m.photo_url, phone: m.phone, website: m.website,
          },
        };
      }).filter(Boolean);

    return respond({
      answer: String(answer.answer ?? ""), recommendations,
      follow_up: typeof answer.follow_up === "string" ? answer.follow_up : null,
      confidence: ["low", "medium", "high"].includes(answer.confidence) ? answer.confidence : "low",
      meta: { model, candidates_considered: shortlist.length, grounded: true },
    });
  } catch (error) {
    console.error("YOOTCHAT_UNHANDLED", error instanceof Error ? error.message : "unknown");
    return respond({ error: "INTERNAL_ERROR" }, 500);
  }
});
