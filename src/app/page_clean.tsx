import Link from "next/link";
import Image from "next/image";

const features = [
  { icon: "📦", title: "Catalogue illimité", text: "Ajoutez tous les produits facilement" },
  { icon: "🎨", title: "Vitrine personnalisée", text: "Ta boutique à ton image et ton style" },
  { icon: "📋", title: "Commandes organisées", text: "Suivi chaque commande en temps réel" },
  { icon: "💳", title: "Paiements à venir", text: "De nouvelles options de paiement bientôt" },
  { icon: "🤝", title: "Support dédié", text: "Une équipe là pour t'accompagner" },
];

const stats = [
  { icon: "🏪", number: "2 500+", label: "Boutiques créées" },
  { icon: "📦", number: "45 000+", label: "Commandes gérées" },
  { icon: "👥", number: "2 500+", label: "Vendeuses actives" },
  { icon: "⭐", number: "4,8/5", label: "Satisfaction client" },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <div className="landing-shell">
        <header className="landing-header">
          <Link href="/" className="landing-brand" aria-label="MYSTOREY home">
            <span className="brand-mark">V</span>
            <span>
              <strong>MYSTOREY</strong>
              <small>Commerce moderne</small>
            </span>
          </Link>

          <nav className="landing-nav" aria-label="Navigation principale">
            <Link href="#fonctionnalites">Fonctionnalités</Link>
            <Link href="#tarifs">Tarifs</Link>
            <Link href="#temoignages">Témoignages</Link>
            <Link href="#ressources">Ressources</Link>
          </nav>

          <div className="landing-header-actions">
            <Link className="text-button" href="/login">Se connecter</Link>
            <Link className="vf-button vf-button--sm" href="/register">Créer ma boutique</Link>
          </div>
        </header>

        <section className="landing-hero-new">
          <div className="hero-left">
            <span className="hero-badge">✨ LA PLATEFORME N°1 DES VENDEUSES SUR WHATSAPP</span>
            
            <h1 className="hero-title">
              Ta boutique en ligne, <br />
              <span className="hero-highlight">ton business qui brille</span>
            </h1>

            <p className="hero-description">
              MYSTOREY t’aide à créer ta boutique, organiser tes produits, gérer tes commandes et booster tes ventes. Simple, rapide et pensé pour les femmes entrepreneures.
            </p>

            <div className="hero-actions">
              <Link className="vf-button" href="/register">Créer ma boutique gratuitement</Link>
              <button className="demo-button">Voir la démo</button>
            </div>

            <div className="hero-social">
              <span className="social-text">Plus de 2 500 vendeuses</span>
              <span className="social-text">nous font confiance ❤️</span>
            </div>
          </div>

          <div className="hero-right">
            <Image 
              src="/images/landing-hero.png" 
              alt="MYSTOREY Dashboard"
              width={600}
              height={500}
              priority
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </section>

        <section id="fonctionnalites" className="features-section">
          <h2>Tout ce dont tu as besoin pour développer ta boutique</h2>
          
          <div className="features-grid">
            {features.map((feature, idx) => (
              <div key={idx} className="feature-card-new">
                <div className="feature-icon-new">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="stats-section">
          <div className="stats-left">
            <h2>MYSTOREY en chiffres</h2>
            <div className="stats-grid">
              {stats.map((stat, idx) => (
                <div key={idx} className="stat-card">
                  <div className="stat-icon">{stat.icon}</div>
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="stats-right">
            <Image 
              src="/images/landing-hero.png" 
              alt="Femme avec téléphone" 
              width={500}
              height={500}
              style={{ width: '100%', height: 'auto', borderRadius: '1.5rem' }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
