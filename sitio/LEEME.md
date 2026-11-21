# Página de venta de Kaja

Sitio estático + funciones de Cloudflare Pages que cobran con Mercado Pago y
entregan la app automáticamente (correo con link, licencia y manual).

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html`, `estilo.css`, `sitio.js` | Página de venta |
| `config.js` | **Datos editables**: WhatsApp, correo, responsable, precios mostrados |
| `privacidad.html`, `terminos.html` | Aviso de privacidad y términos |
| `gracias.html` | Pantalla al volver de Mercado Pago (muestra licencia y links) |
| `functions/_lib/planes.js` | **Precios que se cobran** (mantenerlos iguales a `config.js`) |
| `functions/api/checkout.js` | Crea el cobro en Mercado Pago |
| `functions/api/webhook.js` | Recibe el aviso de pago de Mercado Pago |
| `functions/api/estado.js` | La página de gracias consulta aquí |
| `functions/api/manual.js` | Descarga del manual, solo con licencia válida |
| `functions/_lib/entrega.js` | Revisa el pago, crea la licencia, manda el correo |
| `privado/manual.pdf` | Manual (bloqueado al público por `functions/_middleware.js`) |

## Cómo funciona el cobro

1. El cliente elige plan, pone nombre y correo → `POST /api/checkout` guarda el pedido
   en KV y crea una preferencia de Checkout Pro → el cliente paga en Mercado Pago.
2. Mercado Pago llama a `/api/webhook` → la función valida la firma, **vuelve a consultar
   el pago con el Access Token** (nunca confía en el aviso), revisa que esté aprobado,
   en MXN y por el monto del plan → crea la licencia → manda el correo al cliente y
   un aviso de venta al dueño.
3. El cliente regresa a `gracias.html`, que consulta `/api/estado` y le muestra
   la licencia, el botón para abrir la app y el manual.

Es idempotente: si Mercado Pago avisa varias veces, la licencia es la misma
(sale del número de pago) y el correo se manda una sola vez.

Licencias: `KAJA-XXXX-XXXX-XXXX`. El primer carácter indica el plan
(P Personal, N Negocio, X Plus) y los últimos 4 son una firma HMAC con
`LICENSE_SECRET`, para que la app pueda validarlas sin internet más adelante.

## Configuración en Cloudflare Pages

- Proyecto conectado al repositorio, rama `main`, **Root directory: `sitio`**,
  sin comando de build, Build output directory: `/`.
- Binding KV: nombre de variable `VENTAS`.
- Variables (Settings → Variables and Secrets, marcar como *Secret* las llaves):

| Variable | Ejemplo / de dónde sale |
|---|---|
| `MP_ACCESS_TOKEN` | Mercado Pago → Tus integraciones → tu app → Credenciales de producción → Access Token |
| `MP_WEBHOOK_SECRET` | Mercado Pago → tu app → Webhooks → Firma secreta |
| `RESEND_API_KEY` | resend.com → API Keys |
| `EMAIL_FROM` | `Kaja <ventas@usakaja.com>` (dominio verificado en Resend) |
| `REPLY_TO` | correo donde quieres recibir respuestas de clientes |
| `ADMIN_EMAIL` | tu correo, para el aviso de cada venta |
| `LICENSE_SECRET` | una frase larga al azar; **no la cambies después** |
| `APP_URL` | link que se entrega para instalar la app |
| `SITE_URL` | `https://usakaja.com` |
| `SOPORTE_WHATSAPP` | `5215512345678` |
| `MP_SANDBOX` | `1` solo para probar con credenciales de prueba |

## Prueba local

`npx wrangler pages dev sitio --kv VENTAS` con un archivo `sitio/.dev.vars`
que tenga las variables de arriba (no subirlo al repositorio).
