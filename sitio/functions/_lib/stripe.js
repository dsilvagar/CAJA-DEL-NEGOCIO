// Stripe: tarjeta de crédito/débito y OXXO. Deposita a tu cuenta bancaria (CLABE).
const API = "https://api.stripe.com/v1";

function form(obj, pre = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = pre ? `${pre}[${k}]` : k;
    if (typeof v === "object") form(v, key, out); else out.append(key, String(v));
  }
  return out;
}

async function llamar(env, metodo, ruta, datos, idem) {
  const h = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  if (datos) h["Content-Type"] = "application/x-www-form-urlencoded";
  if (idem) h["Idempotency-Key"] = idem;
  const r = await fetch(API + ruta, { method: metodo, headers: h, body: datos ? form(datos).toString() : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${j?.error?.message || ""}`.slice(0, 300));
  return j;
}

export function crearSesion(env, { planId, plan, ref, correo, base }) {
  return llamar(env, "POST", "/checkout/sessions", {
    mode: "payment",
    payment_method_types: { 0: "card", 1: "oxxo" },
    line_items: { 0: { quantity: 1, price_data: { currency: "mxn", unit_amount: Math.round(plan.precio * 100),
      product_data: { name: plan.nombre, description: "Licencia de por vida, pago único" } } } },
    customer_email: correo,
    client_reference_id: ref,
    metadata: { plan: planId, ref },
    payment_intent_data: { metadata: { plan: planId, ref } },
    payment_method_options: { oxxo: { expires_after_days: 3 } },
    locale: "es-419",
    success_url: `${base}/gracias.html?metodo=stripe&pago={CHECKOUT_SESSION_ID}&ref=${ref}`,
    cancel_url: `${base}/#precios`,
  }, ref);
}

export const leerSesion = (env, id) => llamar(env, "GET", `/checkout/sessions/${encodeURIComponent(id)}`);

export const traducirSesion = (s) => ({
  metodo: "stripe", id: s.id, ref: s.client_reference_id || s.metadata?.ref,
  aprobado: s.payment_status === "paid",
  estado: s.payment_status === "paid" ? "approved" : s.status === "expired" ? "cancelled" : "pending",
  monto: (s.amount_total || 0) / 100, moneda: s.currency, plan: s.metadata?.plan,
  correo: s.customer_details?.email || s.customer_email, nombre: s.customer_details?.name,
});

// Firma del aviso de Stripe (header Stripe-Signature: "t=...,v1=...")
export async function firmaStripe(env, cuerpo, header) {
  if (!env.STRIPE_WEBHOOK_SECRET) return false;
  const partes = {};
  for (const p of String(header || "").split(",")) { const [k, v] = p.split("="); (partes[k] ||= []).push(v); }
  const t = partes.t?.[0];
  if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${cuerpo}`)));
  const hex = Array.from(s, (b) => b.toString(16).padStart(2, "0")).join("");
  return (partes.v1 || []).includes(hex);
}
