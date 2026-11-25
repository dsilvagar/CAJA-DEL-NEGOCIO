import { json } from "../_lib/planes.js";
import { datosBanco } from "../_lib/spei.js";
import { clabeValida } from "../_lib/banco.js";

// Solo se muestran las formas de pago que ya tienen sus llaves cargadas en Cloudflare.
export function metodosActivos(env) {
  const m = [];
  if (!env.VENTAS) return m; // sin la base de ventas no se puede cobrar nada
  if (env.STRIPE_SECRET_KEY) m.push("stripe");
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_SECRET) m.push("paypal");
  if (env.MP_ACCESS_TOKEN) m.push("mp");
  // SPEI necesita una CLABE válida, el titular y alguien que confirme los pagos (ADMIN_EMAIL)
  // y que reciba los correos (RESEND_API_KEY).
  const b = datosBanco(env);
  if (clabeValida(b.clabe) && b.beneficiario && env.ADMIN_EMAIL && env.RESEND_API_KEY) m.push("spei");
  return m;
}

export const onRequestGet = ({ env }) => json({ metodos: metodosActivos(env) });
