import { licenciaValida } from "../_lib/licencia.js";

// Descarga del manual: solo con una licencia comprada.
export async function onRequestGet({ request, env }) {
  const lic = (new URL(request.url).searchParams.get("lic") || "").toUpperCase().trim();
  if (!(await licenciaValida(env.LICENSE_SECRET, lic)) || !(await env.VENTAS.get(`lic:${lic}`)))
    return new Response("Licencia no válida. Escríbenos y te ayudamos.", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const pdf = await env.ASSETS.fetch(new URL("/privado/manual.pdf", request.url));
  if (!pdf.ok) return new Response("Manual no disponible por el momento.", { status: 500 });
  return new Response(pdf.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Manual de uso - Caja del Negocio.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
