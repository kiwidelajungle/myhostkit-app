// Edge Function: Créer une session Stripe Checkout avec split Connect
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { booking_id, amount, commission, cleaner_stripe_account, description, customer_email } = await req.json();

    const sessionParams: any = {
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: description || "Prestation ménage MyHostKit" },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      metadata: { booking_id },
      success_url: "https://myhostkit.com/payment-success?booking_id=" + booking_id,
      cancel_url: "https://myhostkit.com/payment-cancel",
    };

    if (customer_email) sessionParams.customer_email = customer_email;

    // Si la ménagère a un compte Connect, faire un split
    if (cleaner_stripe_account) {
      sessionParams.payment_intent_data = {
        application_fee_amount: commission, // Commission MyHostKit en centimes
        transfer_data: { destination: cleaner_stripe_account },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
