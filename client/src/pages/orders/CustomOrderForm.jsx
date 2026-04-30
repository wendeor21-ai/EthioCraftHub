import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Shirt
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CustomOrderForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlArtisanId = searchParams.get('artisanId');
  const { productId, artisanId: stateArtisanId, productName } = location.state || {};
  
  // Use artisanId from URL if present, otherwise fallback to state
  const targetArtisanId = urlArtisanId || stateArtisanId;

  const [artisanName, setArtisanName] = useState(null);

  // Fetch artisan name when a direct artisanId is present
  useEffect(() => {
    if (!targetArtisanId) return;
    api.get(`/users/artisan/${targetArtisanId}`)
      .then(res => {
        const a = res.data.artisan || res.data;
        const name = a?.name || (a?.profile ? `${a.profile.firstName || ''} ${a.profile.lastName || ''}`.trim() : null);
        if (name) setArtisanName(name);
      })
      .catch(() => {}); // Silently fail — form still works
  }, [targetArtisanId]);

  const [gender, setGender] = useState('Female');
  const [itemType, setItemType] = useState('Dress');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [measurements, setMeasurements] = useState({
    length: '', shoulder: '', bust: '', chest: '', waist: '',
    stomach: '', hip: '', thigh: '', ankle: '', armLength: '', shirtLength: ''
  });

  const [photos, setPhotos] = useState({ front: null, back: null });
  const [previews, setPreviews] = useState({ front: null, back: null });
  const [description, setDescription] = useState('');

  const STEPS = [
    { number: 1, title: 'Style & Photos' },
    { number: 2, title: 'Measurements' },
    { number: 3, title: 'Review & Submit' }
  ];

  const handleInputChange = (e) => {
    setMeasurements({ ...measurements, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setPhotos({ ...photos, [type]: file });
      setPreviews({ ...previews, [type]: URL.createObjectURL(file) });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    if (targetArtisanId) formData.append('artisanId', targetArtisanId);
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
      toast.success('Custom order request sent successfully!');
      navigate('/orders');
    } catch (error) {
      toast.error('Failed to send custom order request.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
     if (step === 1 && !photos.front && !photos.back) {
         toast('Reminder: Reference photos help the artisan.', { icon: '📸' });
     }
     setStep(Math.min(3, step + 1));
  }
  const prevStep = () => setStep(Math.max(1, step - 1));

  // Motion variants
  const slideVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-20 px-4 font-['Inter',sans-serif]">
      <div className="max-w-4xl mx-auto">
        {/* Top Back Navigation */}
        <button 
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-neutral-500 hover:text-[#4A3018] font-bold text-sm mb-6 transition-all group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to Shop
        </button>
        
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-200/60">
          
          {/* Elegant Header */}
          <div className="bg-[#4A3018] px-8 py-10 text-[#F3E5D8] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 transform -rotate-12 translate-x-12 -translate-y-8">
              <Scissors size={200} />
            </div>
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F3E5D8]/10 text-white text-xs font-semibold rounded-full mb-4 tracking-widest uppercase border border-white/10">
                <Ruler className="w-3.5 h-3.5" />
                EthioCraft Tailoring
              </span>
              <h1 className="text-4xl md:text-5xl font-['Playfair_Display',serif] font-bold mb-3">
                Order Custom Design
              </h1>
              <p className="text-white/80 font-light text-lg max-w-xl">
                Experience the luxury of garments crafted specifically for your measurements by our master Ethiopian artisans.
              </p>
              {productName && (
                <div className="mt-4 inline-block bg-black/20 backdrop-blur-sm px-4 py-2 rounded-xl text-sm border border-white/10">
                  <span className="text-white/60">Base Design Inspiration:</span> <strong className="text-white ml-1">{productName}</strong>
                </div>
              )}
              {/* Direct-to-artisan confirmation banner */}
              {targetArtisanId && (
                <div className="mt-4 flex items-center gap-3 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-2xl border border-white/15 w-fit">
                  <span className="text-xl">✂️</span>
                  <span className="text-white/90 font-semibold text-sm">
                    ለባለሙያ{artisanName ? ` ${artisanName}` : ''} ትዕዛዝ እየላኩ ነው
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 lg:p-12">
            
            {/* Elegant Stepper */}
            <div className="mb-12 relative flex items-center justify-between mx-auto max-w-md">
              <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-[2px] bg-neutral-200 -z-10"></div>
              <div 
                className="absolute left-10 top-1/2 -translate-y-1/2 h-[2px] bg-[#CFA66E] transition-all duration-700 ease-in-out -z-10" 
                style={{ width: `${((step - 1) / 2) * 100}%` }}
              ></div>
              
              {STEPS.map((s) => {
                const isActive = step === s.number;
                const isCompleted = step > s.number;
                
                return (
                  <div key={s.number} className="flex flex-col items-center gap-3 relative z-10 bg-white px-2">
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-sm ${
                        isActive 
                          ? 'bg-[#CFA66E] text-white ring-4 ring-[#CFA66E]/20 scale-110' 
                          : isCompleted 
                            ? 'bg-[#4A3018] text-white' 
                            : 'bg-white border-2 border-neutral-200 text-neutral-400'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : s.number}
                    </div>
                    <span className={`text-[10px] sm:text-xs font-semibold tracking-wide uppercase absolute -bottom-8 w-max text-center ${
                      isActive ? 'text-[#CFA66E]' : isCompleted ? 'text-[#4A3018]' : 'text-neutral-400'
                    }`}>
                      {s.title}
                    </span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-16">
              
              {/* === STEP 1: Style & Photos === */}
              {step === 1 && (
                <motion.div variants={slideVariants} initial="hidden" animate="visible" className="space-y-10">
                  
                  {/* Gender Selection */}
                  <section>
                    <h2 className="text-xl font-['Playfair_Display',serif] font-bold text-neutral-900 mb-5 border-b border-neutral-100 pb-2">Target Audience / Gender</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {['Female', 'Male'].map((g) => (
                        <div 
                          key={g}
                          onClick={() => { setGender(g); setItemType(g === 'Female' ? 'Dress' : 'Shirt'); }}
                          className={`relative overflow-hidden cursor-pointer group rounded-2xl border-2 p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                            gender === g 
                              ? 'border-[#CFA66E] bg-[#CFA66E]/5 shadow-md shadow-[#CFA66E]/10 scale-[1.02]' 
                              : 'border-neutral-200 hover:border-[#CFA66E]/50 bg-white'
                          }`}
                        >
                          <div className={`p-3 rounded-full transition-colors ${gender === g ? 'bg-[#CFA66E] text-white' : 'bg-neutral-100 text-neutral-400 group-hover:text-[#CFA66E]'}`}>
                            <User className="w-6 h-6" />
                          </div>
                          <span className={`font-semibold ${gender === g ? 'text-[#4A3018]' : 'text-neutral-600'}`}>{g}</span>
                          {gender === g && (
                            <div className="absolute top-3 right-3 text-[#CFA66E]">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Category Selection */}
                  <section>
                    <h2 className="text-xl font-['Playfair_Display',serif] font-bold text-neutral-900 mb-5 border-b border-neutral-100 pb-2">Garment Type</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                      {(gender === 'Female' ? ['Dress', 'Shirt'] : ['Shirt', 'Trousers']).map((t) => (
                        <div 
                          key={t}
                          onClick={() => setItemType(t)}
                          className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all duration-300 ${
                            itemType === t 
                              ? 'border-[#4A3018] bg-[#4A3018] text-white shadow-lg scale-105' 
                              : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                          }`}
                        >
                          <Shirt className="w-5 h-5 opacity-80" />
                          <span className="font-medium text-sm">{t}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Reference Photos */}
                  <section>
                    <div className="flex justify-between items-end mb-5 border-b border-neutral-100 pb-2">
                      <h2 className="text-xl font-['Playfair_Display',serif] font-bold text-neutral-900">Reference Photos</h2>
                      <span className="text-xs font-semibold text-[#8B6B40] uppercase tracking-wider bg-[#CFA66E]/10 border border-[#CFA66E]/30 px-3 py-1 rounded-full">Optional but Recommended</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                      <div className="group relative">
                        <label className="text-sm font-semibold text-neutral-600 mb-3 block">Front View Inspiration</label>
                        <div 
                          className={`h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 cursor-pointer ${
                            previews.front ? 'border-solid border-[#CFA66E]' : 'border-neutral-300 hover:border-[#CFA66E] bg-neutral-50 hover:bg-[#CFA66E]/5'
                          }`}
                          onClick={() => document.getElementById('front-photo-input').click()}
                        >
                          {previews.front ? (
                            <>
                              <img src={previews.front} alt="Front view" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-medium text-sm flex items-center gap-2"><Camera className="w-4 h-4"/> Change Photo</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-6">
                              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-neutral-400 group-hover:text-[#CFA66E] group-hover:scale-110 transition-all">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                              <span className="text-sm font-medium text-neutral-600">Click to upload front photo</span>
                            </div>
                          )}
                          <input id="front-photo-input" type="file" className="hidden" onChange={(e) => handlePhotoChange(e, 'front')} accept="image/*" />
                        </div>
                      </div>

                      <div className="group relative">
                        <label className="text-sm font-semibold text-neutral-600 mb-3 block">Back View Inspiration</label>
                        <div 
                          className={`h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 cursor-pointer ${
                            previews.back ? 'border-solid border-[#CFA66E]' : 'border-neutral-300 hover:border-[#CFA66E] bg-neutral-50 hover:bg-[#CFA66E]/5'
                          }`}
                          onClick={() => document.getElementById('back-photo-input').click()}
                        >
                          {previews.back ? (
                            <>
                              <img src={previews.back} alt="Back view" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-medium text-sm flex items-center gap-2"><Camera className="w-4 h-4"/> Change Photo</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-center p-6">
                              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-neutral-400 group-hover:text-[#CFA66E] group-hover:scale-110 transition-all">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                              <span className="text-sm font-medium text-neutral-600">Click to upload back photo</span>
                            </div>
                          )}
                          <input id="back-photo-input" type="file" className="hidden" onChange={(e) => handlePhotoChange(e, 'back')} accept="image/*" />
                        </div>
                      </div>
                    </div>
                  </section>

                </motion.div>
              )}

              {/* === STEP 2: Measurements === */}
              {step === 2 && (
                <motion.div variants={slideVariants} initial="hidden" animate="visible" className="space-y-8">
                  
                  <div className="flex items-start gap-4 p-5 bg-[#CFA66E]/10 rounded-2xl border border-[#CFA66E]/20">
                    <div className="p-2 bg-white rounded-full shrink-0 text-[#CFA66E]">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#4A3018] text-sm mb-1">Measurement Accuracy is Key</h3>
                      <p className="text-sm text-[#4A3018]/80 leading-relaxed">
                        For the perfect fit, please use a soft measuring tape and measure closely against the body. All measurements should be provided in <strong>centimeters (cm)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                    {/* General / Upper Body Section */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-[#8B6B40] border-b border-neutral-200 pb-2">Upper Body Measurements</h3>
                      <FloatingInput label="Total Length (ቁመት)" name="length" value={measurements.length} onChange={handleInputChange} suffix="cm" />
                      <FloatingInput label="Shoulder Width (ትክሻ)" name="shoulder" value={measurements.shoulder} onChange={handleInputChange} suffix="cm" />
                      
                      {gender === 'Female' && (
                        <>
                          <FloatingInput label="Bust Circumference (ጡት)" name="bust" value={measurements.bust} onChange={handleInputChange} suffix="cm" />
                          <FloatingInput label="Arm Length (እጅ እርዝመ)" name="armLength" value={measurements.armLength} onChange={handleInputChange} suffix="cm" />
                        </>
                      )}
                      
                      {gender === 'Male' && itemType === 'Shirt' && (
                        <>
                          <FloatingInput label="Chest Circumference (ደረት)" name="chest" value={measurements.chest} onChange={handleInputChange} suffix="cm" />
                          <FloatingInput label="Arm Length (እጅ እርዝመ)" name="armLength" value={measurements.armLength} onChange={handleInputChange} suffix="cm" />
                          <FloatingInput label="Shirt Length" name="shirtLength" value={measurements.shirtLength} onChange={handleInputChange} suffix="cm" />
                        </>
                      )}
                    </div>

                    {/* Lower Body Section */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-[#8B6B40] border-b border-neutral-200 pb-2">Lower Body / Core Measurements</h3>
                      {(gender === 'Female' || (gender === 'Male' && itemType === 'Trousers')) && (
                        <FloatingInput label="Waist (ወገብ)" name="waist" value={measurements.waist} onChange={handleInputChange} suffix="cm" />
                      )}
                      
                      {gender === 'Male' && itemType === 'Shirt' && (
                        <FloatingInput label="Stomach / Core (ቦርጭ)" name="stomach" value={measurements.stomach} onChange={handleInputChange} suffix="cm" />
                      )}

                      {gender === 'Male' && itemType === 'Trousers' && (
                        <>
                          <FloatingInput label="Hip (ዳሌ)" name="hip" value={measurements.hip} onChange={handleInputChange} suffix="cm" />
                          <FloatingInput label="Thigh Circumference (ጭን)" name="thigh" value={measurements.thigh} onChange={handleInputChange} suffix="cm" />
                          <FloatingInput label="Ankle / Hem (ተረከዝ)" name="ankle" value={measurements.ankle} onChange={handleInputChange} suffix="cm" />
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* === STEP 3: Review & Submit === */}
              {step === 3 && (
                <motion.div variants={slideVariants} initial="hidden" animate="visible" className="space-y-8">
                  
                  <section>
                    <h2 className="text-xl font-['Playfair_Display',serif] font-bold text-neutral-900 mb-5 border-b border-neutral-100 pb-2">Additional Specifications</h2>
                    <p className="text-sm text-neutral-500 mb-4">Please describe any specific preferences regarding colors, preferred fabrics, embroidery patterns, beadwork, or loose/tight fit preferences.</p>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. 'I prefer a darker green traditional embroidery around the neckline, similar to the reference photo but with gold threads...'"
                      className="w-full bg-white border border-neutral-200 rounded-2xl focus:ring-4 focus:ring-[#CFA66E]/20 focus:border-[#CFA66E] p-5 min-h-[160px] text-neutral-800 placeholder-neutral-400 transition-all outline-none resize-y"
                    />
                  </section>

                  <section className="bg-[#4A3018]/5 rounded-2xl p-6 border border-[#4A3018]/10">
                    <h3 className="text-lg font-bold text-[#4A3018] mb-4">Order Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm">
                        <span className="text-[#8B6B40] block text-[10px] uppercase font-bold tracking-wider mb-1">Target Artisan</span>
                        <span className="text-neutral-900 font-semibold">
                        {targetArtisanId ? (artisanName || 'Selected Master Artisan') : 'Best Available Artisan'}
                      </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm">
                        <span className="text-[#8B6B40] block text-[10px] uppercase font-bold tracking-wider mb-1">Garment</span>
                        <span className="text-neutral-900 font-semibold">{gender} • {itemType}</span>
                      </div>
                    </div>
                  </section>

                </motion.div>
              )}

              {/* Navigation Footer */}
              <div className="mt-12 pt-6 border-t border-neutral-200 flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3.5 border-2 border-neutral-200 text-neutral-600 rounded-xl font-bold hover:border-[#CFA66E] hover:text-[#CFA66E] hover:bg-[#CFA66E]/5 transition-all flex items-center gap-2 group"
                  >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Back
                  </button>
                ) : (
                  <div></div>
                )}
                
                {step < STEPS.length ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-8 py-3.5 bg-[#4A3018] text-[#F3E5D8] rounded-xl font-bold hover:bg-[#382210] hover:shadow-[0_4px_12px_rgba(74,48,24,0.3)] hover:-translate-y-0.5 transition-all flex items-center gap-2 group ml-auto ring-2 ring-transparent hover:ring-[#CFA66E] ring-offset-2"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-[#CFA66E]" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-10 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#CFA66E] text-white rounded-xl font-black uppercase tracking-widest hover:shadow-[0_8px_20px_rgba(207,166,110,0.4)] hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3 shadow-md disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <>
                        <span className="w-5 h-5 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Finalize & Submit Request
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

const FloatingInput = ({ label, name, value, onChange, placeholder, suffix }) => (
  <div className="relative group">
    <input
      type="number"
      name={name}
      id={name}
      value={value}
      onChange={onChange}
      required
      placeholder=" "
      className="block w-full px-5 pt-8 pb-3 text-neutral-900 bg-white border border-neutral-300 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#CFA66E]/20 focus:border-[#CFA66E] hover:border-[#CFA66E]/50 peer transition-all shadow-sm"
    />
    <label 
      htmlFor={name}
      className="absolute text-[13px] font-bold text-neutral-500 duration-300 transform -translate-y-3.5 scale-90 top-5 z-10 origin-[0] left-5 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-90 peer-focus:-translate-y-3.5 peer-focus:text-[#CFA66E] pointer-events-none uppercase tracking-wide"
    >
      {label}
    </label>
    {suffix && (
      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-[11px] uppercase tracking-widest pointer-events-none">
        {suffix}
      </span>
    )}
  </div>
);

export default CustomOrderForm;
