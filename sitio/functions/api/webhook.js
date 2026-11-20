import { sitio } from "../_lib/planes.js";
import { leerPago, firmaValida } from "../_lib/mercadopago.js";
import { entregar } from "../_lib/entrega.js";

// Mercado Pago avisa aquí cada vez que un pago se crea o cambia.
// Nunca confiamos en lo que trae el aviso: volvemos a consultar el pago con nuestra llave.
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  let body = {};
  try { body = await request.json(); } catch {}
  const tipo = url.searchParams.get("type") || url.searchParams.get("topic") || body.type || body.topic;
  const id = url.searchParams.get("data.id") || url.searchParams.get("id") || body?.data?.id;
  if (tipo !== "payment" || !id) return new Response("ignorado", { status: 200 });

  if (!(await firmaValida(env, request, url.searchParams.get("data.id") || String(id))))
    return new Response("firma inválida", { status: 401 });

  try {
    const pago = await leerPago(env, id);
    if (!pago) return new Response("no existe", { status: 200 });
    const r = await entregar(env, sitio(env, request), pago);
    return new Response(r.licencia ? "entregado" : `estado ${r.estado}`, { status: 200 });
  } catch (e) {
    console.error("webhook", e);
    if (e.name === "PagoInvalido") return new Response("pago no válido", { status: 200 }); // no reintentar
    return new Response("error", { status: 500 }); // Mercado Pago reintenta más tarde
  }
}

export const onRequestGet = () => new Response("ok");
