import { sitio, json } from "../_lib/planes.js";
import { leerPago, traducirPago } from "../_lib/mercadopago.js";
import { leerSesion, traducirSesion } from "../_lib/stripe.js";
import { leerYCobrar } from "../_lib/paypal.js";
import { entregar, publico } from "../_lib/entrega.js";

// La página de "gracias" pregunta aquí si el pago ya quedó, para mostrar
// el link y la licencia en pantalla (además del correo).
// En PayPal, aquí mismo se hace el cobro cuando el cliente regresa.
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const metodo = u.searchParams.get("metodo") || "mp";
  const id = (u.searchParams.get("pago") || "").replace(/[^\w-]/g, "").slice(0, 120);
  const ref = u.searchParams.get("ref") || "";
  if (!ref) return json({ estado: "sin_datos" }, 400);

  if (metodo === "spei") {
    const clave = await env.VENTAS.get(`ref:${ref}`);
    const r = clave && (await env.VENTAS.get(clave, "json"));
    return json(r ? publico(r) : { estado: "pending" });
  }
  if (!id || !["mp", "stripe", "paypal"].includes(metodo)) return json({ estado: "sin_datos" }, 400);

  const ya = await env.VENTAS.get(`pago:${metodo}:${id}`, "json");
  if (ya) return ya.ref === ref ? json(publico(ya)) : json({ estado: "no_coincide" }, 403);

  try {
    let v = null;
    if (metodo === "mp") { const p = await leerPago(env, id); v = p && traducirPago(p); }
    if (metodo === "stripe") { const s = await leerSesion(env, id); v = s && traducirSesion(s); }
    if (metodo === "paypal") v = await leerYCobrar(env, id);
    if (!v || v.ref !== ref) return json({ estado: "no_coincide" }, 403);
    const r = await entregar(env, sitio(env, request), v);
    return json(r.licencia ? publico(r) : { estado: r.estado });
  } catch (e) {
    console.error("estado", metodo, e);
    return json({ estado: "error" }, 500);
  }
}
