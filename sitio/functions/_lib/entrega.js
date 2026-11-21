import { PLANES } from "./planes.js";
import { nuevaLicencia } from "./licencia.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Revisa que el pago sea real y completo, crea la licencia y manda el correo.
// Se puede llamar varias veces con el mismo pago: solo entrega una vez.
export async function entregar(env, sitioUrl, pago) {
  const id = String(pago.id);
  const ya = await env.VENTAS.get(`pago:${id}`, "json");
  if (ya) return { ...ya, nuevo: false };

  if (pago.status !== "approved") return { estado: pago.status || "pendiente" };

  const ref = pago.external_reference || "";
  const pedido = (ref && (await env.VENTAS.get(`pedido:${ref}`, "json"))) || {};
  const planId = pedido.plan || pago.metadata?.plan;
  const plan = PLANES[planId];
  const invalido = (m) => Object.assign(new Error(m), { name: "PagoInvalido" });
  if (!plan) throw invalido(`Pago ${id}: plan desconocido (${planId})`);
  if (pago.currency_id !== "MXN" || Number(pago.transaction_amount) + 0.001 < plan.precio)
    throw invalido(`Pago ${id}: monto ${pago.transaction_amount} ${pago.currency_id} no cubre el plan ${planId}`);

  const correo = pedido.correo || pago.metadata?.correo || pago.payer?.email;
  const nombre = pedido.nombre || pago.metadata?.nombre || pago.payer?.first_name || "";
  const licencia = await nuevaLicencia(env.LICENSE_SECRET, plan.letra, id);
  const registro = {
    estado: "approved", pago: id, ref, plan: planId, correo, nombre, licencia,
    monto: pago.transaction_amount, fecha: new Date().toISOString(),
    app: env.APP_URL, manual: `${sitioUrl}/api/manual?lic=${licencia}`,
  };

  await env.VENTAS.put(`pago:${id}`, JSON.stringify(registro));
  await env.VENTAS.put(`lic:${licencia}`, JSON.stringify({
    plan: planId, correo, nombre, pago: id, fecha: registro.fecha, dispositivos: plan.dispositivos,
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
    await env.VENTAS.put(`pago:${id}`, JSON.stringify(registro));
  }

  if (env.ADMIN_EMAIL) {
    await mandarCorreo(env, {
      to: env.ADMIN_EMAIL,
      subject: `💰 Nueva venta: plan ${planId} $${pago.transaction_amount} MXN`,
      html: `<p><b>${esc(nombre)}</b> (${esc(correo)}) compró el plan <b>${esc(planId)}</b> por $${esc(pago.transaction_amount)} MXN.</p>
<p>Licencia: <b>${esc(licencia)}</b><br>Pago Mercado Pago: ${esc(id)}<br>
Correo al cliente: ${registro.correoEnviado ? "enviado ✅" : "FALLÓ ❌ " + esc(registro.errorCorreo)}</p>`,
    }).catch(() => {});
  }
  return { ...registro, nuevo: true };
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
  Folio de pago: ${esc(r.pago)} · Este correo se envió automáticamente porque compraste Kaja.
  Tus datos no se comparten con nadie. Consulta nuestro aviso de privacidad en el sitio.
</td></tr></table></td></tr></table></body></html>`;
}
