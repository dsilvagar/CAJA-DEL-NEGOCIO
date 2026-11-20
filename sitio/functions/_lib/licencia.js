// Códigos de licencia: CAJA-N7KQ-4MZP-X2HD
// Los últimos 4 caracteres son una firma (HMAC) para que más adelante la app
// pueda comprobar el código sin internet usando el mismo LICENSE_SECRET.
const ALFA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sin 0, O, 1, I, L

function azar(n) {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(b, (x) => ALFA[x % ALFA.length]).join("");
}

async function firma(secreto, cuerpo, n = 4) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(cuerpo)));
  return Array.from(s.slice(0, n), (x) => ALFA[x % ALFA.length]).join("");
}

// Con "semilla" (el número de pago) el código siempre sale igual para el mismo
// pago: si Mercado Pago avisa dos veces, no se crean dos licencias distintas.
export async function nuevaLicencia(secreto, letra, semilla) {
  const cuerpo = letra + (semilla ? (await firma(secreto, "pago:" + semilla, 7)) : azar(7));
  const f = await firma(secreto, cuerpo);
  const t = cuerpo + f; // 12 caracteres
  return `CAJA-${t.slice(0, 4)}-${t.slice(4, 8)}-${t.slice(8, 12)}`;
}

export async function licenciaValida(secreto, codigo) {
  const m = /^CAJA-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})$/.exec(String(codigo || "").toUpperCase().trim());
  if (!m) return false;
  const t = m[1] + m[2] + m[3];
  return (await firma(secreto, t.slice(0, 8))) === t.slice(8);
}
