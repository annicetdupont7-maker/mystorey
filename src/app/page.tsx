import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import heroVisual from "../../public/images/new-image-landing.webp";
import "./LandingPage.css";

export const metadata: Metadata = {
  title: { absolute: "MYSTOREY — Votre boutique en ligne en un seul lien" },
  alternates: { canonical: "/" },
};

// Everything on this page is a capability that exists today. No testimonials, no
// numbers of users, no "X% more sales": MYSTOREY has none of those yet, so it shows
// the problem it solves and exactly how.
const CLIENT_QUESTIONS = [
  "C’est combien ?",
  "Envoie-moi encore la photo stp",
  "Tu as quelle couleur ?",
  "C’est encore disponible ?",
  "Il y a ma taille ?",
  "Comment je commande ?",
];

const CHAT_TIMES = ["09:12", "09:14", "10:03", "11:27", "13:45", "16:08"];

export default function LandingPage() {
  return (
    <div className="vendoflow-page">
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
              <Link href="#probleme">Pourquoi</Link>
              <Link href="#comment-ca-marche">Comment ça marche</Link>
              <Link href="#tarifs">Tarifs</Link>
              <Link href="#faq">Questions</Link>
            </nav>
            <div className="vf-nav-actions">
              <Link href="/login" className="vf-login-link">Se connecter</Link>
              <Link href="/register" className="vf-btn-cta">Créer ma boutique <span>&rarr;</span></Link>
            </div>
          </div>
        </div>
      </header>

      {/* 1. Hero — the promise, in the seller's words */}
      <section className="vf-hero">
        <div className="vf-container vf-hero-grid">
          <div className="vf-hero-copy">
            <div className="vf-hero-badge"><span className="vf-kicker">POUR LES VENDEUSES</span><span>WHATSAPP · INSTAGRAM · TIKTOK</span></div>
            <h1 className="vf-hero-title">Arrêtez de renvoyer<br />les mêmes photos.<br /><span className="vf-highlight">Envoyez votre boutique.</span></h1>
            <p className="vf-hero-subtitle">Vos produits, vos prix et vos couleurs réunis derrière un seul lien. Vos clientes choisissent seules, commandent en quelques secondes, et la commande complète arrive sur votre WhatsApp.</p>
            <div className="vf-hero-actions">
              <Link href="/register" className="vf-btn-primary">Créer ma boutique gratuite <span aria-hidden="true">→</span></Link>
              <a href="#comment-ca-marche" className="vf-btn-secondary">Voir comment ça marche</a>
            </div>
            <div className="vf-hero-trust"><span>✓ Gratuit jusqu’à 10 produits</span><span>✓ Sans carte bancaire</span><span>✓ Tout se fait depuis le téléphone</span></div>
          </div>
          <div className="vf-hero-image-wrapper">
            {/* The hero is the LCP element, so it is preloaded. */}
            <Image
              className="vf-hero-img"
              src={heroVisual}
              alt="Sacs, soins, bijoux et vêtements présentés comme dans une boutique MYSTOREY"
              sizes="(max-width: 1024px) 100vw, 540px"
              placeholder="blur"
              preload
            />
            <div className="vf-float-badge vf-float-badge--stat">
              <span className="vf-stat-arrow" aria-hidden="true">🔗</span>
              <span className="vf-float-text"><strong>Un seul lien</strong><small>dans votre statut et votre bio</small></span>
            </div>
            <div className="vf-float-badge vf-float-badge--order">
              <span className="vf-float-icon" aria-hidden="true">💬</span>
              <span className="vf-float-text"><strong>Commande complète</strong><small>reçue sur WhatsApp</small></span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. The problem — messages every seller knows by heart */}
      <section id="probleme" className="vf-section vf-section--problem">
        <div className="vf-container">
          <div className="vf-problem-grid">
            <div className="vf-problem-copy">
              <span className="vf-kicker">VOUS CONNAISSEZ CES MESSAGES</span>
              <h2 className="vf-section-title">Toute la journée, les mêmes questions.</h2>
              <p className="vf-section-lead">Vous répondez, vous renvoyez les photos, vous redonnez les prix… et souvent, la cliente disparaît avant de commander. Pendant ce temps, les autres messages attendent.</p>
            </div>
            <div className="vf-chat" aria-label="Exemple de conversation WhatsApp">
              {CLIENT_QUESTIONS.map((question, index) => (
                <p key={question} className="vf-chat-bubble">{question}<small>{CHAT_TIMES[index]}</small></p>
              ))}
              <p className="vf-chat-seen">… puis plus de nouvelles de la cliente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The answer */}
      <section className="vf-section vf-section--solution">
        <div className="vf-container">
          <div className="vf-section-header">
            <span className="vf-kicker">LA SOLUTION</span>
            <h2 className="vf-section-title">Une seule réponse : votre lien.</h2>
            <p className="vf-section-lead">Votre boutique MYSTOREY répond à votre place, jour et nuit. Vous gardez WhatsApp pour ce qui compte : confirmer et livrer.</p>
          </div>
          <div className="vf-compare">
            <div className="vf-compare-col vf-compare-col--before">
              <h3>Sans boutique</h3>
              <ul>
                <li>Vous renvoyez les photos une par une</li>
                <li>« C’est combien ? » vingt fois par jour</li>
                <li>Les commandes se perdent dans les discussions</li>
                <li>Vous ne savez plus qui a payé, qui attend</li>
              </ul>
            </div>
            <div className="vf-compare-col vf-compare-col--after">
              <h3>Avec MYSTOREY</h3>
              <ul>
                <li>Toutes vos photos et vos prix, visibles d’un coup</li>
                <li>Couleurs, tailles et stock affichés clairement</li>
                <li>La cliente remplit son panier et vous envoie un récapitulatif complet sur WhatsApp</li>
                <li>Chaque commande est rangée dans votre espace, avec son statut</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How it works — concrete, three steps */}
      <section id="comment-ca-marche" className="vf-section vf-section--steps">
        <div className="vf-container">
          <div className="vf-section-header">
            <span className="vf-kicker">COMMENT ÇA MARCHE</span>
            <h2 className="vf-section-title">Votre boutique en ligne aujourd’hui.</h2>
            <p className="vf-section-lead">Pas d’ordinateur, pas de technique. On vous guide à chaque étape.</p>
          </div>
          <div className="vf-steps-card">
            <div className="vf-step-item">
              <span className="vf-step-num">01</span>
              <h3>Créez votre boutique</h3>
              <p>Son nom, votre lien, un style parmi nos thèmes, votre numéro WhatsApp. C’est tout.</p>
            </div>
            <div className="vf-step-item">
              <span className="vf-step-num">02</span>
              <h3>Ajoutez vos produits</h3>
              <p>Une photo prise avec votre téléphone, un nom, un prix. Ajoutez les couleurs et les tailles si besoin.</p>
            </div>
            <div className="vf-step-item">
              <span className="vf-step-num">03</span>
              <h3>Partagez votre lien</h3>
              <p>Dans votre statut WhatsApp, votre bio Instagram ou TikTok. Les commandes arrivent sur WhatsApp et dans votre tableau de bord.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. What is included — only what exists */}
      <section id="fonctionnalites" className="vf-section vf-section--features-dark">
        <div className="vf-container">
          <div className="vf-section-header vf-section-header--light">
            <span className="vf-kicker vf-kicker--light">INCLUS DÈS LE PLAN GRATUIT</span>
            <h2 className="vf-section-title vf-section-title--light">Tout ce qu’il faut pour vendre.<br />Rien de compliqué.</h2>
          </div>
          <div className="vf-features-grid">
            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">🎨</div>
              <h3>Une boutique à votre image</h3>
              <p>Votre nom, votre logo, vos couleurs. Plusieurs thèmes prêts à l’emploi.</p>
            </div>
            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">📸</div>
              <h3>Photos, couleurs, tailles</h3>
              <p>Plusieurs photos par produit, et un seul produit pour toutes ses couleurs.</p>
            </div>
            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">💬</div>
              <h3>Commandes sur WhatsApp</h3>
              <p>La cliente valide son panier : vous recevez produits, quantités, total et adresse.</p>
            </div>
            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">📦</div>
              <h3>Suivi des commandes</h3>
              <p>Confirmée, en préparation, en livraison, livrée : vous savez où en est chaque commande.</p>
            </div>
            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">🔗</div>
              <h3>Lien et QR code</h3>
              <p>À partager partout, ou à imprimer pour votre stand et vos emballages.</p>
            </div>
            <div className="vf-feature-box">
              <div className="vf-feature-icon-bubble" aria-hidden="true">🤝</div>
              <h3>Une équipe qui vous répond</h3>
              <p>Un souci, une question ? Écrivez-nous depuis votre espace, rubrique « Aide ».</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing — paid plans are honestly "not open yet" */}
      <section id="tarifs" className="vf-section vf-section--pricing">
        <div className="vf-container">
          <div className="vf-section-header">
            <span className="vf-kicker">TARIFS</span>
            <h2 className="vf-section-title">Gratuit pour commencer.<br />Vraiment.</h2>
            <p className="vf-section-lead">Tout le monde démarre sur le plan gratuit, sans carte bancaire. La seule différence entre les plans : le nombre de produits.</p>
          </div>

          <div className="vf-pricing-wrapper">
            <div className="vf-pricing-card vf-pricing-card--featured">
              <div className="vf-pricing-tag">DISPONIBLE</div>
              <h3>Découverte</h3>
              <div className="vf-pricing-amount">
                <span className="vf-price-val">0 FCFA</span>
                <span className="vf-price-period">pour toujours</span>
              </div>
              <p className="vf-pricing-sub">Sans carte bancaire · Sans engagement</p>
              <ul className="vf-pricing-list">
                <li><span className="vf-check">&#10003;</span> Jusqu&apos;à <strong>10 produits</strong></li>
                <li><span className="vf-check">&#10003;</span> Boutique à vos couleurs</li>
                <li><span className="vf-check">&#10003;</span> Commandes sur WhatsApp</li>
                <li><span className="vf-check">&#10003;</span> Couleurs, tailles et stock</li>
                <li><span className="vf-check">&#10003;</span> Suivi des commandes</li>
              </ul>
              <Link href="/register" className="vf-btn-primary vf-pricing-btn">Créer ma boutique <span>&rarr;</span></Link>
            </div>

            <div className="vf-pricing-card">
              <div className="vf-pricing-tag">OUVERTURE PROCHAINE</div>
              <h3>Plus</h3>
              <div className="vf-pricing-amount">
                <span className="vf-price-val">2 000 FCFA</span>
                <span className="vf-price-period">par mois</span>
              </div>
              <p className="vf-pricing-sub">Quand 10 produits ne suffisent plus</p>
              <ul className="vf-pricing-list">
                <li><span className="vf-check">&#10003;</span> Jusqu&apos;à <strong>20 produits</strong></li>
                <li><span className="vf-check">&#10003;</span> Tout le plan Découverte</li>
              </ul>
            </div>

            <div className="vf-pricing-card">
              <div className="vf-pricing-tag">OUVERTURE PROCHAINE</div>
              <h3>Pro</h3>
              <div className="vf-pricing-amount">
                <span className="vf-price-val">2 500 FCFA</span>
                <span className="vf-price-period">par mois</span>
              </div>
              <p className="vf-pricing-sub">Pour une boutique bien fournie</p>
              <ul className="vf-pricing-list">
                <li><span className="vf-check">&#10003;</span> Jusqu&apos;à <strong>100 produits</strong></li>
                <li><span className="vf-check">&#10003;</span> Tout le plan Découverte</li>
              </ul>
            </div>
          </div>

          <p className="vf-pricing-note">Les plans payants ne sont pas encore ouverts : aucun paiement ne vous sera demandé aujourd’hui. Vous serez prévenue depuis votre tableau de bord à leur ouverture.</p>
        </div>
      </section>

      {/* 7. FAQ — the real questions, honest answers */}
      <section id="faq" className="vf-section vf-section--faq">
        <div className="vf-container">
          <div className="vf-section-header">
            <span className="vf-kicker">QUESTIONS FRÉQUENTES</span>
            <h2 className="vf-section-title">Avant de commencer.</h2>
          </div>
          <div className="vf-faq-accordion">
            {[
              ["Faut-il un ordinateur ou savoir coder ?", "Non. Tout se fait depuis votre téléphone : créer la boutique, prendre les photos, ajouter les prix, suivre les commandes."],
              ["Mes clientes doivent-elles créer un compte ?", "Non. Elles ouvrent votre lien, choisissent, indiquent leur nom et leur numéro, puis vous envoient la commande sur WhatsApp."],
              ["Comment je reçois l’argent de mes ventes ?", "Comme aujourd’hui : vous vous arrangez avec votre cliente (Mobile Money, paiement à la livraison…). MYSTOREY ne prélève rien sur vos ventes et ne touche pas à votre argent."],
              ["Comment je reçois une commande ?", "La cliente valide son panier : la commande est enregistrée dans votre tableau de bord, et WhatsApp s’ouvre chez elle avec le récapitulatif complet à vous envoyer."],
              ["Je vends la même robe en plusieurs couleurs ?", "Créez un seul produit, puis ajoutez ses couleurs (ou tailles), chacune avec sa photo et son stock si vous le souhaitez."],
              ["Combien ça coûte ?", "Rien jusqu’à 10 produits. Des plans à 2 000 et 2 500 FCFA par mois ouvriront prochainement pour les boutiques qui ont besoin de plus de produits."],
            ].map(([question, answer]) => (
              <details className="vf-faq-item" key={question}>
                <summary className="vf-faq-summary"><span>{question}</span><span className="vf-faq-arrow" aria-hidden="true">+</span></summary>
                <div className="vf-faq-body"><p>{answer}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final CTA */}
      <section className="vf-cta-final">
        <div className="vf-container vf-cta-final-inner">
          <h2 className="vf-cta-final-title">Ce soir, envoyez votre lien<br />au lieu de vos photos.</h2>
          <p className="vf-cta-final-sub">Créez votre boutique maintenant : dans quelques minutes, vous aurez un lien à mettre dans votre statut.</p>
          <div className="vf-cta-final-actions">
            <Link href="/register" className="vf-btn-primary vf-btn-primary--light">Créer ma boutique gratuite <span>&rarr;</span></Link>
          </div>
        </div>
      </section>

      <footer className="vf-footer">
        <div className="vf-container">
          <div className="vf-footer-grid">
            <div className="vf-footer-brand">
              <div className="vf-brand">
                <span className="vf-brand-mark" aria-hidden="true">M</span>
                <span className="vf-brand-name vf-brand-name--light">MYSTOREY</span>
              </div>
              <p>La boutique en ligne simple des vendeuses qui vendent sur WhatsApp, Instagram et TikTok.</p>
            </div>
            <div className="vf-footer-col">
              <h4>Produit</h4>
              <Link href="#comment-ca-marche">Comment ça marche</Link>
              <Link href="#tarifs">Tarifs</Link>
              <Link href="/register">Créer ma boutique</Link>
            </div>
            <div className="vf-footer-col">
              <h4>Espace vendeuse</h4>
              <Link href="/login">Se connecter</Link>
              <Link href="/register">Créer un compte</Link>
            </div>
            <div className="vf-footer-col">
              <h4>Assistance</h4>
              <Link href="#faq">Questions fréquentes</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/politique-confidentialite">Confidentialité</Link>
              <Link href="/conditions-utilisation">Conditions d’utilisation</Link>
              <Link href="/mentions-legales">Mentions légales</Link>
            </div>
          </div>
          <div className="vf-footer-bottom">
            <p>&copy; {new Date().getFullYear()} MYSTOREY &middot; Your shop. Your story.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
