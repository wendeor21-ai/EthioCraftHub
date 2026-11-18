import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { adminAPI } from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSettings } from '../../contexts/SettingsContext';
import { getFileUrl } from '../../utils/getFileUrl';
import toast from 'react-hot-toast';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Trash2, 
  Plus, 
  Save, 
  Download, 
  Globe, 
  DollarSign, 
  CheckCircle2, 
  Upload,
  Sliders,
  Layers,
  Building,
  ExternalLink,
  Megaphone,
  Clock,
  Users,
  User,
  AlertTriangle,
  Info,
  Gift,
  Send,
  XCircle,
  Eye,
  Radio,
  Bell
} from 'lucide-react';

const AdminSettings = ({ insideDashboard, onSelectTab, initialTab }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = searchParams.get('sub') || (searchParams.get('tab') === 'broadcast' ? 'broadcast' : null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || subParam || 'hero'); // 'hero', 'branding', 'broadcast', 'heritage', 'fees', 'backup'

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (subParam) {
      setActiveTab(subParam);
    }
  }, [initialTab, subParam]);

  // Broadcast Management State
  const [broadcastsList, setBroadcastsList] = useState([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [deletingBroadcastId, setDeletingBroadcastId] = useState(null);
  const [bForm, setBForm] = useState({
    title: '',
    message: '',
    target: 'all', // 'all', 'artisan', 'customer', 'individual'
    targetEmail: '',
    type: 'announcement', // 'announcement', 'alert', 'promotion', 'info'
    durationHours: 24 // 6, 12, 24, 48, 168, 0
  });

  const [platform, setPlatform] = useState({
    name: 'EthioCraft',
    contactEmail: '',
    currency: 'ETB',
    region: 'ET',
    logoUrl: '',
    commissionRate: 5,
    vatRate: 15
  });

  const [homeConfig, setHomeConfig] = useState({
    heroSlides: [],
    heritageTitle_en: '',
    heritageTitle_am: '',
    heritageDescription_en: '',
    heritageDescription_am: '',
    heritageImage: '',
    headerLogo: '',
    footerLogo: ''
  });

  const { refresh, updateSettings, updateHomeConfig } = useSettings();

  const cleanUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    return url.replace(/^https?:\/\/localhost(:\d+)?/i, '').replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, '');
  };

  const fetchAdminBroadcasts = async () => {
    try {
      setLoadingBroadcasts(true);
      const res = await adminAPI.getBroadcasts();
      if (res.data?.broadcasts) {
        setBroadcastsList(res.data.broadcasts);
      }
    } catch (err) {
      console.warn('Failed to load broadcasts', err);
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    if (e) e.preventDefault();
    if (!bForm.message || !bForm.message.trim()) {
      toast.error('Please enter a broadcast announcement message');
      return;
    }
    if (bForm.target === 'individual' && !bForm.targetEmail.trim()) {
      toast.error('Please provide a valid recipient email address');
      return;
    }

    setSendingBroadcast(true);
    const toastId = toast.loading('Publishing live broadcast to platform header...');
    try {
      const payload = {
        title: bForm.title.trim() || undefined,
        message: bForm.message.trim(),
        target: bForm.target,
        targetEmail: bForm.target === 'individual' ? bForm.targetEmail.trim().toLowerCase() : undefined,
        type: bForm.type,
        durationHours: Number(bForm.durationHours)
      };

      const res = await adminAPI.broadcastNotification(payload);
      if (res.data?.success) {
        toast.success('📢 Broadcast sent! Live on header with left-to-right animation.', { id: toastId });
        setBForm({
          title: '',
          message: '',
          target: 'all',
          targetEmail: '',
          type: 'announcement',
          durationHours: 24
        });
        await fetchAdminBroadcasts();
        await refresh();
      } else {
        toast.error('Failed to send broadcast', { id: toastId });
      }
    } catch (err) {
      console.error('Broadcast send error:', err);
      toast.error(err.response?.data?.error || 'Failed to send broadcast. Please try again.', { id: toastId });
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleDeleteBroadcast = async (id) => {
    setDeletingBroadcastId(id);
    const toastId = toast.loading('Removing broadcast notification from header...');
    try {
      const res = await adminAPI.deleteBroadcast(id);
      if (res.data?.success) {
        toast.success('Broadcast notification removed immediately from all headers!', { id: toastId });
        await fetchAdminBroadcasts();
        await refresh();
      } else {
        toast.error('Failed to remove broadcast', { id: toastId });
      }
    } catch (err) {
      console.error('Delete broadcast error:', err);
      toast.error('Failed to remove broadcast', { id: toastId });
    } finally {
      setDeletingBroadcastId(null);
    }
  };

  const handleClearAllBroadcasts = async () => {
    if (!window.confirm('Are you sure you want to remove ALL active broadcast notifications from the header?')) return;
    const toastId = toast.loading('Clearing all broadcasts...');
    try {
      const res = await adminAPI.deleteBroadcast('all');
      if (res.data?.success) {
        toast.success('All broadcast notifications cleared from all headers!', { id: toastId });
        await fetchAdminBroadcasts();
        await refresh();
      }
    } catch (err) {
      toast.error('Failed to clear broadcasts', { id: toastId });
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, hcRes] = await Promise.all([
        adminAPI.getPlatformSettings().catch(() => null),
        api.get('/settings/homepage').catch(() => null),
        fetchAdminBroadcasts().catch(() => null)
      ]);

      if (pRes?.data?.settings) {
        setPlatform(prev => ({
          ...prev,
          ...pRes.data.settings,
          logoUrl: cleanUrl(pRes.data.settings.logoUrl)
        }));
      }

      if (hcRes?.data?.data) {
        const hc = hcRes.data.data;
        setHomeConfig({
          ...hc,
          headerLogo: cleanUrl(hc.headerLogo),
          footerLogo: cleanUrl(hc.footerLogo),
          heritageImage: cleanUrl(hc.heritageImage),
          heroSlides: Array.isArray(hc.heroSlides) ? hc.heroSlides.map(s => ({ ...s, image: cleanUrl(s.image) })) : []
        });
      }
    } catch (err) {
      console.error('fetch settings error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Upload Logo handler (headerLogo or footerLogo)
  const handleLogoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('logo', file);
    const toastId = toast.loading('Uploading logo...');

    try {
      setSaving(true);
      const res = await api.post('/admin/settings/upload-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        const uploadedPath = cleanUrl(res.data.url || res.data.logoUrl);
        
        // Update local state
        setHomeConfig(prev => ({ ...prev, [type]: uploadedPath }));
        if (type === 'headerLogo') {
          setPlatform(prev => ({ ...prev, logoUrl: uploadedPath }));
        }

        // Persist immediately to backend
        await api.put('/admin/settings/homepage', { ...homeConfig, [type]: uploadedPath });
        if (type === 'headerLogo') {
          await adminAPI.setPlatformSettings({ ...platform, logoUrl: uploadedPath });
          updateSettings({ logoUrl: uploadedPath });
        }
        updateHomeConfig({ [type]: uploadedPath });
        await refresh();

        toast.success(`${type === 'headerLogo' ? 'Header' : 'Footer'} logo updated successfully!`, { id: toastId });
      } else {
        toast.error('Failed to upload logo', { id: toastId });
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error('Upload failed. Please try again.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Upload Hero Slide Image
  const handleSlideImageUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('logo', file);
    const toastId = toast.loading('Uploading slide image...');

    try {
      setSaving(true);
      const res = await api.post('/admin/settings/upload-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success) {
        const uploadedPath = cleanUrl(res.data.url || res.data.logoUrl);
        const updatedSlides = [...(homeConfig.heroSlides || [])];
        updatedSlides[index] = { ...updatedSlides[index], image: uploadedPath };

        setHomeConfig(prev => ({ ...prev, heroSlides: updatedSlides }));
        await api.put('/admin/settings/homepage', { ...homeConfig, heroSlides: updatedSlides });
        updateHomeConfig({ heroSlides: updatedSlides });
        await refresh();

        toast.success(`Slide #${index + 1} image updated!`, { id: toastId });
      }
    } catch (err) {
      console.error('Slide upload error:', err);
      toast.error('Failed to upload slide image', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Slide fields change
  const handleSlideFieldChange = (index, field, value) => {
    const updated = [...(homeConfig.heroSlides || [])];
    const s = { ...updated[index], [field]: value };
    if (field === 'title_en') s.title = value;
    if (field === 'description_en') s.subtitle = value;
    if (field === 'title' && !s.title_en) s.title_en = value;
    if (field === 'subtitle' && !s.description_en) s.description_en = value;
    updated[index] = s;
    setHomeConfig(prev => ({ ...prev, heroSlides: updated }));
  };

  // Add new hero slide
  const handleAddSlide = () => {
    const newSlide = {
      title_en: 'Authentic Ethiopian Crafts',
      title_am: 'ትክክለኛ የኢትዮጵያ የእጅ ጥበብ ውጤቶች',
      description_en: 'Directly from verified master artisans across Ethiopia',
      description_am: 'ከተረጋገጡ የኢትዮጵያ የእጅ ጥበብ ባለሙያዎች በቀጥታ',
      badge_en: 'Featured',
      badge_am: 'ተመራጭ',
      cta_en: 'Explore Marketplace',
      cta_am: 'ምርቶችን ይመልከቱ',
      link: '/products',
      image: '/images/hero/hero-bg.jpg'
    };
    setHomeConfig(prev => ({
      ...prev,
      heroSlides: [...(prev.heroSlides || []), newSlide]
    }));
    toast.success('New slide added. Click Save to publish.');
  };

  // Delete slide
  const handleDeleteSlide = (index) => {
    const updated = (homeConfig.heroSlides || []).filter((_, i) => i !== index);
    setHomeConfig(prev => ({ ...prev, heroSlides: updated }));
    toast.success(`Slide #${index + 1} removed.`);
  };

  // Save All Settings
  const handleSaveAll = async () => {
    setSaving(true);
    const toastId = toast.loading('Saving settings & updating website...');
    try {
      const cleanSlides = (homeConfig.heroSlides || []).map(s => ({
        ...s,
        image: cleanUrl(s.image)
      }));

      const cleanHomeData = {
        ...homeConfig,
        headerLogo: cleanUrl(homeConfig.headerLogo),
        footerLogo: cleanUrl(homeConfig.footerLogo),
        heritageImage: cleanUrl(homeConfig.heritageImage),
        heroSlides: cleanSlides
      };

      const cleanPlatformData = {
        ...platform,
        logoUrl: cleanUrl(platform.logoUrl || homeConfig.headerLogo)
      };

      await Promise.all([
        api.put('/admin/settings/homepage', cleanHomeData),
        adminAPI.setPlatformSettings(cleanPlatformData)
      ]);

      // Update global context so header & customer pages reflect instantly
      updateHomeConfig(cleanHomeData);
      updateSettings(cleanPlatformData);
      await refresh();

      toast.success('All settings saved! Homepage & branding updated live.', { id: toastId });
    } catch (err) {
      console.error('Save settings error:', err);
      toast.error('Failed to save settings. Please try again.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Full Database Backup
  const handleDownloadBackup = async () => {
    try {
      setBackingUp(true);
      const response = await api.get('/admin/backup/download', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ethiocraft-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Database backup downloaded successfully!');
    } catch (err) {
      console.error('Backup error:', err);
      toast.error('Failed to download database backup');
    } finally {
      setBackingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pb-10">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
            Platform Settings & Content Manager
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your site branding, homepage hero slides, and platform rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            <span>View Live Site</span>
          </a>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'hero', label: 'Hero Slides', icon: Layers },
          { id: 'branding', label: 'Logos & Brand', icon: Sparkles },
          { id: 'broadcast', label: '📢 Broadcast Messages', icon: Megaphone, highlight: true },
          { id: 'heritage', label: 'Heritage Section', icon: Building },
          { id: 'fees', label: 'Fees & Commission', icon: DollarSign },
          { id: 'backup', label: 'System Backup', icon: Download }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'broadcast') fetchAdminBroadcasts();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : tab.highlight
                  ? 'bg-amber-50 text-amber-900 border-2 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-white' : tab.highlight ? 'text-amber-600' : 'text-gray-500'}`} />
              <span>{tab.label}</span>
              {tab.highlight && !active && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: HERO SLIDES */}
      {activeTab === 'hero' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-amber-900">Homepage Hero Slider</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                These slides appear at the very top of the customer homepage ({homeConfig.heroSlides?.length || 0} active).
              </p>
            </div>
            <button
              onClick={handleAddSlide}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Slide</span>
            </button>
          </div>

          <div className="space-y-4">
            {(homeConfig.heroSlides || []).map((slide, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-gray-800">Slide #{idx + 1}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteSlide(idx)}
                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Slide</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                  {/* Image Preview & Upload */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-gray-600">Slide Image Preview</span>
                    <div className="relative aspect-[16/9] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-inner group">
                      {slide.image ? (
                        <img
                          src={getFileUrl(slide.image)}
                          alt={`Slide ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/images/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon className="w-8 h-8 mb-1" />
                          <span className="text-[11px]">No Image Uploaded</span>
                        </div>
                      )}
                    </div>
                    <label className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5 text-gray-500" />
                      <span>Upload Slide Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSlideImageUpload(e, idx)}
                      />
                    </label>
                  </div>

                  {/* Text Content */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Headline (English)</label>
                      <input
                        type="text"
                        value={slide.title_en || slide.title || ''}
                        onChange={(e) => handleSlideFieldChange(idx, 'title_en', e.target.value)}
                        placeholder="e.g. Discover Authentic Ethiopian Crafts"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Headline (Amharic)</label>
                      <input
                        type="text"
                        value={slide.title_am || ''}
                        onChange={(e) => handleSlideFieldChange(idx, 'title_am', e.target.value)}
                        placeholder="ምሳሌ፡ ትክክለኛ የኢትዮጵያ የእጅ ጥበብ ውጤቶች"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Subtitle (English)</label>
                      <textarea
                        rows={2}
                        value={slide.description_en || slide.subtitle || ''}
                        onChange={(e) => handleSlideFieldChange(idx, 'description_en', e.target.value)}
                        placeholder="Short description under the headline..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Subtitle (Amharic)</label>
                      <textarea
                        rows={2}
                        value={slide.description_am || ''}
                        onChange={(e) => handleSlideFieldChange(idx, 'description_am', e.target.value)}
                        placeholder="አጭር መግለጫ..."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Button Text (CTA)</label>
                      <input
                        type="text"
                        value={slide.cta_en || slide.cta || ''}
                        onChange={(e) => handleSlideFieldChange(idx, 'cta_en', e.target.value)}
                        placeholder="Explore Marketplace"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Destination Link</label>
                      <input
                        type="text"
                        value={slide.link || '/products'}
                        onChange={(e) => handleSlideFieldChange(idx, 'link', e.target.value)}
                        placeholder="/products"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BRANDING & LOGOS */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Header Logo */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Header Logo</h3>
            <p className="text-xs text-gray-500">
              Appears in the main navigation bar at the top of every page.
            </p>
            <div className="w-full h-28 bg-amber-50/50 rounded-xl border border-gray-200 flex items-center justify-center p-3">
              {homeConfig.headerLogo || platform.logoUrl ? (
                <img
                  src={getFileUrl(homeConfig.headerLogo || platform.logoUrl)}
                  alt="Header Logo"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => { e.currentTarget.src = '/logo192.png'; }}
                />
              ) : (
                <span className="text-xs text-gray-400">No logo uploaded</span>
              )}
            </div>
            <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Change Header Logo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoUpload(e, 'headerLogo')}
              />
            </label>
          </div>

          {/* Footer Logo */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Footer Logo</h3>
            <p className="text-xs text-gray-500">
              Appears on the dark footer at the bottom of the website.
            </p>
            <div className="w-full h-28 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center p-3">
              {homeConfig.footerLogo ? (
                <img
                  src={getFileUrl(homeConfig.footerLogo)}
                  alt="Footer Logo"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => { e.currentTarget.src = '/logo192.png'; }}
                />
              ) : (
                <span className="text-xs text-slate-500">No footer logo</span>
              )}
            </div>
            <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Change Footer Logo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoUpload(e, 'footerLogo')}
              />
            </label>
          </div>

          {/* Basic Site Info */}
          <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Platform Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Platform Brand Name</label>
                <input
                  type="text"
                  value={platform.name || ''}
                  onChange={(e) => setPlatform({ ...platform, name: e.target.value })}
                  placeholder="EthioCraft Global"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Public Contact Email</label>
                <input
                  type="email"
                  value={platform.contactEmail || ''}
                  onChange={(e) => setPlatform({ ...platform, contactEmail: e.target.value })}
                  placeholder="contact@ethiocraft.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BROADCAST MESSAGES & HEADER ALERTS */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6">
          {/* Header Description Banner */}
          <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl shrink-0">
                📢
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Live Broadcast Notification Center</h3>
                <p className="text-xs text-amber-100 mt-0.5 leading-relaxed max-w-2xl">
                  Broadcast real-time announcements directly to the top header across the platform with animated left-to-right gliding. Target all artisans, all customers, both, or individual users with configurable auto-expiration (e.g. 24h) and instant removal.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchAdminBroadcasts}
              disabled={loadingBroadcasts}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{loadingBroadcasts ? 'Refreshing...' : 'Refresh List'}</span>
            </button>
          </div>

          {/* Broadcast Composer Form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  <span>Compose Header Broadcast Announcement</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">Send a real-time notification to the website header with animated styling.</p>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-5">
              {/* 1. Target Audience Selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">
                  1. Select Target Audience (ተቀባይ / ሚና ይምረጡ)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'all', label: 'All Users', desc: 'Artisans + Customers', icon: Users, badge: '👥 Everyone' },
                    { id: 'artisan', label: 'All Artisans', desc: 'Artisans Only', icon: Building, badge: '🎨 Artisans' },
                    { id: 'customer', label: 'All Customers', desc: 'Shoppers Only', icon: Globe, badge: '🛍️ Customers' },
                    { id: 'individual', label: 'Individual User', desc: 'Specific by Email', icon: User, badge: '👤 Single User' }
                  ].map(tgt => {
                    const Icon = tgt.icon;
                    const selected = bForm.target === tgt.id;
                    return (
                      <button
                        key={tgt.id}
                        type="button"
                        onClick={() => setBForm(prev => ({ ...prev, target: tgt.id }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-amber-500 bg-amber-50/40 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Icon className={`w-4 h-4 ${selected ? 'text-amber-600' : 'text-gray-400'}`} />
                          <span className="text-[10px] font-bold text-gray-500">{tgt.badge}</span>
                        </div>
                        <div className="text-xs font-bold text-gray-900">{tgt.label}</div>
                        <div className="text-[10px] text-gray-500 truncate">{tgt.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Individual Email Input */}
                {bForm.target === 'individual' && (
                  <div className="mt-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 animate-fadeIn">
                    <label className="text-xs font-bold text-amber-900 block mb-1">
                      Recipient User Email (የተጠቃሚው ኢሜይል) *
                    </label>
                    <input
                      type="email"
                      value={bForm.targetEmail}
                      onChange={(e) => setBForm(prev => ({ ...prev, targetEmail: e.target.value }))}
                      placeholder="e.g. yeshiwagaw21@gmail.com"
                      required
                      className="w-full border border-amber-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 bg-white outline-none font-medium"
                    />
                    <p className="text-[10px] text-amber-700 mt-1">This announcement will only be delivered to this specific user account.</p>
                  </div>
                )}
              </div>

              {/* 2. Style & Type Selector */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">
                  2. Select Broadcast Type & Header Color (የመልእክት አይነትና ቀለም)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'announcement', label: 'Announcement', color: 'from-amber-600 to-yellow-600', icon: '📢', desc: 'Ethiopian Gold' },
                    { id: 'alert', label: 'Urgent Alert', color: 'from-red-600 to-rose-600', icon: '🚨', desc: 'Vibrant Red' },
                    { id: 'promotion', label: 'Special Offer', color: 'from-emerald-600 to-teal-600', icon: '🎁', desc: 'Emerald Green' },
                    { id: 'info', label: 'Platform Info', color: 'from-blue-600 to-indigo-600', icon: 'ℹ️', desc: 'Royal Blue' }
                  ].map(t => {
                    const selected = bForm.type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBForm(prev => ({ ...prev, type: t.id }))}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-amber-500 bg-amber-50/30 shadow-sm ring-1 ring-amber-500'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{t.icon}</span>
                          <span className="text-xs font-bold text-gray-900">{t.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${t.color}`}></div>
                          <span className="text-[10px] text-gray-500">{t.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Duration / Expiration Selector */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  3. Display Duration & Auto-Expiration (የቆይታ ጊዜ / ራስ-ሰር ማጥፊያ)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  After the specified time, the notification is automatically removed from the header.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { hours: 6, label: '⚡ 6 Hours' },
                    { hours: 12, label: '🕒 12 Hours' },
                    { hours: 24, label: '⏰ 24 Hours (Default)', recommended: true },
                    { hours: 48, label: '📅 48 Hours (2 Days)' },
                    { hours: 168, label: '📆 7 Days' },
                    { hours: 0, label: '♾️ Permanent (Until Removed)' }
                  ].map(d => {
                    const selected = Number(bForm.durationHours) === d.hours;
                    return (
                      <button
                        key={d.hours}
                        type="button"
                        onClick={() => setBForm(prev => ({ ...prev, durationHours: d.hours }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          selected
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Title and Message Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Headline / Title (አርዕስት)
                  </label>
                  <input
                    type="text"
                    value={bForm.title}
                    onChange={(e) => setBForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. ልዩ ማስታወቂያ"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Announcement Message (የመልእክቱ ዝርዝር) *
                  </label>
                  <textarea
                    rows={2}
                    value={bForm.message}
                    onChange={(e) => setBForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="e.g. እንኳን ለኢትዮጵያ የባህል የእጅ ጥበብ ሳምንት በሰላም አደረሳችሁ! በሁሉም የእጅ ጥበብ ውጤቶች ላይ 20% ቅናሽ ተደርጓል።"
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none font-medium"
                  />
                  <div className="text-[10px] text-gray-400 text-right mt-0.5">
                    {bForm.message.length} characters
                  </div>
                </div>
              </div>

              {/* 5. Live Header Simulation Preview */}
              <div>
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span>Real-Time Header Preview (በዌብሳይቱ ራስጌ ላይ የሚታይበት መንገድ)</span>
                </label>
                <div className="rounded-xl overflow-hidden border border-gray-300 shadow-inner">
                  {/* Simulation Bar */}
                  <div className={`relative overflow-hidden py-2 px-3 sm:px-4 text-white text-xs ${
                    bForm.type === 'alert'
                      ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-600'
                      : bForm.type === 'promotion'
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500'
                      : bForm.type === 'info'
                      ? 'bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600'
                      : 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700'
                  }`}>
                    {/* Glowing shimmer */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-25"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                        animation: 'shimmerBeam 3s infinite'
                      }}
                    />

                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-1.5 shrink-0 bg-black/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <span>{bForm.type === 'alert' ? '🚨' : bForm.type === 'promotion' ? '🎁' : bForm.type === 'info' ? 'ℹ️' : '📢'}</span>
                        <span className="uppercase">
                          {bForm.type === 'alert' ? 'ALERT' : bForm.type === 'promotion' ? 'PROMO' : bForm.type === 'info' ? 'INFO' : 'NOTICE'}
                        </span>
                      </div>

                      <div className="flex-1 overflow-hidden min-w-0">
                        <div 
                          className="inline-block whitespace-nowrap font-bold text-white text-xs drop-shadow-sm"
                          style={{ animation: 'slideLeftToRight 10s ease-in-out infinite alternate' }}
                        >
                          <span className="text-white/80 mr-1.5 font-semibold">[{bForm.title.trim() || 'Notice'}]:</span>
                          <span>{bForm.message.trim() || 'Your broadcast announcement will slide smoothly across the top header...'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                          ⏱️ {bForm.durationHours > 0 ? `${bForm.durationHours}h left` : 'Permanent'}
                        </span>
                        <span className="text-white/80 text-xs">✕</span>
                      </div>
                    </div>
                  </div>

                  {/* Dummy Mini Navbar underneath */}
                  <div className="bg-white px-4 py-2 flex items-center justify-between border-t border-gray-100 text-[11px] text-gray-500">
                    <span className="font-bold text-amber-800">EthioCraft Global Header</span>
                    <span className="text-gray-400">Shop • AI Assistant • Search • Cart</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingBroadcast ? 'Sending Broadcast Live...' : '🚀 Send Live Broadcast to Header'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active & Scheduled Broadcasts Management */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  <span>Active & Recent Header Broadcasts ({broadcastsList.length})</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">Manage live broadcasts currently being displayed or expired.</p>
              </div>

              {broadcastsList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllBroadcasts}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Broadcasts</span>
                </button>
              )}
            </div>

            {loadingBroadcasts ? (
              <div className="py-8 text-center">
                <LoadingSpinner size="medium" />
              </div>
            ) : broadcastsList.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl space-y-2">
                <div className="text-3xl text-gray-300">📢</div>
                <h5 className="text-xs font-bold text-gray-700">No Active Broadcasts</h5>
                <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                  There are no announcements currently running on the header. Use the composer above to publish one!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {broadcastsList.map((item) => {
                  const isDeleting = deletingBroadcastId === item._id;
                  const isExpired = item.isExpired;

                  const typeBadgeMap = {
                    alert: { bg: 'bg-red-100 text-red-800 border-red-200', label: '🚨 Alert' },
                    promotion: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: '🎁 Promo' },
                    info: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'ℹ️ Info' },
                    announcement: { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: '📢 Announcement' },
                    targeted: { bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: '🎯 Targeted' },
                    system: { bg: 'bg-purple-100 text-purple-800 border-purple-200', label: '⚙️ System' },
                    warning: { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: '⚠️ Warning' }
                  };
                  const typeKey = (item.type || 'announcement').toLowerCase();
                  const typeBadge = typeBadgeMap[typeKey] || {
                    bg: 'bg-amber-100 text-amber-800 border-amber-200',
                    label: `📢 ${item.type || 'Announcement'}`
                  };

                  const targetBadgeMap = {
                    all: { bg: 'bg-purple-100 text-purple-800', label: '👥 All Users' },
                    artisan: { bg: 'bg-amber-100 text-amber-800', label: '🎨 Artisans' },
                    artisans: { bg: 'bg-amber-100 text-amber-800', label: '🎨 Artisans' },
                    customer: { bg: 'bg-teal-100 text-teal-800', label: '🛍️ Customers' },
                    customers: { bg: 'bg-teal-100 text-teal-800', label: '🛍️ Customers' },
                    individual: { bg: 'bg-indigo-100 text-indigo-800', label: `👤 ${item.targetEmail || 'Single User'}` }
                  };
                  const targetKey = (item.target || 'all').toLowerCase();
                  const targetBadge = targetBadgeMap[targetKey] || {
                    bg: 'bg-gray-100 text-gray-800',
                    label: `👥 ${item.target || 'All Users'}`
                  };

                  return (
                    <div 
                      key={item._id}
                      className={`p-4 rounded-xl border transition-all ${
                        isExpired 
                          ? 'bg-gray-50 border-gray-200 opacity-60' 
                          : 'bg-white border-amber-200 shadow-sm hover:border-amber-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Badges Bar */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge?.bg || 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                              {typeBadge?.label || 'Announcement'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${targetBadge?.bg || 'bg-gray-100 text-gray-800'}`}>
                              {targetBadge?.label || 'All Users'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                              isExpired ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-gray-500' : 'bg-green-500 animate-pulse'}`}></span>
                              <span>{isExpired ? 'Expired' : 'Live in Header'}</span>
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              ⏱️ {item.remainingText || (item.durationHours ? `${item.durationHours}h duration` : 'Permanent')}
                            </span>
                          </div>

                          {/* Title & Message */}
                          <h5 className="text-xs sm:text-sm font-bold text-gray-900 leading-snug">
                            {item.title || 'Platform Notice'}
                          </h5>
                          <p className="text-xs text-gray-700 font-medium leading-relaxed bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                            {item.message}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-0.5">
                            <span>Sent: {new Date(item.createdAt).toLocaleString()}</span>
                            <span>By: {item.createdBy || 'Admin'}</span>
                          </div>
                        </div>

                        {/* Best Action Button - Remove Broadcast Instantly */}
                        <div className="shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteBroadcast(item._id)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
                            title="Remove notification from header immediately"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isDeleting ? 'Removing...' : 'Remove from Header'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: HERITAGE SECTION */}
      {activeTab === 'heritage' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Heritage Spotlight Section</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Tells the story of Ethiopian craftsmanship on the homepage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Heritage Headline (English)</label>
              <input
                type="text"
                value={homeConfig.heritageTitle_en || ''}
                onChange={(e) => setHomeConfig({ ...homeConfig, heritageTitle_en: e.target.value })}
                placeholder="Where Heritage Meets Modernity"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Heritage Headline (Amharic)</label>
              <input
                type="text"
                value={homeConfig.heritageTitle_am || ''}
                onChange={(e) => setHomeConfig({ ...homeConfig, heritageTitle_am: e.target.value })}
                placeholder="ቅርስ ከዘመናዊነት ጋር የሚገናኝበት"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Story Paragraph (English)</label>
              <textarea
                rows={4}
                value={homeConfig.heritageDescription_en || ''}
                onChange={(e) => setHomeConfig({ ...homeConfig, heritageDescription_en: e.target.value })}
                placeholder="Detailed story about authentic heritage craftsmanship..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Story Paragraph (Amharic)</label>
              <textarea
                rows={4}
                value={homeConfig.heritageDescription_am || ''}
                onChange={(e) => setHomeConfig({ ...homeConfig, heritageDescription_am: e.target.value })}
                placeholder="ስለ ባህላዊ ቅርስ ዝርዝር መግለጫ..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FEES & COMMISSION */}
      {activeTab === 'fees' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Platform Financial Rules</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Set standard commissions and VAT collected across sales.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Platform Commission (%)</label>
              <input
                type="number"
                value={platform.commissionRate || 5}
                onChange={(e) => setPlatform({ ...platform, commissionRate: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">VAT Rate (%)</label>
              <input
                type="number"
                value={platform.vatRate || 15}
                onChange={(e) => setPlatform({ ...platform, vatRate: parseFloat(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Currency</label>
              <select
                value={platform.currency || 'ETB'}
                onChange={(e) => setPlatform({ ...platform, currency: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none font-bold bg-white"
              >
                <option value="ETB">ETB (Ethiopian Birr)</option>
                <option value="USD">USD (US Dollar)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM BACKUP */}
      {activeTab === 'backup' && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💾</span>
            <div>
              <h3 className="text-base font-bold">System Database Backup & Export</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Download a complete, offline JSON archive of all users, products, orders, and platform settings.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadBackup}
            disabled={backingUp}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-900 rounded-xl text-xs font-bold shadow hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{backingUp ? 'Generating Backup...' : 'Download JSON Backup'}</span>
          </button>
        </div>
      )}

      {/* Floating Save Button at bottom */}
      <div className="pt-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
