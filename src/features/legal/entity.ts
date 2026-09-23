/**
 * L'identité légale de la structure qui édite MYSTOREY, au même endroit pour
 * toutes les pages juridiques.
 *
 * ————————————————————————————————————————————————————————————————
 * À REMPLIR AVANT D'ENCAISSER LE PREMIER PAIEMENT.
 * Les champs laissés vides ne sont pas affichés : mieux vaut une page courte
 * et vraie qu'une page qui annonce « adresse à compléter » à ses clientes.
 * Mais une mention légale sans éditeur identifiable ni adresse n'est pas
 * conforme — c'est un blocage de lancement, pas un détail cosmétique.
 * ————————————————————————————————————————————————————————————————
 */
export const LEGAL_ENTITY = {
  /** Dénomination sociale exacte, telle qu'immatriculée. */
  name: "NEXORA",
  /** Forme juridique, ex. « SARL », « Entreprise individuelle ». */
  legalForm: "",
  /** Adresse complète du siège : rue, quartier, ville, pays. */
  address: "",
  /** Numéro d'immatriculation (RCCM, registre du commerce…). */
  registration: "",
  /** Identifiant fiscal (IFU, NIF…). */
  taxId: "",
  /** Personne responsable de la publication du site. */
  publicationDirector: "",
} as const;

/** Les prestataires par lesquels passent réellement les données de MYSTOREY. */
export const PROCESSORS = [
  { name: "Vercel Inc.", role: "Hébergement du site et des fonctions serveur", location: "Dublin, Irlande (région dub1)", site: "https://vercel.com" },
  { name: "Supabase", role: "Base de données, comptes et fichiers (photos de produits)", location: "Irlande (eu-west-1)", site: "https://supabase.com" },
] as const;

/** Vrai quand la fiche légale est complète et peut être opposée à une cliente. */
export function legalIdentityIsComplete(entity: typeof LEGAL_ENTITY = LEGAL_ENTITY): boolean {
  return Boolean(entity.name.trim() && entity.legalForm.trim() && entity.address.trim() && entity.registration.trim());
}
