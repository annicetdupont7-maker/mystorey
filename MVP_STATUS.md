# MYSTOREY - MVP Status

Dernière mise à jour : 2026-09-04

## Fonctionnalités présentes

- Inscription, connexion, confirmation et récupération de mot de passe.
- Création et personnalisation d’une boutique.
- Catalogue, catégories, images et publication.
- Vitrine publique, panier et commande via WhatsApp.
- Suivi des commandes et messages WhatsApp préremplis.
- Dashboard vendeur et back-office administrateur.
- Plans gratuit, Croissance et Pro avec limites de produits côté serveur.
- Intégrations de paiement FedaPay et Wave avec routes webhook.
- Relances manuelles : commandes à confirmer, clientes inactives, WhatsApp prérempli, journal, consentement et opt-out.

## Fonctionnalités partielles

- Abonnements : parcours présents, mais validation sandbox, renouvellement, expiration et idempotence des webhooks restent à éprouver.
- Limites produits : contrôlées par action serveur et trigger SQL avec verrou de boutique ; validation sur base réelle restante.
- Marketing : landing page réalignée sur MYSTOREY, ses plans et ses capacités réelles ; la preuve sociale reste à collecter auprès de vraies utilisatrices.
- Dashboard administrateur : données disponibles, mais distinction CA vendeuses, revenus MYSTOREY et commissions doit être auditée sur données réelles.

## Fonctionnalités non terminées pour le mandat de lancement

- Tests d’intégration RLS et paiements.
- Checklist de déploiement et recette mobile réelle.
- Pages juridiques, support et politique de confidentialité à confirmer.

## Corrections réalisées dans cet audit

- Blocage des redirections externes du callback auth.
- Utilisation du client service dans les webhooks.
- Refus des produits indisponibles dans la fiche et le checkout.
- Blocage de la modification directe du rôle via RLS.
- Plans alignés sur 5, 20 et 100 produits, à 0, 2 000 et 5 000 FCFA.
- Contrôle du statut, du paiement et de l’expiration avant ajout de produit.
- Inclusion des URLs de retour FedaPay.
- Comparaison des signatures webhook sans comparaison naïve directe.
- Validation SQL des montants de paiement contre le prix du plan.
- Trigger SQL de limite produit.
- Historique et préférences de relance protégés par RLS.
- Migrations Storage et policy de produits rendues rejouables sans conflit de policy.
- Création automatique d'un abonnement gratuit pour les nouvelles boutiques.
- Expiration mensuelle ajoutée lors de l'activation d'un abonnement payant.
- CA vendeur et administrateur limité aux commandes livrées.

## Validation actuelle

- `npm run lint` : réussi.
- `npm run typecheck` : réussi après les corrections.
- `npm run build` : réussi après les dernières corrections.
- `npm test -- --run` : timeout de worker dans l’environnement local.
- `npx vitest run --pool=threads --maxWorkers=1 --no-file-parallelism` : 20 fichiers et 127 tests réussis après ajout des tests de lancement.
- Tests Supabase/RLS : non exécutés, aucun environnement d’intégration fourni.
- Tests FedaPay/Wave sandbox : non exécutés, identifiants et endpoints de recette non fournis.
- CLI Supabase : `npx supabase 2.116.0`, projet réel MYSTOREY lié et `ACTIVE_HEALTHY`; aucune migration exécutée dans cette session.

## Recommandation

**Pas encore prêt** pour un lancement commercial public. Une présentation contrôlée est possible après application des migrations, mais la base réelle, les paiements sandbox et les permissions RLS doivent être validés avant ouverture générale.