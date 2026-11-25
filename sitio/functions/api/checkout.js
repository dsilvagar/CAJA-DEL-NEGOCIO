import { sitio, json } from "../_lib/planes.js";
import { crearPreferencia } from "../_lib/mercadopago.js";
import { crearSesion } from "../_lib/stripe.js";
import { crearOrden } from "../_lib/paypal.js";
import { validarPedido, guardarPedido } from "../_lib/entrega.js";
import { pedidoSpei } from "../_lib/spei.js";
import { metodosActivos } from "./metodos.js";

// El cliente elige plan, pone su correo y elige cómo pagar → lo mandamos a pagar.
export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "Datos inválidos." }, 400); }
  if (!env.VENTAS) {
    console.error("Falta el KV VENTAS en Cloudflare (Settings → Bindings)");
    return json({ error: "La tienda todavía se está configurando. Escríbenos por WhatsApp y te atendemos." }, 503);
  }
  const v = validarPedido(d);
  if (v.error) return json({ error: v.error }, 400);
  const metodo = d.metodo || "mp";
  if (!metodosActivos(env).includes(metodo)) return json({ error: "Esa forma de pago no está disponible por ahora. Elige otra." }, 400);

  const base = sitio(env, request);
  try {
    if (metodo === "spei") return json({ spei: await pedidoSpei(env, base, v) });

    const ref = crypto.randomUUID();
    await guardarPedido(env, ref, { plan: v.planId, nombre: v.nombre, correo: v.correo, metodo });

    if (metodo === "stripe") {
      const s = await crearSesion(env, { planId: v.planId, plan: v.plan, ref, correo: v.correo, base });
      return json({ url: s.url });
    }
    if (metodo === "paypal") {
      return json({ url: await crearOrden(env, { planId: v.planId, plan: v.plan, ref, base }) });
    }
    const pref = await crearPreferencia(env, {
      items: [{ id: v.planId, title: v.plan.nombre, description: "Licencia de por vida, pago único",
        category_id: "services", quantity: 1, currency_id: "MXN", unit_price: v.plan.precio }],
      payer: { name: v.nombre, email: v.correo },
      external_reference: ref,
      metadata: { plan: v.planId, correo: v.correo, nombre: v.nombre },
      back_urls: {
        success: `${base}/gracias.html?metodo=mp`, pending: `${base}/gracias.html?metodo=mp`, failure: `${base}/gracias.html?metodo=mp`,
      },
      auto_return: "approved",
      notification_url: `${base}/api/webhook`,
      statement_descriptor: "KAJA",
      binary_mode: false,
    });
    return json({ url: env.MP_SANDBOX === "1" ? (pref.sandbox_init_point || pref.init_point) : pref.init_point });
  } catch (e) {
    console.error("checkout", metodo, e);
    return json({ error: "No pudimos abrir el pago en este momento. Intenta de nuevo en un minuto o elige otra forma de pago." }, 502);
  }
}
