import { PLANES, sitio, json } from "../_lib/planes.js";
import { crearPreferencia } from "../_lib/mercadopago.js";

// El cliente elige plan y pone su correo → creamos el cobro en Mercado Pago
export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
  const plan = PLANES[d.plan];
  const nombre = String(d.nombre || "").trim().slice(0, 80);
  const correo = String(d.correo || "").trim().toLowerCase().slice(0, 120);
  if (!plan) return json({ error: "Elige un plan." }, 400);
  if (nombre.length < 2) return json({ error: "Escribe tu nombre." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return json({ error: "Revisa tu correo." }, 400);

  const base = sitio(env, request);
  const ref = crypto.randomUUID();
  await env.VENTAS.put(`pedido:${ref}`, JSON.stringify({
    plan: d.plan, nombre, correo, creado: new Date().toISOString(),
  }), { expirationTtl: 60 * 60 * 24 * 45 });

  try {
    const pref = await crearPreferencia(env, {
      items: [{ id: d.plan, title: plan.nombre, description: "Licencia de por vida, pago único",
        category_id: "services", quantity: 1, currency_id: "MXN", unit_price: plan.precio }],
      payer: { name: nombre, email: correo },
      external_reference: ref,
      metadata: { plan: d.plan, correo, nombre },
      back_urls: {
        success: `${base}/gracias.html`, pending: `${base}/gracias.html`, failure: `${base}/gracias.html`,
      },
      auto_return: "approved",
      notification_url: `${base}/api/webhook`,
      statement_descriptor: "KAJA",
      binary_mode: false,
    });
    const url = env.MP_SANDBOX === "1" ? (pref.sandbox_init_point || pref.init_point) : pref.init_point;
    return json({ url });
  } catch (e) {
    console.error(e);
    return json({ error: "No pudimos abrir el pago en este momento. Intenta de nuevo en un minuto." }, 502);
  }
}
