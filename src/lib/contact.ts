// Shared validators / formatters for Portuguese contact info

export const isValidEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const v = email.trim();
  if (v.length > 254) return false;
  // RFC 5322 simplified
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
};

/**
 * Normalize a Portuguese mobile/landline number to E.164 (+351XXXXXXXXX).
 * Accepts inputs like "912345678", "+351 912 345 678", "00351912345678".
 * Returns null when it cannot produce a valid 9-digit PT number.
 */
export const normalizePtPhone = (raw?: string | null): string | null => {
  if (!raw) return null;
  let v = raw.replace(/[\s\-().]/g, "");
  if (v.startsWith("00351")) v = "+351" + v.slice(5);
  if (v.startsWith("351") && v.length === 12) v = "+" + v;
  if (!v.startsWith("+351") && /^\d{9}$/.test(v)) v = "+351" + v;
  if (!/^\+351\d{9}$/.test(v)) return null;
  // Mobile starts with 9; landline 2/3 — both acceptable
  const local = v.slice(4);
  if (!/^[239]\d{8}$/.test(local)) return null;
  return v;
};

export const isValidPtPhone = (raw?: string | null): boolean =>
  normalizePtPhone(raw) !== null;

export const formatPtPhoneDisplay = (raw?: string | null): string => {
  const n = normalizePtPhone(raw);
  if (!n) return raw ?? "";
  // +351 XXX XXX XXX
  const local = n.slice(4);
  return `+351 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
};

export interface LojistaContactCheck {
  valid: boolean;
  errors: string[];
  email?: string;
  whatsapp?: string;
}

export const checkLojistaContact = (
  email?: string | null,
  whatsapp?: string | null
): LojistaContactCheck => {
  const errors: string[] = [];
  const okEmail = isValidEmail(email);
  if (!okEmail) errors.push("Email do stand inválido. Atualiza no perfil.");
  const normalizedPhone = normalizePtPhone(whatsapp);
  if (!normalizedPhone) errors.push("WhatsApp inválido. Usa um número português válido (9 dígitos).");
  return {
    valid: errors.length === 0,
    errors,
    email: okEmail ? email!.trim() : undefined,
    whatsapp: normalizedPhone ?? undefined,
  };
};
