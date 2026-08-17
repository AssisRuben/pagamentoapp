import { randomBytes } from "crypto";

// Sem 0/O/1/I — evita confusão em códigos digitados/lidos em voz alta.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(length = 7): string {
  const bytes = randomBytes(length);
  let code = "";
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}
