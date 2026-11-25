import { sitio } from "../_lib/planes.js";
import { firmaStripe, leerSesion, traducirSesion } from "../_lib/stripe.js";
import { entregar } from "../_lib/entrega.js";

// Stripe avisa aquí cuando se paga con tarjeta y cuando se acredita un pago en OXXO.
export async function onRequestPost({ request, env }) {
  const cuerpo = await request.text();
  if (!(await firmaStripe(env, cuerpo, request.headers.get("stripe-signature"))))
    return new Response("firma inválida", { status: 400 });
  let ev; try { ev = JSON.parse(cuerpo); } catch { return new Response("json", { status: 400 }); }
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(ev.type))
    return new Response("ignorado");
  try {
    const s = await leerSesion(env, ev.data.object.id); // volvemos a consultar con nuestra llave
    if (!s) return new Response("no existe");
    const r = await entregar(env, sitio(env, request), traducirSesion(s));
    return new Response(r.licencia ? "entregado" : `estado ${r.estado}`);
  } catch (e) {
    console.error("webhook-stripe", e);
    if (e.name === "PagoInvalido") return new Response("pago no válido");
    return new Response("error", { status: 500 }); // Stripe reintenta
  }
}
