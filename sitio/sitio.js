(function () {
  var C = window.SITIO || {};
  var fmt = function (n) { return "$" + Number(n).toLocaleString("es-MX"); };
  var NOMBRES = { personal: "Personal", negocio: "Negocio", plus: "Plus" };

  // Precios desde config.js
  document.querySelectorAll("[data-precio]").forEach(function (el) {
    var p = C.planes && C.planes[el.dataset.precio]; if (p) el.textContent = fmt(p.precio);
  });
  document.querySelectorAll("[data-normal]").forEach(function (el) {
    var p = C.planes && C.planes[el.dataset.normal];
    if (p && p.normal > p.precio) el.textContent = fmt(p.normal); else el.remove();
  });

  // Contacto
  var waTxt = encodeURIComponent("Hola, me interesa Caja del Negocio");
  document.querySelectorAll("[data-wa]").forEach(function (a) {
    a.href = "https://wa.me/" + C.whatsapp + "?text=" + waTxt; a.target = "_blank"; a.rel = "noopener";
  });
  document.querySelectorAll("[data-correo]").forEach(function (a) { a.href = "mailto:" + C.correo; });
  document.querySelectorAll("[data-anio]").forEach(function (s) { s.textContent = new Date().getFullYear(); });

  // Animación al aparecer
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("ver"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".sube").forEach(function (el) { io.observe(el); });
  } else document.querySelectorAll(".sube").forEach(function (el) { el.classList.add("ver"); });

  // Compra
  var velo = document.getElementById("velo"), f = document.getElementById("fCompra");
  if (!velo) return;
  var plan = "negocio";
  var err = document.getElementById("cError"), btn = document.getElementById("cPagar");
  function abrir(p) {
    plan = p;
    document.getElementById("cPlan").textContent = NOMBRES[p];
    document.getElementById("cPrecio").textContent = fmt(C.planes[p].precio) + " MXN";
    err.style.display = "none"; btn.disabled = false; btn.textContent = "Continuar al pago seguro";
    velo.classList.add("abierto"); document.body.style.overflow = "hidden";
    setTimeout(function () { document.getElementById("cNombre").focus(); }, 50);
  }
  function cerrar() { velo.classList.remove("abierto"); document.body.style.overflow = ""; }
  document.querySelectorAll("[data-comprar]").forEach(function (b) {
    b.addEventListener("click", function () { abrir(b.dataset.comprar); });
  });
  document.getElementById("cCerrar").onclick = cerrar;
  velo.addEventListener("click", function (e) { if (e.target === velo) cerrar(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrar(); });

  function mal(t) { err.textContent = t; err.style.display = "block"; btn.disabled = false; btn.textContent = "Continuar al pago seguro"; }
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = document.getElementById("cNombre").value.trim();
    var correo = document.getElementById("cCorreo").value.trim();
    if (nombre.length < 2) return mal("Escribe tu nombre.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return mal("Revisa tu correo, parece que tiene un error.");
    if (!document.getElementById("cAcepto").checked) return mal("Para continuar acepta los términos y el aviso de privacidad.");
    btn.disabled = true; btn.textContent = "Abriendo Mercado Pago…";
    fetch("/api/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: plan, nombre: nombre, correo: correo })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) {
        if (r.ok && r.j.url) { location.href = r.j.url; return; }
        mal(r.j.error || "No pudimos abrir el pago. Intenta de nuevo o escríbenos por WhatsApp.");
      })
      .catch(function () { mal("Sin conexión. Revisa tu internet e intenta de nuevo."); });
  });
})();
