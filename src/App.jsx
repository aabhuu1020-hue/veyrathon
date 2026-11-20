import React, { useEffect, useState } from 'react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    const updateProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
      document.documentElement.style.setProperty('--scroll-progress', `${progress}%`);
    };

    window.addEventListener('scroll', updateProgress);
    updateProgress();
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  useEffect(() => {
    const moveCursor = (e) => {
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="scroll-progress"></div>
      <div className="cursor-glow"></div>

      {loading && (
        <div className="loader">
          <img src="/logo.png" alt="VEY RATHON" />
          <div className="loader-line"></div>
          <p>BEYOND ORDINARY</p>
        </div>
      )}

      <main className={loading ? 'site hidden' : 'site visible'}>
        <nav className="navbar">
          <a href="#home" className="logo" onClick={closeMenu}>
            <img src="/logo.png" alt="VEY RATHON" />
          </a>

          <div className="nav-links">
            <a href="#home">HOME</a>
            <a href="#about">ABOUT</a>
            <a href="#contact">CONTACT</a>
          </div>

          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </nav>

        <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
          <a href="#home" onClick={closeMenu}>HOME</a>
          <a href="#about" onClick={closeMenu}>ABOUT</a>
          <a href="#contact" onClick={closeMenu}>CONTACT</a>
          <p>VEY RATHON — BEYOND ORDINARY</p>
        </div>

        <section className="hero" id="home">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <p className="eyebrow">AN INDEPENDENT VISION</p>
            <h1>BEYOND<br /><span>ORDINARY.</span></h1>
            <p className="hero-desc">Not born to follow. Destined to define.</p>
            <a href="#about" className="explore-btn">
              EXPLORE THE VISION <span>↗</span>
            </a>
          </div>
          <div className="hero-bottom">
            <span>EST. 2026</span>
            <span>INDEPENDENT BY NATURE</span>
            <span>01 / 03</span>
          </div>
          <div className="vertical-text">VISION WITHOUT LIMITS</div>
        </section>

        <section className="about" id="about">
          <div className="reveal">
            <p className="eyebrow">THE PHILOSOPHY</p>
            <h2>Greatness begins<br />where limits <span>end.</span></h2>
            <p className="about-desc">
              A vision beyond boundaries.
              An identity beyond definitions.
              This is VEY RATHON.
            </p>
          </div>
        </section>

        <section className="contact" id="contact">
          <div className="reveal">
            <p className="eyebrow">THE NEXT CHAPTER</p>
            <h2>CREATE YOUR<br /><span>OWN LEGACY.</span></h2>
            <a href="mailto:hello@veyrathon.com">GET IN TOUCH ↗</a>
          </div>
        </section>

        <footer>
          <div>VEY RATHON.</div>
          <p>© 2026 VEY RATHON. ALL RIGHTS RESERVED.</p>
        </footer>
      </main>
    </>
  );
}
