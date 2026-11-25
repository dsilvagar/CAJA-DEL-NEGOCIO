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
  var waTxt = encodeURIComponent("Hola, me interesa Kaja");
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
  var spei = document.getElementById("cSpei");
  var plan = "negocio";
  var err = document.getElementById("cError"), btn = document.getElementById("cPagar");
  var TEXTO = { stripe: "Pagar con tarjeta u OXXO", paypal: "Pagar con PayPal", mp: "Pagar con Mercado Pago", spei: "Ver datos para transferir" };
  var TODOS = ["stripe", "paypal", "mp", "spei"];
  var metodosListos = null;
  function cargarMetodos() {
    if (!metodosListos) metodosListos = fetch("/api/metodos").then(function (r) { return r.json(); })
      .then(function (j) { return j.metodos; })
      .catch(function () { metodosListos = null; return C.metodos || TODOS; });
    return metodosListos;
  }
  function elegido() { var r = f.querySelector('input[name="metodo"]:checked'); return r ? r.value : null; }
  function textoBoton() { var m = elegido(); btn.textContent = m ? TEXTO[m] : "Elige cómo pagar"; btn.disabled = !m; }
  f.querySelectorAll('input[name="metodo"]').forEach(function (r) { r.addEventListener("change", textoBoton); });
  function mostrarMetodos(lista) {
    var primero = null;
    TODOS.forEach(function (m) {
      var l = f.querySelector('[data-m="' + m + '"]'), on = lista.indexOf(m) >= 0;
      l.hidden = !on; if (!on) l.querySelector("input").checked = false;
      if (on && !primero) primero = l.querySelector("input");
    });
    if (!elegido() && primero) primero.checked = true;
    if (!lista.length) { mal("Muy pronto podrás comprar aquí. Mientras, escríbenos por WhatsApp y te atendemos."); btn.disabled = true; btn.textContent = "No disponible por ahora"; return; }
    textoBoton();
  }
  function abrir(p) {
    plan = p;
    document.getElementById("cPlan").textContent = NOMBRES[p];
    document.getElementById("cPrecio").textContent = fmt(C.planes[p].precio) + " MXN";
    err.style.display = "none"; f.hidden = false; spei.hidden = true;
    velo.classList.add("abierto"); document.body.style.overflow = "hidden";
    cargarMetodos().then(mostrarMetodos);
    setTimeout(function () { document.getElementById("cNombre").focus(); }, 50);
  }
  function cerrar() { velo.classList.remove("abierto"); document.body.style.overflow = ""; }
  document.querySelectorAll("[data-comprar]").forEach(function (b) {
    b.addEventListener("click", function () { abrir(b.dataset.comprar); });
  });
  document.getElementById("cCerrar").onclick = cerrar;
  velo.querySelectorAll("[data-cerrar]").forEach(function (b) { b.onclick = cerrar; });
  velo.addEventListener("click", function (e) { if (e.target === velo) cerrar(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrar(); });
  velo.querySelectorAll("[data-copiar]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = document.getElementById(b.dataset.copiar).textContent;
      try { navigator.clipboard.writeText(t).then(function () { b.textContent = "Copiado"; setTimeout(function () { b.textContent = "Copiar"; }, 1500); }); } catch (e) {}
    });
  });

  function mal(t) { err.textContent = t; err.style.display = "block"; textoBoton(); }
  function verSpei(d) {
    document.getElementById("sBanco").textContent = d.banco || "";
    document.getElementById("sBenef").textContent = d.beneficiario || "";
    document.getElementById("sClabe").textContent = d.clabe;
    document.getElementById("sMonto").textContent = fmt(d.monto) + ".00 MXN";
    document.getElementById("sRef").textContent = d.ref;
    document.getElementById("sWa").href = "https://wa.me/" + (d.whatsapp || C.whatsapp) + "?text=" +
      encodeURIComponent("Hola, envío mi comprobante de pago de Kaja. Referencia " + d.ref);
    f.hidden = true; spei.hidden = false; spei.scrollTop = 0;
  }
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = document.getElementById("cNombre").value.trim();
    var correo = document.getElementById("cCorreo").value.trim();
    var metodo = elegido();
    if (nombre.length < 2) return mal("Escribe tu nombre.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return mal("Revisa tu correo, parece que tiene un error.");
    if (!metodo) return mal("Elige cómo quieres pagar.");
    if (!document.getElementById("cAcepto").checked) return mal("Para continuar acepta los términos y el aviso de privacidad.");
    err.style.display = "none"; btn.disabled = true; btn.textContent = metodo === "spei" ? "Preparando tus datos…" : "Abriendo el pago seguro…";
    fetch("/api/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: plan, nombre: nombre, correo: correo, metodo: metodo })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) {
        if (r.ok && r.j.url) { location.href = r.j.url; return; }
        if (r.ok && r.j.spei) { textoBoton(); return verSpei(r.j.spei); }
        mal(r.j.error || "No pudimos abrir el pago. Intenta de nuevo o escríbenos por WhatsApp.");
      })
      .catch(function () { mal("Sin conexión. Revisa tu internet e intenta de nuevo."); });
  });
})();
