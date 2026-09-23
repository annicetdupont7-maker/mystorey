# MYSTOREY - Launch Checklist

Dernière vérification : 2026-09-23

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
de production (`database/testing/prod_snapshot.sql`) et vérifie 20 scénarios (dont la faille avant/après).

## Paiements

Fermés (`KKIAPAY_PAYMENTS_ENABLED` absent ou différent de `true`) : les plans payants affichent
« Ouverture prochaine ». Avant d'ouvrir : valider l'intégration KKiaPay contre l'API réelle
(widget officiel + vérification serveur de la transaction), clés live, webhook signé testé.

## Migration du 2026-09-23 — À APPLIQUER en production

`database/migrations/20260923_order_flood_guard.sql` — garde anti-inondation du
checkout public : 3 commandes par numéro et 25 par boutique sur 10 minutes, posées
en base (un compteur en mémoire ne protège rien sur Vercel, chaque requête pouvant
atterrir sur une instance différente). Une vendeuse connectée n'est jamais bridée.

```powershell
npx supabase db query --linked -f database/migrations/20260923_order_flood_guard.sql
```

Preuve : `src/test/rls.integration.test.ts` rejoue la migration sur le schéma de
production reconstruit et vérifie les trois cas (même numéro, rafale multi-numéros,
vendeuse non bridée).

## Actions manuelles restantes

Par ordre : rien en dessous ne sert tant que le point 1 n'est pas fait.

### 1. Domaine — BLOQUANT

Aujourd'hui le site répond sur `mystorey-tau.vercel.app` alors que le code retombe sur
`mystorey.vercel.app`. Tant que les trois réglages ci-dessous ne désignent pas la
**même** adresse, les liens de confirmation d'email, les aperçus de partage WhatsApp
et le sitemap pointent ailleurs que le site.

1. Choisir l'adresse définitive (domaine propre ou adresse Vercel), et s'y tenir.
2. Vercel > Settings > Environment Variables : `NEXT_PUBLIC_APP_URL` = cette adresse,
   **sans slash final**, sur Production ET Preview.
3. Supabase > Authentication > URL Configuration : `Site URL` = cette adresse, et
   `Redirect URLs` contient `<adresse>/auth/callback`.
4. Redéployer, puis vérifier en créant un compte jetable : le lien reçu par email
   doit pointer sur l'adresse choisie et la connexion aboutir.

### 2. Identité légale — BLOQUANT avant tout encaissement

Remplir `src/features/legal/entity.ts` : dénomination exacte, forme juridique, adresse
complète du siège, numéro d'immatriculation (RCCM), identifiant fiscal, responsable de
la publication. Les champs vides ne s'affichent pas — la page reste propre mais
incomplète au sens de la loi. Un seul fichier à éditer, les trois pages juridiques
suivent.

### 3. Email de nouvelle commande — fortement recommandé

Sans lui, une commande dont la cliente n'envoie pas le message WhatsApp n'alerte
personne : elle dort dans le tableau de bord.

1. Créer un compte sur resend.com (gratuit jusqu'à 3 000 envois/mois) et y vérifier
   le domaine de l'adresse d'envoi.
2. Vercel > Environment Variables : `RESEND_API_KEY` et
   `ORDER_EMAILS_FROM` (ex. `MYSTOREY <commandes@mondomaine>`).
3. Redéployer, passer une commande de test sur une vraie boutique, vérifier la
   réception. Sans ces deux variables, aucun email ne part et le checkout est
   inchangé — il n'y a rien à désactiver.

### 4. Paiements KKiaPay — quand une vendeuse atteindra 10 produits

Rien ne presse : le plan gratuit couvre 10 produits. Dans l'ordre, le jour venu :
compte marchand validé → les 3 clés **live** dans Vercel → webhook pointé sur
`<adresse>/api/webhooks/kkiapay` et signature vérifiée → un vrai achat de bout en bout
→ `KKIAPAY_PAYMENTS_ENABLED=true`. Le renouvellement et l'expiration mensuelle n'ont
jamais tourné sur des données réelles : les éprouver avant d'ouvrir à toutes.

FedaPay et Wave ont des routes de webhook mais aucune clé et aucun test : ne pas les
ouvrir tant que KKiaPay n'est pas rodé.

### 5. Surveillance

Les erreurs serveur sont désormais journalisées sur une ligne préfixée
`[mystorey-error]` (`src/instrumentation.ts`). Dans Vercel > Observability > Logs,
filtrer sur ce préfixe, et y jeter un œil après chaque déploiement.

## Commandes de validation

```powershell
npm run lint
npm run typecheck
npx vitest run --pool=threads --maxWorkers=1 --no-file-parallelism
npm run build
```

## Tests de bout en bout sur le site en ligne (2026-09-22)

Comptes temporaires @example.com créés puis supprimés avec toutes leurs données.
Vendeuse (mobile) : 20/20. Cliente (mobile) : 17/18 — le point restant était une erreur du test (texte en majuscules via CSS), pas du site.
Commandes, sécurité entre vendeuses, admin : 34/36 au premier passage ; les 2 points (chargement lent de l'accueil admin, message traité qui disparaissait) ont été corrigés et revérifiés en ligne.

## Infrastructure

`vercel.json` fixe les fonctions à Dublin (`dub1`), à côté de la base Supabase (eu-west-1).
