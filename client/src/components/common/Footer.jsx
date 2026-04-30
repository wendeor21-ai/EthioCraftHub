/**
 * Footer Component - Professional & Compact Design
 * Minimized height with enhanced user experience and modern aesthetics
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSettings } from '../../contexts/SettingsContext';
import api from '../../utils/api';

const developers = [
  {
    name: 'Wasihun Abera',
    role: 'Full-Stack Developer',
    stack: 'React · Node.js · PostgreSQL',
    email: 'wasihuna29@gmail.com',
    phone: '+251 964 377 965',
    location: 'Addis Abeba, Ethiopia',
    linkedin: 'https://linkedin.com/in/wasihun-abera-91268037b',
    portfolio: 'https://wasihun-portfolio.netlify.app',
    initials: 'WA',
    gradient: 'from-amber-500 to-orange-600',
    accent: '#F59E0B',
  },
  {
    name: 'Wendwesen Wagaw',
    role: 'Full-Stack Developer',
    stack: 'Python · Java · React · Node.js · AI/ML · MongoDB',
    email: 'wendeor21@gmail.com',
    phone: '+251 914 22 57 24',
    location: 'Sekota, Amhara, Ethiopia',
    linkedin: 'https://linkedin.com/in/wendwesen-wagaw-0b482a38b',
    portfolio: 'https://wendwesenwagaw218-sys.github.io/PersonalPortfolios/',
    initials: 'WW',
    gradient: 'from-violet-500 to-purple-700',
    accent: '#8B5CF6',
  },
];

const Footer = () => {
  const { settings } = useSettings();
  const [homeConfig, setHomeConfig] = useState(null);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devModalOpen, setDevModalOpen] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/settings/homepage');
        if (res.data.success && res.data.data) {
          setHomeConfig(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching footer config:', err);
      }
    };
    fetchConfig();
  }, []);

  const footerLogo = homeConfig?.footerLogo;

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setSubscribeStatus({ type: "error", message: "Please enter a valid email address" });
      setTimeout(() => setSubscribeStatus({ type: "", message: "" }), 3000);
      return;
    }

    setIsSubmitting(true);
    try {
      // Replace with your actual newsletter endpoint
      // const response = await api.post('/newsletter/subscribe', { email });
      // Simulate API call for demo
      await new Promise(resolve => setTimeout(resolve, 500));
      setSubscribeStatus({ type: "success", message: "Thanks for subscribing! 🎉" });
      setEmail("");
      setTimeout(() => setSubscribeStatus({ type: "", message: "" }), 3000);
    } catch (error) {
      setSubscribeStatus({ type: "error", message: "Something went wrong. Please try again." });
      setTimeout(() => setSubscribeStatus({ type: "", message: "" }), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="relative bg-[#09090b] text-slate-200 border-t border-zinc-800/60 font-body">
      {/* Subtle premium texture overlay - reduced opacity for cleaner look */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-rule='evenodd'%3E%3Cpath d='M30 30l-5-5-5 5 5 5 5-5zm0-20l-5-5-5 5 5 5 5-5zm0 40l-5-5-5 5 5 5 5-5zm20-20l-5-5-5 5 5 5 5-5zm-40 0l-5-5-5 5 5 5 5-5z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '24px 24px'
        }}
      ></div>

      <div className="relative z-10 container mx-auto px-4 md:px-6 pt-10 pb-6">
        {/* Main Footer Grid - Compact Spacing */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">

          {/* Column 1: Brand & Mission - 5 columns on large screens */}
          <div className="md:col-span-5 space-y-5">
            <Link to="/" className="inline-block transition-transform hover:scale-[1.02] active:scale-95">
              {footerLogo ? (
                <img
                  src={footerLogo.startsWith('/') ? `${api.defaults.baseURL.replace(/\/api\/?$/, '')}${footerLogo}` : footerLogo}
                  alt="EthioCraft Global"
                  className="h-10 md:h-12 w-auto object-contain brightness-110"
                />
              ) : (
                <span className="text-2xl md:text-3xl font-display font-bold text-white tracking-wide">
                  EthioCraft<span className="text-ethiopian-gold">Global</span>
                </span>
              )}
            </Link>

            <p className="text-slate-400 text-sm leading-relaxed italic border-l-2 border-ethiopian-gold/40 pl-4">
              Empowering Ethiopian artisans, preserving ancient craftsmanship for a global audience.
            </p>

            {/* Compact Newsletter Form */}
            <div className="pt-2">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Newsletter</h4>
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-sm">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ethiopian-gold focus:border-ethiopian-gold transition-all text-white placeholder:text-slate-600"
                    aria-label="Email for newsletter"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-ethiopian-gold hover:bg-[#b8962c] text-zinc-950 px-5 py-2.5 rounded-lg font-semibold text-xs transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  {isSubmitting ? "..." : "Subscribe"}
                </button>
              </form>
              {subscribeStatus.message && (
                <p className={`text-xs mt-2 ${subscribeStatus.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                  {subscribeStatus.message}
                </p>
              )}
            </div>
          </div>

          {/* Column 2: Quick Links - 3 columns */}
          <div className="md:col-span-4">
            <h4 className="text-base font-display font-semibold mb-5 text-white relative inline-block">
              Help & Information
              <span className="absolute -bottom-2 left-0 w-10 h-0.5 bg-gradient-to-r from-ethiopian-gold to-transparent"></span>
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ul className="space-y-3">
                <li>
                  <Link to="/products" className="text-slate-400 hover:text-ethiopian-gold transition-all duration-200 text-sm flex items-center group">
                    <span className="w-0 group-hover:w-2 h-px bg-ethiopian-gold mr-0 group-hover:mr-2 transition-all duration-200"></span>
                    Shop All
                  </Link>
                </li>
                <li>
                  <Link to="/artisans" className="text-slate-400 hover:text-ethiopian-gold transition-all duration-200 text-sm flex items-center group">
                    <span className="w-0 group-hover:w-2 h-px bg-ethiopian-gold mr-0 group-hover:mr-2 transition-all duration-200"></span>
                    Meet Artisans
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-slate-400 hover:text-ethiopian-gold transition-all duration-200 text-sm flex items-center group">
                    <span className="w-0 group-hover:w-2 h-px bg-ethiopian-gold mr-0 group-hover:mr-2 transition-all duration-200"></span>
                    Our Story
                  </Link>
                </li>
              </ul>
              <ul className="space-y-3">
                <li><Link to="/shipping" className="text-slate-400 hover:text-ethiopian-gold transition-colors duration-200 text-sm">Shipping</Link></li>
                <li><Link to="/terms" className="text-slate-400 hover:text-ethiopian-gold transition-colors duration-200 text-sm">Terms</Link></li>
                <li><Link to="/privacy" className="text-slate-400 hover:text-ethiopian-gold transition-colors duration-200 text-sm">Privacy</Link></li>
              </ul>
            </div>
          </div>

          {/* Column 3: Trust & Social - 3 columns */}
          <div className="md:col-span-3 space-y-5">
            {/* Compact Trust Badge */}
            <div className="flex items-center gap-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 hover:border-ethiopian-gold/30 transition-all duration-300">
              <div className="bg-ethiopian-gold/10 p-2 rounded-lg shrink-0">
                <svg className="w-6 h-6 text-ethiopian-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Authenticated By</p>
                <p className="text-sm font-display font-semibold text-white">Artisan Guarantee</p>
              </div>
            </div>

            {/* Social Links - Compact */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Connect With Us</p>
              <div className="flex gap-2">
                <a href="#" className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-slate-400 hover:text-white hover:bg-ethiopian-gold hover:border-ethiopian-gold transition-all duration-300" aria-label="Instagram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 10.001 12.324A6.162 6.162 0 0012 5.838zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </a>
                <a href="#" className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-slate-400 hover:text-white hover:bg-[#0088cc] hover:border-[#0088cc] transition-all duration-300" aria-label="Telegram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.54.26l.213-3.05 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" /></svg>
                </a>
                <a href="#" className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-slate-400 hover:text-white hover:bg-[#0077b5] hover:border-[#0077b5] transition-all duration-300" aria-label="LinkedIn">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Minimized Height */}
        <div className="border-t border-zinc-800/60 mt-8 pt-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] font-medium">
            <p className="text-slate-500 uppercase tracking-wider order-2 sm:order-1">
              © 2026 EthioCraft Global. All rights reserved.
            </p>

            <div className="flex items-center gap-6 order-1 sm:order-2">
              <Link to="/sitemap" className="text-slate-500 hover:text-ethiopian-gold transition-colors uppercase tracking-wider hover:underline underline-offset-2">
                Sitemap
              </Link>

              {/* ── Developers button ── */}
              <button
                onClick={() => setDevModalOpen(true)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-ethiopian-gold transition-colors uppercase tracking-wider hover:underline underline-offset-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Developers
              </button>

              <div className="flex items-center gap-2">
                <span className="text-zinc-600 text-[8px] font-bold uppercase tracking-wider">Secure Payments</span>
                <div className="flex gap-1.5 opacity-40 grayscale">
                  <div className="w-5 h-3 bg-zinc-600 rounded-sm"></div>
                  <div className="w-5 h-3 bg-zinc-600 rounded-sm"></div>
                  <div className="w-5 h-3 bg-zinc-600 rounded-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ── Developers Modal ── */}
      {devModalOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setDevModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
            style={{ background: 'linear-gradient(135deg,#0f0f13 0%,#1a1a2e 50%,#0f0f13 100%)' }}
          >
            {/* Abstract blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle,#F59E0B,transparent)' }} />
              <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle,#8B5CF6,transparent)' }} />
              <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="devgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#devgrid)" />
              </svg>
            </div>

            {/* ── Sticky header row with close button — always visible ── */}
            <div className="relative z-10 flex items-center justify-between px-8 pt-7 pb-4 shrink-0">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5">
                <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Built By</span>
              </div>
              <button
                onClick={() => setDevModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-all border border-white/20 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="relative z-10 overflow-y-auto flex-1">
            {/* Header title */}
            <div className="text-center px-8 pb-6">
              <h2 className="text-2xl font-black text-white tracking-tight">The Engineering Team</h2>
              <p className="text-xs text-slate-500 mt-1">For technical support, feature requests, or deployment assistance</p>
            </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-4">
                <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Built By</span>
              </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 mx-6 mb-8 rounded-2xl overflow-hidden border border-white/10">
              {developers.map((dev, i) => (
                <div key={i} className="bg-[#0f0f13]/80 p-7 flex flex-col gap-5 hover:bg-white/[0.03] transition-colors">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${dev.gradient} flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0`}>
                      {dev.initials}
                    </div>
                    <div>
                      <h3 className="text-white font-black text-base leading-tight">{dev.name}</h3>
                      <p className="text-[11px] font-bold mt-0.5" style={{ color: dev.accent }}>{dev.role}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{dev.stack}</p>
                    </div>
                  </div>

                  <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${dev.accent}50,transparent)` }} />

                  {/* Contact */}
                  <div className="space-y-2.5 text-xs">
                    <a href={`mailto:${dev.email}`} className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors group">
                      <span className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      </span>
                      {dev.email}
                    </a>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                      </span>
                      {dev.phone}
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      </span>
                      {dev.location}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="flex gap-2 mt-auto pt-1">
                    <a href={dev.linkedin} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                      LinkedIn
                    </a>
                    <a href={dev.portfolio} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      style={{ border: `1px solid ${dev.accent}50`, color: dev.accent, background: `${dev.accent}15` }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                      Portfolio
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative z-10 text-center pb-6">
              <p className="text-[10px] text-slate-600">EthioCraft Global v1.0 · Built with ❤️ in Ethiopia · 2026</p>
            </div>
            </div>{/* end scrollable body */}
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;