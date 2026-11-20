import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import './style.css';

const categories = [
  'All',
  'Motivation',
  'Discipline',
  'Loneliness',
  'Success',
  'Wisdom',
  'Warrior Mindset'
];

const defaultSiteContent = {
  site_name: "SOVEREIGNABHII",
  hero_heading: "BEYOND ORDINARY.",
  hero_tagline: "Not born to follow. Destined to define.",
  hero_description: "AN INDEPENDENT VISION",
  about_heading: "Greatness begins where limits end.",
  about_description: "A vision beyond boundaries. An identity beyond definitions. This is SOVEREIGNABHII.",
  contact_email: "hello@veyrathon.com",
  instagram: "",
  youtube: "",
  telegram: "",
  footer_text: "ALL RIGHTS RESERVED."
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [category, setCategory] = useState('All');
  const [adminMode, setAdminMode] = useState(
    new URLSearchParams(window.location.search).get('admin') === '1'
  );

  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [quote, setQuote] = useState('');
  const [author, setAuthor] = useState('');
  const [quoteCategory, setQuoteCategory] = useState('Motivation');
  const [published, setPublished] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [siteContent, setSiteContent] = useState(defaultSiteContent);
  const [activeAdminTab, setActiveAdminTab] = useState("Dashboard");

  async function loadSiteContent() {
    const { data, error } = await supabase
      .from("site_content")
      .select("content")
      .eq("id", "main")
      .maybeSingle();

    if (error) {
      console.error("CMS load error:", error.message);
      return;
    }

    if (data?.content) {
      setSiteContent({
        ...defaultSiteContent,
        ...data.content
      });
    }
  }

  useEffect(() => {
    loadSiteContent();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
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
  }, [loading, quotes]);

  useEffect(() => {
    const updateProgress = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = height > 0 ? (window.scrollY / height) * 100 : 0;
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

  async function checkAdmin(user) {
    if (!user) {
      setIsAdmin(false);
      return false;
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const allowed = !error && !!data;
    setIsAdmin(allowed);
    return allowed;
  }

  async function loadQuotes(showAll = false) {
    let request = supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!showAll) {
      request = request.eq('published', true);
    }

    const { data, error } = await request;

    if (error) {
      setMessage('Unable to load quotes.');
      return;
    }

    setQuotes(data || []);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      const currentSession = data.session;
      setSession(currentSession);

      if (currentSession?.user) {
        const allowed = await checkAdmin(currentSession.user);
        if (active) await loadQuotes(allowed);
      } else {
        await loadQuotes(false);
      }
    }

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        if (newSession?.user) {
          const allowed = await checkAdmin(newSession.user);
          await loadQuotes(allowed);
        } else {
          setIsAdmin(false);
          await loadQuotes(false);
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(error.message);
    } else {
      const allowed = await checkAdmin(data.user);
      if (allowed) {
        setMessage('Admin login successful.');
        await loadQuotes(true);
      } else {
        await supabase.auth.signOut();
        setMessage('This account is not an authorized admin.');
      }
    }

    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setMessage('You have been logged out.');
    await loadQuotes(false);
  }

  async function saveSiteContent(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("site_content")
      .upsert({
        id: "main",
        content: siteContent
      }, { onConflict: "id" });

    if (error) {
      setMessage("Save failed: " + error.message);
    } else {
      setMessage("Website content saved successfully.");
    }

    setBusy(false);
  }

  async function saveQuote(e) {
    e.preventDefault();

    if (!quote.trim()) {
      setMessage('Please enter a quote.');
      return;
    }

    setBusy(true);
    setMessage('');

    const values = {
      quote: quote.trim(),
      author: author.trim() || 'Unknown',
      category: quoteCategory,
      published
    };

    let result;

    if (editingId) {
      result = await supabase
        .from('quotes')
        .update(values)
        .eq('id', editingId);
    } else {
      result = await supabase
        .from('quotes')
        .insert([values]);
    }

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(editingId ? 'Quote updated.' : 'Quote added.');
      resetForm();
      await loadQuotes(true);
    }

    setBusy(false);
  }

  function resetForm() {
    setQuote('');
    setAuthor('');
    setQuoteCategory('Motivation');
    setPublished(true);
    setEditingId(null);
  }

  function editQuote(item) {
    setQuote(item.quote);
    setAuthor(item.author || '');
    setQuoteCategory(item.category || 'Motivation');
    setPublished(item.published);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteQuote(id) {
    if (!window.confirm('Delete this quote permanently?')) return;

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Quote deleted.');
      await loadQuotes(true);
    }
  }

  async function copyQuote(item) {
    try {
      await navigator.clipboard.writeText(
        `"${item.quote}" — ${item.author || 'Unknown'}`
      );
      setMessage('Quote copied.');
    } catch {
      setMessage('Could not copy quote.');
    }
  }

  async function shareQuote(item) {
    const text = `"${item.quote}" — ${item.author || 'Unknown'}`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // Sharing was cancelled.
      }
    } else {
      await copyQuote(item);
    }
  }

  const closeMenu = () => setMenuOpen(false);

  const visibleQuotes = quotes.filter(
    (item) => category === 'All' || item.category === category
  );

  const dailyQuote = quotes.length
    ? quotes[new Date().getDate() % quotes.length]
    : null;

  if (adminMode) {
    return (
      <main className="admin-page">
        <div className="admin-top">
          <a href={window.location.pathname} className="admin-brand">
            SOVEREIGNABHII
          </a>
          <a href={window.location.pathname}>BACK TO WEBSITE ↗</a>
        </div>

        <section className="admin-container">
          <p className="eyebrow">PRIVATE CONTROL CENTER</p>
          <h1>ADMIN <span>PANEL.</span></h1>

          {!session || !isAdmin ? (
            <form className="admin-form login-form" onSubmit={login}>
              <h2>ADMIN LOGIN</h2>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button disabled={busy}>
                {busy ? 'PLEASE WAIT...' : 'SIGN IN'}
              </button>
              {message && <p className="admin-message">{message}</p>}
            </form>
          ) : (
            <>
              <div className="admin-dashboard-heading">
                <p>Welcome, Administrator.</p>
                <button className="logout-btn" onClick={logout}>
                  LOG OUT
                </button>
              </div>

              <form className="admin-form" onSubmit={saveSiteContent}>
<h2>WEBSITE EDITOR</h2>
{[["site_name","Website Name"],["hero_heading","Hero Heading"],["hero_tagline","Hero Tagline"],["hero_description","Hero Description"],["about_heading","About Heading"],["contact_email","Contact Email"],["instagram","Instagram URL"],["youtube","YouTube URL"],["telegram","Telegram URL"],["footer_text","Footer Text"]].map(([key,label]) => <label key={key} style={{display:"block",marginBottom:"12px"}}><span>{label}</span><input value={siteContent[key] || ""} onChange={e => setSiteContent(prev => ({...prev,[key]:e.target.value}))} /></label>)}
<label>About Description<textarea value={siteContent.about_description || ""} onChange={e => setSiteContent(prev => ({...prev,about_description:e.target.value}))} /></label>
<button disabled={busy}>{busy ? "SAVING..." : "SAVE WEBSITE CONTENT"}</button>
{message && <p className="admin-message">{message}</p>}
</form>

<form className="admin-form" onSubmit={saveQuote}>
                <h2>{editingId ? 'EDIT QUOTE' : 'ADD NEW QUOTE'}</h2>

                <textarea
                  placeholder="Write your quote..."
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="Author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />

                <select
                  value={quoteCategory}
                  onChange={(e) => setQuoteCategory(e.target.value)}
                >
                  {categories.slice(1).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>

                <label className="publish-check">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                  />
                  Publish this quote
                </label>

                <div className="admin-actions">
                  <button disabled={busy}>
                    {busy ? 'SAVING...' : editingId ? 'UPDATE QUOTE' : 'ADD QUOTE'}
                  </button>
                  {editingId && (
                    <button type="button" className="cancel-btn" onClick={resetForm}>
                      CANCEL
                    </button>
                  )}
                </div>

                {message && <p className="admin-message">{message}</p>}
              </form>

              <div className="admin-quote-list">
                <h2>MANAGE QUOTES ({quotes.length})</h2>
                {quotes.map((item) => (
                  <div className="admin-quote-item" key={item.id}>
                    <div>
                      <p>{item.quote}</p>
                      <small>
                        {item.author} · {item.category} · {item.published ? 'Published' : 'Draft'}
                      </small>
                    </div>
                    <div className="admin-item-actions">
                      <button onClick={() => editQuote(item)}>EDIT</button>
                      <button onClick={() => deleteQuote(item.id)}>DELETE</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="scroll-progress"></div>
      <div className="cursor-glow"></div>

      {loading && (
        <div className="loader">
          <img src={import.meta.env.BASE_URL + 'logo.png?v=3'} alt="SOVEREIGNABHII" />
          <div className="loader-line"></div>
          <p>BEYOND ORDINARY</p>
        </div>
      )}

      <main className={loading ? 'site hidden' : 'site visible'}>
        <nav className="navbar">
          <a href="#home" className="logo" onClick={closeMenu}>
            <img src={import.meta.env.BASE_URL + 'logo.png?v=3'} alt="SOVEREIGNABHII" />
          </a>

          <div className="nav-links">
            <a href="#home">HOME</a>
            <a href="#about">ABOUT</a>
            <a href="#quotes">QUOTES</a>
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
          <a href="#quotes" onClick={closeMenu}>QUOTES</a>
          <a href="#contact" onClick={closeMenu}>CONTACT</a>
          <p>SOVEREIGNABHII — BEYOND ORDINARY</p>
        </div>

        <section className="hero" id="home">
          <div className="hero-bg"></div>
          <div className="hero-content">
            <p className="eyebrow">{siteContent.hero_description}</p>
            <h1>{(siteContent.hero_heading || defaultSiteContent.hero_heading).split(" ")[0]}<br /><span>{(siteContent.hero_heading || defaultSiteContent.hero_heading).split(" ").slice(1).join(" ")}</span></h1>
            <p className="hero-desc">{siteContent.hero_tagline}</p>
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
            <h2>{siteContent.about_heading}</h2>
            <p className="about-desc">
              {siteContent.about_description}
            </p>
          </div>
        </section>

        <section className="quotes-section" id="quotes">
          <div className="quotes-heading reveal">
            <p className="eyebrow">WORDS THAT DEFINE</p>
            <h2>THE QUOTE<br /><span>COLLECTION.</span></h2>
            <p>Thoughts worth remembering. Words worth carrying.</p>
          </div>

          {dailyQuote && (
            <div className="daily-quote reveal">
              <p className="eyebrow">QUOTE OF THE DAY</p>
              <blockquote>“{dailyQuote.quote}”</blockquote>
              <p className="quote-author">— {dailyQuote.author || 'Unknown'}</p>
            </div>
          )}

          <div className="category-list">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? 'active' : ''}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="quotes-grid">
            {visibleQuotes.map((item) => (
              <article className="quote-card reveal" key={item.id}>
                <span className="quote-mark">“</span>
                <p>{item.quote}</p>
                <small>— {item.author || 'Unknown'}</small>
                <div className="quote-card-bottom">
                  <span>{item.category}</span>
                  <div>
                    <button onClick={() => copyQuote(item)}>COPY</button>
                    <button onClick={() => shareQuote(item)}>SHARE</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visibleQuotes.length === 0 && (
            <p className="empty-quotes">
              No published quotes here yet. Check back soon.
            </p>
          )}
          {message && !adminMode && <p className="quote-feedback">{message}</p>}
        </section>

        <section className="contact" id="contact">
          <div className="reveal">
            <p className="eyebrow">THE NEXT CHAPTER</p>
            <h2>CREATE YOUR<br /><span>OWN LEGACY.</span></h2>
            <a href={`mailto:${siteContent.contact_email}`}>GET IN TOUCH ↗</a>
          </div>
        </section>

        <footer>
          <div>SOVEREIGNABHII.</div>
          <p>© 2026 {siteContent.site_name}. {siteContent.footer_text}</p>
          <a href="?admin=1">ADMIN</a>
        </footer>
      </main>
    </>
  );
}




