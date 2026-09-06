# MYSTOREY - Launch Checklist

Dernière vérification : 2026-09-04

## Statut

Recommandation actuelle : **pas encore prêt**.

Le build, le lint, le typecheck et les tests locaux passent. Le lancement reste bloqué par l’exécution réelle des migrations, les tests RLS d’intégration et les paiements sandbox.

## Terminé ou vérifié localement

- Authentification, onboarding, boutiques, produits, catégories, commandes WhatsApp et dashboards présents.
- Build Next.js de production réussi.
- Typecheck TypeScript réussi.
- ESLint réussi.
- Redirection externe du callback d’authentification bloquée.
- Webhooks configurés pour utiliser le client Supabase service côté serveur.
- Produits indisponibles filtrés dans la fiche publique et le checkout SQL.
- Plans MVP alignés sur 5 / 20 / 100 produits et 0 / 2 000 / 5 000 FCFA par mois.
- Modification directe du rôle via la clé publishable bloquée par migration de sécurité.
- Relances manuelles intégrées : candidates réelles, message WhatsApp, journal, consentement, opt-out et anti-répétition.
- Tests locaux des montants, signatures, limites et ordre des migrations ajoutés.

## Bloquants avant lancement

- Appliquer et vérifier les migrations sur un projet Supabase de recette vierge puis sur le projet actuel.
- Tester avec deux comptes vendeurs l’isolation RLS, notamment `profiles`, paiements, abonnements et commandes.
- Ajouter les tests d’intégration webhook sans cookie utilisateur et vérifier activation, montant et idempotence.
- Exécuter les tests d’intégration RLS avec deux vendeuses et vérifier l’historique des relances.
- Remplacer les témoignages de démonstration de la landing page par des preuves réelles ou une section explicitement descriptive.

## Actions manuelles

1. Configurer les variables de `.env.example` dans l’environnement de déploiement, sans exposer `SUPABASE_SECRET_KEY`.
2. Appliquer les migrations SQL dans l’ordre, dont `20260904_launch_security.sql`.
3. Promouvoir le premier administrateur directement dans Supabase SQL, puis vérifier que les vendeurs ne peuvent pas modifier `profiles.role`.
4. Configurer les URLs de callback et les URLs webhook publiques chez Supabase, FedaPay et Wave.
5. Effectuer un paiement sandbox réussi et échoué pour chaque fournisseur.
6. Tester une boutique publiée depuis un téléphone réel : ajout au panier, checkout et ouverture WhatsApp.
7. Confirmer l’accord d’une cliente avant d’utiliser « Autoriser les relances ».

## Variables à configurer

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`
- `FEDAPAY_PUBLIC_KEY`
- `FEDAPAY_SECRET_KEY`
- `FEDAPAY_MERCHANT_ID`
- `FEDAPAY_WEBHOOK_SECRET`
- `WAVE_API_KEY` et `WAVE_MERCHANT_ID` si Wave est activé
- `WAVE_WEBHOOK_SECRET` si Wave est activé

## Commandes de validation

```powershell
npm run lint
npm run typecheck
npm run build
npx vitest run --pool=threads --maxWorkers=1 --no-file-parallelism
```

## Risques résiduels

- Les migrations n’ont pas encore été appliquées sur une base Supabase vierge et sur la base actuelle.
- Les webhooks doivent encore être testés avec des fixtures fournisseurs réelles et des événements sandbox.
- Les tests RLS et paiements sandbox n’ont pas été exécutés dans cet environnement.
- Les statistiques et revenus administrateur doivent être vérifiés contre les données de production avant toute promesse commerciale.