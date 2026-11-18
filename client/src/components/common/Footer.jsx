import { getFileUrl } from '../../utils/getFileUrl';
/**
 * Footer Component - Modern, Mobile-First Clean White Design
 * Features compact responsive footprint, high readability,
 * dedicated social channels (Telegram, LinkedIn, Instagram),
 * and a rock-solid "የምህንድስና ቡድን" (Engineering Core) modal mounted via React Portal
 * so it never freezes the page, never snaps scroll, and stays open permanently until closed.
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useSettings } from "../../contexts/SettingsContext";
import api from "../../utils/api";
import { useCustomTranslation } from "../../hooks/useCustomTranslation";
import wasihunPhoto from "../../assets/developers/wasihun.jpg";
import wendwesenPhoto from "../../assets/developers/wendwesen.jpg";

const developers = [
  {
    name: "Wasihun Abera",
    role: "Full-Stack Developer",
    specialty: "Frontend & Platform Architecture",
    initials: "WA",
    photo: wasihunPhoto,
    fallbackPhoto: "/images/developers/wasihun.jpg",
    skills: ["React", "Node.js", "PostgreSQL", "Express", "Tailwind CSS", "REST API"],
    email: "wasihuna29@gmail.com",
    phone: "+251 964 377 965",
    location: "Addis Abeba, Ethiopia",
    linkedin: "https://linkedin.com/in/wasihun-abera-91268037b",
    instagram: "https://instagram.com/wasihun.6",
    instagramHandle: "@wasihun.6",
    telegram: "https://t.me/+ZSiJLRCBGxpjMzlk",
    portfolio: "https://wasihun-portfolio.netlify.app",
    gradient: "from-amber-500 to-amber-600",
    accentBorder: "border-amber-500",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    name: "Wendwesen Wagaw",
    role: "Full-Stack Developer",
    specialty: "Backend, AI/ML & Systems Engineering",
    initials: "WW",
    photo: wendwesenPhoto,
    fallbackPhoto: "/images/developers/wendwesen.jpg",
    skills: ["Python", "Java", "React", "Node.js", "AI/ML", "MongoDB", "DevOps"],
    email: "wendeor21@gmail.com",
    phone: "+251 914 22 57 24",
    location: "Gondar, Amhara, Ethiopia",
    linkedin: "https://www.linkedin.com/in/wendwesen-wagaw-0b482a38b",
    telegram: "https://t.me/+ZSiJLRCBGxpjMzlk",
    portfolio: "https://wendewesen-wagaw.netlify.app/",
    gradient: "from-purple-500 to-indigo-600",
    accentBorder: "border-purple-600",
    badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
    iconBg: "bg-purple-100 text-purple-700",
  },
];

const Footer = () => {
  const location = useLocation();
  const { settings } = useSettings();
  const { t } = useCustomTranslation();
  const [homeConfig, setHomeConfig] = useState(null);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Hide footer completely in actor portals (artisan and admin dashboards / workflows)
  const isActorPortal =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/dashboard') ||
    (location.pathname.startsWith('/artisan') && !location.pathname.match(/^\/artisan\/[a-zA-Z0-9_-]{20,}$/));

  const handleCopy = (text, key) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  useEffect(() => {
    if (isActorPortal) return;
    const fetchConfig = async () => {
      try {
        const res = await api.get("/settings/homepage");
        if (res.data.success && res.data.data) setHomeConfig(res.data.data);
      } catch (err) {
        console.error("Footer config error:", err);
      }
    };
    fetchConfig();
  }, [isActorPortal]);

  if (isActorPortal) {
    return null;
  }

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

  return (
    <footer className="bg-white border-t border-gray-200 text-gray-800 font-sans shadow-xs">

      {/* ═══════════════════════════════════════
          MOBILE FOOTER (< 768px) - Modern, Compact & Readable
          ═══════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Compact Brand + Engineering Trigger Row */}
        <div className="px-3.5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <Link to="/" className="inline-flex items-center gap-1.5 min-w-0">
            {footerLogo ? (
              <img
                src={getFileUrl(footerLogo)}
                alt="EthioCraft Global"
                className="h-6 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-md bg-amber-500 text-white font-black text-xs flex items-center justify-center">E</span>
                <span className="text-sm font-bold text-gray-900 tracking-tight">
                  EthioCraft<span className="text-amber-600">Global</span>
                </span>
              </div>
            )}
          </Link>

          {/* Quick Trigger for የምህንድስና ቡድን */}
          <button
            type="button"
            onClick={() => setDevModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-bold shadow-2xs active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>የምህንድስና ቡድን</span>
          </button>
        </div>

        {/* Short Tagline */}
        <div className="px-3.5 py-2 text-[11px] text-gray-500 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
          <span>{t('footer.about_text_short', "Authentic Ethiopian crafts, delivered worldwide.")}</span>
          <span className="text-gray-400 font-semibold text-[10px] shrink-0">🇪🇹 Ethiopia</span>
        </div>

        {/* Quick Links Accordion / Compact Grid */}
        <div className="border-b border-gray-100">
          <button
            type="button"
            onClick={() => setLinksOpen(!linksOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-gray-50/40 hover:bg-gray-50"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              {t('footer.quick_links', 'Quick Links & Support')}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-gray-500 font-normal">
              <span>{linksOpen ? "Hide" : "Show"}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`w-3.5 h-3.5 transition-transform ${linksOpen ? "rotate-180" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {linksOpen && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 px-3.5 py-2.5 bg-white border-t border-gray-100">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-gray-600 text-xs py-1 hover:text-amber-600 font-medium transition-colors truncate"
                >
                  • {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter - Compact Bar */}
        <div className="px-3.5 py-2.5 border-b border-gray-100 bg-white">
          <form onSubmit={handleSubscribe} className="flex gap-1.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('footer.email_placeholder', 'Your email')}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-60 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              {isSubmitting ? "..." : t('footer.subscribe_short', "Join")}
            </button>
          </form>
          {subscribeStatus.message && (
            <p className={`text-[10px] mt-1 font-semibold ${subscribeStatus.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
              {subscribeStatus.message}
            </p>
          )}
        </div>

        {/* Mobile Bottom Bar */}
        <div className="px-3.5 py-2.5 flex items-center justify-between text-[11px] text-gray-500 bg-gray-50/80">
          <span>© 2026 EthioCraft Global</span>
          <button
            type="button"
            onClick={() => setDevModalOpen(true)}
            className="text-amber-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Engineering Core</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      {/* END MOBILE FOOTER */}

      {/* ═══════════════════════════════════════
          DESKTOP FOOTER (≥ 768px) - Clean, Professional White Theme
          ═══════════════════════════════════════ */}
      <div className="hidden md:block">
        <div className="container mx-auto px-6 pt-8 pb-6">
          <div className="grid grid-cols-12 gap-8">
            {/* Col 1: Brand & Social */}
            <div className="col-span-4 space-y-4">
              <Link to="/" className="inline-block">
                {footerLogo ? (
                  <img
                    src={getFileUrl(footerLogo)}
                    alt="EthioCraft Global"
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white font-black text-lg flex items-center justify-center shadow-xs">E</span>
                    <span className="text-xl font-bold text-gray-900 tracking-tight">
                      EthioCraft<span className="text-amber-600">Global</span>
                    </span>
                  </div>
                )}
              </Link>
              <p className="text-gray-500 text-xs leading-relaxed border-l-2 border-amber-500/60 pl-3">
                {t('footer.about_text', "Empowering Ethiopian artisans, preserving ancient craftsmanship, and delivering authentic cultural heritage worldwide.")}
              </p>
            </div>

            {/* Col 2: Quick Links */}
            <div className="col-span-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3.5">
                {t('footer.help_info', 'Navigation & Support')}
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-gray-500 hover:text-amber-700 transition-colors text-xs font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Col 3: Trust & Authenticity Guarantee */}
            <div className="col-span-2 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3.5">
                {t('footer.artisan_guarantee', 'Artisan Guarantee')}
              </h4>
              <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-[11px] font-bold text-gray-900">100% Authentic Heritage</p>
                <p className="text-[10px] text-gray-600 leading-tight">Every craft verified by master artisan guilds in Ethiopia.</p>
              </div>
            </div>

            {/* Col 4: Newsletter + Engineering Core Pill */}
            <div className="col-span-3 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                {t('footer.newsletter', 'Newsletter')}
              </h4>
              <p className="text-xs text-gray-500">Subscribe for artisan stories & exclusive discounts.</p>
              <form onSubmit={handleSubscribe} className="flex gap-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.email_placeholder', 'Your email')}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 shrink-0 shadow-2xs cursor-pointer"
                >
                  {isSubmitting ? "..." : t('footer.subscribe', "Subscribe")}
                </button>
              </form>
              {subscribeStatus.message && (
                <p className={`text-[10px] font-semibold ${subscribeStatus.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                  {subscribeStatus.message}
                </p>
              )}

              {/* Engineering Team Box */}
              <button
                type="button"
                onClick={() => setDevModalOpen(true)}
                className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all group text-left active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 group-hover:text-amber-700 transition-colors">የምህንድስና ቡድን (Engineering)</p>
                    <p className="text-[10px] text-gray-500">2 Full-Stack Engineers</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </div>
          </div>

          {/* Desktop Bottom bar */}
          <div className="border-t border-gray-100 mt-6 pt-4 flex justify-between items-center text-xs text-gray-500">
            <p>© 2026 EthioCraft Global. {t('footer.rights_reserved', 'All rights reserved.')} • Built in Ethiopia 🇪🇹</p>
            <div className="flex items-center gap-5">
              <Link to="/sitemap" className="hover:text-amber-600 transition-colors">{t('footer.sitemap', 'Sitemap')}</Link>
              <button
                type="button"
                onClick={() => setDevModalOpen(true)}
                className="text-gray-700 font-semibold hover:text-amber-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{t('footer.developers', 'የምህንድስና ቡድን')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* END DESKTOP FOOTER */}

      {/* ═══════════════════════════════════════
          የምህንድስና ቡድን MODAL - Rendered with React Portal to document.body
          Ensures absolute top layering, perfectly centered, never displaced by parent layouts,
          never snaps page scroll, and never freezes the page.
          ═══════════════════════════════════════ */}
      {devModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
          onClick={() => setDevModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] sm:max-h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-gray-100 shrink-0 bg-white">
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  EthioCraft Engineering Core
                </div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-1.5">
                  {t('footer.engineering_team', 'የምህንድስና ቡድን')}
                  <span className="text-[10px] font-semibold text-gray-600 border border-gray-200 bg-gray-50 px-1.5 py-0.2 rounded-full">
                    2 Engineers
                  </span>
                </h2>
                <p className="text-[10px] sm:text-[11px] text-gray-500 leading-tight">
                  {t('footer.tech_support_msg', 'The architects behind the platform — technical support & engineering excellence.')}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setDevModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black transition-colors shrink-0 active:scale-95 ml-2 cursor-pointer shadow-xs"
                title="Close"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Profiles */}
            <div className="overflow-y-auto flex-1 p-3 sm:p-4 bg-white space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {developers.map((dev, i) => {
                  const isWasihun = i === 0;

                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-3 flex flex-col justify-between bg-white border border-gray-200 shadow-2xs hover:border-gray-300 transition-all ${
                        isWasihun ? "border-t-[3px] border-t-amber-500" : "border-t-[3px] border-t-purple-600"
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Avatar + Main Info */}
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <div className={`w-12 h-12 rounded-xl p-[1.5px] bg-gradient-to-br shadow-xs ${isWasihun ? "from-amber-400 to-amber-600" : "from-purple-500 to-indigo-600"}`}>
                              <img
                                src={dev.photo}
                                alt={dev.name}
                                className="w-full h-full object-cover object-top rounded-[10px] bg-gray-100"
                                onError={(e) => {
                                  if (e.currentTarget.src !== dev.fallbackPhoto) {
                                    e.currentTarget.src = dev.fallbackPhoto;
                                  } else {
                                    e.currentTarget.style.display = "none";
                                    const fallbackEl = document.getElementById(`fallback-avatar-${i}`);
                                    if (fallbackEl) fallbackEl.style.display = "flex";
                                  }
                                }}
                              />
                              <div
                                id={`fallback-avatar-${i}`}
                                style={{ display: "none" }}
                                className={`w-full h-full rounded-[10px] bg-gradient-to-br ${dev.gradient} items-center justify-center text-white font-bold text-sm`}
                              >
                                {dev.initials}
                              </div>
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3" title="Active">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white" />
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-gray-900 font-bold text-xs sm:text-sm leading-tight truncate">
                              {dev.name}
                            </h3>
                            <div className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold mt-0.5 ${dev.badgeBg}`}>
                              {dev.role}
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5 leading-tight truncate">
                              {dev.specialty}
                            </p>
                          </div>
                        </div>

                        {/* Tech Stack */}
                        <div>
                          <p className="text-[9px] uppercase font-bold tracking-wider text-gray-400 mb-1">
                            Tech Stack & Expertise
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {dev.skills.map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-50 text-gray-700 border border-gray-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1 text-xs pt-1 border-t border-gray-100">
                          {/* Email */}
                          <div className="flex items-center justify-between gap-1 p-1 rounded-md bg-gray-50/70 border border-gray-100">
                            <a
                              href={`mailto:${dev.email}`}
                              className="flex items-center gap-1.5 text-gray-700 truncate min-w-0"
                            >
                              <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${dev.iconBg}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </span>
                              <span className="truncate text-[11px] font-medium">{dev.email}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopy(dev.email, `email-${i}`)}
                              className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border transition-all shrink-0 active:scale-95 ${
                                copiedKey === `email-${i}`
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                                  : "bg-white hover:bg-gray-100 text-gray-600 border-gray-200 shadow-2xs"
                              }`}
                            >
                              {copiedKey === `email-${i}` ? "✓ Copied" : "Copy"}
                            </button>
                          </div>

                          {/* Phone */}
                          <div className="flex items-center justify-between gap-1 p-1 rounded-md bg-gray-50/70 border border-gray-100">
                            <a
                              href={`tel:${dev.phone.replace(/\s+/g, "")}`}
                              className="flex items-center gap-1.5 text-gray-700 truncate min-w-0"
                            >
                              <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${dev.iconBg}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                              </span>
                              <span className="truncate text-[11px] font-medium">{dev.phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopy(dev.phone, `phone-${i}`)}
                              className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border transition-all shrink-0 active:scale-95 ${
                                copiedKey === `phone-${i}`
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                                  : "bg-white hover:bg-gray-100 text-gray-600 border-gray-200 shadow-2xs"
                              }`}
                            >
                              {copiedKey === `phone-${i}` ? "✓ Copied" : "Copy"}
                            </button>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-1.5 p-1 rounded-md bg-gray-50/40 border border-gray-100 text-gray-500 text-[10px]">
                            <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${dev.iconBg}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </span>
                            <span className="font-medium text-gray-600 truncate">{dev.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Social & Action Links */}
                      <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-gray-100">
                        {isWasihun ? (
                          <>
                            <a
                              href={dev.instagram}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border border-pink-200 bg-pink-50/50 hover:bg-pink-100/60 text-pink-700 text-[10px] font-bold shadow-2xs transition-all active:scale-95"
                            >
                              <span>@wasihun.6</span>
                            </a>
                            <a
                              href={dev.linkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 text-[10px] font-bold shadow-2xs transition-all active:scale-95"
                            >
                              <span>LinkedIn</span>
                            </a>
                            <a
                              href={dev.portfolio}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 min-w-[65px] inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shadow-2xs transition-all active:scale-95"
                            >
                              <span>Portfolio</span>
                            </a>
                          </>
                        ) : (
                          <>
                            <a
                              href={dev.linkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 text-[10px] font-bold shadow-2xs transition-all active:scale-95"
                            >
                              <span>LinkedIn</span>
                            </a>
                            <a
                              href={dev.telegram}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 min-w-[75px] inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border border-sky-200 bg-sky-50/50 hover:bg-sky-100/60 text-sky-700 text-[10px] font-bold shadow-2xs transition-all active:scale-95"
                            >
                              <span>Telegram</span>
                            </a>
                            <a
                              href={dev.portfolio}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 min-w-[65px] inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold shadow-2xs transition-all active:scale-95"
                            >
                              <span>Portfolio</span>
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Telegram Community */}
              <div className="p-2 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200/80 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.54.26l.213-3.05 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-gray-900 truncate">EthioCraft Telegram Community</p>
                    <p className="text-[9px] text-gray-500 truncate">Platform updates & engineering discussions</p>
                  </div>
                </div>

                <a
                  href="https://t.me/+ZSiJLRCBGxpjMzlk"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold rounded-lg shadow-2xs shrink-0 active:scale-95 transition-all"
                >
                  Join Group
                </a>
              </div>

              {/* Bottom Manual Close Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setDevModalOpen(false)}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl shadow-2xs active:scale-95 transition-all text-center cursor-pointer border border-gray-200"
                >
                  ✕ ዝጋ (Close)
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[10px] text-gray-400 font-medium">
                <span>EthioCraft Global v1.0 • Built in Ethiopia 🇪🇹 • 2026</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </footer>
  );
};

export default Footer;
