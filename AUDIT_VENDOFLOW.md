# VENDOFLOW — ÉTAT ACTUEL

Audit réalisé en **lecture seule** — aucun fichier créé ou modifié, aucune migration, aucun changement de design. Faits vérifiés dans le code (sinon indiqué « Non vérifié dans le code »).

---

## 1. Résumé

VendoFlow est une plateforme SaaS de **boutiques en ligne sans paiement** (type « catalogue + vente par WhatsApp »), pour l'écosystème **FCFA / Afrique de l'Ouest**. Un vendeur crée sa boutique, y publie des produits, la personnalise (thème + identité), la partage publiquement et reçoit ses commandes sur son **WhatsApp**. Aucun paiement en ligne : la commande est enregistrée côté plateforme puis le client est redirigé vers WhatsApp pour finaliser. Un **back-office administrateur** supervise toute la plateforme (utilisateurs, boutiques, produits, commandes).

Stack : **Next.js 16.3.3 (Turbopack), React 19, TypeScript, Tailwind CSS v4, Supabase** (auth + base de données + stockage), `lucide-react`, **Zod** (validation), **Vitest 4** (tests).

État global : **fonctionnel et cohérent**. Build, lint, typecheck et les 116 tests passent. Les missions successives (éditeur produit, catégories, partage, back-office, identité de boutique) sont livrées et vérifiées.

---

## 2. Architecture & stack technique

**Frontend / runtime**
- Next.js 16.3.3 — App Router, React Server Components, Server Actions (`"use server"`), Turbopack. Node 24, Windows.
- React 19 (hooks, `useActionState`, `flushSync`), TypeScript.
- Tailwind CSS v4 (`@import "tailwindcss"`), lucide-react pour les icônes.
- CSS global custom dans `globals.css` (905 lignes) avec variables de design tokens (`--ink`, `--brand`, `--surface`, etc.).

**Backend / données**
- Supabase : auth (email/mot de passe), base PostgreSQL (RLS), storage (buckets `product-images`, `store-images`).
- SDK `@supabase/ssr` côté serveur, `@supabase/supabase-js` côté navigateur.
- **3 clients** dans `src/lib/supabase/` : `server.ts` (cookie-based, RLS appliqué), `client.ts` (publique), `admin.ts` (`SUPABASE_SECRET_KEY` service role, utilisée SEULEMENT par l'admin et les opérations serveur sensibles).

**Tests** : Vitest 4 (jsdom, `fileParallelism:false`, `maxWorkers:1`), 16 fichiers de test, 116 tests, tous verts.

**Scripts** : `dev`, `build` (next build), `lint` (eslint --cache), `typecheck` (tsc --noEmit), `test` (vitest run).

---

## 3. Structure du projet

- `src/app/` — routes (layout racine, pages)
- `src/features/` — modules métier : `auth`, `stores`, `products`, `categories`, `orders`, `sharing`, `storefront`, `themes`, `insights`, `admin`, `dashboard`
- `src/lib/supabase/` — clients
- `src/proxy.ts` — middleware (rewrite/proxy)
- `migrations/` — 11 fichiers SQL idempotents (0x)
- `package.json`, `tsconfig.json`, `vitest.config.ts`, compose ESLint/TypeScript

Modules dans `src/features/` :
- `auth/` : `actions.ts`, `schemas.ts`, `admin.ts`, composant `auth-form.tsx`
- `stores/` : `data.ts`, `actions.ts`, `schemas.ts`, composants (`onboarding-form`, `settings-form`, `identity-form`, `appearance-editor`, dashboard)
- `products/` : `data.ts`, `actions.ts`, `schemas.ts`, `product-form`, `product-manager`, `delete-product-button`
- `categories/` : `actions.ts`, `data.ts`, `category-manager`, `filter.ts`
- `orders/` : `data.ts`, `actions.ts`, `checkout-actions.ts`, `types`, `schemas`, `status-badge`, `status-changer`, `order-quick-actions`, `order-create-form`, `messages`, `overview`
- `sharing/` : `share.ts`, `share-sheet.tsx`
- `storefront/` : `storefront-types.ts`, `components.tsx`, `whatsapp.ts`
- `themes/` : `theme-schema.ts`, `presets.ts`, `resolve-theme.ts`, `components/theme-preview.tsx`
- `insights/` : `types.ts`, `rules/` (insights, todos), `components/insight-card.tsx`
- `admin/` : `data.ts`, `actions.ts`, `schemas.ts`, `stats.ts`, `types.ts`, `components/` (nav, views)
- `dashboard/` : `dashboard-shell.tsx`, pages

---

## 4. Routes & navigation

Routes publiques :
- `/` — page d'accueil (rend `ThemePreview`, vitrine de démonstration du système de thèmes)
- `/store/[slug]` — vitrine publique d'une boutique (force-dynamic, `notFound` si absent, page « bientôt disponible » si non publiée)
- `/store/[slug]/produit/[productId]` — page produit publique
- `/login`, `/register`, `/forgot-password`, `/reset-password` — authentification (`AuthForm`)
- `/auth/callback` — retour OAuth/callback
- `/_not-found`

Espace vendeur (dashboard) :
- `/dashboard` — accueil + KPIs + insights + todo
- `/dashboard/products`, `/dashboard/products/[id]`, `/dashboard/products/new`
- `/dashboard/categories`
- `/dashboard/orders`
- `/dashboard/settings`
- `/dashboard/storefront` — identité (logo, slogan, présentation, couverture)
- `/dashboard/storefront/appearance` — éditeur d'apparence/thème
- `/onboarding` — création initiale de la boutique

Back-office (`/admin`, protégé `requireAdmin`) :
- `/admin` (dashboard), `/admin/users`, `/admin/users/[id]`, `/admin/users/[id]/preview`
- `/admin/stores`, `/admin/products`, `/admin/orders`

**Navigation dashboard** (sidebar + header) : Accueil (Sparkles), Produits (LayoutGrid), Catégories (Tags), Commandes (ClipboardList), Ma boutique `/dashboard/storefront` (BadgeCheck, exact), Apparence `/dashboard/storefront/appearance` (Store), Paramètres `/dashboard/settings` (Settings). Header : marque « V », bouton de partage de la boutique, déconnexion.

**Navigation admin** (sidebar sombre) : Dashboard (LayoutDashboard), Utilisateurs (Users), Boutiques (Store), Produits (Package), Commandes (ClipboardList), + lien retour « Mon espace vendeur ».

---

## 5. Parcours utilisateur / parcours type

1. **Inscription / connexion** : `/register` puis `/login`. `auth/actions.ts` → `register` (signUp + redirect `/onboarding` si session), `login`, `logout`.
2. **Onboarding** : `/onboarding` crée la boutique (infos + thème de départ). Redirige vers `/dashboard` si une boutique existe déjà.
3. **Création de produits** : `/dashboard/products` → ajouter/modifier. Nom, note, description, prix FCFA, image, disponibilité, vedette, catégorie.
4. **Gestion des catégories** : `/dashboard/categories`.
5. **Identité de boutique** : `/dashboard/storefront` — logo, slogan, présentation, image de couverture, WhatsApp.
6. **Apparence** : `/dashboard/storefront/appearance` — thème + personnalisation avancée.
7. **Publication & partage** : la boutique devient publique, liens partage + QR + réseaux sociaux.
8. **Achat côté client** : `/store/[slug]` → panier (drawer) → checkout (coordonnées) → commande enregistrée + redirection WhatsApp.
9. **Traitement des commandes** : `/dashboard/orders` — changement de statut, messages WhatsApp préremplis.
10. **Supervision** : `/admin` (utilisateur admin uniquement).

---

## 6. Dashboard vendeur

- **Accueil** (`/dashboard` via `dashboard-shell.tsx`) : KPIs (boutique, produits, commandes, revenus), insights contextualisés (`features/insights`), todo list de démarrage, carte « vedette » de la boutique, boutons d'action rapide, partage.
- **Produits** : liste pro avec recherche, filtre catégorie/statut, aperçu, badges (à la une, indisponible, catégorie). Éditeur sur 2 colonnes dans `product-editor-grid` (~1fr + 320px) avec aperçu sticky, upload drag & drop, toggles disponibilité/vedette.
- **Catégories** : `category-manager` — créer, renommer inline, supprimer (avec compteur produit).
- **Commandes** : liste de cartes, filtres par statut, changement de statut, création manuelle, envoi de messages WhatsApp, aperçu.
- **Paramètres** : numéro WhatsApp, slug, statut, déconnexion.

---

## 7. Gestion des produits

- Modèle : `id, store_id, name, note, description, price (entier FCFA ≤ 1e8), image_url, is_available, is_featured, category_id, created_at`.
- Validations (Zod) : name ≤ 100, note ≤ 120, description ≤ 1000, price entier ≤ 1e8, image JPG/PNG/WebP ≤ 5 Mo, stockées dans le bucket `product-images` sous `${userId}/${uuid}.{ext}`.
- Statuts : disponible / indisponible (caché de la vitrine publique — migration `20260901c_hide_unavailable_products`), vedette (tri prioritaire + badge).
- Éditeur : `ProductEditor` avec aperçu temps réel, compteur de caractères, toggles, catégorie.

---

## 8. Catégories

- Table `categories` (`id, store_id, name`). Propriétaire de boutique uniquement (RLS).
- Dashboard : **créer / renommer / supprimer** (garde le fait qu'une suppression détache des produits).
- Vitrine : filtres par catégorie (`category-chip`), `categoriesWithProducts` (catégories non vides) + `filterProductsByCategory` dans `features/categories/filter.ts`.

---

## 9. Boutique (dashboard)

- Création via onboarding ; champs : `name, slug, description, whatsapp, status (draft|published), slogan, logo_url, cover_url, owner_id`.
- **Identité** (`/dashboard/storefront` → `IdentityForm`) : logo (placeholder lettre ou image), nom ≤80, slogan ≤120, présentation ≤500, couverture (1600×900 recommandé, PNG/JPG/WebP), WhatsApp. Aperçu réel avec `Storefront` + `themeCssVariables`.
- **Apparence** (`appearance-editor.tsx`) : thème de départ, palette (4 couleurs), boutons/cartes, disposition (grille/liste, colonnes 2-4, espacement), structure (header style, hero variant). Enregistrer brouillon ou publier.
- Publication : `status = "published"` → visible sur `/store/[slug]`.

---

## 10. Storefront (vitrine publique)

- **Système de thèmes** (`features/themes`) : 7 presets (`elegant, minimal, luxury, modern, bold, natural, colorful`), chacun avec palette, typographies (titre/corps), style de boutons (`soft|sharp|pill`), style de cartes (`flat|outlined|elevated`), rayon 0-32px, ombre, disposition. `resolveStoreTheme` fusionne preset + overrides + layout. Variables CSS `--store-*` exposées par `themeCssVariables`.
- **Hero** : 5 variantes (`banner, editorial, split, featured, compact`). Rend nom, slogan, logo, description, couverture ; `featured` met en avant un produit.
- **Composants** : `StoreHeader` (logo + lien), `StoreHero`, `ProductGrid`/`ProductList`, `ProductCard` (badge « À la une », prix, bouton ajouter), `CartDrawer` (panier + checkout), `StoreFooter`, `StoreProductPage`.
- **Sections** : tagline (slogan) + filtres catégories + catalogue + « À propos de {name} » (si description) + footer.
- **Panier** : `cart-bubble` flottant, drawer avec quantité, étape checkout (nom, téléphone, adresse, note), validation, redirection WhatsApp.

---

## 11. Page produit publique

`/store/[slug]/produit/[productId]` : layout 2 colonnes (image + infos). Affiche image, eyebrow, nom, note, prix, bouton « Ajouter », lien « Voir toute la boutique ». Gère l'indisponibilité (« Ce produit est indisponible pour le moment. »). Panier + checkout utilisables sur cette page. `notFound()` si boutique non publiée ou produit absent de la boutique.

---

## 12. Commandes & checkout

- **Statuts** : `new, to_confirm, confirmed, preparing, shipped, delivered, cancelled`. `ORDER_STATUS_META` avec couleurs (violet/amber/blue/cyan/indigo/green/red). `order_number` (#VF-0001).
- **Checkout public** (`checkout-actions.ts` + RPC `create_checkout_order`) : enregistre la commande (customer name/phone/address, items, total) puis ouvre WhatsApp avec le récapitulatif. Fichier de validation `orders/schemas.ts`.
- **Dashboard commandes** : cartes détaillées (client, articles, total, statut, note), filtres par statut avec compteurs, changement de statut (`status-changer`), **création manuelle** (`order-create-form`), **messages WhatsApp préremplis** (`messages.ts`), aperçu, actions rapides.
- **Overview** (`orders/overview.ts`) : stats total/pending/week/weekend, alimente aussi les insights.

---

## 13. Partage

- `features/sharing` : `productShareUrl` → `/store/{slug}/produit/{id}`, `storeShareUrl` → `/store/{slug}`.
- Versions WhatsApp / Facebook / Instagram + QR code (api.qrserver.com).
- `ShareSheet` : modal avec aperçu (image/logo, nom, prix), lien copiable, boutons de partage, toggle QR, retours visuels.

---

## 14. Back-office admin

- Protection `requireAdmin` (`auth/admin.ts`, notFound si rôle ≠ admin) ; fonction SQL `is_admin()` (security definer) ; rôle `seller|admin` dans `profiles`.
- **Coquille sombre distincte** (`admin-shell`) : sidebar violet/dark, topbar « Back-office », déconnexion.
- **Dashboard** : 6 KPIs (comptes, vendeurs, boutiques, produits, commandes, CA), commandes récentes, activité récente.
- **Utilisateurs** : liste (email, rôle, statut, nb boutiques) + **fiche utilisateur** (rôle éditable, stats, boutiques) + **aperçu « voir comme »** (`/admin/users/[id]/preview`) avec bandeau preview et `disableCheckout` (lecture seule du storefront).
- **Boutiques / Produits / Commandes** : listes détaillées avec recherche, filtres, pagination, badges, actions.
- `data.ts` utilise le service client sur `auth.admin.listUsers`, `auth.admin.getUserById`.
- `actions.ts` : `updateUserRole` (empêche de rétrograder le dernier admin). Pagination via `admin-pagination`.

---

## 15. Design & charte actuelle

- **Identité produit** : « Premium, chaleureux, moderne, technologique, non genré » (en-tête de `globals.css`).
- **Tokens système** (`:root`) : `--ink #21232d`, `--ink-soft #5c6072`, `--paper #f7f3ec` (fond crème), `--surface #fffdf8`, `--line #eae0d1`, `--brand #d9644a` (terracotta), `--brand-deep #b34a33`, `--ok/warn/danger`, accents violet/blue/cyan/indigo, `--radius 16px`, ombres douces.
- **Typographies** : `--font-sans` = Segoe UI/system-ui ; `--font-display` = Georgia serif (titres de page). Eyebrow uppercase crème (`vf-eyebrow`).
- **Composants** : `.vf-button` (arrondis, micro-interactions translateY), `.nav-item` (pill nav « navette » dans `#f0e9dc`), cartes ombragées, `status` colorés, `tag` colorés, toggles custom, upload zones pointillées, share modal (backdrop blur + animation). Sidebar admin sombre (#1c1f2e) + violet.
- **Storefront** : entièrement piloté par variables `--store-*` (visuel par vendeur, indépendant de la charte VendoFlow).

---

## 16. Système de design

Il n'existe **pas de Storybook ni de librairie de composants dédiée**. Le « design system » est un ensemble cohérent de **classes CSS utilitaires dans `globals.css`** + tokens CSS + composants React locaux :
- Composants/classes réutilisables : `vf-button` (+ variantes ghost/dark/sm/danger), `text-button`, `icon-button`, `field`, `field-input`, `field-error`/`field-hint`, `form-error`/`form-success`, `toggle-row`/`toggle-control`, `tag`, `badge`, `status`, `panel`, `kpi`, `empty-state`, `banner-warn`/`banner-inline`, `visually-hidden`, `muted`, `vf-eyebrow`, `admin-*`, `store-*`, `cart-*`, `share-*`.
- Conventions d'accessibilité : `focus-visible` (3px brand), `prefers-reduced-motion` (désactive animations), `aria-label`, `aria-live` pour feedbacks, `visually-hidden`. Classes `is-active`, `is-selected`, `is-added`, `is-visible` pour états.

---

## 17. Base de données

Schéma (11 migrations idempotentes) :
- **profiles** : `user_id, display_name, role (seller|admin), created_at`
- **stores** : `id, owner_id, name, slug, description, whatsapp, status (draft|published), slogan, logo_url, cover_url, created_at`
- **products** : `id, store_id, name, note, description, price, image_url, is_available, is_featured, category_id, created_at`
- **categories** : `id, store_id, name` (RLS propriétaire)
- **orders** : `id, store_id, order_number, customer_name, customer_phone, customer_address, total, status, note, items, created_at`
- **store_themes** : `store_id, preset_id, overrides (jsonb), layout (jsonb), version`
- **Fonctions/RPC** : `is_admin()` (security definer), `create_checkout_order`.
- **Buckets storage** : `product-images` (par `${userId}/…` + RLS), `store-images` (logos + couvertures + RLS).

Migrations (ordre) : `20260827_auth_stores`, `20260828_full_schema`, `20260828_products`, `20260829_public_read_grants`, `20260830_whatsapp_orders`, `20260831_admin_roles`, `20260901_orders_featured`, `20260901c_hide_unavailable_products`, `20260902_orders_checkout`, `20260903_product_categories`, `20260904_store_identity`.

---

## 18. Sécurité

- **RLS jamais désactivé** sur les tables ; le secret (`SUPABASE_SECRET_KEY`) est réservé au serveur (client admin). Le navigateur n'utilise que la clé **publishable/anon**.
- `.env.local` : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publiques) + `SUPABASE_SECRET_KEY` (serveur, **jamais exposée**).
- Auth : `requireUser` (redirect /login), `requireAdmin` (notFound). Rôles contrôlés. `auth.admin.listUsers/getUserById` limités au service role.
- Uploads limités (type + taille) et stockés sous `userId`, couverts par RLS.
- Anti-rétrogradation : ne pas retirer le dernier admin.
- Aucun secret commité. (Non vérifié dans le code : réglages détaillés de password/email templates Supabase.)

---

## 19. Responsive / accessibilité

- **Breakpoints** : 640 (preset picker), 700 (admin mobile — sidebar devient horizontale), 760 (grille vitrine 2 colonnes mobile, hero split/featured empilés, dashboard-nav arrondi, panier/share modaux), 860 (kpis 4 col), 900 (dashboard-grid, appearance/identity 2 col), 960 (admin-panels 2 col), 1024 (product-editor 1 col), 1180 (admin-kpis 6 col).
- Mobile : nav horizontale scrollable (pill), modales en bas d'écran, tableaux scrollables horizontalement.
- Accessibilité : focus visibles, `prefers-reduced-motion`, `aria-live`, labels, `role="dialog"` sur paniers, `aria-current`. Adapté et cohérent.

---

## 20. Ce qui est terminé

Toutes les missions planifiées sont **livrées et vérifiées** :
- Éditeur produit complet (aperçu, upload, toggles, validation) ✅
- Catégories (dashboard + filtres vitrine) ✅
- Partage (liens + réseaux + QR) ✅
- Back-office admin (dashboard, utilisateurs + fiche + « voir comme », boutiques, produits, commandes) ✅
- Identité de boutique (logo + slogan + présentation + couverture, bucket `store-images`, RLS) ✅ — vérifié live (pages publiques 200)
- Thèmes / personnalisation d'apparence ✅
- Panier + checkout WhatsApp + gestion des commandes ✅
- Tests : 116 verts ; typecheck/lint/build propres.

---

## 21. En cours de réalisation

Le **rapport d'audit 24 sections** est la seule tâche en cours ; aucune autre mission n'est active. La recette de la « mission identité » (vérification en prod) est terminée.

---

## 22. Ce qui est absent / à faire (écarts relevés)

Absent du code (prévu mais non implémenté) :
- **Paiement en ligne** — le flux est volontairement sans paiement (virement/WhatsApp). Non vérifié dans le code : intention de paiement à terme.
- **Notifications temps réel** (live) pour nouvelles commandes — pas de WebSocket/Realtime visible.
- **Système de livraison / tracking intégré** — seule l'adresse est collectée au checkout.
- **Avis/notes clients** sur les produits, **blog**, **CRM client**, **IA** (suggestions/rédaction) — non présents.
- **Multi-magasins / multi-vendeurs avancé** dans les insights (géré au niveau admin).
- **i18n** (interface entièrement en français, pas de mécanisme de localisation multi-langue détecté).
- Aucun Storybook.

---

## 23. Points faibles / risques identifiés

- **Base CSS monolithique** (`globals.css` 905 lignes, très peu de composants isolés) → difficile à faire évoluer au fil du temps.
- **Pas de système de composants réutilisables** (pas de Storybook / UI kit) — la cohérence repose sur la discipline manuelle.
- **Design storefront généré par variables** : un mauvais choix de couleurs par un vendeur peut casser lisibilité/contraste (peu de garde-fous de contraste côté vitrine).
- **Paiement absent** : le tunnel se termine par WhatsApp ; pas de garantie de règlement, pas de frais de livraison calculés automatiquement.
- **Pas de notifications temps réel** : le vendeur doit recharger la page pour voir de nouvelles commandes.
- **Secret key** manipulée côté serveur — risque si elle fuit ; le stockage reste sur `.env.local` (non commité).

---

## 24. Contraintes & recommandation pour le redesign

**Contraintes**
- Ne pas toucher à la logique métier : le redesign doit rester **factuel/visuel**.
- Préserver les tokens `--brand`, `--paper`, `--surface`, `--ink` comme socle de cohérence.
- La vitrine des vendeurs est **pilotée par l'utilisateur** (variables `--store-*`) : le redesign de l'app shell (dashboard/admin/auth) et le redesign du storefront doivent rester différenciés.
- Garder la lisibilité des états (focus, réduit-motion, aria) et la compatibilité mobile.
- Toute refonte devra recompiler `globals.css` en gardant les mêmes noms de classes (le markup Nest fait référence à ces classes), ou prévoir une migration de classes en même temps.
- Next 16 (Turbopack) : pas de `next/image` côté vitrine (images `<img>` dynamiques/Unsplash), à surveiller pour le LCP.

**Recommandation**
Pour la refonte UI/visuelle à confier à ChatGPT, commencer par :
1. Une **rationalisation / composantisation** du design system (extraire les classes récurrentes en vrais composants + tokens structurés), sans casser les noms de classes existants.
2. Un **redesign de l'app shell** (dashboard + admin) sur la base de la charte actuelle (crème + terracotta, verre, ombres douces) avec une identité premium cohérente.
3. Un **retravail de la vitrine** en rendant les presets plus distincts et en ajoutant des **garde-fous de contraste** pour les couleurs choisies par les vendeurs.
4. Garder le flux « catalogue → panier → WhatsApp » inchangé (logique métier), en ne touchant qu'à la présentation.
