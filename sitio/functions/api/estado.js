import { sitio, json } from "../_lib/planes.js";
import { leerPago } from "../_lib/mercadopago.js";
import { entregar } from "../_lib/entrega.js";

// La página de "gracias" pregunta aquí si el pago ya quedó, para mostrar
// el link y la licencia en pantalla (además del correo).
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const id = (u.searchParams.get("pago") || "").replace(/\D/g, "");
  const ref = u.searchParams.get("ref") || "";
  if (!id || !ref) return json({ estado: "sin_datos" }, 400);

  const publico = (r) => ({ estado: "approved", plan: r.plan, licencia: r.licencia, app: r.app, manual: r.manual, correo: r.correo });
  const ya = await env.VENTAS.get(`pago:${id}`, "json");
  if (ya) return ya.ref === ref ? json(publico(ya)) : json({ estado: "no_coincide" }, 403);

  try {
    const pago = await leerPago(env, id);
    if (!pago || pago.external_reference !== ref) return json({ estado: "no_coincide" }, 403);
    const r = await entregar(env, sitio(env, request), pago);
    return json(r.licencia ? publico(r) : { estado: r.estado });
  } catch (e) {
    console.error("estado", e);
    return json({ estado: "error" }, 500);
  }
}
