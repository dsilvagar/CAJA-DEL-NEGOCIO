/* ============================================================
   DATOS DEL SITIO: cambia aquí y se actualiza toda la página.
   (Los precios que de verdad se cobran están en
    functions/_lib/planes.js; mantenlos iguales.)
   ============================================================ */
window.SITIO = {
  nombre: "Kaja",
  // WhatsApp con lada de país, sin espacios ni "+". Ej: 523311974744
  whatsapp: "523311974744",
  whatsappVisible: "33 1197 4744",
  correo: "soporte@usakaja.com",
  // Para el aviso de privacidad y los términos.
  // PENDIENTE: la ley pide nombre y domicilio completos del responsable.
  // Cuando los tengas, pon aquí tu nombre (o razón social) y la dirección completa.
  responsable: "Kaja",
  domicilio: "Guadalajara, Jalisco, México",
  dominio: "usakaja.com",
  actualizado: "20 de noviembre de 2026",
  // Precio de lanzamiento (el que se cobra) y precio normal (tachado)
  planes: {
    personal: { precio: 199, normal: 299 },
    negocio:  { precio: 499, normal: 799 },
    plus:     { precio: 999, normal: 1499 }
  }
};
