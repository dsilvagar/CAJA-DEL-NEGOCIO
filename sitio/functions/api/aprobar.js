import { sitio } from "../_lib/planes.js";
import { tokenAprobar, aprobarSpei } from "../_lib/spei.js";

// Botón del correo "Ya recibí el pago". Primero muestra una confirmación (GET)
// y solo al tocar "Confirmar" (POST) se envía la licencia. Así ningún antivirus
// de correo que abra el link por su cuenta aprueba un pago por error.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pagina = (cuerpo, status = 200) => new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Aprobar pago · Kaja</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0b1a2e;margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;color:#0e1c30}
.c{background:#fff;border-radius:22px;padding:28px 22px;max-width:420px;width:100%;text-align:center}button{width:100%;border:0;border-radius:99px;padding:16px;font:700 17px inherit;background:#c9a227;color:#1a1405;margin-top:16px;cursor:pointer}p{color:#5b6576}</style></head>
<body><div class="c">${cuerpo}</div></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

async function revisar(env, ref, t) {
  return ref && t && t === (await tokenAprobar(env, ref));
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const ref = u.searchParams.get("ref") || "", t = u.searchParams.get("t") || "";
  if (!(await revisar(env, ref, t))) return pagina("<h2>Link no válido</h2>", 403);
  const pedido = await env.VENTAS.get(`pedido:${ref}`, "json");
  if (!pedido) return pagina("<h2>No encontré ese pedido</h2><p>Puede que haya pasado más de 45 días.</p>", 404);
  const ya = await env.VENTAS.get(`ref:${ref}`);
  if (ya) return pagina(`<h2>✅ Ya estaba aprobado</h2><p>La licencia de ${esc(pedido.nombre)} ya se envió a ${esc(pedido.correo)}.</p>`);
  return pagina(`<h2>¿Ya te llegó la transferencia?</h2>
<p><b>${esc(pedido.nombre)}</b><br>${esc(pedido.correo)}<br>Plan ${esc(pedido.plan)} · <b>$${esc(pedido.monto)} MXN</b><br>Referencia <b>${esc(ref)}</b></p>
<p>Revisa en tu banco que el depósito sea por el monto completo antes de confirmar.</p>
<form method="post"><input type="hidden" name="ref" value="${esc(ref)}"><input type="hidden" name="t" value="${esc(t)}"><button>Sí, ya llegó: enviar su app</button></form>`);
}

export async function onRequestPost({ request, env }) {
  const f = await request.formData();
  const ref = String(f.get("ref") || ""), t = String(f.get("t") || "");
  if (!(await revisar(env, ref, t))) return pagina("<h2>Link no válido</h2>", 403);
  try {
    const r = await aprobarSpei(env, sitio(env, request), ref);
    if (!r) return pagina("<h2>No encontré ese pedido</h2>", 404);
    return pagina(`<h2>✅ Listo</h2><p>Se envió la app y la licencia <b>${esc(r.licencia)}</b> a ${esc(r.correo)}.${r.correoEnviado === false ? "<br><b>Ojo: el correo falló.</b> Mándale la licencia por WhatsApp." : ""}</p>`);
  } catch (e) {
    console.error("aprobar", e);
    return pagina(`<h2>Algo falló</h2><p>${esc(e.message)}</p>`, 500);
  }
}
