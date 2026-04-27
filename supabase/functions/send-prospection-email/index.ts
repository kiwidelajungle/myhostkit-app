// ============================================================
// Edge Function: send-prospection-email
// 
// Reçoit une demande de mise en relation depuis l'app cleaner :
// 1. Vérifie l'authentification (JWT de l'agent)
// 2. Récupère le cleaner_id depuis auth.uid()
// 3. Insère la ligne dans public.prospection_requests
// 4. Envoie un email à myhostkit.contact@gmail.com via Resend
// 5. Retourne 200 OK avec l'id de la demande
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ProspectionPayload {
  city: string;
  radius_km: number;
  pricing_mode: "hourly" | "surface";
  price: number;
  available_from: string;
  volume: string;
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ====== 1. Récupérer le JWT de l'agent ======
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== 2. Initialiser Supabase avec le JWT de l'utilisateur ======
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Récupérer l'utilisateur authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== 3. Récupérer le cleaner_id ======
    const { data: cleaner, error: cleanerError } = await supabase
      .from("cleaners")
      .select("id, full_name, email, phone")
      .eq("user_id", user.id)
      .single();

    if (cleanerError || !cleaner) {
      return new Response(
        JSON.stringify({ error: "Cleaner profile not found", details: cleanerError?.message }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== 4. Parser et valider le payload ======
    const payload: ProspectionPayload = await req.json();

    if (!payload.city || !payload.price || !payload.available_from) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["hourly", "surface"].includes(payload.pricing_mode)) {
      return new Response(
        JSON.stringify({ error: "Invalid pricing_mode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== 5. Insérer dans prospection_requests ======
    const { data: insertedRow, error: insertError } = await supabase
      .from("prospection_requests")
      .insert({
        cleaner_id: cleaner.id,
        city: payload.city,
        radius_km: payload.radius_km,
        pricing_mode: payload.pricing_mode,
        price: payload.price,
        available_from: payload.available_from,
        volume: payload.volume,
        status: "new",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save request", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== 6. Envoyer l'email via Resend ======
    const resendApiKey = Deno.env.get("RESEND_PROSPECTION_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_PROSPECTION_API_KEY not set - skipping email");
      return new Response(
        JSON.stringify({ ok: true, request_id: insertedRow.id, email_sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceLabel = payload.pricing_mode === "hourly"
      ? `${payload.price}€ / heure`
      : `${payload.price}€ / m²`;

    const emailHtml = `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #F5EFE6;">
        <div style="background: #0A1F3D; color: #B89B6E; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-family: Georgia, serif;">🎯 Nouvelle demande de prospection</h1>
        </div>
        
        <div style="background: white; padding: 24px; border-radius: 12px;">
          <h2 style="color: #0A1F3D; margin-top: 0;">Détails de la demande</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">📍 Ville :</td><td style="padding: 8px 0; color: #0A1F3D; font-weight: 600;">${payload.city}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">📏 Rayon :</td><td style="padding: 8px 0; color: #0A1F3D;">${payload.radius_km} km</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">💰 Tarif :</td><td style="padding: 8px 0; color: #0A1F3D; font-weight: 600;">${priceLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">📅 Disponible :</td><td style="padding: 8px 0; color: #0A1F3D;">${payload.available_from}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">⏱ Volume :</td><td style="padding: 8px 0; color: #0A1F3D;">${payload.volume} missions/sem</td></tr>
          </table>
          
          <hr style="border: none; border-top: 1px solid #B89B6E33; margin: 24px 0;">
          
          <h3 style="color: #0A1F3D;">👤 Agent demandeur</h3>
          <p style="margin: 4px 0;"><strong>Nom :</strong> ${cleaner.full_name || "(non renseigné)"}</p>
          <p style="margin: 4px 0;"><strong>Email :</strong> ${cleaner.email || "(non renseigné)"}</p>
          <p style="margin: 4px 0;"><strong>Téléphone :</strong> ${cleaner.phone || "(non renseigné)"}</p>
          <p style="margin: 4px 0; color: #888; font-size: 13px;">cleaner_id : ${cleaner.id}</p>
          
          <hr style="border: none; border-top: 1px solid #B89B6E33; margin: 24px 0;">
          
          <p style="color: #888; font-size: 13px; margin: 0;">
            ID demande : ${insertedRow.id}<br>
            Reçue le : ${new Date(insertedRow.created_at).toLocaleString("fr-FR")}
          </p>
        </div>
        
        <p style="text-align: center; color: #888; font-size: 13px; margin-top: 24px;">
          ⏱ À traiter sous 48-72h<br>
          MyHostKit · Conciergerie Airbnb tout-en-un
        </p>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MyHostKit <noreply@app.myhostkit.com>",
        to: ["myhostkit.contact@gmail.com"],
        subject: `🎯 Nouvelle demande de prospection - ${payload.city}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();
    
    if (!emailRes.ok) {
      console.error("Resend error:", emailResult);
      // La demande est sauvegardée, juste l'email a échoué — on retourne quand même un succès
      return new Response(
        JSON.stringify({ 
          ok: true, 
          request_id: insertedRow.id, 
          email_sent: false,
          email_error: emailResult 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        request_id: insertedRow.id, 
        email_sent: true,
        email_id: emailResult.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});