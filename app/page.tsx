'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const themeInitialized = useRef(false);

  useEffect(() => {
    if (themeInitialized.current) return;
    themeInitialized.current = true;

    const saved = localStorage.getItem('rms-theme');
    const dark = saved === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('dark', dark);

    const btn = document.getElementById('themeToggle');
    btn?.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      document.body.classList.toggle('dark', isDark);
      localStorage.setItem('rms-theme', isDark ? 'dark' : 'light');
    });

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu    = document.getElementById('mobileMenu');
    mobileMenuBtn?.addEventListener('click', () => mobileMenu?.classList.toggle('open'));
    mobileMenu?.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => mobileMenu.classList.remove('open'))
    );

    const navbar = document.getElementById('navbar');
    const onScroll = () => {
      if (navbar) navbar.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.08)' : 'none';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --navy-950:#050d1a;--navy-900:#091525;--navy-800:#0f2035;--navy-700:#162d4a;--navy-600:#1e3a5f;
          --orange-400:#fb923c;--orange-500:#f97316;--orange-600:#ea6c0a;
          --slate-50:#f8fafc;--slate-100:#f1f5f9;--slate-200:#e2e8f0;--slate-300:#cbd5e1;
          --slate-400:#94a3b8;--slate-500:#64748b;--slate-600:#475569;--slate-700:#334155;--slate-800:#1e293b;
          --white:#ffffff;
          --font-display:'Playfair Display',Georgia,serif;
          --font-body:'DM Sans',sans-serif;
          --font-mono:'JetBrains Mono',monospace;
          --bg:var(--slate-50);--text:var(--slate-800);
          --nav-bg:rgba(255,255,255,0.92);--nav-border:var(--slate-100);--nav-text:var(--slate-600);
          --card-bg:var(--white);--card-border:var(--slate-100);--section-alt:var(--white);
          --muted:var(--slate-500);--muted2:var(--slate-400);
          --stat-bg:var(--slate-50);--table-head:var(--slate-500);--table-border:var(--slate-200);
          --feature-icon-bg:#fff7ed;
        }
        html.dark {
          --bg:var(--navy-950);--text:#f1f5f9;
          --nav-bg:rgba(9,21,37,0.92);--nav-border:rgba(22,45,74,0.5);--nav-text:#cbd5e1;
          --card-bg:var(--navy-800);--card-border:var(--navy-700);--section-alt:var(--navy-900);
          --muted:#94a3b8;--muted2:#64748b;
          --stat-bg:rgba(22,45,74,0.5);--table-head:#94a3b8;--table-border:var(--navy-700);
          --feature-icon-bg:rgba(249,115,22,0.15);
        }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:var(--font-body);background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;transition:background .3s,color .3s;line-height:1.6}
        body.dark{background:var(--navy-950);color:#f1f5f9}
        a{text-decoration:none;color:inherit}
        ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:var(--slate-300);border-radius:9999px}
        html.dark ::-webkit-scrollbar-thumb{background:var(--navy-600)}
        .lp-container{max-width:1152px;margin:0 auto;padding:0 24px}
        .text-center{text-align:center}.text-white{color:var(--white)}.text-orange{color:var(--orange-500)}
        .btn-primary{display:inline-flex;align-items:center;gap:6px;background:var(--orange-500);color:var(--white);font-family:var(--font-body);font-weight:600;padding:10px 24px;border-radius:10px;border:none;cursor:pointer;transition:background .2s,box-shadow .2s,transform .1s;box-shadow:0 4px 14px rgba(249,115,22,.25);font-size:.875rem}
        .btn-primary:hover{background:var(--orange-600);box-shadow:0 6px 20px rgba(249,115,22,.4)}
        .btn-primary:active{transform:scale(.97)}
        .btn-outline{display:inline-flex;align-items:center;gap:6px;background:transparent;color:var(--navy-700);font-family:var(--font-body);font-weight:600;padding:10px 24px;border-radius:10px;border:2px solid var(--navy-600);cursor:pointer;transition:all .2s;font-size:.875rem}
        .btn-outline:hover{background:var(--navy-600);color:var(--white)}
        html.dark .btn-outline{color:#e2e8f0;border-color:var(--navy-600)}
        html.dark .btn-outline:hover{background:var(--navy-600);color:var(--white)}
        .btn-lg{padding:12px 32px;font-size:1rem}
        /* Navbar */
        .lp-navbar{position:sticky;top:0;z-index:100;background:var(--nav-bg);border-bottom:1px solid var(--nav-border);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:background .3s,border-color .3s}
        .lp-nav-inner{max-width:1152px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between}
        .lp-logo{height:48px}
        .lp-nav-links{display:flex;align-items:center;gap:32px;font-size:.875rem;font-weight:500;color:var(--nav-text)}
        .lp-nav-links a{transition:color .2s}.lp-nav-links a:hover{color:var(--orange-500)}
        .lp-nav-actions{display:flex;align-items:center;gap:12px}
        .lp-nav-login{font-size:.875rem;font-weight:600;color:var(--slate-700);transition:color .2s}
        .lp-nav-login:hover{color:var(--orange-500)}
        html.dark .lp-nav-login{color:#e2e8f0}
        .lp-theme-btn{background:transparent;border:none;cursor:pointer;padding:8px;border-radius:8px;color:var(--slate-500);display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}
        .lp-theme-btn:hover{background:var(--slate-100)}
        html.dark .lp-theme-btn:hover{background:var(--navy-700)}
        html.dark .lp-theme-btn{color:#94a3b8}
        .icon-sun{display:none}.icon-moon{display:block}
        html.dark .icon-sun{display:block}html.dark .icon-moon{display:none}
        .lp-mobile-btn{display:none;flex-direction:column;gap:5px;background:transparent;border:none;cursor:pointer;padding:6px}
        .lp-mobile-btn span{display:block;width:22px;height:2px;background:var(--slate-600);border-radius:2px;transition:all .3s}
        html.dark .lp-mobile-btn span{background:#94a3b8}
        .lp-mobile-menu{display:none;flex-direction:column;padding:16px 24px 20px;border-top:1px solid var(--nav-border);gap:4px}
        .lp-mobile-menu a{font-size:.9rem;font-weight:500;color:var(--nav-text);padding:10px 0;display:block;transition:color .2s;border-bottom:1px solid var(--nav-border)}
        .lp-mobile-menu a:hover{color:var(--orange-500)}
        .lp-mobile-menu.open{display:flex}
        /* Hero */
        .lp-hero{position:relative;overflow:hidden;padding:96px 24px 80px}
        .lp-hero-bg{position:absolute;inset:0;overflow:hidden;pointer-events:none}
        .blob{position:absolute;border-radius:50%;filter:blur(80px)}
        .blob-1{width:384px;height:384px;top:-160px;right:-160px;background:rgba(249,115,22,.1)}
        .blob-2{width:288px;height:288px;top:80px;left:-80px;background:rgba(30,58,95,.1)}
        .hero-divider{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:100%;height:1px;background:linear-gradient(to right,transparent,rgba(249,115,22,.2),transparent)}
        .lp-hero-content{max-width:896px;margin:0 auto;text-align:center;position:relative}
        .hero-badge{display:inline-flex;align-items:center;gap:8px;background:#fff7ed;color:#c2410c;font-size:.75rem;font-weight:700;padding:8px 16px;border-radius:9999px;margin-bottom:32px}
        html.dark .hero-badge{background:rgba(249,115,22,.15);color:var(--orange-400)}
        .hero-title{font-family:var(--font-display);font-size:clamp(2.5rem,7vw,4.5rem);font-weight:900;color:var(--navy-900);line-height:1;margin-bottom:24px;letter-spacing:-.02em}
        html.dark .hero-title{color:var(--white)}
        .hero-subtitle{font-size:1.125rem;color:var(--slate-600);max-width:640px;margin:0 auto 40px;line-height:1.7}
        html.dark .hero-subtitle{color:#cbd5e1}
        .hero-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:16px}
        .hero-note{font-size:.75rem;color:var(--muted2);margin-top:24px}
        /* Dashboard preview */
        .dashboard-preview{max-width:960px;margin:64px auto 0}
        .dashboard-window{background:var(--card-bg);border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,.12);border:1px solid var(--card-border);overflow:hidden}
        .window-bar{background:var(--navy-900);padding:12px 16px;display:flex;align-items:center;gap:8px}
        .window-dot{width:12px;height:12px;border-radius:50%}
        .dot-red{background:#f87171}.dot-yellow{background:#fbbf24}.dot-green{background:#34d399}
        .window-url{font-family:var(--font-mono);font-size:.75rem;color:#94a3b8;margin-left:12px}
        .window-body{padding:24px}
        html.dark .window-body,body.dark .window-body{background:var(--navy-800)}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}
        .stat-item{background:var(--stat-bg);border-radius:12px;padding:16px;text-align:center}
        .stat-value{font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--navy-800)}
        html.dark .stat-value,body.dark .stat-value{color:var(--white)}
        .stat-label{font-size:.75rem;color:var(--muted);margin-top:4px}
        .table-wrap{background:var(--stat-bg);border-radius:12px;overflow:hidden}
        .preview-table{width:100%;border-collapse:collapse;font-size:.875rem}
        .preview-table thead tr{border-bottom:1px solid var(--table-border)}
        .preview-table th{text-align:left;padding:12px 16px;font-size:.7rem;font-weight:700;color:var(--table-head);text-transform:uppercase;letter-spacing:.05em}
        .preview-table tbody tr{border-bottom:1px solid var(--table-border)}
        .preview-table tbody tr:last-child{border-bottom:none}
        .td-name{padding:12px 16px;font-weight:500;color:var(--navy-800)}
        html.dark .td-name,body.dark .td-name{color:#e2e8f0}
        .td-muted{padding:12px 16px;color:var(--muted)}
        .badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:9999px;font-size:.75rem;font-weight:700}
        .grade-a{background:#d1fae5;color:#065f46}.grade-b{background:#dbeafe;color:#1e40af}
        html.dark .grade-a{background:rgba(52,211,153,.15);color:#34d399}
        html.dark .grade-b{background:rgba(96,165,250,.15);color:#60a5fa}
        /* Features */
        .features-section{padding:96px 0;background:var(--section-alt)}
        .section-header{text-align:center;margin-bottom:64px}
        .section-title{font-family:var(--font-display);font-size:clamp(1.75rem,4vw,2.5rem);font-weight:700;color:var(--navy-900);margin-bottom:16px}
        html.dark .section-title{color:var(--white)}
        .section-subtitle{font-size:1rem;color:var(--muted);max-width:512px;margin:0 auto;line-height:1.6}
        .features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
        .feature-card{padding:24px;border-radius:16px;border:1px solid var(--card-border);background:var(--card-bg);transition:border-color .2s,box-shadow .2s,transform .2s;cursor:default}
        .feature-card:hover{border-color:rgba(249,115,22,.4);box-shadow:0 8px 30px rgba(0,0,0,.06);transform:translateY(-2px)}
        .feature-card:hover .feature-icon{background:var(--orange-500);color:var(--white)}
        html.dark .feature-card,body.dark .feature-card{background:var(--navy-800);border-color:var(--navy-700)}
        .feature-icon{width:44px;height:44px;border-radius:12px;background:var(--feature-icon-bg);color:var(--orange-500);display:flex;align-items:center;justify-content:center;margin-bottom:16px;transition:background .2s,color .2s}
        .feature-title{font-family:var(--font-display);font-weight:700;font-size:1rem;color:var(--navy-800);margin-bottom:8px}
        html.dark .feature-title{color:var(--white)}
        .feature-desc{font-size:.875rem;color:var(--muted);line-height:1.6}
        /* Pricing */
        .pricing-section{padding:96px 0;background:var(--bg)}
        .pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;align-items:start}
        .pricing-card{background:var(--card-bg);border:2px solid var(--card-border);border-radius:16px;padding:24px;position:relative;transition:border-color .2s,box-shadow .2s}
        .pricing-card:hover{border-color:rgba(249,115,22,.3)}
        html.dark .pricing-card:not(.pricing-card-highlight),body.dark .pricing-card:not(.pricing-card-highlight){background:var(--navy-800);border-color:var(--navy-700)}
        .pricing-card-highlight{background:var(--navy-900);border-color:var(--orange-500);box-shadow:0 20px 60px rgba(249,115,22,.1);transform:scale(1.02);color:var(--white)}
        .popular-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--orange-500);color:var(--white);font-size:.7rem;font-weight:700;padding:4px 16px;border-radius:9999px;white-space:nowrap}
        .plan-name{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--orange-500);margin-bottom:8px}
        .plan-price-row{display:flex;align-items:flex-end;gap:4px;margin-bottom:4px}
        .plan-price{font-family:var(--font-display);font-size:2.25rem;font-weight:900;color:var(--navy-900);line-height:1}
        .pricing-card-highlight .plan-price{color:var(--white)}
        html.dark .plan-price,body.dark .plan-price{color:var(--white)}
        .plan-period{font-size:.875rem;color:var(--muted);margin-bottom:6px}.plan-period-light{color:#cbd5e1}
        .plan-desc{font-size:.875rem;color:var(--muted);margin-bottom:24px}.plan-desc-light{color:#cbd5e1}
        .plan-features{list-style:none;display:flex;flex-direction:column;gap:12px;margin-bottom:32px}
        .plan-features li{display:flex;align-items:center;gap:8px;font-size:.875rem;color:var(--slate-600)}
        .plan-features li svg{color:var(--orange-500);flex-shrink:0}
        html.dark .plan-features li,body.dark .plan-features li{color:#cbd5e1}
        .plan-features-light li{color:#e2e8f0}
        .plan-btn{display:block;text-align:center;padding:10px;border-radius:10px;font-weight:700;font-size:.875rem;transition:all .2s;border:2px solid transparent}
        .plan-btn-outline{border-color:var(--slate-200);color:var(--slate-700)}
        .plan-btn-outline:hover{border-color:var(--orange-500);color:var(--orange-500)}
        html.dark .plan-btn-outline,body.dark .plan-btn-outline{border-color:var(--navy-600);color:#e2e8f0}
        .plan-btn-orange{background:var(--orange-500);color:var(--white);border-color:var(--orange-500)}
        .plan-btn-orange:hover{background:var(--orange-600);border-color:var(--orange-600)}
        /* Testimonials */
        .testimonials-section{padding:80px 0;background:var(--navy-900)}
        .testimonials-section .section-title{margin-bottom:48px}
        .testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
        .testimonial-card{background:var(--navy-800);border:1px solid var(--navy-700);border-radius:16px;padding:24px}
        .stars{display:flex;gap:4px;color:var(--orange-400);margin-bottom:16px}
        .testimonial-text{font-size:.875rem;color:#cbd5e1;line-height:1.7;margin-bottom:20px}
        .author-name{font-weight:600;color:var(--white);font-size:.875rem}
        .author-role{font-size:.75rem;color:#94a3b8;margin-top:2px}
        /* CTA */
        .cta-section{padding:96px 24px;background:linear-gradient(135deg,var(--orange-500),var(--orange-600))}
        .cta-title{font-family:var(--font-display);font-size:clamp(1.75rem,4vw,2.5rem);font-weight:900;color:var(--white);margin-bottom:16px}
        .cta-subtitle{color:rgba(255,255,255,.85);margin-bottom:32px;font-size:1rem}
        .cta-btn{display:inline-flex;align-items:center;gap:8px;background:var(--white);color:#c2410c;font-weight:700;padding:14px 32px;border-radius:12px;font-size:1rem;box-shadow:0 10px 30px rgba(0,0,0,.15);transition:background .2s,transform .1s}
        .cta-btn:hover{background:#fff7ed}.cta-btn:active{transform:scale(.97)}
        /* Footer */
        .lp-footer{padding:32px 24px;background:var(--navy-950)}
        .footer-inner{max-width:1152px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:16px}
        @media(min-width:768px){.footer-inner{flex-direction:row;justify-content:space-between}}
        .footer-brand{display:flex;align-items:center;gap:8px;color:#94a3b8;font-weight:600}
        .footer-copy{font-size:.875rem;color:#64748b}
        .footer-links{display:flex;gap:24px;font-size:.875rem;color:#64748b}
        .footer-links a{transition:color .2s}.footer-links a:hover{color:var(--orange-400)}
        /* Animations */
        .stagger-1{animation-delay:.1s}.stagger-2{animation-delay:.2s}.stagger-3{animation-delay:.3s}.stagger-4{animation-delay:.4s}
        .animate-fade-up{opacity:0;animation:fadeUp .65s ease forwards}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        /* Responsive */
        @media(max-width:768px){
          .lp-nav-links,.lp-nav-login{display:none}
          .lp-mobile-btn{display:flex}
          .stats-grid{grid-template-columns:repeat(2,1fr)}
          .pricing-card-highlight{transform:none}
          .lp-hero{padding:72px 24px 60px}
          .features-section,.pricing-section{padding:64px 0}
          .testimonials-section,.cta-section{padding:64px 24px}
        }
        @media(max-width:480px){
          .hero-actions{flex-direction:column;width:100%}
          .hero-actions .btn-primary,.hero-actions .btn-outline{width:100%;justify-content:center}
          .pricing-grid{grid-template-columns:1fr}
        }
      ` }} />

      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet" />

      {/* Navbar */}
      <nav className="lp-navbar" id="navbar">
        <div className="lp-nav-inner">
          <a href="#">
            <img src="/assets/img/logo.png" alt="STEAMhives" className="lp-logo" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
          </a>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">About</a>
          </div>
          <div className="lp-nav-actions">
            <button className="lp-theme-btn" id="themeToggle" aria-label="Toggle dark mode">
              <svg className="icon-sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              <svg className="icon-moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            </button>
            <Link href="/login" className="lp-nav-login">Admin Login</Link>
            <Link href="/teacher-login" className="lp-nav-login" style={{color:'#0f766e'}}>Teacher Login</Link>
            <Link href="/onboarding" className="btn-primary">Get Started</Link>
          </div>
          <button className="lp-mobile-btn" id="mobileMenuBtn" aria-label="Menu">
            <span/><span/><span/>
          </button>
        </div>
        <div className="lp-mobile-menu" id="mobileMenu">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">About</a>
          <Link href="/onboarding" className="btn-primary" style={{marginTop:8,textAlign:'center',display:'block'}}>Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="blob blob-1"/>
          <div className="blob blob-2"/>
          <div className="hero-divider"/>
        </div>
        <div className="lp-hero-content">
          <div className="hero-badge animate-fade-up">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
            The #1 School Result System in Nigeria
          </div>
          <h1 className="hero-title animate-fade-up stagger-1">School Results,<br/><span className="text-orange">Reimagined.</span></h1>
          <p className="hero-subtitle animate-fade-up stagger-2">Manage student results, generate beautiful PDF report cards, and give parents secure PIN access — all in one modern platform built for African schools.</p>
          <div className="hero-actions animate-fade-up stagger-3">
            <Link href="/onboarding" className="btn-primary btn-lg">
              Start Free Trial
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
            <Link href="/results" className="btn-outline btn-lg">Check a Result</Link>
          </div>
          <p className="hero-note animate-fade-up stagger-4">No credit card required · Free 30-day trial · Setup in minutes</p>
        </div>
        <div className="dashboard-preview animate-fade-up stagger-4">
          <div className="dashboard-window">
            <div className="window-bar">
              <div className="window-dot dot-red"/><div className="window-dot dot-yellow"/><div className="window-dot dot-green"/>
              <span className="window-url">admin.steamhives.ng</span>
            </div>
            <div className="window-body">
              <div className="stats-grid">
                {[{v:'238',l:'Students'},{v:'12',l:'Classes'},{v:'94%',l:'Pass Rate'},{v:'3',l:'Teachers'}].map(s=>(
                  <div className="stat-item" key={s.l}><div className="stat-value">{s.v}</div><div className="stat-label">{s.l}</div></div>
                ))}
              </div>
              <div className="table-wrap">
                <table className="preview-table">
                  <thead><tr><th>Student</th><th>Class</th><th>Average</th><th>Grade</th></tr></thead>
                  <tbody>
                    <tr><td className="td-name">Adaeze Nwosu</td><td className="td-muted">JSS 3</td><td className="td-muted">78.4</td><td><span className="badge grade-a">A</span></td></tr>
                    <tr><td className="td-name">Babatunde Ogunleye</td><td className="td-muted">JSS 3</td><td className="td-muted">65.2</td><td><span className="badge grade-b">B</span></td></tr>
                    <tr><td className="td-name">Chiamaka Obi</td><td className="td-muted">SSS 1</td><td className="td-muted">82.1</td><td><span className="badge grade-a">A</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="lp-container">
          <div className="section-header">
            <h2 className="section-title">Everything you need</h2>
            <p className="section-subtitle">Purpose-built for Nigerian schools, STEAMhives handles the full result management lifecycle.</p>
          </div>
          <div className="features-grid">
            {[
              {icon:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,title:'Smart Result Engine',desc:'Auto-calculates grades, totals, and positions with configurable grading rules.'},
              {icon:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,title:'PDF Report Cards',desc:'Beautiful, printable result sheets with school logo, signatures, and stamps.'},
              {icon:<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,title:'PIN Security',desc:'Students access results with unique 8-digit PINs — secure, one-time use.'},
              {icon:<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,title:'Multi-School Ready',desc:'Manage multiple schools from a single super-admin dashboard.'},
              {icon:<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>,title:'Excel Import/Export',desc:'Bulk upload results via Excel templates. Export broadsheets instantly.'},
              {icon:<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,title:'Role-Based Access',desc:'Admins, teachers, and students each get a tailored experience.'},
            ].map(f=>(
              <div className="feature-card" key={f.title}>
                <div className="feature-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{f.icon}</svg></div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-section" id="pricing">
        <div className="lp-container">
          <div className="section-header">
            <h2 className="section-title">Simple, transparent pricing</h2>
            <p className="section-subtitle">Per term. No hidden fees. Cancel anytime.</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <p className="plan-name">Starter</p>
              <div className="plan-price-row"><span className="plan-price">₦75,000</span><span className="plan-period">/term</span></div>
              <p className="plan-desc">Perfect for small schools</p>
              <ul className="plan-features">
                {['Up to 100 students','PDF report cards','PIN system','Excel export','Email support'].map(f=>(
                  <li key={f}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>{f}</li>
                ))}
              </ul>
              <Link href="/onboarding" className="plan-btn plan-btn-outline">Get Started</Link>
            </div>
            <div className="pricing-card pricing-card-highlight">
              <div className="popular-badge">Most Popular</div>
              <p className="plan-name">Pro</p>
              <div className="plan-price-row"><span className="plan-price">₦150,000</span><span className="plan-period plan-period-light">/term</span></div>
              <p className="plan-desc plan-desc-light">Most popular for growing schools</p>
              <ul className="plan-features plan-features-light">
                {['Up to 200 students','Everything in Starter','Broadsheet analytics','Multi-teacher access','Priority support','Custom school branding'].map(f=>(
                  <li key={f}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>{f}</li>
                ))}
              </ul>
              <Link href="/onboarding" className="plan-btn plan-btn-orange">Get Started</Link>
            </div>
            <div className="pricing-card">
              <p className="plan-name">Enterprise</p>
              <div className="plan-price-row"><span className="plan-price">Custom</span></div>
              <p className="plan-desc">For large networks &amp; groups</p>
              <ul className="plan-features">
                {['Unlimited students','Everything in Pro','Multiple schools','Dedicated support','API access','White-label option'].map(f=>(
                  <li key={f}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>{f}</li>
                ))}
              </ul>
              <Link href="/onboarding" className="plan-btn plan-btn-outline">Get Started</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section" id="about">
        <div className="lp-container">
          <h2 className="section-title text-white text-center">Trusted by schools across Nigeria</h2>
          <div className="testimonials-grid">
            {[
              {text:'"STEAMhives transformed how we manage results. What used to take days now takes hours."',name:'Mrs. Blessing Adeyemi',role:'Principal, Greenfield Academy'},
              {text:'"The PIN system is brilliant. Parents love checking results online without any hassle."',name:'Mr. Seun Folarin',role:'ICT Coordinator, Kings School'},
            ].map(t=>(
              <div className="testimonial-card" key={t.name}>
                <div className="stars">{[0,1,2,3,4].map(i=><svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}</div>
                <p className="testimonial-text">{t.text}</p>
                <div><p className="author-name">{t.name}</p><p className="author-role">{t.role}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="lp-container text-center">
          <h2 className="cta-title">Ready to modernize your school?</h2>
          <p className="cta-subtitle">Join hundreds of schools already using STEAMhives to manage results efficiently.</p>
          <Link href="/onboarding" className="cta-btn">
            Start Free Trial
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#f97316"><path d="M12 2L21.196 7.5V16.5L12 22L2.804 16.5V7.5L12 2Z"/></svg>
            <span>STEAMhives</span>
          </div>
          <p className="footer-copy">&copy; 2026 STEAMhives. Built for African schools.</p>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </>
  );
}
