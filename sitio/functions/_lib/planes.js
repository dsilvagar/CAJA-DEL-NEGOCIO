// PRECIOS QUE SE COBRAN DE VERDAD (en pesos MXN, IVA incluido).
// Si los cambias, cambia también config.js para que la página muestre lo mismo.
export const PLANES = {
  personal: { nombre: "Caja del Negocio · Plan Personal", precio: 199, dispositivos: 3, letra: "P" },
  negocio:  { nombre: "Caja del Negocio · Plan Negocio",  precio: 499, dispositivos: 3, letra: "N" },
  plus:     { nombre: "Caja del Negocio · Plan Plus",     precio: 999, dispositivos: 6, letra: "X" },
};

export function sitio(env, request) {
  return (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
