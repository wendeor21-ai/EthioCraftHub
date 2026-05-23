/**
 * Footer Component - Mobile-First Minimal Design
 * Desktop: full rich footer | Mobile: compact, clean, easy to scroll
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../../contexts/SettingsContext";
import api from "../../utils/api";
import { useCustomTranslation } from "../../hooks/useCustomTranslation";

const developers = [
  {
    name: "Wasihun Abera",
    role: "Full-Stack Developer",
    stack: "React · Node.js · PostgreSQL",
    email: "wasihuna29@gmail.com",
    phone: "+251 964 377 965",
    location: "Addis Abeba, Ethiopia",
    linkedin: "https://linkedin.com/in/wasihun-abera-91268037b",
    portfolio: "https://wasihun-portfolio.netlify.app",
    initials: "WA",
    gradient: "from-amber-500 to-orange-600",
    accent: "#F59E0B",
  },
  {
    name: "Wendwesen Wagaw",
    role: "Full-Stack Developer",
    stack: "Python · Java · React · Node.js · AI/ML · MongoDB",
    email: "wendeor21@gmail.com",
    phone: "+251 914 22 57 24",
    location: "Sekota, Amhara, Ethiopia",
    linkedin: "https://linkedin.com/in/wendwesen-wagaw-0b482a38b",
    portfolio: "https://wendwesenwagaw218-sys.github.io/PersonalPortfolios/",
    initials: "WW",
    gradient: "from-violet-500 to-purple-700",
    accent: "#8B5CF6",
  },
];

const Footer = () => {
  const { settings } = useSettings();
  const { t } = useCustomTranslation();
  const [homeConfig, setHomeConfig] = useState(null);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get("/settings/homepage");
        if (res.data.success && res.data.data) setHomeConfig(res.data.data);
      } catch (err) {
        console.error("Footer config error:", err);
      }
    };
    fetchConfig();
  }, []);

  const footerLogo = homeConfig?.footerLogo;

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setSubscribeStatus({ type: "error", message: t('footer.invalid_email', "Enter a valid email") });
      setTimeout(() => setSubscribeStatus({ type: "", message: "" }), 3000);
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setSubscribeStatus({ type: "success", message: t('footer.subscribe_success', "Subscribed! Thanks 🎉") });
      setEmail("");
      setTimeout(() => setSubscribeStatus({ type: "", message: "" }), 3000);
    } catch {
      setSubscribeStatus({ type: "error", message: t('footer.subscribe_error', "Something went wrong.") });
      setTimeout(() => setSubscribeStatus({ type: "", message: "" }), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickLinks = [
    { to: "/products", label: t('footer.shop_all', "Shop All") },
    { to: "/artisans", label: t('footer.meet_artisans', "Meet Artisans") },
    { to: "/about", label: t('footer.our_story', "Our Story") },
    { to: "/shipping", label: t('footer.shipping', "Shipping") },
    { to: "/terms", label: t('footer.terms', "Terms") },
    { to: "/privacy", label: t('footer.privacy', "Privacy") },
    { to: "/faqs", label: t('footer.faqs', "FAQs") },
    { to: "/contact-support", label: t('footer.support', "Support") },
  ];

  const socialLinks = [
    {
      label: "Instagram",
      href: "#",
      color: "#E1306C",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      label: "Telegram",
      href: "#",
      color: "#0088cc",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.54.26l.213-3.05 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
        </svg>
      ),
    },
    {
      label: "LinkedIn",
      href: "#",
      color: "#0077b5",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-[#09090b] text-slate-300 font-body">

      {/* ═══════════════════════════════════════
          MOBILE FOOTER  (< 768px) — minimal
          ═══════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Brand row */}
        <div className="px-4 pt-6 pb-4 border-b border-zinc-800">
          <Link to="/" className="inline-block mb-2">
            {footerLogo ? (
              <img
                src={footerLogo.startsWith("/") ? `${api.defaults.baseURL.replace(/\/api\/?$/, "")}${footerLogo}` : footerLogo}
                alt="EthioCraft Global"
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-xl font-bold text-white">
                EthioCraft<span className="text-yellow-400">Global</span>
              </span>
            )}
          </Link>
          <p className="text-slate-500 text-xs leading-relaxed">
            {t('footer.about_text_short', "Authentic Ethiopian crafts, delivered worldwide.")}
          </p>
        </div>

        {/* Social icons row */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
          {socialLinks.map((s) => (
            <a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              {s.icon}
            </a>
          ))}
          <span className="ml-auto text-[10px] text-slate-600 uppercase tracking-wider">{t('footer.connect_with_us', 'Follow us')}</span>
        </div>

        {/* Collapsible quick links */}
        <div className="border-b border-zinc-800">
          <button
            onClick={() => setLinksOpen(!linksOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-300"
          >
            <span>{t('footer.quick_links', 'Quick Links')}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`w-4 h-4 transition-transform ${linksOpen ? "rotate-180" : ""}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {linksOpen && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pb-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-slate-400 text-sm py-1 hover:text-yellow-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter - compact */}
        <div className="px-4 py-4 border-b border-zinc-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('footer.newsletter', 'Newsletter')}</p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('footer.email_placeholder', 'Your email')}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-yellow-500"
              style={{ fontSize: "16px" }}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-4 py-2 rounded-lg shrink-0 disabled:opacity-60"
            >
              {isSubmitting ? "..." : t('footer.subscribe_short', "Go")}
            </button>
          </form>
          {subscribeStatus.message && (
            <p className={`text-xs mt-1.5 ${subscribeStatus.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
              {subscribeStatus.message}
            </p>
          )}
        </div>

        {/* Bottom bar */}
        <div className="px-4 py-4 flex items-center justify-between">
          <p className="text-[10px] text-slate-600">© 2026 EthioCraft Global</p>
          <button
            onClick={() => setDevModalOpen(true)}
            className="text-[10px] text-slate-600 flex items-center gap-1 hover:text-yellow-400 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            {t('footer.developers', 'Developers')}
          </button>
        </div>
      </div>
      {/* END MOBILE FOOTER */}

      {/* ═══════════════════════════════════════
          DESKTOP FOOTER  (≥ 768px) — full rich
          ═══════════════════════════════════════ */}
      <div className="hidden md:block relative">
        {/* Texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-rule='evenodd'%3E%3Cpath d='M30 30l-5-5-5 5 5 5 5-5zm0-20l-5-5-5 5 5 5 5-5zm0 40l-5-5-5 5 5 5 5-5zm20-20l-5-5-5 5 5 5 5-5zm-40 0l-5-5-5 5 5 5 5-5z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 container mx-auto px-6 pt-10 pb-6">
          <div className="grid grid-cols-12 gap-10">
            {/* Brand */}
            <div className="col-span-5 space-y-5">
              <Link to="/" className="inline-block">
                {footerLogo ? (
                  <img
                    src={footerLogo.startsWith("/") ? `${api.defaults.baseURL.replace(/\/api\/?$/, "")}${footerLogo}` : footerLogo}
                    alt="EthioCraft Global"
                    className="h-12 w-auto object-contain brightness-110"
                  />
                ) : (
                  <span className="text-3xl font-display font-bold text-white tracking-wide">
                    EthioCraft<span className="text-yellow-400">Global</span>
                  </span>
                )}
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-yellow-500/40 pl-4">
                {t('footer.about_text', "Empowering Ethiopian artisans, preserving ancient craftsmanship for a global audience.")}
              </p>
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">{t('footer.newsletter', 'Newsletter')}</h4>
                <form onSubmit={handleSubscribe} className="flex gap-2 max-w-sm">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('footer.email_placeholder', 'Your email address')}
                    className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white placeholder:text-slate-600"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2.5 rounded-lg font-semibold text-xs disabled:opacity-70"
                  >
                    {isSubmitting ? "..." : t('footer.subscribe', "Subscribe")}
                  </button>
                </form>
                {subscribeStatus.message && (
                  <p className={`text-xs mt-2 ${subscribeStatus.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                    {subscribeStatus.message}
                  </p>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="col-span-4">
              <h4 className="text-base font-display font-semibold mb-5 text-white">{t('footer.help_info', 'Help & Information')}</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {quickLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="text-slate-400 hover:text-yellow-400 transition-colors text-sm">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Trust + Social */}
            <div className="col-span-3 space-y-5">
              <div className="flex items-center gap-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3">
                <div className="bg-yellow-500/10 p-2 rounded-lg shrink-0">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('footer.authenticated_by', 'Authenticated By')}</p>
                  <p className="text-sm font-display font-semibold text-white">{t('footer.artisan_guarantee', 'Artisan Guarantee')}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">{t('footer.connect_with_us', 'Connect With Us')}</p>
                <div className="flex gap-2">
                  {socialLinks.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      aria-label={s.label}
                      className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-slate-400 hover:text-white transition-all duration-300"
                      style={{ "--hover-bg": s.color }}
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-zinc-800/60 mt-8 pt-5 flex justify-between items-center text-[10px] font-medium">
            <p className="text-slate-500 uppercase tracking-wider">{t('footer.rights_reserved', '© 2026 EthioCraft Global. All rights reserved.')}</p>
            <div className="flex items-center gap-6">
              <Link to="/sitemap" className="text-slate-500 hover:text-yellow-400 transition-colors uppercase tracking-wider">{t('footer.sitemap', 'Sitemap')}</Link>
              <button
                onClick={() => setDevModalOpen(true)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-yellow-400 transition-colors uppercase tracking-wider"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {t('footer.developers', 'Developers')}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* END DESKTOP FOOTER */}

      {/* ── Developers Modal (shared, works on both) ── */}
      {devModalOpen && (
        <div
          className="fixed inset-0 z-[9000] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4"
          onClick={() => setDevModalOpen(false)}
        >
          <div
            className="relative w-full md:max-w-3xl rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              background: "linear-gradient(135deg,#0f0f13 0%,#1a1a2e 50%,#0f0f13 100%)",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 md:px-8 pt-4 md:pt-7 pb-3 shrink-0">
              <div>
                <h2 className="text-base md:text-2xl font-black text-white">{t('footer.engineering_team', 'The Engineering Team')}</h2>
                <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">{t('footer.tech_support_msg', 'Technical support & deployment assistance')}</p>
              </div>
              <button
                onClick={() => setDevModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable cards */}
            <div className="overflow-y-auto flex-1 px-3 md:px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {developers.map((dev, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4 md:p-6 flex flex-col gap-4"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${dev.gradient} flex items-center justify-center text-white font-black text-base md:text-lg shadow-lg shrink-0`}
                      >
                        {dev.initials}
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm md:text-base leading-tight">{dev.name}</h3>
                        <p className="text-[11px] font-semibold mt-0.5" style={{ color: dev.accent }}>{dev.role}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{dev.stack}</p>
                      </div>
                    </div>

                    <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${dev.accent}50,transparent)` }} />

                    {/* Contact */}
                    <div className="space-y-2 text-xs">
                      <a href={`mailto:${dev.email}`} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </span>
                        <span className="truncate">{dev.email}</span>
                      </a>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </span>
                        {dev.phone}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </span>
                        {dev.location}
                      </div>
                    </div>

                    {/* Links */}
                    <div className="flex gap-2">
                      <a
                        href={dev.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                      >
                        LinkedIn
                      </a>
                      <a
                        href={dev.portfolio}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        style={{ border: `1px solid ${dev.accent}50`, color: dev.accent, background: `${dev.accent}15` }}
                      >
                        Portfolio
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-[10px] text-slate-600 mt-4">EthioCraft Global v1.0 · {t('footer.built_with_love', 'Built with love in Ethiopia')} · 2026</p>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
