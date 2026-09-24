# MYSTOREY

La boutique en ligne des vendeuses qui vendent déjà sur WhatsApp.

Au Bénin, des milliers de vendeuses tiennent leur commerce depuis leur statut WhatsApp, leur bio Instagram ou TikTok. Elles renvoient les mêmes photos vingt fois par jour, répondent à « c'est combien ? » en boucle, et perdent des commandes au milieu des conversations. MYSTOREY leur donne un lien unique à partager : leur boutique répond à leur place, et chaque commande arrive rangée, avec son statut.

Démo en ligne : [mystorey-tau.vercel.app](https://mystorey-tau.vercel.app)

## État du projet

L'application est déployée et fonctionne de bout en bout : création de compte, boutique, catalogue, vitrine publique, panier, commande et tableau de bord.

L'encaissement des abonnements n'est pas encore ouvert. L'intégration KKiaPay attend sa validation contre l'API réelle, et les plans payants affichent « Ouverture prochaine ». Le projet est donc réel et avancé, mais pas commercialement terminé.

## Le parcours, des deux côtés

Côté vendeuse, elle crée sa boutique depuis son téléphone : le nom, le lien, un thème, son numéro WhatsApp. Elle ajoute ses produits avec plusieurs photos, ses couleurs, ses tailles et son stock, puis partage son lien. Son tableau de bord lui montre ses commandes et leur statut, ses clientes, ses statistiques, et lui prépare des messages WhatsApp de relance pour les commandes à confirmer ou les clientes inactives.

Côté cliente, elle ouvre le lien, voit tout le catalogue d'un coup, remplit son panier, choisit sa taille et sa couleur, et valide. Elle reçoit un récapitulatif complet, avec les produits, les quantités, le total et l'adresse, prêt à envoyer sur WhatsApp à la vendeuse.

Côté administration, un back-office sépare la supervision de la plateforme, c'est-à-dire les comptes, les boutiques, les produits, les commandes, les abonnements et les retours des utilisatrices, de l'espace des vendeuses.

## Technologies

Next.js 16 avec l'App Router, les Server Components et les Server Actions, en TypeScript.

React 19 et Tailwind CSS 4 pour l'interface.

PostgreSQL via Supabase, avec Row Level Security, Supabase Auth pour les comptes et Supabase Storage pour les photos, optimisées avec sharp.

Zod pour la validation, Vitest et Testing Library pour les tests, PGlite pour rejouer le schéma de production en mémoire.

Déploiement sur Vercel.

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

La sécurité est posée dans la base, pas seulement dans l'application. Une règle qui ne vit que dans le code JavaScript se contourne depuis la console du navigateur. Les protections importantes sont donc des politiques RLS et des triggers PostgreSQL.

Le checkout est une fonction SQL. Le navigateur n'envoie que des identifiants de produits et des quantités, et le serveur recalcule chaque prix et le total depuis la base. Un panier trafiqué ne change pas ce qui est facturé.

Une garde anti-inondation protège le checkout public. Une visiteuse anonyme est limitée à 3 commandes par numéro et 25 par boutique sur 10 minutes. La limite est en base parce que sur Vercel chaque requête peut atterrir sur une instance différente, donc un compteur en mémoire ne protégerait rien. Une vendeuse connectée qui saisit ses commandes à la main n'est jamais bridée.

Un champ piège invisible est posé sur le formulaire de commande, et il est refusé avant la moindre requête en base.

Le rôle administrateur est verrouillé en base : un compte ne peut pas se promouvoir lui-même depuis le navigateur.

Chaque vendeuse ne voit que ses données, qu'il s'agisse des produits, des commandes, de l'historique, des relances ou des clientes, par politique RLS.

Les erreurs serveur sont traçables. Le fichier `src/instrumentation.ts` écrit toute erreur non rattrapée sur une seule ligne JSON préfixée `[mystorey-error]`, filtrable dans les logs Vercel. Aucune donnée cliente n'en sort.

L'email de nouvelle commande ne fait jamais attendre la cliente. Il part dans `after()`, une fois la réponse rendue. Sans clé Resend configurée, rien n'est envoyé et le checkout se comporte exactement comme avant.

## Tests

```bash
npm test
```

234 tests, dont une suite d'intégration qui rejoue les migrations sur une reconstruction du schéma de production avec PGlite, puis vérifie les scénarios de sécurité réellement, y compris une faille avant et après correctif, et les trois cas de la garde anti-inondation.

```bash
npm run typecheck
npm run lint
```

## Installation

```bash
git clone https://github.com/princessefoly30-sudo/mystorey.git
cd mystorey
npm install
cp .env.example .env.local
npm run dev
```

Renseignez les clés Supabase dans `.env.local`. Les migrations de `database/migrations/` s'appliquent dans l'ordre des noms de fichiers, via le SQL Editor Supabase ou avec `npx supabase db query --linked -f <fichier>`.

## Ce qui vient ensuite

Intégrer et valider l'agrégateur de paiement KKiaPay contre l'API réelle.

Choisir le domaine définitif et aligner les URLs d'authentification et de partage.

Compléter l'identité légale avant tout encaissement.

## Auteure

Princesse FOLY, étudiante en 3e année de Licence en Informatique de gestion à l'UCAO, au Bénin.

MYSTOREY est le projet sur lequel j'apprends à construire un produit complet plutôt qu'un exercice : comprendre un problème réel, modéliser les données, développer le frontend et le backend, sécuriser l'application et la déployer.
