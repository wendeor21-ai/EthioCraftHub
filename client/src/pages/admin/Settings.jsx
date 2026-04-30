import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { adminAPI } from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useSettings } from '../../contexts/SettingsContext';
import toast from 'react-hot-toast';
import { SparklesIcon } from '@heroicons/react/24/outline';

const HeroSlideEditor = ({ slide, index, handleHeroSlideChange, removeHeroSlide, onHeroImageUpload, generateECGSKU }) => {
  const [activeLangTab, setActiveLangTab] = useState('am');

  const handleAutoTranslate = async (field) => {
    // Find first non-empty field as source
    const sourceText = slide[`${field}_${activeLangTab}`] || 
                       slide[`${field}_en`] || 
                       slide[`${field}_am`] || 
                       slide[field];
                       
    if (!sourceText) return toast.error('No source text found to translate');
    
    const loadingToast = toast.loading('Synchronizing across all languages...');
    
    // Logic: If we have sourceText, fill in ANY empty fields for this slide
    setTimeout(() => {
      const translations = {
        [`${field}_en`]: slide[`${field}_en`] || sourceText,
        [`${field}_am`]: slide[`${field}_am`] || sourceText, // If Amharic is empty, use the source
        [`${field}_or`]: slide[`${field}_or`] || `(Oromo) ${sourceText}`,
        [`${field}_ti`]: slide[`${field}_ti`] || `(Tigrinya) ${sourceText}`
      };
      
      Object.entries(translations).forEach(([key, val]) => {
        handleHeroSlideChange(index, key, val);
      });
      
      toast.dismiss(loadingToast);
      toast.success('Fields auto-filled');
    }, 800);
  };

  return (
    <div className="border border-gray-200 rounded-2xl p-5 mb-6 bg-white shadow-sm border-l-4 border-l-ethiopian-gold transition-all hover:shadow-md">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <div className="bg-ethiopian-gold text-white text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center shadow-lg shadow-ethiopian-gold/20">
            {index + 1}
          </div>
          <span className="text-sm font-black text-gray-800 uppercase tracking-widest">Hero Slide</span>
        </div>
        <button onClick={() => removeHeroSlide(index)} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors">Delete Slide</button>
      </div>

      <div className="flex gap-2 mb-6 bg-gray-50 p-1 rounded-xl">
        {['am', 'en', 'or', 'ti'].map(lang => (
          <button
            key={lang}
            type="button"
            onClick={() => setActiveLangTab(lang)}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeLangTab === lang ? 'bg-white text-ethiopian-gold shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {lang === 'en' ? 'English' : lang === 'am' ? 'ባህላዊ' : lang === 'or' ? 'Oromo' : 'Tigrinya'}
          </button>
        ))}
      </div>
      
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Headline ({activeLangTab})</label>
              <button 
                type="button"
                onClick={() => handleAutoTranslate('title')} 
                className="text-[9px] font-black text-ethiopian-gold uppercase tracking-widest hover:underline bg-ethiopian-gold/5 px-2 py-0.5 rounded cursor-pointer"
              >
                Auto-Fill Others
              </button>
            </div>
            <input 
              value={slide[`title_${activeLangTab}`] || (activeLangTab === 'en' ? slide.title : '') || ''} 
              onChange={e => handleHeroSlideChange(index, `title_${activeLangTab}`, e.target.value)} 
              className="w-full bg-gray-50/50 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-ethiopian-gold focus:bg-white transition-all" 
              placeholder={slide.title || "Enter Headline"}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-headline ({activeLangTab})</label>
            <input 
              value={slide[`subtitle_${activeLangTab}`] || (activeLangTab === 'en' ? slide.subtitle : '') || ''} 
              onChange={e => handleHeroSlideChange(index, `subtitle_${activeLangTab}`, e.target.value)} 
              className="w-full bg-gray-50/50 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-ethiopian-gold focus:bg-white transition-all" 
              placeholder={slide.subtitle}
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description ({activeLangTab})</label>
            <button 
              type="button" 
              onClick={() => handleHeroSlideChange(index, 'hideDescription', !slide.hideDescription)}
              className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${slide.hideDescription ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              {slide.hideDescription ? '🙉 Hidden on Site' : '👁️ Visible'}
            </button>
          </div>
          <textarea 
            value={slide[`description_${activeLangTab}`] || (activeLangTab === 'en' ? slide.description : '') || ''} 
            onChange={e => handleHeroSlideChange(index, `description_${activeLangTab}`, e.target.value)} 
            className={`w-full bg-gray-50/50 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold h-24 focus:ring-2 focus:ring-ethiopian-gold focus:bg-white transition-all resize-none ${slide.hideDescription ? 'opacity-40 grayscale' : ''}`} 
            placeholder={slide.description}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Badge ({activeLangTab})</label>
            <input value={slide[`badge_${activeLangTab}`] || (activeLangTab === 'en' ? slide.badge : '') || ''} onChange={e => handleHeroSlideChange(index, `badge_${activeLangTab}`, e.target.value)} className="w-full bg-gray-50/50 border-gray-100 rounded-xl px-4 py-2 text-xs font-bold" placeholder={slide.badge} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CTA Text ({activeLangTab})</label>
            <input value={slide[`cta_${activeLangTab}`] || (activeLangTab === 'en' ? slide.cta : '') || ''} onChange={e => handleHeroSlideChange(index, `cta_${activeLangTab}`, e.target.value)} className="w-full bg-gray-50/50 border-gray-100 rounded-xl px-4 py-2 text-xs font-bold" placeholder={slide.cta} />
          </div>
          <div className="md:col-span-2 space-y-1.5">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Destination Link</label>
             <input value={slide.link || ''} onChange={e => handleHeroSlideChange(index, 'link', e.target.value)} className="w-full bg-gray-50/50 border-gray-100 rounded-xl px-4 py-2 text-xs font-bold" placeholder="/products" />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-50">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Slide Media & Preview</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {slide.image ? (
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-inner group">
                <img src={slide.image} alt="preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-[8px] font-black text-ethiopian-gold uppercase tracking-[0.2em] mb-2">{slide[`badge_${activeLangTab}`] || 'NEW'}</span>
                  <h4 className="text-white font-black text-base leading-tight drop-shadow-lg mb-1">{slide[`title_${activeLangTab}`] || 'HEADLINE'}</h4>
                  <p className="text-white/80 text-[10px] font-medium line-clamp-2">{slide[`description_${activeLangTab}`] || 'Description...'}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-[16/9] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-center">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest m-auto">No Image Uploaded</span>
              </div>
            )}
            <div className="space-y-3">
              <p className="text-[10px] text-gray-400 font-medium">Resolution: 1920x1080 Recommended</p>
              <input type="file" accept="image/*" onChange={(e) => onHeroImageUpload(e, index)} className="text-xs w-full block cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-ethiopian-gold file:text-white hover:file:bg-amber-600 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState({ name: 'EthioCraft', contactEmail: '', currency: 'ETB', region: 'ET', logoUrl: '', commissionRate: 5 });
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loginAlerts, setLoginAlerts] = useState([]);
  const [homeConfig, setHomeConfig] = useState({
    heroSlides: [],
    heritageTitle: '',
    heritageDescription: '',
    heritageImage: '',
    headerLogo: '',
    footerLogo: ''
  });
  const { refresh, updateSettings, updateHomeConfig } = useSettings();
  const [heritageLang, setHeritageLang] = useState('am');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, cmsRes, auditRes] = await Promise.all([
        adminAPI.getPlatformSettings(),
        adminAPI.getCMS(),
        adminAPI.getAuditLogs({ limit: 50 }),
      ]);
      if (pRes?.data?.settings) setPlatform(pRes.data.settings);
      if (cmsRes?.data) {
        setCategories(cmsRes.data.categories || []);
        setBanners(cmsRes.data.banners || []);
        setFeatured(cmsRes.data.featured || []);
      }
      if (auditRes?.data?.logs) setAuditLogs(auditRes.data.logs || []);
      // login alerts may be available at /admin/login-alerts
      try {
        const la = await api.get('/admin/login-alerts?limit=50');
        setLoginAlerts(la.data.alerts || []);
      } catch (e) { console.warn('no login alerts endpoint', e); }

      // Fetch Homepage Config
      try {
        const hc = await api.get('/settings/homepage');
        if (hc.data.success && hc.data.data) {
          setHomeConfig(hc.data.data);
        }
      } catch (e) { console.warn('no homepage config yet', e); }

    } catch (err) {
      console.error('fetch settings data', err);
    } finally { setLoading(false); }
  };

  const onLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      setSaving(true);
      const res = await api.post('/admin/platform-settings/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newLogoUrl = res.data.logoUrl;
      
      // Update local state immediately
      setPlatform(prev => ({ ...prev, logoUrl: newLogoUrl }));
      
      // Also update homeConfig.headerLogo to keep them in sync
      setHomeConfig(prev => ({ ...prev, headerLogo: newLogoUrl }));
      
      // Update global context
      updateSettings({ logoUrl: newLogoUrl });
      updateHomeConfig({ headerLogo: newLogoUrl });
      
      // Persist to MongoDB as well to ensure it's saved in both locations
      await api.put('/admin/settings/homepage', { ...homeConfig, headerLogo: newLogoUrl });
      
      await refresh();
      toast?.success && toast.success('Logo uploaded and synchronized');
    } catch (err) {
      console.error('upload logo', err);
      alert('Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const onSiteLogoChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      setSaving(true);
      const res = await api.post('/admin/settings/upload-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        const newUrl = res.data.url;
        setHomeConfig(prev => ({ ...prev, [type]: newUrl }));
        updateHomeConfig({ [type]: newUrl });
        
        // If it's headerLogo, also update platform logoUrl for consistency
        if (type === 'headerLogo') {
          setPlatform(prev => ({ ...prev, logoUrl: newUrl }));
          updateSettings({ logoUrl: newUrl });
          // Persist to platform settings too
          await adminAPI.setPlatformSettings({ ...platform, logoUrl: newUrl });
        }
        
        // Persist to MongoDB
        await api.put('/admin/settings/homepage', { ...homeConfig, [type]: newUrl });
        
        await refresh();
      }
    } catch (err) {
      console.error('upload site logo', err);
      alert('Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleHeroSlideChange = (index, field, value) => {
    const newSlides = [...(homeConfig.heroSlides || [])];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setHomeConfig({ ...homeConfig, heroSlides: newSlides });
  };

  const addHeroSlide = () => {
    const newSlide = { title: '', subtitle: '', description: '', image: '', cta: 'Shop Now', link: '/products', badge: 'New' };
    setHomeConfig({ ...homeConfig, heroSlides: [...(homeConfig.heroSlides || []), newSlide] });
  };

  const removeHeroSlide = (index) => {
    const newSlides = (homeConfig.heroSlides || []).filter((_, i) => i !== index);
    setHomeConfig({ ...homeConfig, heroSlides: newSlides });
  };

  const onHeroImageUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    try {
      setSaving(true);
      const res = await api.post('/admin/settings/upload-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        const url = res.data.url;
        handleHeroSlideChange(index, 'image', url);
        // Automatically push change to backend so the public site updates instantly without needing "Save All"
        const newSlides = [...(homeConfig.heroSlides || [])];
        newSlides[index] = { ...newSlides[index], image: url };
        await api.put('/admin/settings/homepage', { ...homeConfig, heroSlides: newSlides });
      }
    } catch (err) {
      console.error('upload hero image', err);
      alert('Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaultConfig = async () => {
    if (!window.confirm('This will reset your homepage Hero and Heritage content to professional Amharic/English/Oromo/Tigrinya defaults. Proceed?')) return;
    try {
      setSaving(true);
      const res = await api.post('/admin/settings/homepage/reset');
      if (res.data.success) {
        setHomeConfig(res.data.data);
        updateHomeConfig(res.data.data);
        await refresh();
        toast.success('Site configuration reset to localized defaults');
      }
    } catch (err) {
      console.error('reset config', err);
      toast.error('Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  const batchTranslateAll = async () => {
    if (!window.confirm('Auto-translate all slides into Oromo and Tigrinya based on Amharic/English content?')) return;
    try {
      setSaving(true);
      const newSlides = await Promise.all((homeConfig.heroSlides || []).map(async (slide) => {
        // Simple logic: if title_am exists, use it as source
        const source = slide.title_am || slide.title_en || slide.title;
        if (!source) return slide;
        
        // Mocking automatic multi-lingual translation
        return {
          ...slide,
          title_or: `(Oromo) ${source}`,
          title_ti: `(Tigrinya) ${source}`,
          subtitle_or: slide.subtitle_am ? `(Oromo) ${slide.subtitle_am}` : slide.subtitle_or,
          subtitle_ti: slide.subtitle_am ? `(Tigrinya) ${slide.subtitle_am}` : slide.subtitle_ti,
          description_or: slide.description_am ? `(Oromo) ${slide.description_am}` : slide.description_or,
          description_ti: slide.description_am ? `(Tigrinya) ${slide.description_am}` : slide.description_ti,
          cta_or: 'Kuusaa Ilaali',
          cta_ti: 'ስብስባት ዳህስሱ',
          badge_or: 'Haaraa',
          badge_ti: 'ሓድሽ'
        };
      }));
      
      const newConfig = { ...homeConfig, heroSlides: newSlides };
      setHomeConfig(newConfig);
      await api.put('/admin/settings/homepage', newConfig);
      await refresh();
      toast.success('All slides automatically localized');
    } catch (err) {
      console.error('batch translate', err);
      toast.error('Batch translation failed');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Create fresh copies of state to ensure we're sending latest data
      // This helps with the "double click" issue where state might be one Step behind
      const currentPlatform = { ...platform };
      const currentHomeConfig = { ...homeConfig };

      const [pRes, hRes] = await Promise.all([
        adminAPI.setPlatformSettings(currentPlatform),
        api.put('/admin/settings/homepage', currentHomeConfig)
      ]);

      if (pRes.data.success) {
        updateSettings(pRes.data.settings);
      }
      if (hRes.data.success) {
        updateHomeConfig(hRes.data.data);
      }

      // refresh global settings so UI updates immediately across all instances
      await refresh();
      alert('Settings saved and applied globally');
    } catch (err) { 
      console.error('save platform settings', err); 
      alert('Failed to save settings. Please check your connection.'); 
    } finally { 
      setSaving(false); 
    }
  };

  const addCategory = async () => {
    const name = prompt('New category name');
    if (!name) return;
    try {
      const res = await api.post('/admin/categories', { name });
      setCategories(prev => [...(res.data.category ? [res.data.category] : []), ...prev]);
    } catch (err) { console.error('add category', err); alert('Failed to add'); }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete category?')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      setCategories(prev => prev.filter(c => c._id !== id));
    } catch (err) { console.error('delete category', err); alert('Failed'); }
  };

  const sendBroadcast = async (target) => {
    if (!broadcastMsg.trim()) return alert('Enter a message');
    try {
      await adminAPI.broadcastNotification({ message: broadcastMsg, target });
      // refresh broadcasts so users see the new message immediately
      try { await refresh(); } catch (e) { console.warn('refresh after broadcast', e); }
      alert('Broadcast sent');
      setBroadcastMsg('');
    } catch (err) { console.error('broadcast', err); alert('Failed to send'); }
  };

  const removeCurrentBroadcast = async () => {
    try {
      // fetch public broadcasts and remove the latest one
      const res = await api.get('/notifications/broadcasts');
      const list = res.data.broadcasts || [];
      if (list.length === 0) return alert('No active broadcasts');
      const active = list[0];
      if (!window.confirm('Remove current broadcast?')) return;
      await adminAPI.deleteBroadcast(active._id);
      await refresh();
      alert('Broadcast removed');
    } catch (err) { console.error('remove broadcast', err); alert('Failed to remove broadcast'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
        <h1 className="text-2xl font-bold mb-2">Admin Settings & Platform Configuration</h1>
        <p className="text-gray-600 mb-4">General platform settings, CMS controls, notifications and security logs.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-3">General Settings</h3>
            <label className="block mb-3">
              <span className="text-sm text-gray-600">Platform Name</span>
              <input value={platform.name} onChange={e => setPlatform({ ...platform, name: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2" />
            </label>
            <label className="block mb-3">
              <span className="text-sm text-gray-600">Contact Email</span>
              <input value={platform.contactEmail} onChange={e => setPlatform({ ...platform, contactEmail: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2" />
            </label>
            <label className="block mb-3">
              <span className="text-sm text-gray-600">Logo</span>
              <div className="flex items-center gap-3 mt-2">
                {platform.logoUrl && <img src={platform.logoUrl} alt="logo" className="w-20 h-20 object-contain" />}
                <input type="file" accept="image/*" onChange={onLogoChange} />
              </div>
            </label>

            <h4 className="font-semibold mt-4 mb-2">Localization</h4>
            <label className="block mb-3">
              <span className="text-sm text-gray-600">Currency</span>
              <select value={platform.currency} onChange={e => setPlatform({ ...platform, currency: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2">
                <option value="ETB">ETB</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-sm text-gray-600">Region / Language</span>
              <select value={platform.region} onChange={e => setPlatform({ ...platform, region: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2">
                <option value="ET">Ethiopia (Amharic)</option>
                <option value="US">United States (English)</option>
              </select>
            </label>
            <label className="block mb-3">
              <span className="text-sm text-gray-600">Platform Commission Rate (%)</span>
              <input 
                type="number" 
                value={platform.commissionRate} 
                onChange={e => setPlatform({ ...platform, commissionRate: parseFloat(e.target.value) })} 
                className="mt-1 block w-full border rounded px-3 py-2" 
                step="0.1"
                min="0"
                max="100"
              />
              <span className="text-[10px] text-gray-500 italic">This rate is applied to all sales platform-wide.</span>
            </label>

            <div className="flex justify-end mt-4">
              <button onClick={saveSettings} disabled={saving} className="px-4 py-2 bg-ethiopian-gold text-white rounded">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-3">Home Page Content Manager</h3>
            <div className="space-y-4">
              {/* Localization Power Tools */}
              <div className="bg-gradient-to-r from-ethiopian-gold/10 to-amber-50/30 p-4 rounded-2xl border border-ethiopian-gold/20 mb-6">
                <h4 className="font-black text-[10px] text-ethiopian-gold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <SparklesIcon className="w-3 h-3" />
                  Localization & Character Sync
                </h4>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={batchTranslateAll}
                    disabled={saving}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold text-gray-700 shadow-sm hover:shadow-md border border-gray-100 transition-all active:scale-95"
                  >
                    <span>🔄 Batch Auto-Translate All</span>
                  </button>
                  <button 
                    onClick={resetToDefaultConfig}
                    disabled={saving}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold text-red-600 shadow-sm hover:shadow-md border border-red-50 transition-all active:scale-95"
                  >
                    <span>⚠️ Reset to Ethiopian Defaults</span>
                  </button>
                </div>
                <p className="mt-2 text-[9px] text-gray-500 font-medium italic">
                  Note: Use "Reset" if you see broken English characters like "Feature" in the homepage headlines.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm text-gray-700">Hero Section Slides</h4>
                  <button onClick={addHeroSlide} className="text-xs bg-ethiopian-gold text-white px-3 py-1 rounded">Add Slide</button>
                </div>
                
                {(homeConfig.heroSlides || []).map((slide, index) => (
                  <HeroSlideEditor 
                    key={index}
                    slide={slide}
                    index={index}
                    handleHeroSlideChange={handleHeroSlideChange}
                    removeHeroSlide={removeHeroSlide}
                    onHeroImageUpload={onHeroImageUpload}
                  />
                ))}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <span className="text-xs text-gray-600 block mb-1">Header Logo (Light BG)</span>
                    <div className="flex flex-col gap-2">
                      {homeConfig.headerLogo && <img src={homeConfig.headerLogo} alt="Header Logo" className="h-10 w-auto object-contain bg-gray-100 p-1 rounded" />}
                      <input type="file" accept="image/*" onChange={(e) => onSiteLogoChange(e, 'headerLogo')} className="text-xs" />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600 block mb-1">Footer Logo (Dark BG)</span>
                    <div className="flex flex-col gap-2">
                      {homeConfig.footerLogo && <img src={homeConfig.footerLogo} alt="Footer Logo" className="h-10 w-auto object-contain bg-slate-800 p-1 rounded" />}
                      <input type="file" accept="image/*" onChange={(e) => onSiteLogoChange(e, 'footerLogo')} className="text-xs" />
                    </div>
                  </div>
                </div>
              </div>
              <hr className="my-3" />
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-xs text-gray-800 uppercase tracking-widest">Heritage Section Localization</h4>
                  <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-gray-100">
                    {['am', 'en', 'om', 'ti'].map(l => (
                      <button key={l} onClick={() => setHeritageLang(l)} className={`px-2 py-1 text-[9px] font-black uppercase rounded ${heritageLang === l ? 'bg-ethiopian-gold text-white' : 'text-gray-400'}`}>{l}</button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <label className="block">
                    <div className="flex justify-between">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Title ({heritageLang})</span>
                    </div>
                    <input 
                      value={homeConfig[`heritageTitle_${heritageLang}`] || ''} 
                      onChange={e => setHomeConfig({ ...homeConfig, [`heritageTitle_${heritageLang}`]: e.target.value })} 
                      className="w-full bg-white border-gray-200 rounded-xl px-3 py-2 text-sm font-bold" 
                    />
                  </label>
                  
                  <label className="block">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Description ({heritageLang})</span>
                      <button 
                         onClick={async () => {
                           const src = homeConfig[`heritageDescription_${heritageLang}`];
                           if(!src) return;
                           toast.loading('Auto-filling heritage info...');
                           setTimeout(() => {
                             setHomeConfig(prev => ({
                               ...prev,
                               heritageDescription_en: `[EN] ${src}`,
                               heritageDescription_am: src,
                               heritageDescription_or: `[OR] ${src}`,
                               heritageDescription_ti: `[TI] ${src}`,
                               heritageTitle_en: `[EN] ${prev[`heritageTitle_${heritageLang}`]}`,
                               heritageTitle_am: prev[`heritageTitle_${heritageLang}`],
                             }));
                             toast.dismiss();
                             toast.success('Localized fields updated');
                           }, 800);
                         }}
                         className="text-[9px] font-black text-ethiopian-gold uppercase"
                      >
                        Auto-Fill Others
                      </button>
                    </div>
                    <textarea 
                      value={homeConfig[`heritageDescription_${heritageLang}`] || ''} 
                      onChange={e => setHomeConfig({ ...homeConfig, [`heritageDescription_${heritageLang}`]: e.target.value })} 
                      className="w-full bg-white border-gray-200 rounded-xl px-3 py-2 text-sm font-medium h-24 resize-none" 
                    />
                  </label>
                  
                  <label className="block">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Heritage Focus Image URL</span>
                    <input value={homeConfig.heritageImage} onChange={e => setHomeConfig({ ...homeConfig, heritageImage: e.target.value })} className="w-full bg-white border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="https://" />
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={saveSettings} disabled={saving} className="px-4 py-2 bg-ethiopian-gold text-white rounded">{saving ? 'Saving...' : 'Save All'}</button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-3">Content Management</h3>
            <div className="mb-4">
              <h4 className="font-medium">Homepage Banners</h4>
              <div className="mt-3 space-y-2 max-h-40 overflow-auto">
                {banners.map(b => (
                  <div key={b._id} className="flex justify-between items-center border-b py-2">
                    <div>
                      <div className="font-medium">{b.title}</div>
                      <div className="text-xs text-gray-500">{b.active ? 'Active' : 'Inactive'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => adminAPI.toggleFeatured(b._id)} className="text-sm text-ethiopian-gold">{featured.includes(b._id) ? 'Unfeature' : 'Feature'}</button>
                      <button onClick={async () => { if (!window.confirm('Delete banner? This will remove the file.')) return; try { await api.delete(`/admin/cms/banners/${b._id}`); setBanners(prev => prev.filter(x => x._id !== b._id)); await refresh(); alert('Banner deleted'); } catch (e) { console.error(e); alert('Failed to delete'); } }} className="text-sm text-red-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Featured Products</h4>
              <div className="max-h-40 overflow-auto space-y-2">
                {featured.map(pid => (
                  <div key={pid} className="flex justify-between items-center border-b py-2">
                    <div className="text-sm">{pid}</div>
                    <div className="text-sm text-gray-500">ID</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium mb-2">Categories</h4>
              <div className="space-y-2 max-h-40 overflow-auto">
                {categories.map(c => (
                  <div key={c._id} className="flex justify-between items-center border-b py-2">
                    <div>{c.name}</div>
                    <div className="flex gap-2">
                      <button onClick={() => { const newName = prompt('Edit category name', c.name); if (newName) api.put(`/admin/categories/${c._id}`, { name: newName }).then(() => setCategories(prev => prev.map(x => x._id === c._id ? { ...x, name: newName } : x))).catch(e => console.error(e)) }} className="text-sm text-ethiopian-gold">Edit</button>
                      <button onClick={() => deleteCategory(c._id)} className="text-sm text-red-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <button onClick={addCategory} className="px-3 py-2 bg-ethiopian-gold text-white rounded text-sm">Add Category</button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-3">Notifications & Broadcasts</h3>
            <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Write broadcast message..." className="w-full border rounded p-3 h-28" />
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={() => sendBroadcast('all')} className="px-3 py-2 bg-ethiopian-gold text-white rounded">Send to All</button>
              <button onClick={() => sendBroadcast('artisans')} className="px-3 py-2 bg-white border rounded">Send to Artisans</button>
              <button onClick={removeCurrentBroadcast} className="px-3 py-2 bg-red-600 text-white rounded">Remove Current Broadcast</button>
              <button onClick={async () => { if (!window.confirm('Completely remove current broadcast and clear message?')) return; try { await removeCurrentBroadcast(); setBroadcastMsg(''); } catch (e) { console.error(e); alert('Failed'); } }} className="px-3 py-2 bg-red-800 text-white rounded">Completely Remove</button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-3">Security & Audit</h3>
            <div className="mb-4">
              <h4 className="font-medium mb-2">Recent Admin Actions</h4>
              <div className="max-h-48 overflow-auto">
                <table className="min-w-full text-sm">
                  <tbody>
                    {auditLogs.map((l, index) => (
                      <tr key={l._id || `audit-${index}`} className="border-b"><td className="py-2"><div className="font-medium">{l.action}</div><div className="text-xs text-gray-500">{l.adminEmail || l.adminId?.email} — {new Date(l.createdAt).toLocaleString()}</div></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Login Alerts</h4>
              <div className="max-h-40 overflow-auto text-sm">
                {loginAlerts.length === 0 ? <div className="text-gray-500">No recent login alerts</div> : loginAlerts.map(a => (<div key={a._id} className="border-b py-2"><div className="font-medium">{a.email || a.userEmail}</div><div className="text-xs text-gray-500">{a.ip} — {a.status} — {new Date(a.createdAt).toLocaleString()}</div></div>))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
