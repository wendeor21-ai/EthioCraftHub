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

  const name = artisan?.name || (artisan?.profile && `${artisan.profile.firstName || ''} ${artisan.profile.lastName || ''}`.trim()) || 'Unknown Artisan';
  const specialties = artisan?.profile?.specialties || [];
  const bio = artisan?.profile?.bio || artisan?.profile?.description || '';
  const memberSince = artisan?.memberSince
    ? new Date(artisan.memberSince).getFullYear()
    : (artisan?.createdAt ? new Date(artisan.createdAt).getFullYear() : null);
  const location = artisan?.profile?.location || artisan?.profile?.city || 'Ethiopia';
  const profileImage = artisan?.profile?.image;

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
          {/* Header gradient stripe */}
          <div className="h-36 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-80 h-80 bg-ethiopian-gold rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400 rounded-full translate-y-1/2 -translate-x-1/4" />
            </div>
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
                <div className="absolute -bottom-2 -right-2 p-2 bg-white rounded-full shadow-md border border-gray-100">
                  <CheckBadgeIcon className="w-6 h-6 text-ethiopian-gold" />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 pb-1">
                <button
                  onClick={() => navigate(`/products?artisan=${id}`)}
                  className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:border-gray-300 transition-all"
                >
                  Browse Products
                </button>
                <button
                  onClick={() => navigate(`/custom-order?artisanId=${id}`)}
                  className="px-5 py-2.5 bg-ethiopian-gold text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all shadow-md shadow-amber-100 flex items-center gap-2"
                >
                  <Scissors className="w-4 h-4" />
                  ትዕዛዝ ይጀምሩ
                </button>
              </div>
            </div>

            {/* Profile Info */}
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-['Playfair_Display',serif] font-black text-gray-900">{name}</h1>
                <span className="px-3 py-1 bg-ethiopian-gold/10 text-ethiopian-gold text-[10px] font-black uppercase tracking-widest rounded-full">Verified Artisan</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 font-medium mb-4 flex-wrap">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                    {location}
                  </span>
                )}
                {memberSince && (
                  <span>Member since {memberSince}</span>
                )}
                <span className="flex items-center gap-1">
                  <StarIcon className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-700 font-bold">4.9</span> <span>(120+ reviews)</span>
                </span>
              </div>

              {bio && (
                <p className="text-gray-600 leading-relaxed max-w-3xl border-l-2 border-ethiopian-gold/30 pl-4 italic">
                  "{bio}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Years Experience', value: '15+' },
            { label: 'Pieces Created', value: '400+' },
            { label: 'Happy Customers', value: '200+' },
            { label: 'Traditions Preserved', value: '4' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
              <p className="text-3xl font-black text-gray-900 mb-1">{stat.value}</p>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ─── Specialties ─── */}
        {specialties.length > 0 && (
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xs font-black text-ethiopian-gold uppercase tracking-[0.3em] mb-6">Specialties</h2>
            <div className="flex flex-wrap gap-3">
              {specialties.map((s, i) => (
                <span
                  key={i}
                  className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-sm font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ─── Custom Design Banner ─── */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center">
            {/* Left: Content */}
            <div className="flex-1 p-8 sm:p-12">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full mb-6">
                <Ruler className="w-4 h-4 text-ethiopian-gold" />
                <span className="text-xs font-black text-amber-800 uppercase tracking-widest">Custom Design Service</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-['Playfair_Display',serif] font-black text-gray-900 mb-4 leading-tight">
                የእርስዎን ልዩ<br />
                <span className="text-ethiopian-gold">ዲዛይን</span> ያዛዙ
              </h2>
              <p className="text-gray-600 leading-relaxed mb-2 max-w-lg">
                Work directly with <strong>{name}</strong> to create a one-of-a-kind garment tailored to your exact measurements and preferences.
              </p>
              <p className="text-gray-500 text-sm mb-8 max-w-lg">
                Share your measurements, upload reference photos, and describe your vision. {name} will bring it to life.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3 mb-10">
                {[
                  { icon: <Ruler className="w-3.5 h-3.5" />, label: 'Custom Measurements' },
                  { icon: <Scissors className="w-3.5 h-3.5" />, label: 'Handcrafted by Expert' },
                  { icon: <SparklesIcon className="w-3.5 h-3.5" />, label: 'Unique Design' },
                ].map((pill, i) => (
                  <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700">
                    <span className="text-ethiopian-gold">{pill.icon}</span>
                    {pill.label}
                  </span>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => navigate(`/custom-order?artisanId=${id}`)}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-black transition-all shadow-xl shadow-gray-200 hover:shadow-gray-300 hover:-translate-y-0.5"
              >
                <Scissors className="w-5 h-5 text-ethiopian-gold group-hover:rotate-12 transition-transform" />
                ትዕዛዝ ይጀምሩ
                <span className="text-gray-400 font-normal normal-case tracking-normal text-[11px] ml-1">
                  (Start Custom Order)
                </span>
              </button>
            </div>

            {/* Right: Decorative Visual */}
            <div className="hidden lg:flex w-72 xl:w-96 self-stretch bg-gradient-to-br from-amber-50 to-orange-50 items-center justify-center relative overflow-hidden p-12 shrink-0">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-4 right-4 rotate-45">
                  <Ruler size={120} />
                </div>
                <div className="absolute bottom-4 left-4 -rotate-12">
                  <Scissors size={80} />
                </div>
              </div>
              {/* Central Icon Stack */}
              <div className="relative z-10 text-center">
                <div className="w-28 h-28 bg-white rounded-[2rem] shadow-2xl shadow-amber-100 flex items-center justify-center mx-auto mb-4 border border-amber-100">
                  <Scissors className="w-14 h-14 text-ethiopian-gold" strokeWidth={1.5} />
                </div>
                <div className="w-20 h-20 bg-ethiopian-gold/10 rounded-[1.5rem] flex items-center justify-center mx-auto border border-ethiopian-gold/20">
                  <Ruler className="w-10 h-10 text-ethiopian-gold" strokeWidth={1.5} />
                </div>
                <p className="mt-4 text-[10px] font-black text-amber-800/60 uppercase tracking-widest">Master Craftsmanship</p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ArtisanProfile;
