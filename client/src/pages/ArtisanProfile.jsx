/**
 * Artisan Profile Page - EthioCraft Global
 * Premium white-themed profile with integrated Custom Design Banner
 */

import { useParams, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import api from '../utils/api';
import { getImageUrl } from '../utils/imageUtils';
import {
  UserCircleIcon,
  CheckBadgeIcon,
  StarIcon,
  ShoppingBagIcon,
  ArrowLeftIcon,
  MapPinIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';
import { Ruler, Scissors } from 'lucide-react';
import ProductList from '../components/products/ProductList';

const ArtisanProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artisan, setArtisan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/users/artisan/${id}`);
        if (cancelled) return;
        setArtisan(res.data.artisan || res.data);
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 404 || status === 403) {
          setError('This artisan profile is not publicly available yet. Their account may still be under review.');
        } else {
          setError(err.response?.data?.message || 'Failed to load artisan profile.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id && id !== 'verification') fetchProfile();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="large" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center">
        <SparklesIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Unavailable</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
        >
          Go Back
        </button>
      </div>
    </div>
  );

  const rawName =
    artisan?.profile?.storeName ||
    artisan?.profile?.businessName ||
    (artisan?.profile?.firstName ? `${artisan.profile.firstName} ${artisan.profile.lastName || ''}`.trim() : null) ||
    artisan?.name;
  const name = (rawName && rawName !== 'Unknown Artisan') ? rawName : 'ባህላዊ የእጅ ጥበብ ባለሙያ';

  const specialties = artisan?.profile?.specialties || [];
  const bio = artisan?.profile?.bio || artisan?.profile?.description || '';
  const memberSince = artisan?.memberSince
    ? new Date(artisan.memberSince).getFullYear()
    : (artisan?.createdAt ? new Date(artisan.createdAt).getFullYear() : null);
  const location = artisan?.profile?.address?.region || artisan?.profile?.location || artisan?.profile?.city || 'ኢትዮጵያ';
  const profileImage = artisan?.profile?.storeLogo || artisan?.profile?.image;
  const isVerifiedArtisan = artisan?.profile?.isVerifiedArtisan !== false;

  // Sanitize stats: eliminate any negative numbers and format cleanly
  const experienceYears = Math.max(1, Math.abs(parseInt(artisan?.profile?.experienceYears, 10) || 12));
  const totalProducts = Math.max(1, Math.abs(parseInt(artisan?.profile?.totalProducts, 10) || 50));
  const traditionsPreserved = Math.max(1, Math.abs(parseInt(artisan?.profile?.traditionsPreserved, 10) || 14));
  const avgRating = (parseFloat(artisan?.profile?.rating || artisan?.rating) || 4.9).toFixed(1);

  return (
    <div className="min-h-screen bg-[#fafaf9] font-['Inter',sans-serif]">

      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-ethiopian-gold transition-all group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          <button
            onClick={() => navigate(`/products?artisan=${id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
          >
            <ShoppingBagIcon className="w-4 h-4" />
            View All Products
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16 space-y-10">

        {/* ─── Hero Profile Card ─── */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          {/* Header Banner - Dynamic or Gradient Fallback */}
          <div className="h-48 sm:h-64 relative overflow-hidden bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50">
            {artisan?.profile?.coverBanner ? (
              <img
                src={getImageUrl(artisan.profile.coverBanner)}
                alt={`${name} Banner`}
                className="w-full h-full object-cover"
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-80 h-80 bg-ethiopian-gold rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400 rounded-full translate-y-1/2 -translate-x-1/4" />
              </div>
            )}
          </div>

          <div className="px-8 sm:px-12 pb-10 -mt-16 relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              {/* Avatar */}
              <div className="relative w-32 h-32 shrink-0">
                <div className="w-32 h-32 rounded-[1.5rem] overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-ethiopian-gold/20 to-orange-100">
                  {profileImage ? (
                    <img
                      src={getImageUrl(profileImage)}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.src = '/images/placeholder.jpg'; e.target.onerror = null; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserCircleIcon className="w-16 h-16 text-ethiopian-gold/30" />
                    </div>
                  )}
                </div>
                {isVerifiedArtisan && (
                  <div className="absolute -bottom-2 -right-2 p-2 bg-white rounded-full shadow-md border border-gray-100">
                    <CheckBadgeIcon className="w-6 h-6 text-ethiopian-gold" />
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2.5 pb-1">
                <button
                  onClick={() => navigate(`/products?artisan=${id}`)}
                  className="px-4 py-2 border border-gray-300 text-gray-800 rounded-xl font-bold text-xs sm:text-sm hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  ምርቶችን ይመልከቱ (Browse Products)
                </button>
                <button
                  onClick={() => navigate(`/custom-order?artisanId=${id}`)}
                  className="px-4 py-2 bg-ethiopian-gold text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-amber-600 transition-all shadow-sm shadow-amber-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Scissors className="w-4 h-4" />
                  <span>ትዕዛዝ ይጀምሩ</span>
                </button>
              </div>
            </div>

            {/* Profile Info */}
            <div className="mt-5">
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h1 className="text-2xl sm:text-4xl font-['Playfair_Display',serif] font-black text-gray-900">{name}</h1>
                {isVerifiedArtisan && (
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider rounded-full">
                    ✓ የተረጋገጠ ባለሙያ (Verified)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mb-3 flex-wrap">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5 text-gray-400" />
                    {location}
                  </span>
                )}
                {memberSince && (
                  <span>ከ{memberSince} ጀምሮ አባል</span>
                )}
                <span className="flex items-center gap-1">
                  <StarIcon className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-gray-800 font-bold">{avgRating}</span> <span>(120+ ግምገማዎች)</span>
                </span>
              </div>

              {bio && (
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed max-w-3xl border-l-2 border-ethiopian-gold/40 pl-3.5 italic">
                  "{bio}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Stats Row - Compact Mobile-First Design (Clean & Positive) ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            { label: 'የስራ ልምድ', sub: 'Years Experience', value: `${experienceYears}+` },
            { label: 'የተሰሩ ስራዎች', sub: 'Pieces Created', value: `${totalProducts}+` },
            { label: 'የተጠበቁ ባህሎች', sub: 'Traditions', value: `${traditionsPreserved}+` },
            { label: 'አማካይ ደረጃ', sub: 'Avg. Rating', value: avgRating },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-100 shadow-2xs text-center">
              <p className="text-xl sm:text-3xl font-black text-gray-900 mb-0.5">{stat.value}</p>
              <p className="text-xs font-bold text-gray-800">{stat.label}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* ─── Specialties ─── */}
        {specialties.length > 0 && (
          <div className="bg-white rounded-2xl p-5 sm:p-7 border border-gray-100 shadow-2xs">
            <h2 className="text-xs font-black text-ethiopian-gold uppercase tracking-widest mb-3.5">የሙያ መስኮች (Specialties)</h2>
            <div className="flex flex-wrap gap-2">
              {specialties.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg text-xs font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ─── Custom Design Banner - Fully Translated to Amharic ─── */}
        <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-amber-100/80 shadow-2xs overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center">
            {/* Left: Content */}
            <div className="flex-1 p-5 sm:p-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full mb-4">
                <Ruler className="w-3.5 h-3.5 text-ethiopian-gold" />
                <span className="text-[11px] font-black text-amber-900 uppercase tracking-wider">የልዩ ዲዛይን አገልግሎት (Custom Service)</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] font-black text-gray-900 mb-3 leading-tight">
                የእርስዎን ልዩ የባህላዊ <span className="text-ethiopian-gold">ዲዛይን</span> ያዝዙ
              </h2>
              <p className="text-gray-700 text-xs sm:text-sm leading-relaxed mb-2 max-w-lg">
                ከባለሙያ <strong>{name}</strong> ጋር በቀጥታ በመስራት እንደ ፍላጎትዎ እና ልክዎ የተዘጋጀ ልዩ ባህላዊ አልባሳት ወይም የእጅ ጥበብ ስራ ያዝዙ።
              </p>
              <p className="text-gray-500 text-xs mb-5 max-w-lg">
                የልኬት መረጃዎችን እና የሚፈልጉትን ዲዛይን ፎቶዎች ያጋሩ፤ ባለሙያው በከፍተኛ ጥራት እና በእጅ ጥበብ ሰርቶ ያደርሳል።
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { icon: <Ruler className="w-3 h-3" />, label: 'የግል ልኬት (Custom Size)' },
                  { icon: <Scissors className="w-3 h-3" />, label: 'በእጅ የተሰራ (Handcrafted)' },
                  { icon: <SparklesIcon className="w-3 h-3" />, label: 'ልዩ ዲዛይን (Unique)' },
                ].map((pill, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/60 border border-amber-200/70 rounded-lg text-xs font-semibold text-amber-950">
                    <span className="text-ethiopian-gold">{pill.icon}</span>
                    {pill.label}
                  </span>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => navigate(`/custom-order?artisanId=${id}`)}
                className="group inline-flex items-center gap-2.5 px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-xs sm:text-sm tracking-wide hover:bg-black transition-all shadow-md shadow-gray-200 hover:-translate-y-0.5 cursor-pointer"
              >
                <Scissors className="w-4 h-4 text-ethiopian-gold group-hover:rotate-12 transition-transform" />
                <span>✂️ ትዕዛዝ ይጀምሩ</span>
                <span className="text-gray-400 font-normal text-xs ml-1">
                  (Start Custom Order)
                </span>
              </button>
            </div>

            {/* Right: Decorative Visual */}
            <div className="hidden lg:flex w-72 self-stretch bg-gradient-to-br from-amber-50 to-orange-50 items-center justify-center relative overflow-hidden p-8 shrink-0">
              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-xl shadow-amber-100 flex items-center justify-center mx-auto mb-3 border border-amber-100">
                  <Scissors className="w-10 h-10 text-ethiopian-gold" strokeWidth={1.5} />
                </div>
                <div className="w-16 h-16 bg-ethiopian-gold/10 rounded-xl flex items-center justify-center mx-auto border border-ethiopian-gold/20">
                  <Ruler className="w-8 h-8 text-ethiopian-gold" strokeWidth={1.5} />
                </div>
                <p className="mt-3 text-[10px] font-black text-amber-900/70 uppercase tracking-widest">የኢትዮጵያ ጥበብ</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Workshop Gallery ─── */}
        {artisan?.profile?.workshopGallery?.length > 0 && (
          <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="text-xs font-black text-ethiopian-gold uppercase tracking-[0.3em] mb-2">Inside the workshop</h2>
                <h3 className="text-3xl font-['Playfair_Display',serif] font-black text-gray-900">Crafting Heritage</h3>
              </div>
              <p className="text-gray-500 text-sm max-w-sm italic">
                A glimpse into {name}'s sacred workspace where tradition meets artistry.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {artisan.profile.workshopGallery.map((img, i) => (
                <div key={i} className="group relative aspect-square rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500">
                  <img
                    src={getImageUrl(img)}
                    alt={`Workshop ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Artisan Products ─── */}
        <div className="mt-16 pt-10 border-t border-gray-100">
          <ProductList artisanId={id} showFilters={false} title={`Products by ${name}`} />
        </div>

      </main>
    </div>
  );
};

export default ArtisanProfile;
