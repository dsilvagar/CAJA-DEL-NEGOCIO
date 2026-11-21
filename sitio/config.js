/* ============================================================
   DATOS DEL SITIO: cambia aquí y se actualiza toda la página.
   (Los precios que de verdad se cobran están en
    functions/_lib/planes.js; mantenlos iguales.)
   ============================================================ */
window.SITIO = {
  nombre: "Kaja",
  // WhatsApp con lada de país, sin espacios ni "+". Ej: 5215512345678
  whatsapp: "521XXXXXXXXXX",
  correo: "hola@kaja.mx",
  // Para el aviso de privacidad
  responsable: "[NOMBRE COMPLETO DEL RESPONSABLE]",
  domicilio: "[CALLE, NÚMERO, COLONIA, CIUDAD, ESTADO, C.P.], México",
  dominio: "kaja.mx",
  actualizado: "20 de noviembre de 2026",
  // Precio de lanzamiento (el que se cobra) y precio normal (tachado)
  planes: {
    personal: { precio: 199, normal: 299 },
    negocio:  { precio: 499, normal: 799 },
    plus:     { precio: 999, normal: 1499 }
  }
};
