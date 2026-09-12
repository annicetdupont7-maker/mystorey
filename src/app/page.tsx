import Link from "next/link";
import Image from "next/image";
import heroVisual from "../../public/images/new-image-landing.webp";
import "./LandingPage.css";

export default function LandingPage() {
  return (
    <div className="vendoflow-page">

      {/* ===================================================
          1. HEADER / NAVIGATION
          ================================================= */}
      <header className="vf-navbar">
        <div className="vf-nav-inner">

          <Link href="/" className="vf-brand">
            <span className="vf-brand-mark" aria-hidden="true">M</span>
            <span className="vf-brand-name">MYSTOREY</span>
          </Link>

          <input type="checkbox" id="vf-nav-toggle" className="vf-nav-toggle" />
          <label htmlFor="vf-nav-toggle" className="vf-nav-burger" aria-label="Ouvrir le menu">
            <span></span>
            <span></span>
            <span></span>
          </label>

          <div className="vf-nav-menu">
            <nav className="vf-nav-links">
              <Link href="#fonctionnalites">Fonctionnalités</Link>
              <Link href="#comment-ca-marche">Comment ça marche</Link>
              <Link href="#temoignages">Témoignages</Link>
              <Link href="#faq">Ressources</Link>
            </nav>

            <div className="vf-nav-actions">
              <Link href="/login" className="vf-login-link">
                Se connecter
              </Link>
              <Link href="/register" className="vf-btn-cta">
                Créer ma boutique <span>&rarr;</span>
              </Link>
            </div>
          </div>

        </div>
      </header>


      {/* ===================================================
          2. HERO — SECTION PRINCIPALE
          =================================================== */}
      <section className="vf-hero">
        <div className="vf-container vf-hero-grid">
          <div className="vf-hero-copy">
            <div className="vf-hero-badge"><span className="vf-kicker">YOUR SHOP. YOUR STORY.</span><span>PENSÉ POUR LES VENDEUSES AMBITIEUSES</span></div>
            <h1 className="vf-hero-title">Votre boutique mérite<br /><span className="vf-highlight">son propre espace.</span></h1>
            <p className="vf-hero-subtitle">MYSTOREY aide les vendeuses à transformer leurs produits et leurs commandes WhatsApp en une boutique en ligne claire, professionnelle et simple à gérer.</p>
            <div className="vf-hero-actions"><Link href="/register" className="vf-btn-primary">Créer ma boutique gratuitement <span aria-hidden="true">→</span></Link><a href="#comment-ca-marche" className="vf-btn-secondary">Découvrir comment ça marche</a></div>
            <div className="vf-hero-trust"><span>✓ Sans carte bancaire pour commencer</span><span>✓ Pensé pour le mobile</span></div>
          </div>
          {/* A real photo of the kind of goods our sellers actually sell, instead of the
              CSS-drawn fake browser window that was here. The floating badges state the
              value proposition in four words: one link, orders in WhatsApp. */}
          <div className="vf-hero-image-wrapper">
            {/* The hero is the LCP element, so it is preloaded. `preload` replaces the
                `priority` prop, deprecated in Next 16. Imported statically so the
                dimensions and the blur placeholder come from the file itself. */}
            <Image
              className="vf-hero-img"
              src={heroVisual}
              alt="Sacs, soins, bijoux et vêtements présentés comme dans une boutique MYSTOREY"
              sizes="(max-width: 1024px) 100vw, 540px"
              placeholder="blur"
              preload
            />
            <div className="vf-float-badge vf-float-badge--stat">
              <span className="vf-stat-arrow" aria-hidden="true">↗</span>
              <span className="vf-float-text">
                <strong>Un seul lien</strong>
                <small>à partager partout</small>
              </span>
            </div>
            <div className="vf-float-badge vf-float-badge--order">
              <span className="vf-float-icon" aria-hidden="true">💬</span>
              <span className="vf-float-text">
                <strong>Nouvelle commande</strong>
                <small>reçue sur WhatsApp</small>
              </span>
            </div>
          </div>
        </div>
      </section>


      {/* ===================================================
          4. SECTION DE VOTRE IDÉE À VOS PREMIÈRES VENTES
          ================================================= */}
      <section id="comment-ca-marche" className="vf-section vf-section--steps">
        <div className="vf-container">
          <div className="vf-section-header">
            <span className="vf-kicker">SIMPLE PAR NATURE</span>
            <h2 className="vf-section-title">
              De votre idée à vos premières<br />ventes.
            </h2>
            <p className="vf-section-lead">
              Pas de jargon technique. Pas de journées perdues à tout configurer. Seulement les outils essentiels, au bon endroit.
            </p>
          </div>

          <div className="vf-steps-card">
            <div className="vf-step-item">
              <span className="vf-step-num">01</span>
              <h3>Créez votre vitrine</h3>
              <p>Choisissez un style, ajoutez votre identité et publiez en quelques minutes.</p>
            </div>

            <div className="vf-step-item">
              <span className="vf-step-num">02</span>
              <h3>Ajoutez vos produits</h3>
                    <p>Photos, prix, descriptions et disponibilité : votre catalogue prend vie simplement.</p>
            </div>

            <div className="vf-step-item">
              <span className="vf-step-num">03</span>
              <h3>Commencez à vendre</h3>
              <p>Partagez votre lien, recevez vos commandes et suivez vos performances.</p>
            </div>
          </div>
        </div>
      </section>


      {/* ===================================================
          5. SECTION PROBLÈME / SOLUTION
          ================================================= */}
      <section className="vf-section vf-section--problem">
        <div className="vf-container">
          <div className="vf-problem-grid">
            <div className="vf-problem-copy">
              <span className="vf-kicker">LE CONSTAT</span>
              <h2 className="vf-section-title">
                Votre activité mérite mieux que des commandes dispersées.
              </h2>
              <p className="vf-section-lead">
                Entre WhatsApp, les messages privés, les captures d’écran et les notes, il devient vite difficile de savoir qui a commandé quoi.
              </p>
            </div>

            <div className="vf-problem-card">
              <ul className="vf-problem-list">
                <li>
                  <span className="vf-check" aria-hidden="true">&#10003;</span>
                  <span>Vous perdez du temps à confirmer les commandes.</span>
                </li>
                <li>
                  <span className="vf-check" aria-hidden="true">&#10003;</span>
                  <span>Vos produits sont éparpillés entre plusieurs canaux.</span>
                </li>
                <li>
                  <span className="vf-check" aria-hidden="true">&#10003;</span>
                  <span>Vos commandes arrivent dans plusieurs conversations.</span>
                </li>
                <li>
                  <span className="vf-check" aria-hidden="true">&#10003;</span>
                  <span>Vos clients attendent une réponse rapide.</span>
                </li>
                <li>
                  <span className="vf-check" aria-hidden="true">&#10003;</span>
                  <span>Vous voulez vendre en ligne sans devenir informaticien.</span>
                </li>
              </ul>
              <div className="vf-problem-punchline">
                <strong>MYSTOREY rassemble l’essentiel au même endroit.</strong>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ===================================================
          6. SECTION FONCTIONNALITÉS (BORDEAUX FONCÉ)
          ================================================= */}
      <section id="fonctionnalites" className="vf-section vf-section--features-dark">
        <div className="vf-container">
          <div className="vf-section-header vf-section-header--light">
            <span className="vf-kicker vf-kicker--light">FONCTIONNALITÉS</span>
            <h2 className="vf-section-title vf-section-title--light">
              Une boutique simple.<br />Un business plus fluide.
            </h2>
            <p className="vf-section-lead vf-section-lead--light">
              Concentrez-vous sur vos produits et vos clientes. MYSTOREY s’occupe de simplifier le reste.
            </p>
          </div>

          <div className="vf-features-grid">
            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">&#127912;</div>
              <h3>Boutique personnalisée</h3>
              <p>Une vitrine professionnelle qui s’adapte à votre marque, sans code.</p>
            </div>

            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">&#128172;</div>
              <h3>WhatsApp intégré</h3>
              <p>Facilitez les échanges avec vos clients et gardez vos conversations utiles.</p>
            </div>

            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">&#128230;</div>
              <h3>Gestion des commandes</h3>
              <p>Visualisez les nouvelles commandes et leur statut depuis un seul espace.</p>
            </div>

            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">&#128200;</div>
              <h3>Suivi de l’activité</h3>
              <p>Gardez une vue claire sur vos ventes et les performances de votre boutique.</p>
            </div>

            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">&#128666;</div>
              <h3>Commandes organisées</h3>
              <p>Suivez les informations importantes liées à vos expéditions.</p>
            </div>

            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">&#10024;</div>
              <h3>Votre identité</h3>
              <p>Couleurs, visuels et présentation : votre boutique vous ressemble.</p>
            </div>
          </div>
        </div>
      </section>


      {/* ===================================================
          7. SECTION POURQUOI MYSTOREY
          ================================================= */}
      <section className="vf-section vf-section--why">
        <div className="vf-container">
          <div className="vf-why-grid">
            <div className="vf-why-left">
              <span className="vf-kicker">POURQUOI MYSTOREY ?</span>
              <h2 className="vf-section-title">
                Vous n’avez pas besoin de plus de complexité.
              </h2>
              <p className="vf-section-lead">
                Vous avez besoin d’un outil qui vous aide à vendre, pas d’un logiciel qui vous oblige à devenir expert.
              </p>

              <ul className="vf-why-list">
                <li>
                  <span className="vf-check" aria-hidden="true">&#10003;</span>
                  <span>Une prise en main pensée pour les entrepreneurs.</span>
                </li>
                <li>
                  <span className="vf-check" aria-hidden="true">&#10003;</span>
                  <span>Une expérience claire sur téléphone et ordinateur.</span>
                </li>
                <li>
                  <span className="vf-check" aria-hidden="true">&#10003;</span>
                  <span>Des outils réunis au même endroit.</span>
                </li>
                <li>
                  <span className="vf-check" aria-hidden="true">&#10003;</span>
                  <span>Un accompagnement humain quand vous en avez besoin.</span>
                </li>
              </ul>
            </div>

            <div className="vf-why-card">
              <h3>Votre boutique peut être prête plus vite que vous ne le pensez.</h3>
              <p>
                Ajoutez vos produits, personnalisez votre vitrine et partagez votre lien. L’objectif : passer de « je veux vendre en ligne » à « voici ma boutique » sans vous perdre dans la technique.
              </p>
              <Link href="/register" className="vf-btn-primary vf-why-btn">
                Créer ma boutique <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* ===================================================
          8. SECTION EXEMPLES D'USAGE
          ================================================= */}
      <section id="temoignages" className="vf-section vf-section--testimonials">
        <div className="vf-container">
          <div className="vf-section-header">
            <span className="vf-kicker">EXEMPLES D’USAGE</span>
            <h2 className="vf-section-title">
              Une boutique plus simple,<br />pour vendre plus sereinement.
            </h2>
            <p className="vf-section-lead">
              Des situations concrètes auxquelles MYSTOREY aide les vendeuses à répondre.
            </p>
          </div>

          <div className="vf-testimonials-grid">
            <article className="vf-testi-card">
              <blockquote>
                &ldquo;Avant, je recevais mes commandes un peu partout. Maintenant, j’ai enfin une vitrine claire à partager à mes clientes.&rdquo;
              </blockquote>
              <footer>
                <div className="vf-testi-avatar">A</div>
                <div>
                  <strong>Vendre plus clairement</strong>
                  <small>Exemple d’usage</small>
                </div>
              </footer>
            </article>

            <article className="vf-testi-card">
              <blockquote>
                &ldquo;J’avais peur que créer une boutique soit compliqué. J’ai surtout aimé le fait de pouvoir commencer sans me perdre dans la technique.&rdquo;
              </blockquote>
              <footer>
                <div className="vf-testi-avatar">M</div>
                <div>
                  <strong>Rester organisée</strong>
                  <small>Exemple d’usage</small>
                </div>
              </footer>
            </article>

            <article className="vf-testi-card">
              <blockquote>
                &ldquo;Le lien de ma boutique est beaucoup plus professionnel que d’envoyer dix photos différentes dans WhatsApp.&rdquo;
              </blockquote>
              <footer>
                <div className="vf-testi-avatar">G</div>
                <div>
                  <strong>Créer une relation durable</strong>
                  <small>Exemple d’usage</small>
                </div>
              </footer>
            </article>

            <article className="vf-testi-card">
              <blockquote>
                &ldquo;Je peux présenter mes produits, recevoir les commandes et garder une meilleure organisation.&rdquo;
              </blockquote>
              <footer>
                <div className="vf-testi-avatar">N</div>
                <div>
                  <strong>Suivre ses commandes</strong>
                  <small>Exemple d’usage</small>
                </div>
              </footer>
            </article>

            <article className="vf-testi-card">
              <blockquote>
                &ldquo;Ce que j’aime, c’est la simplicité. Je peux me concentrer sur mes produits et mes clients au lieu de passer mon temps à gérer la technique.&rdquo;
              </blockquote>
              <footer>
                <div className="vf-testi-avatar">S</div>
                <div>
                  <strong>Gagner du temps</strong>
                  <small>Exemple d’usage</small>
                </div>
              </footer>
            </article>

            <article className="vf-testi-card">
              <blockquote>
                &ldquo;Ma boutique donne tout de suite une image plus sérieuse de mon activité.&rdquo;
              </blockquote>
              <footer>
                <div className="vf-testi-avatar">P</div>
                <div>
                  <strong>Raconter son univers</strong>
                  <small>Exemple d’usage</small>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </section>


      {/* ===================================================
          9. SECTION OFFRE / TARIFS
          ================================================= */}
      <section id="tarifs" className="vf-section vf-section--pricing">
        <div className="vf-container">
          <div className="vf-section-header">
            <span className="vf-kicker">TARIFS</span>
            <h2 className="vf-section-title">
              Commencez gratuitement.<br />Payez seulement si vous grandissez.
            </h2>
            <p className="vf-section-lead">
              Tout le monde démarre sur le plan gratuit, sans carte bancaire. Vous changez de plan depuis votre tableau de bord uniquement quand votre catalogue devient trop grand.
            </p>
          </div>

          <div className="vf-pricing-wrapper">
            <div className="vf-pricing-card">
              <div className="vf-pricing-tag">POUR COMMENCER</div>
              <h3>Découverte</h3>
              <div className="vf-pricing-amount">
                <span className="vf-price-val">0 FCFA</span>
                <span className="vf-price-period">pour toujours</span>
              </div>
              <p className="vf-pricing-sub">Sans carte bancaire &middot; Sans engagement</p>

              <ul className="vf-pricing-list">
                <li><span className="vf-check">&#10003;</span> Jusqu&apos;à <strong>10 produits</strong></li>
                <li><span className="vf-check">&#10003;</span> Boutique en ligne personnalisable</li>
                <li><span className="vf-check">&#10003;</span> Commandes directes sur WhatsApp</li>
                <li><span className="vf-check">&#10003;</span> Catégories et produit à la une</li>
                <li><span className="vf-check">&#10003;</span> Tableau de bord et suivi des commandes</li>
              </ul>

              <Link href="/register" className="vf-btn-primary vf-pricing-btn">
                Créer ma boutique <span>&rarr;</span>
              </Link>
            </div>

            <div className="vf-pricing-card vf-pricing-card--featured">
              <div className="vf-pricing-tag">BIENTÔT</div>
              <h3>Plus</h3>
              <div className="vf-pricing-amount">
                <span className="vf-price-val">2 000 FCFA</span>
                <span className="vf-price-period">par mois</span>
              </div>
              <p className="vf-pricing-sub">Quand vos 10 produits ne suffisent plus</p>

              <ul className="vf-pricing-list">
                <li><span className="vf-check">&#10003;</span> Jusqu&apos;à <strong>20 produits</strong></li>
                <li><span className="vf-check">&#10003;</span> Tout ce que contient Découverte</li>
                <li><span className="vf-check">&#10003;</span> Mensuel, résiliable à tout moment</li>
              </ul>

              <Link href="/register" className="vf-btn-secondary vf-pricing-btn">
                Commencer par le plan gratuit
              </Link>
            </div>

            <div className="vf-pricing-card">
              <div className="vf-pricing-tag">BIENTÔT</div>
              <h3>Pro</h3>
              <div className="vf-pricing-amount">
                <span className="vf-price-val">2 500 FCFA</span>
                <span className="vf-price-period">par mois</span>
              </div>
              <p className="vf-pricing-sub">Pour une boutique bien fournie</p>

              <ul className="vf-pricing-list">
                <li><span className="vf-check">&#10003;</span> Jusqu&apos;à <strong>100 produits</strong></li>
                <li><span className="vf-check">&#10003;</span> Tout ce que contient Découverte</li>
                <li><span className="vf-check">&#10003;</span> Mensuel, résiliable à tout moment</li>
              </ul>

              <Link href="/register" className="vf-btn-secondary vf-pricing-btn">
                Commencer par le plan gratuit
              </Link>
            </div>
          </div>

          <p className="vf-pricing-note">
            Le plan gratuit est disponible dès maintenant. Les plans payants ouvriront prochainement : la seule différence est le nombre de produits que vous pouvez publier — toutes les autres fonctionnalités sont incluses dans le plan gratuit. Vous serez prévenue depuis votre tableau de bord.
          </p>
        </div>
      </section>


      {/* ===================================================
          10. SECTION FAQ
          ================================================= */}
      <section id="faq" className="vf-section vf-section--faq">
        <div className="vf-container">
          <div className="vf-section-header">
            <span className="vf-kicker">QUESTIONS FRÉQUENTES</span>
            <h2 className="vf-section-title">
              Tout savoir avant de commencer.
            </h2>
          </div>

          <div className="vf-faq-accordion">
            <details className="vf-faq-item">
              <summary className="vf-faq-summary">
                <span>Faut-il savoir coder ?</span>
                <span className="vf-faq-arrow" aria-hidden="true">+</span>
              </summary>
              <div className="vf-faq-body">
                <p>Non, absolument aucun code n’est nécessaire. Tout se configure visuellement en quelques clics depuis votre téléphone ou votre ordinateur.</p>
              </div>
            </details>

            <details className="vf-faq-item">
              <summary className="vf-faq-summary">
                <span>Puis-je gérer ma boutique depuis mon téléphone ?</span>
                <span className="vf-faq-arrow" aria-hidden="true">+</span>
              </summary>
              <div className="vf-faq-body">
                <p>Oui, MYSTOREY est pensé pour le mobile. Vous pouvez ajouter des produits, modifier vos prix et suivre vos commandes directement depuis votre smartphone.</p>
              </div>
            </details>

            <details className="vf-faq-item">
              <summary className="vf-faq-summary">
                <span>Puis-je personnaliser ma boutique ?</span>
                <span className="vf-faq-arrow" aria-hidden="true">+</span>
              </summary>
              <div className="vf-faq-body">
                <p>Oui, vous pouvez adapter les couleurs, ajouter votre logo, bannière, descriptions et organiser vos produits par catégories.</p>
              </div>
            </details>

            <details className="vf-faq-item">
              <summary className="vf-faq-summary">
                <span>Comment mes clients passent-ils commande ?</span>
                <span className="vf-faq-arrow" aria-hidden="true">+</span>
              </summary>
              <div className="vf-faq-body">
                <p>Vos clients parcourent votre vitrine, ajoutent leurs articles au panier et finalisent leur commande. Le récapitulatif détaillé vous est automatiquement transmis sur WhatsApp.</p>
              </div>
            </details>

            <details className="vf-faq-item">
              <summary className="vf-faq-summary">
                <span>Le plan gratuit est-il vraiment gratuit ?</span>
                <span className="vf-faq-arrow" aria-hidden="true">+</span>
              </summary>
              <div className="vf-faq-body">
                <p>Oui, vous pouvez créer votre boutique et vendre sans aucun frais caché ni carte bancaire requise.</p>
              </div>
            </details>
          </div>
        </div>
      </section>


      {/* ===================================================
          11. CTA FINAL (BORDEAUX FONCÉ)
          ================================================= */}
      <section className="vf-cta-final">
        <div className="vf-container vf-cta-final-inner">
          <h2 className="vf-cta-final-title">
            Votre talent mérite<br />sa boutique.
          </h2>
          <p className="vf-cta-final-sub">
            Arrêtez de gérer votre activité dans tous les sens. Créez un espace clair pour présenter vos produits, recevoir vos commandes et développer votre activité.
          </p>
          <div className="vf-cta-final-actions">
            <Link href="/register" className="vf-btn-primary vf-btn-primary--light">
              Créer ma boutique gratuitement <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>


      {/* ===================================================
          12. FOOTER
          ================================================= */}
      <footer className="vf-footer">
        <div className="vf-container">
          <div className="vf-footer-grid">

            <div className="vf-footer-brand">
              <div className="vf-brand">
                <span className="vf-brand-mark" aria-hidden="true">M</span>
                <span className="vf-brand-name vf-brand-name--light">MYSTOREY</span>
              </div>
              <p>
                La plateforme simple et élégante pour créer votre boutique en ligne et développer vos ventes sur WhatsApp.
              </p>
            </div>

            <div className="vf-footer-col">
              <h4>Produit</h4>
              <Link href="#fonctionnalites">Fonctionnalités</Link>
              <Link href="#comment-ca-marche">Comment ça marche</Link>
              <Link href="#tarifs">Tarifs</Link>
              <Link href="/register">Créer ma boutique</Link>
            </div>

            <div className="vf-footer-col">
              <h4>Espace vendeur</h4>
              <Link href="/login">Se connecter</Link>
              <Link href="/dashboard">Mon tableau de bord</Link>
              <Link href="/register">Devenir vendeur</Link>
            </div>

            <div className="vf-footer-col">
              <h4>Assistance</h4>
              <Link href="#faq">Questions fréquentes</Link>
              <Link href="/contact">Contact / Support</Link>
              <Link href="/politique-confidentialite">Politique de confidentialité</Link>
              <Link href="/conditions-utilisation">Conditions d’utilisation</Link>
              <Link href="/mentions-legales">Mentions légales</Link>
            </div>

          </div>

          <div className="vf-footer-bottom">
            <p>&copy; 2026 MYSTOREY &middot; Your shop. Your story.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
