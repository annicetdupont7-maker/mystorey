# MYSTOREY - Launch Checklist

Dernière vérification : 2026-09-22

## État de la base de production (lu le 2026-09-21)

Avant le 2026-09-22, la production ne contenait que 9 tables : `profiles`, `stores`, `store_themes`, `products`,
`product_media`, `categories`, `orders`, `order_status_history`, `subscription_plans`.
Les migrations d'abonnements, de paiements, de variantes et de relances n'y ont jamais été
appliquées, et :

- **Faille critique** : un vendeur peut écrire `profiles.role = 'admin'` depuis le navigateur.
- `order_status_history` n'a pas de RLS : tout compte connecté lit/modifie l'historique de toutes les boutiques.
- Le checkout accepte un produit masqué (seule l'API publique le cache).
- La limite du plan gratuit n'est vérifiée que par l'application.

## Migrations de lancement — APPLIQUÉES en production le 2026-09-22

Essai à blanc (transaction annulée) puis application atomique. Données vérifiées avant/après :
13 comptes, 11 boutiques, 8 produits, 3 commandes, 1 catégorie, 1 admin — inchangés.

1. `database/migrations/20260912_product_variants.sql` — stock, variantes, checkout sécurisé.
2. `database/migrations/20260921_launch_hardening.sql` — verrou du rôle admin, RLS de l'historique,
   plans en lecture seule, abonnements (plan gratuit pour chaque boutique), limite produits en base,
   table KKiaPay, relances, « Aide & suggestions », limites de taille des images.

Via le CLI : `npx supabase db query --linked -f <fichier>` pour chaque fichier, ou collez-les dans le SQL Editor.

Preuve : `src/test/rls.integration.test.ts` rejoue ces migrations sur une reconstruction du schéma
de production (`database/testing/prod_snapshot.sql`) et vérifie 17 scénarios (dont la faille avant/après).

## Paiements

Fermés (`KKIAPAY_PAYMENTS_ENABLED` absent ou différent de `true`) : les plans payants affichent
« Ouverture prochaine ». Avant d'ouvrir : valider l'intégration KKiaPay contre l'API réelle
(widget officiel + vérification serveur de la transaction), clés live, webhook signé testé.

## Actions manuelles restantes

- Vérifier dans Vercel que `NEXT_PUBLIC_APP_URL=https://mystorey.vercel.app` (ou le domaine final).
- Dans Supabase Auth > URL Configuration : Site URL et Redirect URLs sur le domaine réel.
- Compléter l'adresse légale de NEXORA dans `/mentions-legales`.

## Commandes de validation

```powershell
npm run lint
npm run typecheck
npx vitest run --pool=threads --maxWorkers=1 --no-file-parallelism
npm run build
```

## Tests de bout en bout sur le site en ligne (2026-09-22)

Comptes temporaires @example.com créés puis supprimés avec toutes leurs données.
Vendeuse (mobile) : 20/20. Cliente (mobile) : 18/18. Commandes, sécurité entre vendeuses, admin : 36/36 après corrections.

## Infrastructure

`vercel.json` fixe les fonctions à Dublin (`dub1`), à côté de la base Supabase (eu-west-1).
