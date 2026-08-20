// netlify/functions/stripe-webhook.js
// Listens for Stripe subscription events and updates premium status in Supabase.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lsgtujvneyouihoivgyy.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook error: ${err.message}` };
  }

  const session = stripeEvent.data.object;

  switch (stripeEvent.type) {
    // Payment succeeded — unlock premium
    case 'checkout.session.completed':
    case 'invoice.payment_succeeded': {
      const customerId = session.customer;
      const email = session.customer_email || session.customer_details?.email;
      if (email) {
        // Find user by email and mark premium
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();
        if (profile) {
          await supabase
            .from('profiles')
            .update({
              is_premium: true,
              premium_source: 'stripe',
              stripe_customer_id: customerId
            })
            .eq('id', profile.id);
        }
      }
      break;
    }

    // Subscription cancelled or payment failed — revoke premium
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const customerId = session.customer;
      await supabase
        .from('profiles')
        .update({ is_premium: false })
        .eq('stripe_customer_id', customerId);
      break;
    }

    default:
      // Ignore other events
      break;
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
