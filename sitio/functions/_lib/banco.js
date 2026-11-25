// Datos de la cuenta para recibir transferencias SPEI.
// Se muestran a cada cliente que elige "Transferencia SPEI".
// (Si cargas SPEI_CLABE, SPEI_BANCO o SPEI_BENEFICIARIO en Cloudflare, esos ganan.)
export const BANCO = {
  clabe: "646195405600536819",   // dígito verificador revisado ✔
  banco: "Plata (STP)",          // Plata usa STP: en la app del cliente puede aparecer como STP
  beneficiario: "DANIEL SILVA GARCIA",
};

// Revisa el dígito verificador de una CLABE (18 dígitos, pesos 3-7-1).
export function clabeValida(c) {
  if (!/^\d{18}$/.test(c || "")) return false;
  const w = [3, 7, 1];
  let s = 0;
  for (let i = 0; i < 17; i++) s += (Number(c[i]) * w[i % 3]) % 10;
  return (10 - (s % 10)) % 10 === Number(c[17]);
}
