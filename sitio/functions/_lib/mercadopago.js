const API = "https://api.mercadopago.com";

export async function crearPreferencia(env, pref) {
  const r = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": pref.external_reference,
    },
    body: JSON.stringify(pref),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago preferencia ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j;
}

export async function leerPago(env, id) {
  const r = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Mercado Pago pago ${r.status}`);
  return r.json();
}

// Firma del webhook (header x-signature: "ts=...,v1=...").
// Plantilla de Mercado Pago: id:[data.id];request-id:[x-request-id];ts:[ts];
export async function firmaValida(env, request, dataId) {
  if (!env.MP_WEBHOOK_SECRET) return true; // sin secreto configurado no se valida (el pago igual se confirma con la API)
  const h = request.headers.get("x-signature") || "";
  const partes = Object.fromEntries(h.split(",").map((p) => p.trim().split("=").map((s) => s.trim())));
  const ts = partes.ts, v1 = partes.v1;
  if (!ts || !v1) return false;
  const reqId = request.headers.get("x-request-id");
  let manifest = "";
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? String(dataId).toLowerCase() : dataId};`;
  if (reqId) manifest += `request-id:${reqId};`;
  manifest += `ts:${ts};`;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.MP_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(manifest)));
  const hex = Array.from(s, (b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

// Traduce un pago de Mercado Pago al formato común de entrega.js
export const traducirPago = (p) => ({
  metodo: "mp", id: p.id, ref: p.external_reference, aprobado: p.status === "approved", estado: p.status,
  monto: p.transaction_amount, moneda: p.currency_id, plan: p.metadata?.plan,
  correo: p.metadata?.correo || p.payer?.email, nombre: p.metadata?.nombre || p.payer?.first_name,
});
