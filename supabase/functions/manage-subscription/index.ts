import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16' });
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// URLs de redirection — page web qui redirige vers l'app
const SUCCESS_BASE = 'https://myhostkit.com/payment-redirect?status=success';
const CANCEL_BASE = 'https://myhostkit.com/payment-redirect?status=cancel';

const PRICES: Record<string, string> = {
  starter: 'price_1THs2c1Dfb6RH0ekrCYH3Dxv',
  pro: 'price_1THs391Dfb6RH0ekGje7g0Sa',
  cleaner_pro: 'price_1TNGn91Dfb6RH0ekltsawo5x',
  cleaner_business: 'price_1TNGni1Dfb6RH0ekX0yFiDru',
};

serve(async (req: Request) => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, plan, user_id, booking_id, amount, commission, cleaner_stripe_account, description } = body;

    // 1. Créer un abonnement
    if (action === 'create' && plan && PRICES[plan]) {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: PRICES[plan], quantity: 1 }],
        success_url: SUCCESS_BASE + '&plan=' + plan,
        cancel_url: CANCEL_BASE,
        metadata: { plan, user_id: user_id || '' },
      });
      return new Response(JSON.stringify({ url: session.url }), { headers: corsHeaders });
    }

    // 2. Paiement unique (ménage)
    if (action === 'checkout' && amount) {
      const sessionParams: any = {
        mode: 'payment',
        line_items: [{ price_data: { currency: 'eur', product_data: { name: description || 'Prestation menage MyHostKit' }, unit_amount: amount }, quantity: 1 }],
        success_url: SUCCESS_BASE + '&booking=' + (booking_id || ''),
        cancel_url: CANCEL_BASE,
        metadata: { booking_id: booking_id || '', commission: commission || 0 },
      };
      // Stripe Connect — transfert vers la ménagère
      if (cleaner_stripe_account) {
        sessionParams.payment_intent_data = {
          application_fee_amount: commission || 0,
          transfer_data: { destination: cleaner_stripe_account },
        };
      }
      const session = await stripe.checkout.sessions.create(sessionParams);
      return new Response(JSON.stringify({ url: session.url }), { headers: corsHeaders });
    }

    // 3. Stripe Connect — onboarding ménagère
    if (action === 'connect') {
      const account = await stripe.accounts.create({ type: 'express', country: 'FR', capabilities: { card_payments: { requested: true }, transfers: { requested: true } } });
      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: CANCEL_BASE,
        return_url: SUCCESS_BASE + '&connect=true',
        type: 'account_onboarding',
      });
      return new Response(JSON.stringify({ url: link.url, account_id: account.id }), { headers: corsHeaders });
    }

    // 4. Portail de gestion
    if (action === 'manage' && user_id) {
      const customers = await stripe.customers.list({ limit: 1 });
      if (customers.data.length) {
        const portal = await stripe.billingPortal.sessions.create({
          customer: customers.data[0].id,
          return_url: SUCCESS_BASE,
        });
        return new Response(JSON.stringify({ url: portal.url }), { headers: corsHeaders });
      }
    }

    // 5. Vérifier si un paiement a été effectué (après retour du navigateur)
    if (action === 'verify_payment' && body.session_url) {
      try {
        // Extraire le session ID de l'URL Stripe
        const urlParts = body.session_url.split('/');
        const sessionId = urlParts[urlParts.length - 1]?.split('#')[0]?.split('?')[0];
        
        if (sessionId && sessionId.startsWith('cs_')) {
          const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
          const paid = checkoutSession.payment_status === 'paid';
          return new Response(JSON.stringify({ paid, status: checkoutSession.payment_status }), { headers: corsHeaders });
        }
        
        // Si on ne peut pas extraire le session ID, lister les sessions récentes
        const sessions = await stripe.checkout.sessions.list({ limit: 1 });
        if (sessions.data.length > 0) {
          const latest = sessions.data[0];
          const paid = latest.payment_status === 'paid' && (Date.now() - new Date(latest.created * 1000).getTime()) < 300000; // < 5 min
          return new Response(JSON.stringify({ paid, status: latest.payment_status }), { headers: corsHeaders });
        }
        
        return new Response(JSON.stringify({ paid: false, status: 'unknown' }), { headers: corsHeaders });
      } catch (verifyErr: any) {
        return new Response(JSON.stringify({ paid: false, error: verifyErr.message }), { headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: 'Action inconnue ou paramètres manquants' }), { status: 400, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
