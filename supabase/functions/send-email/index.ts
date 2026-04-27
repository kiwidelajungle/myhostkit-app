// Edge Function: Envoi d'email via Resend (ou autre provider)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { to, cc, subject, body, html } = await req.json();

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "to et subject requis" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (RESEND_API_KEY) {
      // Envoi via Resend
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "MyHostKit <noreply@myhostkit.com>",
          to: [to],
          cc: cc ? [cc] : undefined,
          subject,
          text: body,
          html: html || undefined,
        }),
      });

      if (response.ok) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      const err = await response.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Pas de provider email configuré
    return new Response(JSON.stringify({ success: false, message: "Email provider non configuré" }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
