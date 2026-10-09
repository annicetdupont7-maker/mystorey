/**
 * Pourquoi une inscription a été refusée, traduit en une phrase que la personne
 * peut suivre. Séparé de l'action pour être testable sans Supabase : c'est le seul
 * endroit qui décide de ce qu'elle voit quand `signUp` échoue.
 *
 * Avant, presque tout tombait dans « réessayez dans quelques minutes », y compris
 * une panne d'envoi d'email qui n'a rien à voir avec son mot de passe. Impossible
 * de diagnostiquer, et surtout impossible pour elle de savoir quoi corriger.
 */
export type SignUpFailure = { code?: string; status?: number; message: string; reasons?: readonly string[] };

/**
 * Une adresse déjà inscrite. Partagé avec l'action, qui doit renvoyer exactement
 * la même phrase quand Supabase masque le cas au lieu de lever une erreur.
 */
export const ALREADY_REGISTERED = "Un compte existe déjà avec cette adresse. Connectez-vous, ou utilisez « Mot de passe oublié ? » pour choisir un nouveau mot de passe.";

const GENERIC = "Impossible de créer le compte pour le moment. Réessayez dans quelques minutes, ou écrivez à l’équipe MYSTOREY (page Contact).";

export function signUpErrorMessage(failure: SignUpFailure): string {
  const { code = "", status, message } = failure;
  const text = message ?? "";

  if (code === "user_already_exists" || /already registered|already exists/i.test(text)) return ALREADY_REGISTERED;

  if (code === "weak_password") {
    const reasons = failure.reasons ?? [];
    // `pwned` d'abord : c'est le refus le plus déroutant, un mot de passe qui
    // respecte la règle des 8 caractères et qui est quand même rejeté.
    if (reasons.includes("pwned")) return "Ce mot de passe apparaît dans des fuites de données connues. Choisissez-en un autre, même simple à retenir, mais qui ne soit pas déjà utilisé partout.";
    if (reasons.includes("characters")) return "Ce mot de passe doit mélanger lettres, chiffres et symboles. Par exemple : Boutique2026!";
    if (reasons.includes("length")) return "Ce mot de passe est trop court. Prenez au moins 8 caractères.";
    return "Ce mot de passe est refusé car trop facile à deviner. Choisissez-en un autre.";
  }

  // L'envoi de l'email de confirmation fait échouer toute l'inscription côté
  // Supabase : le compte n'est pas créé. Ce n'est ni son adresse ni son mot de
  // passe, et elle doit l'entendre, sinon elle réessaie indéfiniment.
  if (/error sending|sending .*email|smtp/i.test(text)) return "Votre compte n’a pas pu être créé car l’email de confirmation n’est pas parti. Cela ne vient pas de votre mot de passe. Écrivez à l’équipe MYSTOREY (page Contact) : elle vous ouvrira l’accès à la main.";

  if (status === 429 || /rate.?limit/i.test(code) || /rate limit/i.test(text)) return "Trop de demandes d’inscription viennent d’être envoyées. Patientez quelques minutes puis réessayez.";

  if (code === "signup_disabled" || code === "email_provider_disabled") return "Les inscriptions sont momentanément fermées. Écrivez à l’équipe MYSTOREY (page Contact), elle vous créera votre boutique.";

  if (code === "email_address_invalid" || code === "email_address_not_authorized" || /email address.*invalid/i.test(text)) return "Cette adresse email est refusée. Vérifiez l’orthographe, ou essayez avec une autre adresse.";

  return GENERIC;
}
