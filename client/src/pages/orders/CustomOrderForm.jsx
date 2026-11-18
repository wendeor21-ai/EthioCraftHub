/**
 * Custom Design & Tailoring Order Form - EthioCraft Global
 * 
 * Features:
 * - Direct artisan routing with verified artisan selector
 * - Compact, mobile-first, high-readability UI
 * - Minimal scroll complexity with responsive compact cards & inputs
 * - Step-by-step guidance: 1. Style & Photos, 2. Measurements, 3. Review & Submit
 * - Full bilingual support (Amharic & English)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Ruler, 
  Camera, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  Scissors,
  User,
  Check,
  Image as ImageIcon,
  Shirt,
  Sparkles,
  Store
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const CustomOrderForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useCustomTranslation();

  const urlArtisanId = searchParams.get('artisanId');
  const { productId, artisanId: stateArtisanId, productName } = location.state || {};
  
  // Initial artisan ID from URL or navigation state
  const initialArtisanId = urlArtisanId || stateArtisanId || '';
  const [selectedArtisanId, setSelectedArtisanId] = useState(initialArtisanId);
  const [artisanName, setArtisanName] = useState(null);
  const [artisansList, setArtisansList] = useState([]);
  const [loadingArtisans, setLoadingArtisans] = useState(false);

  // Fetch verified artisans list if none pre-selected
  useEffect(() => {
    let mounted = true;
    api.get('/users/artisans?limit=50')
      .then(res => {
        if (!mounted) return;
        const list = res.data?.artisans || [];
        setArtisansList(list);
        
        // If an artisanId is provided, look up their name
        if (selectedArtisanId) {
          const match = list.find(a => String(a._id || a.id) === String(selectedArtisanId));
          if (match) {
            const name = match.profile?.storeName || 
              `${match.profile?.firstName || ''} ${match.profile?.lastName || ''}`.trim();
            setArtisanName(name);
          }
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [selectedArtisanId]);

  // Lookup single artisan name if direct URL parameter was provided
  useEffect(() => {
    if (!selectedArtisanId) {
      setArtisanName(null);
      return;
    }
    api.get(`/users/artisan/${selectedArtisanId}`)
      .then(res => {
        const a = res.data?.artisan || res.data;
        const name = a?.profile?.storeName || 
          (a?.profile ? `${a.profile.firstName || ''} ${a.profile.lastName || ''}`.trim() : a?.name);
        if (name) setArtisanName(name);
      })
      .catch(() => {});
  }, [selectedArtisanId]);

  const [gender, setGender] = useState('Female');
  const [itemType, setItemType] = useState('Dress');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [measurements, setMeasurements] = useState({
    length: '',
    shoulder: '',
    bust: '',
    chest: '',
    waist: '',
    stomach: '',
    hip: '',
    thigh: '',
    ankle: '',
    armLength: '',
    shirtLength: ''
  });

  const [photos, setPhotos] = useState({ front: null, back: null });
  const [previews, setPreviews] = useState({ front: null, back: null });
  const [description, setDescription] = useState('');

  const STEPS = [
    { number: 1, title: 'ስታይል እና ፎቶ', subtitle: 'Style & Photos' },
    { number: 2, title: 'ልኬቶች', subtitle: 'Measurements' },
    { number: 3, title: 'ማረጋገጫ', subtitle: 'Review & Submit' }
  ];

  const handleInputChange = (e) => {
    setMeasurements({ ...measurements, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('የምስሉ መጠን ከ 8MB መብለጥ የለበትም');
        return;
      }
      setPhotos({ ...photos, [type]: file });
      setPreviews({ ...previews, [type]: URL.createObjectURL(file) });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    if (selectedArtisanId) formData.append('artisanId', selectedArtisanId);
    if (productId) formData.append('productId', productId);
    formData.append('gender', gender);
    formData.append('itemType', itemType);
    formData.append('measurements', JSON.stringify(measurements));
    formData.append('description', description);
    
    if (photos.front) formData.append('frontPhoto', photos.front);
    if (photos.back) formData.append('backPhoto', photos.back);

    try {
      await api.post('/custom-orders', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('የብጁ ዲዛይን ጥያቄዎ በተሳካ ሁኔታ ተልኳል! ወደ ትዕዛዞች ገጽ በመሄድ ይከታተሉ።', { duration: 6000 });
      navigate('/orders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'ትዕዛዙን መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !photos.front && !photos.back) {
      toast('ማስታወሻ፦ የማጣቀሻ ፎቶ ማከል ባለሙያው ዲዛይኑን በትክክል እንዲረዳ ያግዛል', { icon: '📸' });
    }
    setStep(Math.min(3, step + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setStep(Math.max(1, step - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-16 pt-3 sm:pt-6">
      {/* Top Accent Strip */}
      <div className="h-1.5 bg-gradient-to-r from-green-600 via-amber-400 to-red-600 w-full mb-4" />

      <div className="max-w-3xl mx-auto px-3 sm:px-6">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-amber-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>ተመለስ (Back)</span>
          </button>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Scissors className="w-3 h-3 text-amber-600" />
            የግል ዲዛይን ስፌት
          </span>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1C1C1C] via-[#2A241C] to-[#1C1C1C] px-4 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-amber-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  የብጁ/የግል ዲዛይን ማዘዣ (Custom Tailoring)
                </h1>
                <p className="text-xs text-gray-300 mt-0.5">
                  የራስዎን ልክና ምርጫ በማስገባት በባህላዊ እደ-ጥበብ ባለሙያዎች በትክክል ያስሰፉ
                </p>
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 items-center justify-center border border-amber-500/30">
                <Ruler className="w-5 h-5" />
              </div>
            </div>

            {/* Targeted Artisan Card Banner */}
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-gray-300">የተመረጠ ባለሙያ (Artisan):</span>
                <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">
                  {artisanName || (selectedArtisanId ? 'የተመረጠ ባለሙያ' : 'ማንኛውም ዝግጁ ባለሙያ (Open Order)')}
                </span>
              </div>

              {/* Artisan Selector Dropdown if not fixed from URL */}
              {!initialArtisanId && artisansList.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-gray-400">ባለሙያ ይምረጡ:</label>
                  <select
                    value={selectedArtisanId}
                    onChange={(e) => setSelectedArtisanId(e.target.value)}
                    className="bg-black/40 text-amber-300 text-xs border border-white/20 rounded-lg px-2 py-1 outline-none focus:border-amber-400"
                  >
                    <option value="" className="bg-gray-900 text-white">ማንኛውም ምርጥ ባለሙያ (Any Available)</option>
                    {artisansList.map(a => {
                      const aId = String(a._id || a.id);
                      const name = a.profile?.storeName || `${a.profile?.firstName || ''} ${a.profile?.lastName || ''}`.trim() || 'ባለሙያ';
                      return (
                        <option key={aId} value={aId} className="bg-gray-900 text-white">
                          {name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 sm:p-5">
            {/* Compact Stepper */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {STEPS.map((s) => {
                const isActive = step === s.number;
                const isCompleted = step > s.number;
                return (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => setStep(s.number)}
                    className={`flex items-center space-x-2 p-2 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-amber-500 text-white shadow-sm'
                        : isCompleted
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive
                        ? 'bg-white text-amber-600'
                        : isCompleted
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.number}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold truncate leading-tight">{s.title}</p>
                      <p className={`text-[10px] hidden sm:block truncate ${isActive ? 'text-amber-100' : 'text-gray-400'}`}>
                        {s.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit}>
              {/* ════════════════════════════════════════════════════════════════
                  STEP 1: ስታይል እና ፎቶ (Style & Photos)
                 ════════════════════════════════════════════════════════════════ */}
              {step === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Gender Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      1. ማንን የሚለብስ ነው? (Target Gender)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'Female', label: 'የሴት (Female)' },
                        { key: 'Male', label: 'የወንድ (Male)' }
                      ].map((g) => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => {
                            setGender(g.key);
                            setItemType(g.key === 'Female' ? 'Dress' : 'Shirt');
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            gender === g.key
                              ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <User className="w-4 h-4 text-amber-600" />
                          <span>{g.label}</span>
                          {gender === g.key && <CheckCircle2 className="w-4 h-4 text-amber-600 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Garment Type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      2. የልብሱ አይነት (Garment Type)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(gender === 'Female' 
                        ? [
                            { key: 'Dress', am: 'የባህል ቀሚስ (Dress)' },
                            { key: 'Shirt', am: 'ሸሚዝ / ቱታ (Shirt)' },
                            { key: 'Scarf/Netela', am: 'ነጠላ / ሻሽ (Shawl)' },
                            { key: 'Full Suit', am: 'ሙሉ ልብስ (Full Set)' }
                          ]
                        : [
                            { key: 'Shirt', am: 'የባህል ሸሚዝ (Shirt)' },
                            { key: 'Trousers', am: 'ሱሪ (Trousers)' },
                            { key: 'Full Suit', am: 'ሙሉ ልብስ (Full Suit)' },
                            { key: 'Vest', am: 'ካፖርት / ቬስት (Vest)' }
                          ]
                      ).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setItemType(item.key)}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center ${
                            itemType === item.key
                              ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Shirt className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.am}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reference Photos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-600" />
                        3. የማጣቀሻ ፎቶዎች (Reference Photos - አማራጭ)
                      </label>
                      <span className="text-[10px] text-gray-400">የፊት እና የኋላ ፎቶ</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Front Photo */}
                      <div>
                        <span className="block text-[11px] text-gray-500 font-medium mb-1">የፊት ገጽታ ፎቶ</span>
                        <div
                          onClick={() => document.getElementById('custom-front-photo').click()}
                          className={`h-28 sm:h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                            previews.front ? 'border-amber-500 bg-amber-50/30' : 'border-gray-200 bg-gray-50 hover:bg-amber-50/40 hover:border-amber-400'
                          }`}
                        >
                          {previews.front ? (
                            <div className="relative w-full h-full group">
                              <img src={previews.front} alt="Front view" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                ፎቶ ቀይር
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-2">
                              <ImageIcon className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                              <span className="text-[11px] text-gray-600 font-medium block">የፊት ፎቶ ጫን</span>
                              <span className="text-[9px] text-gray-400">PNG / JPG</span>
                            </div>
                          )}
                          <input id="custom-front-photo" type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(e, 'front')} />
                        </div>
                      </div>

                      {/* Back Photo */}
                      <div>
                        <span className="block text-[11px] text-gray-500 font-medium mb-1">የኋላ ገጽታ ፎቶ</span>
                        <div
                          onClick={() => document.getElementById('custom-back-photo').click()}
                          className={`h-28 sm:h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                            previews.back ? 'border-amber-500 bg-amber-50/30' : 'border-gray-200 bg-gray-50 hover:bg-amber-50/40 hover:border-amber-400'
                          }`}
                        >
                          {previews.back ? (
                            <div className="relative w-full h-full group">
                              <img src={previews.back} alt="Back view" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                ፎቶ ቀይር
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-2">
                              <ImageIcon className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                              <span className="text-[11px] text-gray-600 font-medium block">የኋላ ፎቶ ጫን</span>
                              <span className="text-[9px] text-gray-400">PNG / JPG</span>
                            </div>
                          )}
                          <input id="custom-back-photo" type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(e, 'back')} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  STEP 2: ልኬቶች (Body Measurements in CM)
                 ════════════════════════════════════════════════════════════════ */}
              {step === 2 && (
                <div className="space-y-3.5 animate-fadeIn">
                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ልኬቶችን በ<strong>ሴንቲሜትር (cm)</strong> ያስገቡ። ልኬቱን የማያውቁትን ባዶ መተው ይችላሉ፤ ባለሙያው በቀጥታ ያነጋግርዎታል።</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <CompactInput label="ቁመት (Total Length)" name="length" value={measurements.length} onChange={handleInputChange} />
                    <CompactInput label="ትክሻ (Shoulder)" name="shoulder" value={measurements.shoulder} onChange={handleInputChange} />
                    
                    {gender === 'Female' ? (
                      <>
                        <CompactInput label="ጡት (Bust)" name="bust" value={measurements.bust} onChange={handleInputChange} />
                        <CompactInput label="ወገብ (Waist)" name="waist" value={measurements.waist} onChange={handleInputChange} />
                        <CompactInput label="ዳሌ (Hip)" name="hip" value={measurements.hip} onChange={handleInputChange} />
                        <CompactInput label="እጅ እርዝመት (Arm Length)" name="armLength" value={measurements.armLength} onChange={handleInputChange} />
                      </>
                    ) : (
                      <>
                        <CompactInput label="ደረት (Chest)" name="chest" value={measurements.chest} onChange={handleInputChange} />
                        <CompactInput label="ወገብ (Waist)" name="waist" value={measurements.waist} onChange={handleInputChange} />
                        <CompactInput label="ቦርጭ/ሆድ (Stomach)" name="stomach" value={measurements.stomach} onChange={handleInputChange} />
                        <CompactInput label="እጅ እርዝመት (Arm Length)" name="armLength" value={measurements.armLength} onChange={handleInputChange} />
                        <CompactInput label="የሸሚዝ ቁመት (Shirt Length)" name="shirtLength" value={measurements.shirtLength} onChange={handleInputChange} />
                        <CompactInput label="የሱሪ ቁመት / ተረከዝ" name="ankle" value={measurements.ankle} onChange={handleInputChange} />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════════
                  STEP 3: ማረጋገጫ እና ልዩ ማስታወሻ (Review & Submit)
                 ════════════════════════════════════════════════════════════════ */}
              {step === 3 && (
                <div className="space-y-3.5 animate-fadeIn">
                  {/* Summary Card */}
                  <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                      የትዕዛዙ ማጠቃለያ (Order Summary)
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[10px] text-gray-400 block font-bold">ባለሙያ</span>
                        <span className="font-bold text-gray-800">{artisanName || 'ምርጥ ዝግጁ ባለሙያ'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <span className="text-[10px] text-gray-400 block font-bold">አይነት</span>
                        <span className="font-bold text-gray-800">{gender === 'Female' ? 'የሴት' : 'የወንድ'} {itemType}</span>
                      </div>
                    </div>
                  </div>

                  {/* Special Notes / Description */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      ተጨማሪ መመሪያ ወይም ምርጫ (ቀለም፣ ጥልፍ፣ የጥልፍ አይነት)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="ለምሳሌ፡ ጥልፉ አረንጓዴና ወርቃማ ክር እንዲሆን እፈልጋለሁ፤ ዙሪያው በወርቅ ጥልፍ የተሸለመ እንዲሆን..."
                      className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none min-h-[90px] resize-y"
                    />
                  </div>
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>ወደ ኋላ (Back)</span>
                  </button>
                ) : (
                  <div />
                )}

                {step < STEPS.length ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all shadow-sm ml-auto"
                  >
                    <span>ቀጥል (Continue)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-1.5 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-xl transition-all shadow-md disabled:opacity-50 ml-auto"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>በመላክ ላይ...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ትዕዛዙን ላክ (Submit Design Request)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompactInput = ({ label, name, value, onChange }) => (
  <div className="bg-white p-2 rounded-xl border border-gray-200 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all">
    <label htmlFor={name} className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate">
      {label}
    </label>
    <div className="flex items-center mt-0.5">
      <input
        type="number"
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        placeholder="0"
        className="w-full text-xs sm:text-sm font-bold text-gray-800 outline-none bg-transparent"
      />
      <span className="text-[10px] text-gray-400 font-bold ml-1">cm</span>
    </div>
  </div>
);

export default CustomOrderForm;
