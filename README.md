# MYSTOREY

**La boutique en ligne des vendeuses qui vendent déjà sur WhatsApp.**

Au Bénin, des milliers de vendeuses tiennent leur commerce depuis leur statut WhatsApp, leur bio Instagram ou TikTok. Elles renvoient les mêmes photos vingt fois par jour, répondent « c'est combien ? » en boucle, et perdent des commandes au milieu des conversations. MYSTOREY leur donne un lien unique à partager : leur boutique répond à leur place, et chaque commande arrive rangée, avec son statut.

🔗 **Démo en ligne** : [mystorey-tau.vercel.app](https://mystorey-tau.vercel.app)

> **État du projet** — application déployée et fonctionnelle de bout en bout : création de compte, boutique, catalogue, vitrine publique, panier, commande et tableau de bord. **L'encaissement des abonnements n'est pas encore ouvert** : l'intégration KKiaPay attend sa validation contre l'API réelle, les plans payants affichent « Ouverture prochaine ». Le projet est donc réel et avancé, mais pas commercialement terminé.



## Le parcours, des deux côtés

**Côté vendeuse** — elle crée sa boutique depuis son téléphone (nom, lien, thème, numéro WhatsApp), ajoute ses produits avec plusieurs photos, ses couleurs, ses tailles et son stock, puis partage son lien. Son tableau de bord lui montre ses commandes et leur statut, ses clientes, ses statistiques, et lui prépare des messages WhatsApp de relance pour les commandes à confirmer ou les clientes inactives.

**Côté cliente** — elle ouvre le lien, voit tout le catalogue d'un coup, remplit son panier, choisit sa taille et sa couleur, et valide. Elle reçoit un récapitulatif complet — produits, quantités, total, adresse — prêt à envoyer sur WhatsApp à la vendeuse.

**Côté administration** — un back-office sépare la supervision de la plateforme (comptes, boutiques, produits, commandes, abonnements, retours des utilisatrices) de l'espace des vendeuses.

## Stack technique

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Components, Server Actions) |
| **Langage** | TypeScript |
| **Interface** | React 19, Tailwind CSS 4 |
| **Base de données** | PostgreSQL via Supabase, avec Row Level Security |
| **Authentification** | Supabase Auth (email, confirmation, réinitialisation) |
| **Fichiers** | Supabase Storage, images optimisées avec `sharp` |
| **Validation** | Zod |
| **Tests** | Vitest, Testing Library, PGlite (Postgres en mémoire) |
| **Déploiement** | Vercel |

## Organisation du code

```
src/
  app/              Routes : (auth), dashboard, admin, store/[slug], pages légales
  features/         Logique métier par domaine
    orders/         Checkout, messages WhatsApp, emails, erreurs
    storefront/     Vitrine publique, panier, identité de la boutique
    subscriptions/  Plans et limites
    legal/          Identité légale partagée par les pages juridiques
    phone/          Validation des numéros
  lib/              Clients Supabase (navigateur, serveur, service), utilitaires
  test/             Tests d'intégration RLS et ordre des migrations
database/
  migrations/       25 migrations SQL numérotées, rejouables
  testing/          Reconstruction du schéma de production pour les tests
```

## Les décisions techniques dont je suis contente

**La sécurité est posée dans la base, pas seulement dans l'application.** Une règle qui ne vit que dans le code JavaScript se contourne depuis la console du navigateur. Les protections importantes sont donc des politiques RLS et des triggers PostgreSQL :

- **Le checkout est une fonction SQL.** Le navigateur n'envoie que des identifiants de produits et des quantités ; le serveur recalcule chaque prix et le total depuis la base. Un panier trafiqué ne change pas ce qui est facturé.
- **Garde anti-inondation du checkout public** (`20260923_order_flood_guard.sql`) : une visiteuse anonyme est limitée à 3 commandes par numéro et 25 par boutique sur 10 minutes. La limite est en base parce que sur Vercel chaque requête peut atterrir sur une instance différente — un compteur en mémoire ne protégerait rien. Une vendeuse connectée qui saisit ses commandes à la main n'est jamais bridée.
- **Champ piège invisible** sur le formulaire de commande, refusé avant la moindre requête en base.
- **Le rôle administrateur est verrouillé en base** : un compte ne peut pas se promouvoir lui-même depuis le navigateur.
- **Chaque vendeuse ne voit que ses données** — produits, commandes, historique, relances, clientes — par politique RLS.

**Les erreurs serveur sont traçables.** `src/instrumentation.ts` écrit toute erreur non rattrapée sur une seule ligne JSON préfixée `[mystorey-error]`, filtrable dans les logs Vercel. Aucune donnée cliente n'en sort.

**L'email de nouvelle commande ne fait jamais attendre la cliente.** Il part dans `after()`, une fois la réponse rendue. Sans clé Resend configurée, rien n'est envoyé et le checkout se comporte exactement comme avant.

## Tests

```bash
npm test
```

234 tests, dont une suite d'intégration qui **rejoue les migrations sur une reconstruction du schéma de production** avec PGlite, puis vérifie les scénarios de sécurité réellement — y compris une faille avant/après correctif, et les trois cas de la garde anti-inondation.

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
```

## Installation

```bash
git clone https://github.com/princessefoly30-sudo/mystorey.git
cd mystorey
npm install
cp .env.example .env.local   # renseigner les clés Supabase
npm run dev
```

Les migrations de `database/migrations/` s'appliquent dans l'ordre des noms de fichiers, via le SQL Editor Supabase ou `npx supabase db query --linked -f <fichier>`.

## Ce qui vient ensuite

- Intégration et validation de l'agrégateur de paiement KKiaPay contre l'API réelle
- Choix du domaine définitif et alignement des URLs d'authentification et de partage
- Identité légale à compléter avant tout encaissement

## Auteure

**Princesse FOLY** — étudiante en 3e année de Licence en Informatique de gestion à l'UCAO (Bénin).

MYSTOREY est le projet sur lequel j'apprends à construire un produit complet plutôt qu'un exercice : comprendre un problème réel, modéliser les données, développer le frontend et le backend, sécuriser l'application et la déployer.
