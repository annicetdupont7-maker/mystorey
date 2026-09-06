# MYSTOREY - Procédure de recette contrôlée

Dernière mise à jour : 2026-09-04

## Règle de décision

Ne jamais déclarer MYSTOREY prête pour le lancement public avant d'avoir obtenu des preuves sur :

- une base Supabase de recette vierge ;
- le projet Supabase actuel après sauvegarde ;
- deux comptes vendeuses distincts et un compte administrateur ;
- les paiements sandbox FedaPay et Wave ;
- les webhooks reçus et traités ;
- les limites de produits, expirations et changements de plan ;
- le parcours mobile réel.

Cette procédure ne demande aucune clé de production. Utiliser uniquement les projets, comptes et clés sandbox jusqu'à la validation complète.

## 1. Prérequis

Installer ou préparer :

- Node.js 24 ou version compatible avec le projet ;
- npm ;
- Git ;
- un projet Supabase de recette séparé du projet de production ;
- un accès administrateur au dashboard Supabase ;
- un compte sandbox FedaPay ;
- un compte sandbox Wave, si Wave est activé pour le pays concerné ;
- deux adresses email de test vendeuses (`vendeuse-a` et `vendeuse-b`) ;
- un troisième compte de test administrateur ;
- un téléphone réel Android ou iOS et un navigateur mobile ;
- une URL HTTPS publique temporaire pour recevoir les webhooks, par exemple un tunnel de recette approuvé par l'équipe.

Ne pas utiliser `SUPABASE_SECRET_KEY`, les clés de paiement réelles ou les comptes clients réels dans cette recette.

## 2. Installer et vérifier le CLI Supabase

### Option recommandée sous Windows avec Scoop

Dans PowerShell :

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
supabase --version
```

Si Scoop n'est pas installé, suivre sa procédure officielle d'installation, puis reprendre ces commandes.

### Option sans installation globale

Depuis le dépôt :

```powershell
npx supabase --version
```

Utiliser ensuite `npx supabase` à la place de `supabase` dans toutes les commandes. Vérifier la version affichée et conserver cette version dans le compte-rendu de recette.

## 3. Se connecter et vérifier le bon projet

Se connecter avec un compte Supabase autorisé :

```powershell
supabase login
```

La commande ouvre une procédure d'authentification. Ne coller jamais un token dans un fichier du dépôt.

Depuis la racine de MYSTOREY, lier explicitement le projet de recette :

```powershell
supabase link --project-ref <PROJECT_REF_RECETTE>
```

Le `PROJECT_REF_RECETTE` est visible dans l'URL du projet Supabase et dans `Project Settings > General`. Ne pas le déduire du nom du projet.

Vérifier l'identité du projet avant toute migration :

```powershell
supabase projects list
supabase status
```

Contrôles manuels obligatoires dans le dashboard Supabase :

1. Le nom et l'organisation correspondent à MYSTOREY recette.
2. L'URL du projet correspond à `NEXT_PUBLIC_SUPABASE_URL` de recette.
3. Le projet n'est pas le projet de production.
4. Une sauvegarde ou un point de restauration est disponible avant toute opération sur une base existante.

Vérifier localement l'URL sans afficher de secret :

```powershell
Select-String -Path .env.local -Pattern '^NEXT_PUBLIC_SUPABASE_URL='
```

## 4. Préparer les variables d'environnement sandbox

Créer ou modifier `.env.local` uniquement sur la machine de recette. Ne pas commiter ce fichier.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref-recette>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<cle-publishable-recette>
SUPABASE_SECRET_KEY=<cle-service-recette>
NEXT_PUBLIC_APP_URL=https://<url-https-recette>

FEDAPAY_PUBLIC_KEY=<cle-publique-sandbox>
FEDAPAY_SECRET_KEY=<cle-secrete-sandbox>
FEDAPAY_MERCHANT_ID=<merchant-sandbox>
FEDAPAY_WEBHOOK_SECRET=<secret-webhook-sandbox>

WAVE_API_KEY=<cle-api-sandbox>
WAVE_MERCHANT_ID=<merchant-sandbox>
WAVE_WEBHOOK_SECRET=<secret-webhook-sandbox>
```

Les noms exacts des variables sont ceux attendus par le code. Confirmer dans le dashboard de chaque fournisseur que le compte est bien en mode test/sandbox. Ne jamais mettre une clé secrète dans une variable `NEXT_PUBLIC_*`.

Redémarrer le serveur après toute modification :

```powershell
npm run dev
```

## 5. Vérifier l'ordre et appliquer les migrations sans destruction

Les migrations du dépôt sont dans `database/migrations`, pas dans le dossier standard `supabase/migrations`. Le CLI Supabase ne doit donc pas être lancé directement contre ce dossier comme s'il s'agissait d'un historique CLI standard.

Avant toute application :

```powershell
Get-ChildItem database/migrations -Filter *.sql | Sort-Object Name | Select-Object -ExpandProperty Name
```

Résultat attendu : ordre lexical croissant, notamment :

1. `20260828_subscription_plans.sql` avant les migrations de paiements ;
2. `20260901_wave_payments.sql` avant `20260902_fedapay_payments.sql` ;
3. `20260904_launch_security.sql` avant `20260906_reengagement.sql`.

### Base vierge de recette

1. Créer un projet Supabase de recette séparé.
2. Appliquer d'abord le schéma initial et toutes les migrations du dépôt dans l'ordre affiché.
3. Si l'équipe adopte `supabase db push`, copier les migrations dans un dossier `supabase/migrations` **après revue et validation**, sans supprimer ni renommer l'historique source. Cette adaptation de structure doit être documentée et revue avant exécution.
4. Utiliser le SQL Editor Supabase pour une première recette si l'historique CLI n'est pas encore initialisé.
5. Exécuter chaque migration dans l'ordre et arrêter au premier échec.

À contrôler dans `Database > Tables` après exécution : `profiles`, `stores`, `products`, `orders`, `subscription_plans`, `seller_subscriptions`, `wave_payments`, `fedapay_payments`, `customer_contacts` et `reengagement_logs`.

### Base actuelle avec données

1. Exporter un backup avant migration depuis Supabase.
2. Vérifier le nombre de lignes des tables métier et conserver ces nombres.
3. Exécuter d'abord les migrations sur le projet vierge.
4. Vérifier ensuite que chaque migration est idempotente en la rejouant dans une copie de recette.
5. Appliquer au projet actuel uniquement après succès de la recette vierge et validation humaine.
6. Ne jamais utiliser `supabase db reset` sur la base actuelle.
7. Après application, comparer les nombres de lignes, les index, les contraintes, les policies RLS et les colonnes avant/après.

Commandes utiles après configuration du CLI :

```powershell
supabase db diff --linked
supabase db push --dry-run
```

Si la version installée ne supporte pas `--dry-run`, ne pas improviser : utiliser le SQL Editor sur la base vierge ou inspecter le SQL généré avant toute exécution.

## 6. Vérifier les tables et les RLS

Dans Supabase SQL Editor, exécuter les contrôles suivants sur le projet de recette :

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'stores', 'store_themes', 'products', 'categories', 'orders',
    'order_status_history', 'subscription_plans', 'seller_subscriptions',
    'wave_payments', 'fedapay_payments', 'customer_contacts', 'reengagement_logs'
  )
order by tablename;

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Résultat attendu : `rowsecurity = true` pour toutes les tables contenant des données privées ou mutables. Les tables publiques doivent exposer uniquement les lectures prévues des boutiques publiées et produits disponibles.

Vérifier aussi les privilèges :

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'seller_subscriptions', 'wave_payments', 'fedapay_payments', 'reengagement_logs')
order by table_name, grantee, privilege_type;
```

## 7. Test d'isolation avec deux vendeuses

Créer les comptes A et B via l'interface d'inscription et créer une boutique pour chacune.

Pour chaque compte :

1. Créer un produit distinct identifiable (`PRODUIT-A`, `PRODUIT-B`).
2. Créer une commande dans sa propre boutique.
3. Ajouter une préférence de relance et un historique dans sa propre boutique.
4. Vérifier que le dashboard ne montre que ses données.

Tentatives négatives à réaliser avec le compte A :

- ouvrir directement les URLs de la boutique B dans le dashboard ;
- modifier ou supprimer un produit de B en envoyant son identifiant dans une Server Action ;
- lire la commande de B ;
- lire ou modifier l'abonnement, le paiement ou les relances de B ;
- modifier `profiles.role` de A en `admin` via l'API Supabase publishable.

Résultat attendu : aucune donnée de B n'est lisible ou modifiable par A, toutes les mutations croisées échouent, et le rôle de A reste `seller`.

Conserver les résultats et les identifiants de test dans un compte-rendu hors dépôt, sans stocker de token.

## 8. Vérifier les montants FCFA

Avant tout paiement sandbox, vérifier dans `subscription_plans` :

```sql
select id, name, price, product_limit
from public.subscription_plans
order by price;
```

Résultat attendu :

| Plan | Montant mensuel | Limite |
| --- | ---: | ---: |
| free | 0 FCFA | 5 |
| growth | 2 000 FCFA | 20 |
| pro | 5 000 FCFA | 100 |

Vérifier les tentatives :

```sql
select plan_id, amount, status, provider, created_at
from public.fedapay_payments
union all
select plan_id, amount, status, provider, created_at
from public.wave_payments
order by created_at desc;
```

Le montant applicatif doit rester en entier XOF/FCFA. Pour FedaPay, confirmer dans la documentation sandbox si l'API attend l'unité FCFA ou la plus petite unité avant d'activer le fournisseur. Le code et la base doivent utiliser une seule convention documentée ; toute conversion doit être faite une seule fois, côté client fournisseur, puis vérifiée par le webhook.

Tests négatifs : tenter une insertion avec `amount = 200000` pour un plan à `2 000`, un mauvais `plan_id`, un montant décimal ou un statut initial différent de `pending`. Toutes doivent être refusées.

## 9. Configurer et vérifier les webhooks

Créer une URL HTTPS publique vers l'application de recette :

```text
https://<url-recette>/api/webhooks/fedapay
https://<url-recette>/api/webhooks/wave
```

Dans les dashboards sandbox :

1. Déclarer l'URL correspondant au fournisseur.
2. Activer les événements de succès et d'échec.
3. Copier le secret de signature dans la variable serveur correspondante.
4. Vérifier le nom exact de l'en-tête de signature attendu par le fournisseur.
5. Envoyer un événement de test et vérifier un code HTTP 200 pour un événement valide.

Le webhook doit :

- refuser une signature absente ou incorrecte ;
- retrouver la tentative par identifiant fournisseur ;
- vérifier le statut et le montant attendus ;
- mettre à jour le paiement ;
- activer l'abonnement uniquement après succès confirmé ;
- traiter deux fois le même événement sans créer de doublon ni prolonger abusivement l'abonnement.

## 10. Tester FedaPay et Wave en sandbox

Pour chaque fournisseur et pour `growth` puis `pro` :

1. Partir d'une boutique au plan `free`.
2. Capturer le montant affiché et le montant de la ligne de paiement en base.
3. Lancer le checkout sandbox depuis `/dashboard/subscriptions`.
4. Réaliser un paiement sandbox réussi avec les données de test du fournisseur.
5. Vérifier l'événement webhook reçu dans les logs du fournisseur et de l'application.
6. Vérifier que `payment.status` devient `approved`/`completed` et que l'abonnement devient `active` avec `payment_status = paid`.
7. Rejouer le même webhook et vérifier l'idempotence.
8. Réaliser un paiement sandbox refusé ou annulé.
9. Vérifier que le plan reste `free` ou revient à son état précédent et que la tentative est `declined`/`failed`/`cancelled`.

Ne pas considérer la page de retour du fournisseur comme preuve de paiement. La seule preuve est l'état confirmé en base après webhook authentifié.

## 11. Expiration, renouvellement et downgrade

Sur une boutique de test, via SQL Editor de recette uniquement :

```sql
update public.seller_subscriptions
set status = 'active', payment_status = 'paid', expires_at = now() - interval '1 minute'
where store_id = '<STORE_ID_TEST>';
```

Résultat attendu : l'ajout d'un nouveau produit est refusé pour un plan payant expiré.

Tester ensuite :

1. renouvellement réussi via un nouveau paiement sandbox ; l'abonnement redevient actif avec une expiration correcte ;
2. échec de renouvellement ; le plan payant n'est pas conservé comme actif ;
3. downgrade vers `free` ; les produits existants sont conservés, mais l'ajout est bloqué au-delà de 5 ;
4. downgrade vers `growth` ; les produits existants sont conservés, mais l'ajout est bloqué au-delà de 20 ;
5. aucun produit n'est supprimé automatiquement.

## 12. Limites de produits

Sur trois boutiques de test :

- plan `free` : créer 5 produits, vérifier que le 6e est refusé ;
- plan `growth` : créer 20 produits, vérifier que le 21e est refusé ;
- plan `pro` : créer 100 produits, vérifier que le 101e est refusé.

Répéter les tentatives avec :

- appel normal de l'interface ;
- appel direct de la Server Action ;
- deux créations simultanées ;
- produit dupliqué ou import multiple, si ces fonctions sont activées.

Résultat attendu : la limite est refusée côté serveur et en base, même si le client est modifié. Une erreur claire propose de changer de plan. Les produits existants restent intacts après downgrade.

## 13. Tester les relances WhatsApp

Avec des commandes réelles de recette :

1. Créer une commande avec nom et téléphone valides, puis la laisser en statut à confirmer.
2. Ouvrir `/dashboard/marketing` et vérifier la candidate correspondante.
3. Autoriser les relances pour le contact de test.
4. Vérifier le nom, le numéro, le numéro de commande et le montant dans le message généré.
5. Cliquer sur l'action WhatsApp et vérifier que le message est prérempli, sans envoi automatique.
6. Marquer la relance effectuée et vérifier `reengagement_logs`.
7. Recharger la page : la relance récente doit être bloquée pendant la fenêtre anti-répétition.
8. Utiliser « Ne plus relancer » et vérifier que le contact disparaît des candidates.
9. Créer une commande ancienne de plus de 30 jours avec téléphone et vérifier la candidate inactive.
10. Répéter le test avec un contact sans téléphone : il ne doit pas être relançable.

Résultat attendu : aucune API WhatsApp automatique n'est revendiquée ou utilisée dans ce MVP.

## 14. Test mobile

Sur Android et iOS, en Wi-Fi puis réseau mobile :

1. Ouvrir la landing page.
2. S'inscrire et terminer l'onboarding.
3. Ajouter un produit avec image.
4. Ouvrir la boutique publique.
5. Ajouter au panier, remplir le checkout et ouvrir WhatsApp.
6. Revenir au dashboard et traiter une commande.
7. Ouvrir la page relances et lancer une relance.
8. Tester rotation portrait/paysage, clavier ouvert, boutons, modales et scroll horizontal.

Résultat attendu : aucun texte ou bouton ne déborde, les actions principales restent accessibles au pouce, les erreurs et états de chargement sont visibles, et les liens WhatsApp ouvrent l'application ou le navigateur attendu.

## 15. Preuves à conserver

Conserver hors dépôt :

- version du CLI et `PROJECT_REF` de recette ;
- export/backup avant migration ;
- sortie des requêtes RLS et privilèges ;
- captures des montants sandbox ;
- identifiants de paiement non secrets ;
- logs webhook succès, échec et rejeu ;
- résultats des tests A/B d'isolation ;
- vidéos ou captures des parcours mobiles.

Ne jamais conserver de clé secrète, token de session, mot de passe ou donnée cliente réelle.

## 16. Critères de déclaration « prête »

MYSTOREY pourra être déclarée **prête avec réserves** uniquement si :

- toutes les migrations passent sur une base vierge et une copie de la base actuelle ;
- les backups et la procédure de restauration sont confirmés ;
- les RLS refusent tous les accès croisés avec deux vendeuses ;
- les paiements sandbox réussis et échoués sont confirmés par webhook ;
- les montants et devises sont cohérents sans double conversion ;
- les rejouements webhook sont idempotents ;
- les expirations, renouvellements et downgrades sont vérifiés ;
- les limites 5/20/100 sont bloquées côté serveur sous concurrence ;
- les relances sont testées avec consentement, opt-out et anti-répétition ;
- les parcours mobiles sont validés ;
- `npm run lint`, `npm run typecheck`, `npm run build` et les tests passent.

Elle restera **pas encore prête** si un seul de ces points est non testé ou échoue. Le lancement public ne doit commencer qu'après remplacement des clés sandbox par les clés de production lors d'une étape séparée, avec une nouvelle recette de fumée.

## Commandes locales finales

```powershell
npm run lint
npm run typecheck
npm run build
npx vitest run --pool=threads --maxWorkers=1 --no-file-parallelism
```

Cette recette ne remplace pas les tests d'intégration Supabase et fournisseurs : ceux-ci nécessitent les projets et comptes sandbox réels décrits ci-dessus.
