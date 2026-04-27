// Edge Function: Analyse qualité photo de ménage via Claude Vision
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { image_base64, room_name, prompt } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 requis" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Appel API Claude avec vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: image_base64 },
            },
            {
              type: "text",
              text: prompt || `Analyse cette photo de la pièce "${room_name}" après un ménage. Score sur 10. Réponds en JSON: { "score": 8, "status": "ok", "details": "...", "issues": [] }`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: "Claude API error: " + err }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiText = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ response: aiText }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
