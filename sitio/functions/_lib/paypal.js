// PayPal: el cliente paga con su cuenta PayPal o con tarjeta. El dinero llega a tu saldo PayPal
// y de ahí lo pasas a tu banco.
const base = (env) => (env.PAYPAL_SANDBOX === "1" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com");

async function token(env) {
  const r = await fetch(`${base(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`PayPal token ${r.status}`);
  return (await r.json()).access_token;
}

async function llamar(env, metodo, ruta, datos, idem) {
  const h = { Authorization: `Bearer ${await token(env)}`, "Content-Type": "application/json" };
  if (idem) h["PayPal-Request-Id"] = idem;
  const r = await fetch(base(env) + ruta, { method: metodo, headers: h, body: datos ? JSON.stringify(datos) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 404) return null;
  if (!r.ok && !(r.status === 422 && j?.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED"))
    throw new Error(`PayPal ${r.status}: ${j?.details?.[0]?.issue || j?.message || ""}`.slice(0, 300));
  return j;
}

export async function crearOrden(env, { planId, plan, ref, base: sitioUrl }) {
  const o = await llamar(env, "POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{ reference_id: planId, custom_id: ref, invoice_id: ref, description: plan.nombre,
      amount: { currency_code: "MXN", value: plan.precio.toFixed(2) } }],
    payment_source: { paypal: { experience_context: {
      brand_name: "Kaja", locale: "es-MX", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW",
      return_url: `${sitioUrl}/gracias.html?metodo=paypal&ref=${ref}`, cancel_url: `${sitioUrl}/#precios` } } },
  }, ref);
  const link = (o.links || []).find((l) => l.rel === "payer-action" || l.rel === "approve");
  if (!link) throw new Error("PayPal no devolvió link de pago");
  return link.href;
}

// Lee la orden y, si el cliente ya la aprobó, cobra (captura). Devuelve el pago traducido.
export async function leerYCobrar(env, id) {
  let o = await llamar(env, "GET", `/v2/checkout/orders/${encodeURIComponent(id)}`);
  if (!o) return null;
  if (o.status === "APPROVED") o = (await llamar(env, "POST", `/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {}, `cap-${id}`)) || o;
  if (o.status === "APPROVED" || (o.name === "UNPROCESSABLE_ENTITY")) o = await llamar(env, "GET", `/v2/checkout/orders/${encodeURIComponent(id)}`);
  const pu = o.purchase_units?.[0] || {};
  const cap = pu.payments?.captures?.[0];
  return {
    metodo: "paypal", id: o.id, ref: pu.custom_id, plan: pu.reference_id,
    aprobado: o.status === "COMPLETED" && cap?.status === "COMPLETED",
    estado: o.status === "COMPLETED" ? (cap?.status === "COMPLETED" ? "approved" : "pending")
      : o.status === "VOIDED" ? "cancelled" : "pending",
    monto: cap?.amount?.value ?? pu.amount?.value, moneda: cap?.amount?.currency_code ?? pu.amount?.currency_code,
    correo: o.payer?.email_address, nombre: o.payer?.name?.given_name,
  };
}
