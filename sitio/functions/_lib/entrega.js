import { PLANES } from "./planes.js";
import { nuevaLicencia } from "./licencia.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const METODOS = { mp: "Mercado Pago", stripe: "Stripe (tarjeta u OXXO)", paypal: "PayPal", spei: "Transferencia SPEI" };

// Revisa que el pago sea real y completo, crea la licencia y manda el correo.
// Se puede llamar varias veces con el mismo pago: solo entrega una vez.
// "v" es el pago ya traducido por cada método (ver mercadopago.js, stripe.js, paypal.js):
//   { metodo, id, ref, aprobado, estado, monto, moneda, plan?, correo?, nombre? }
export async function entregar(env, sitioUrl, v) {
  const id = String(v.id);
  const clave = `pago:${v.metodo}:${id}`;
  const ya = await env.VENTAS.get(clave, "json");
  if (ya) return { ...ya, nuevo: false };

  if (!v.aprobado) return { estado: v.estado || "pendiente" };

  const ref = v.ref || "";
  const pedido = (ref && (await env.VENTAS.get(`pedido:${ref}`, "json"))) || {};
  const planId = pedido.plan || v.plan;
  const plan = PLANES[planId];
  const invalido = (m) => Object.assign(new Error(m), { name: "PagoInvalido" });
  if (!plan) throw invalido(`Pago ${v.metodo} ${id}: plan desconocido (${planId})`);
  if (String(v.moneda).toUpperCase() !== "MXN" || Number(v.monto) + 0.001 < plan.precio)
    throw invalido(`Pago ${v.metodo} ${id}: monto ${v.monto} ${v.moneda} no cubre el plan ${planId}`);

  const correo = pedido.correo || v.correo;
  const nombre = pedido.nombre || v.nombre || "";
  const licencia = await nuevaLicencia(env.LICENSE_SECRET, plan.letra, `${v.metodo}:${id}`);
  const registro = {
    estado: "approved", metodo: v.metodo, pago: id, ref, plan: planId, correo, nombre, licencia,
    monto: Number(v.monto), fecha: new Date().toISOString(),
    app: env.APP_URL, manual: `${sitioUrl}/api/manual?lic=${licencia}`,
  };

  await env.VENTAS.put(clave, JSON.stringify(registro));
  if (ref) await env.VENTAS.put(`ref:${ref}`, clave);
  await env.VENTAS.put(`lic:${licencia}`, JSON.stringify({
    plan: planId, correo, nombre, metodo: v.metodo, pago: id, fecha: registro.fecha, dispositivos: plan.dispositivos,
  }));

  try {
    await mandarCorreo(env, {
      to: correo,
      subject: `Tu app Kaja está lista (plan ${planId[0].toUpperCase() + planId.slice(1)})`,
      html: correoCliente(env, registro, plan),
    });
    registro.correoEnviado = true;
  } catch (e) {
    registro.correoEnviado = false;
    registro.errorCorreo = String(e.message || e).slice(0, 300);
    await env.VENTAS.put(clave, JSON.stringify(registro));
  }

  if (env.ADMIN_EMAIL) {
    await mandarCorreo(env, {
      to: env.ADMIN_EMAIL,
      subject: `💰 Nueva venta: plan ${planId} $${registro.monto} MXN (${METODOS[v.metodo]})`,
      html: `<p><b>${esc(nombre)}</b> (${esc(correo)}) compró el plan <b>${esc(planId)}</b> por $${esc(registro.monto)} MXN con <b>${esc(METODOS[v.metodo])}</b>.</p>
<p>Licencia: <b>${esc(licencia)}</b><br>Folio del pago: ${esc(id)}<br>
Correo al cliente: ${registro.correoEnviado ? "enviado ✅" : "FALLÓ ❌ " + esc(registro.errorCorreo)}</p>`,
    }).catch(() => {});
  }
  return { ...registro, nuevo: true };
}

// Lo que la página de "gracias" puede ver (nada privado de más).
export const publico = (r) => ({ estado: "approved", plan: r.plan, licencia: r.licencia, app: r.app, manual: r.manual, correo: r.correo });

// Guarda el pedido antes de mandar al cliente a pagar.
export function validarPedido(d) {
  const plan = PLANES[d.plan];
  const nombre = String(d.nombre || "").trim().slice(0, 80);
  const correo = String(d.correo || "").trim().toLowerCase().slice(0, 120);
  if (!plan) return { error: "Elige un plan." };
  if (nombre.length < 2) return { error: "Escribe tu nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { error: "Revisa tu correo." };
  return { plan, planId: d.plan, nombre, correo };
}

export async function guardarPedido(env, ref, datos) {
  await env.VENTAS.put(`pedido:${ref}`, JSON.stringify({ ...datos, creado: new Date().toISOString() }),
    { expirationTtl: 60 * 60 * 24 * 45 });
}

export async function mandarCorreo(env, { to, subject, html }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM, to: [to], subject, html,
      reply_to: env.REPLY_TO || undefined,
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

function correoCliente(env, r, plan) {
  const wa = env.SOPORTE_WHATSAPP ? `https://wa.me/${env.SOPORTE_WHATSAPP}` : null;
  const boton = (href, txt, fondo, color) =>
    `<a href="${esc(href)}" style="display:inline-block;background:${fondo};color:${color};text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:99px">${txt}</a>`;
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f3efe4;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0e1c30">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0b1a2e;padding:28px 28px 24px;text-align:center">
  <div style="color:#f3d77a;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Kaja</div>
  <div style="color:#ffffff;font-size:24px;font-weight:800;margin-top:8px">¡Gracias por tu compra${r.nombre ? ", " + esc(r.nombre.split(" ")[0]) : ""}!</div>
  <div style="color:#c9d3e3;font-size:15px;margin-top:6px">${esc(plan.nombre)} · pago único</div>
</td></tr>
<tr><td style="padding:28px">
  <p style="margin:0 0 16px;font-size:16px">Tu app ya está lista. Ábrela desde tu celular con este botón:</p>
  <p style="text-align:center;margin:0 0 24px">${boton(r.app, "Abrir mi app", "#c9a227", "#1a1405")}</p>
  <div style="background:#faf7ef;border:1px solid #e6e1d3;border-radius:14px;padding:16px;text-align:center;margin-bottom:24px">
    <div style="font-size:13px;color:#5b6576">Tu código de licencia</div>
    <div style="font-size:24px;font-weight:800;letter-spacing:.06em;font-family:Menlo,Consolas,monospace;margin-top:4px">${esc(r.licencia)}</div>
    <div style="font-size:13px;color:#5b6576;margin-top:4px">Guárdalo. Válido para ${plan.dispositivos} dispositivos.</div>
  </div>
  <p style="font-weight:700;margin:0 0 8px">Cómo instalarla en tu celular</p>
  <p style="margin:0 0 6px;font-size:15px"><b>iPhone:</b> abre el link en <b>Safari</b>, toca el botón Compartir (el cuadrito con flecha) y elige <b>"Agregar a pantalla de inicio"</b>.</p>
  <p style="margin:0 0 20px;font-size:15px"><b>Android:</b> abre el link en <b>Chrome</b>, toca el menú (⋮) y elige <b>"Instalar app"</b> o "Agregar a pantalla principal".</p>
  <p style="text-align:center;margin:0 0 24px">${boton(r.manual, "Descargar manual de uso (PDF)", "#0b1a2e", "#ffffff")}</p>
  <p style="font-size:14px;color:#5b6576;margin:0">¿Dudas? ${wa ? `Escríbenos por <a href="${esc(wa)}" style="color:#1d3a6b">WhatsApp</a> o r` : "R"}esponde a este correo y te ayudamos.</p>
</td></tr>
<tr><td style="background:#faf7ef;padding:16px 28px;font-size:12px;color:#5b6576">
  Folio de pago: ${esc(r.pago)} (${esc(METODOS[r.metodo] || "")}) · Este correo se envió automáticamente porque compraste Kaja.
  Tus datos no se comparten con nadie. Consulta nuestro aviso de privacidad en el sitio.
</td></tr></table></td></tr></table></body></html>`;
}
