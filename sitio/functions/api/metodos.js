import { json } from "../_lib/planes.js";

// Solo se muestran las formas de pago que ya tienen sus llaves cargadas en Cloudflare.
export function metodosActivos(env) {
  const m = [];
  if (env.STRIPE_SECRET_KEY) m.push("stripe");
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET) m.push("paypal");
  if (env.MP_ACCESS_TOKEN) m.push("mp");
  if (env.SPEI_CLABE) m.push("spei");
  return m;
}

export const onRequestGet = ({ env }) => json({ metodos: metodosActivos(env) });
