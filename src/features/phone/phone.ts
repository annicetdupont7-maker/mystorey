/**
 * International phone numbers without asking anyone to know their "indicatif". WhatsApp
 * links need the full international number; sellers and clients naturally type the local
 * one ("97 00 00 00"). The country is picked from a list and joined for them.
 */
export type Country = { code: string; name: string; flag: string; /** Local numbers start with a 0 that is dropped internationally. */ trunkZero?: boolean };

export const COUNTRIES: Country[] = [
  { code: "229", name: "Bénin", flag: "🇧🇯" },
  { code: "225", name: "Côte d’Ivoire", flag: "🇨🇮" },
  { code: "237", name: "Cameroun", flag: "🇨🇲" },
  { code: "221", name: "Sénégal", flag: "🇸🇳" },
  { code: "228", name: "Togo", flag: "🇹🇬" },
  { code: "226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "223", name: "Mali", flag: "🇲🇱" },
  { code: "227", name: "Niger", flag: "🇳🇪" },
  { code: "224", name: "Guinée", flag: "🇬🇳" },
  { code: "241", name: "Gabon", flag: "🇬🇦" },
  { code: "242", name: "Congo", flag: "🇨🇬" },
  { code: "243", name: "RD Congo", flag: "🇨🇩", trunkZero: true },
  { code: "235", name: "Tchad", flag: "🇹🇩" },
  { code: "236", name: "Centrafrique", flag: "🇨🇫" },
  { code: "234", name: "Nigeria", flag: "🇳🇬", trunkZero: true },
  { code: "233", name: "Ghana", flag: "🇬🇭", trunkZero: true },
  { code: "250", name: "Rwanda", flag: "🇷🇼", trunkZero: true },
  { code: "261", name: "Madagascar", flag: "🇲🇬", trunkZero: true },
  { code: "212", name: "Maroc", flag: "🇲🇦", trunkZero: true },
  { code: "216", name: "Tunisie", flag: "🇹🇳" },
  { code: "213", name: "Algérie", flag: "🇩🇿", trunkZero: true },
  { code: "33", name: "France", flag: "🇫🇷", trunkZero: true },
  { code: "32", name: "Belgique", flag: "🇧🇪", trunkZero: true },
  { code: "41", name: "Suisse", flag: "🇨🇭", trunkZero: true },
  { code: "1", name: "Canada / États-Unis", flag: "🇨🇦" },
];

export const DEFAULT_COUNTRY = "229";

const byLongestCode = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

/** Splits a stored "+229 97 00 00 00" back into its country and local part. */
export function splitPhone(value: string | null | undefined, fallback = DEFAULT_COUNTRY): { code: string; local: string } {
  const raw = (value ?? "").trim();
  if (!raw) return { code: fallback, local: "" };
  if (raw.startsWith("+") || raw.startsWith("00")) {
    const digits = raw.replace(/\D/g, "").replace(/^00/, "");
    const country = byLongestCode.find((c) => digits.startsWith(c.code));
    if (country) return { code: country.code, local: groupDigits(digits.slice(country.code.length)) };
  }
  return { code: fallback, local: raw };
}

/** Pairs of digits, the way numbers are written locally: "6 90 00 00 00", "97 00 00 00". */
function groupDigits(digits: string): string {
  const head = digits.length % 2 ? digits.slice(0, 1) : "";
  const pairs = digits.slice(head.length).match(/\d{2}/g) ?? [];
  return [head, ...pairs].filter(Boolean).join(" ");
}

/**
 * Joins a country and what the person typed. Someone who typed a full international
 * number in the local box keeps it as typed. Returns "" when nothing was typed.
 */
export function joinPhone(code: string, local: string): string {
  const typed = local.trim();
  if (!typed) return "";
  if (typed.startsWith("+") || typed.startsWith("00")) {
    const digits = typed.replace(/\D/g, "").replace(/^00/, "");
    return digits ? `+${digits.slice(0, 15)}` : "";
  }
  const country = COUNTRIES.find((c) => c.code === code);
  let digits = typed.replace(/\D/g, "");
  if (country?.trunkZero) digits = digits.replace(/^0/, "");
  if (!digits) return "";
  return `+${code} ${groupDigits(digits)}`;
}

/** Country code of a stored number, to preselect the client's country from the shop's. */
export function countryOf(value: string | null | undefined): string {
  return splitPhone(value).code;
}

export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return value.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15;
}
