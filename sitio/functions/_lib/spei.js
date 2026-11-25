import { guardarPedido, mandarCorreo, entregar } from "./entrega.js";

// Transferencia SPEI directa a tu CLABE. No hay comisión, pero el banco no avisa a la página:
// tú confirmas cada pago con un botón que te llega por correo, y la licencia sale sola.
const ALFA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dinero = (n) => "$" + Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 });

export function datosBanco(env) {
  return { clabe: env.SPEI_CLABE, banco: env.SPEI_BANCO || "", beneficiario: env.SPEI_BENEFICIARIO || "" };
}

export async function tokenAprobar(env, ref) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.LICENSE_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("spei:" + ref)));
  return Array.from(s.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function pedidoSpei(env, base, v) {
  const ref = "K" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => ALFA[x % ALFA.length]).join("");
  await guardarPedido(env, ref, { plan: v.planId, nombre: v.nombre, correo: v.correo, metodo: "spei", monto: v.plan.precio });
  const b = datosBanco(env);
  const info = { ref, monto: v.plan.precio, ...b, whatsapp: env.SOPORTE_WHATSAPP || "", correo: env.REPLY_TO || "" };
  const fila = (k, val) => `<tr><td style="padding:6px 0;color:#5b6576">${k}</td><td style="padding:6px 0;font-weight:700;text-align:right">${esc(val)}</td></tr>`;
  const tabla = `<table width="100%" style="border-collapse:collapse;font-size:15px">${fila("Banco", b.banco)}${fila("Beneficiario", b.beneficiario)}${fila("CLABE", b.clabe)}${fila("Monto exacto", dinero(v.plan.precio) + " MXN")}${fila("Concepto / referencia", ref)}</table>`;

  // Si el correo falla, igual mostramos los datos en pantalla.
  await mandarCorreo(env, {
    to: v.correo,
    subject: `Datos para tu transferencia · Kaja (referencia ${ref})`,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0e1c30;max-width:520px">
<h2 style="margin:0 0 8px">Ya casi, ${esc(v.nombre.split(" ")[0])}</h2>
<p>Para recibir tu app <b>${esc(v.plan.nombre)}</b>, haz una transferencia SPEI con estos datos:</p>${tabla}
<p>Escribe la referencia <b>${esc(ref)}</b> en el concepto. Después mándanos tu comprobante${info.whatsapp ? ` por <a href="https://wa.me/${esc(info.whatsapp)}?text=${encodeURIComponent("Hola, envío mi comprobante de pago de Kaja. Referencia " + ref)}">WhatsApp</a> o` : ""} respondiendo a este correo.</p>
<p>En cuanto confirmemos el depósito te llega otro correo con tu app, tu licencia y tu manual. Normalmente es el mismo día hábil.</p></div>`,
  }).catch((e) => console.error("correo spei", e));

  if (env.ADMIN_EMAIL) {
    const link = `${base}/api/aprobar?ref=${ref}&t=${await tokenAprobar(env, ref)}`;
    await mandarCorreo(env, {
      to: env.ADMIN_EMAIL,
      subject: `🏦 Pedido por transferencia ${ref}: plan ${v.planId} ${dinero(v.plan.precio)}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
<p><b>${esc(v.nombre)}</b> (${esc(v.correo)}) pidió el plan <b>${esc(v.planId)}</b> y va a pagar por transferencia.</p>
<p>Monto: <b>${dinero(v.plan.precio)} MXN</b> · Referencia: <b>${esc(ref)}</b></p>
<p>Cuando veas el depósito en tu banco, toca este botón y su licencia se envía sola:</p>
<p><a href="${esc(link)}" style="display:inline-block;background:#c9a227;color:#1a1405;font-weight:700;padding:14px 24px;border-radius:99px;text-decoration:none">Ya recibí el pago: enviar su app</a></p>
<p style="color:#5b6576;font-size:13px">No reenvíes este correo: el botón es solo para ti.</p></div>`,
    }).catch(() => {});
  }
  return info;
}

export async function aprobarSpei(env, base, ref) {
  const pedido = await env.VENTAS.get(`pedido:${ref}`, "json");
  if (!pedido || pedido.metodo !== "spei") return null;
  return entregar(env, base, { metodo: "spei", id: ref, ref, aprobado: true, monto: pedido.monto, moneda: "MXN" });
}
