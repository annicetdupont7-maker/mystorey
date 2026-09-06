# MYSTOREY - Audit avant lancement

Audit réalisé le 2026-09-04 à partir du code, des migrations, des tests, du build local et de l'inventaire CLI Supabase. Le projet lié est MYSTOREY (`oklkkesfzkqsyimdljxm`, `ACTIVE_HEALTHY`). Les RLS effectives, paiements sandbox et responsive sur appareil réel restent à vérifier manuellement.

## Bloquant avant lancement

1. **Migrations Supabase** : les policies Storage dupliquées et la policy produits sont maintenant protégées par `drop policy if exists`. L’application réelle sur une base vierge et la base actuelle reste à exécuter ; `db diff` reste bloqué par Docker.
2. **Sécurité du rôle administrateur** : la policy historique autorisait un vendeur à modifier son rôle. La migration `20260904_launch_security.sql` retire cette possibilité. Elle doit être appliquée puis testée avec deux comptes vendeuses.
3. **Paiements sandbox** : les montants XOF restent des entiers FCFA sans multiplication FedaPay, les tentatives sont contrôlées par SQL et les webhooks valident le montant. Aucun paiement sandbox réel n’a encore été exécuté faute de configuration vérifiable.
4. **Webhooks** : client service, signature de longueur contrôlée, montant validé et doublon de confirmation ignoré. Les payloads et en-têtes exacts doivent être confirmés avec les fournisseurs.
5. **Limites commerciales** : plans 5, 20 et 100 ; contrôle applicatif et trigger SQL avec verrou de boutique. Les nouvelles boutiques reçoivent désormais automatiquement le plan gratuit. La vérification doit être faite contre une vraie base, y compris downgrade et expiration.
6. **Relances intelligentes** : MVP implémenté dans le dashboard marketing avec commandes en attente, clientes inactives depuis 30 jours, consentement/opt-out, message WhatsApp prérempli, journal et délai anti-répétition de 7 jours.

## Important mais non bloquant

- Les migrations SQL n’ont pas été exécutées par un CLI Supabase dans cet environnement ; les tests vérifient l’ordre et les gardes statiquement.
- Les webhooks ne sont pas testés contre des payloads fournisseurs réels ; les confirmations répétées connues sont ignorées.
- Les tables de paiement disposent maintenant de RLS dans une migration dédiée, mais leur état effectif doit être inspecté sur l’instance Supabase.
- Les statistiques administrateur doivent distinguer CA des vendeuses, revenus MYSTOREY, abonnements et commissions sur données réelles.
- Le CA vendeur et administrateur ne comptabilise désormais que les commandes livrées ; les tests existants ont été alignés sur cette règle.
- La landing page active a été réparée et les faux témoignages ont été remplacés par des exemples d'usage non attribués.
- La landing page ne doit pas présenter de témoignages de démonstration comme des preuves clients réelles.
- Les pages juridiques, support, sauvegardes et procédure de restauration ne sont pas confirmées dans le dépôt.
- Les tests actuels sont surtout unitaires et composants ; les tests d’intégration RLS, checkout et webhooks manquent.

## Amélioration ultérieure

- Renouvellement automatique et gestion complète des échecs de paiement.
- Relances automatiques, modèles, segmentation et conversion.
- Export administrateur et filtres avancés par période.
- Observabilité structurée, alertes webhook et audit trail.
- Tests E2E mobile sur les parcours inscription, boutique et commande.

## Validation locale

- `npm run lint` : réussi.
- `npm run typecheck` : réussi.
- `npm run build` : réussi.
- `npx vitest run --pool=threads --maxWorkers=1 --no-file-parallelism` : 20 fichiers et 127 tests réussis après ajout des tests de lancement.
- `npx supabase --version` : `2.116.0` ; `npx supabase projects list` confirme le projet MYSTOREY lié.
- Tests RLS/integration Supabase : non exécutés, aucun projet/CLI de recette fourni.
- Tests sandbox FedaPay/Wave : non exécutés, aucune configuration sandbox vérifiable fournie.

## Recommandation

**Pas encore prêt** pour un lancement commercial public. MYSTOREY est présentable pour une recette contrôlée, mais les migrations réelles, les RLS effectives, les paiements sandbox et les permissions doivent être validés avant l’ouverture générale.