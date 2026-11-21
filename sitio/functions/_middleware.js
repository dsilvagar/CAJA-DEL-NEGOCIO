// Nadie puede abrir /privado/ directamente (el manual solo se baja con licencia).
export async function onRequest({ request, next }) {
  if (new URL(request.url).pathname.startsWith("/privado")) return new Response("No encontrado", { status: 404 });
  return next();
}
