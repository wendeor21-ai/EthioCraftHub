// ArtisanVerification

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import GuidelinesModal from '../../components/artisan/GuidelinesModal';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import {
  ShieldCheck, User, Briefcase, Image as ImageIcon, Video,
  CreditCard, CheckCircle, AlertCircle, Upload, ChevronRight,
  ChevronLeft, Info, FileText, PlusCircle
} from 'lucide-react';

const ArtisanVerification = () => {
  const { user, refreshUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Guidelines gate — show modal until artisan has accepted
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(
    () => user?.hasAcceptedGuidelines === true
  );

  // Sync once user loads from auth context
  useEffect(() => {
    if (user?.hasAcceptedGuidelines) setGuidelinesAccepted(true);
  }, [user?.hasAcceptedGuidelines]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    businessName: '',
    tinNumber: '',
    tradeLicenseNumber: '',
    bankName: '',
    accountNumber: '',
    telebirrNumber: '',
    termsAccepted: false,
  });

  // Real-time field validation errors
  const [fieldErrors, setFieldErrors] = useState({
    accountNumber: '',
    telebirrNumber: '',
    tradeLicense: '',
  });

  const [files, setFiles] = useState({
    identity: null,
    tradeLicense: null,
    tinCertificate: null,
    productPhotos: [],
    workVideos: [],
  });

  const [previews, setPreviews] = useState({
    identity: null,
    tradeLicense: null,
    tinCertificate: null,
    productPhotos: [],
    workVideos: [],
  });

  // Derive status — default to 'none' for brand-new artisans with no verification object
  const currentStatus = (user?.verification?.status || 'none').toLowerCase().trim();
  const feedback = user?.verification?.feedback || '';

  // Show the multi-step form for new artisans (none) or rejected ones
  const showForm = currentStatus === 'none' || currentStatus === 'rejected' || currentStatus === 'not_submitted';
  // Show status banner for submitted applications
  const showPending = currentStatus === 'pending' || currentStatus === 'under_review';
  // Show approved banner
  const showApproved = currentStatus === 'approved';

  // Pre-fill form with existing user profile data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        phone: user.profile?.phone || '',
        address: user.profile?.address?.street || '',
        businessName: user.profile?.businessInfo?.businessName || '',
        tinNumber: user.profile?.businessInfo?.tinNumber || '',
        tradeLicenseNumber: user.profile?.businessInfo?.tradeLicenseNumber || '',
        bankName: user.bankDetails?.bankName || '',
        accountNumber: user.bankDetails?.accountNumber || '',
        telebirrNumber: user.bankDetails?.telebirrNumber || '',
        termsAccepted: false,
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));

    // Real-time validation
    if (name === 'accountNumber') {
      const digits = value.replace(/\D/g, '');
      if (value && !/^\d+$/.test(value)) {
        setFieldErrors(prev => ({ ...prev, accountNumber: 'Account number must contain digits only.' }));
      } else if (digits.length > 0 && (digits.length < 13 || digits.length > 16)) {
        setFieldErrors(prev => ({ ...prev, accountNumber: 'Please enter a valid 13–16 digit Ethiopian bank account number.' }));
      } else {
        setFieldErrors(prev => ({ ...prev, accountNumber: '' }));
      }
    }

    if (name === 'telebirrNumber') {
      if (value && !/^(09|07)\d{8}$/.test(value)) {
        setFieldErrors(prev => ({ ...prev, telebirrNumber: 'Telebirr number must start with 09 or 07 and be exactly 10 digits.' }));
      } else {
        setFieldErrors(prev => ({ ...prev, telebirrNumber: '' }));
      }
    }
  };

  const handleFileChange = (e, fieldName) => {
    const fileList = Array.from(e.target.files);
    if (!fileList.length) return;
    if (fieldName === 'productPhotos' || fieldName === 'workVideos') {
      const limit = fieldName === 'productPhotos' ? 5 : 2;
      setFiles(prev => ({ ...prev, [fieldName]: [...prev[fieldName], ...fileList].slice(0, limit) }));
      fileList.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => ({ ...prev, [fieldName]: [...prev[fieldName], reader.result].slice(0, limit) }));
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = fileList[0];
      setFiles(prev => ({ ...prev, [fieldName]: file }));
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreviews(prev => ({ ...prev, [fieldName]: reader.result }));
        reader.readAsDataURL(file);
      } else {
        setPreviews(prev => ({ ...prev, [fieldName]: 'file' }));
      }
    }
  };

  const removeFile = (fieldName, index) => {
    setFiles(prev => ({ ...prev, [fieldName]: prev[fieldName].filter((_, i) => i !== index) }));
    setPreviews(prev => ({ ...prev, [fieldName]: prev[fieldName].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ── Validation ────────────────────────────────────────────────────────
    if (!files.identity) { toast.error('Identity document is required'); return; }
    if (!files.tradeLicense) { toast.error('Trade License is required to operate on EthioCraft Global.'); return; }

    // Bank account: required, digits only, 13–16 digits
    if (formData.accountNumber) {
      const digits = formData.accountNumber.replace(/\D/g, '');
      if (!/^\d+$/.test(formData.accountNumber) || digits.length < 13 || digits.length > 16) {
        toast.error('Please enter a valid 13–16 digit Ethiopian bank account number.');
        setCurrentStep(3);
        return;
      }
    }

    // Telebirr: if filled, must be 09/07 + 8 digits
    if (formData.telebirrNumber && !/^(09|07)\d{8}$/.test(formData.telebirrNumber)) {
      toast.error('Telebirr number must start with 09 or 07 and be exactly 10 digits.');
      setCurrentStep(3);
      return;
    }

    if (!formData.termsAccepted) { toast.error('Please accept the terms and conditions'); return; }

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (files.identity) data.append('identity', files.identity);
      if (files.tradeLicense) data.append('tradeLicense', files.tradeLicense);
      if (files.tinCertificate) data.append('tinCertificate', files.tinCertificate);
      files.productPhotos.forEach(file => data.append('productPhotos', file));
      files.workVideos.forEach(file => data.append('workVideos', file));
      await api.post('/artisan/verify-submit', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Application submitted! Under review within 24-48 hours.');
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step Indicator ────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
      {[1, 2, 3, 4].map(step => (
        <div key={step} className="flex flex-col items-center flex-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
            currentStep === step ? 'bg-ethiopian-gold text-white shadow-lg ring-4 ring-orange-100' :
            currentStep > step ? 'bg-green-500 text-white' : 'bg-white text-gray-400 border-2 border-gray-200'
          }`}>
            {currentStep > step ? <CheckCircle className="w-6 h-6" /> : step}
          </div>
          <span className={`text-[10px] uppercase font-bold mt-2 ${currentStep === step ? 'text-ethiopian-gold' : 'text-gray-400'}`}>
            {step === 1 ? 'Identity' : step === 2 ? 'Proof' : step === 3 ? 'Tax & Payment' : 'Review'}
          </span>
          {step < 4 && <div className={`h-1 w-full mt-[-30px] ml-[50%] ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  // ── Wait for auth to finish loading ──────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar onCollapsedChange={setIsSidebarCollapsed} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-500 font-medium">Loading your verification status...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Guidelines gate — blocks the page until accepted */}
      {!guidelinesAccepted && (
        <GuidelinesModal
          onAccepted={async () => {
            await refreshUser();
            setGuidelinesAccepted(true);
          }}
        />
      )}
      <Sidebar onCollapsedChange={setIsSidebarCollapsed} />
      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">

          {/* ── Page Header ── */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Artisan Verification</h1>
              <p className="text-gray-500 text-sm">Legalize your business to start selling on EthioCraft Global.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm text-xs font-bold text-gray-500">
              <ShieldCheck className="w-4 h-4 text-ethiopian-gold" />
              SECURE GATEWAY
            </div>
          </div>

          {/* ── Approved Banner ── */}
          {showApproved && (
            <div className="mb-8 p-6 rounded-3xl border bg-green-50 border-green-200 flex items-start gap-5 shadow-sm">
              <div className="p-3 rounded-2xl bg-green-100 text-green-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-gray-900 uppercase tracking-tight text-base mb-1">Status: APPROVED</h3>
                <p className="text-sm text-gray-700 font-medium">Your account is fully verified. You can now list and manage your products.</p>
                <button onClick={() => navigate('/artisan/dashboard')} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-green-700 transition-all">
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* ── Pending / Under Review Banner ── */}
          {showPending && (
            <div className="mb-8 p-6 rounded-3xl border bg-[#FFFBEB] border-amber-200 flex items-start gap-5 shadow-sm">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-600">
                <Info className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-gray-900 uppercase tracking-tight text-base mb-1">
                  Status: {currentStatus.replace('_', ' ').toUpperCase()}
                </h3>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">
                  Under Review: Our administration team is reviewing your documents. Please allow 24–48 business hours for a decision.
                </p>
              </div>
            </div>
          )}

          {/* ── Rejected Banner (shown above the re-submit form) ── */}
          {currentStatus === 'rejected' && (
            <div className="mb-8 p-6 rounded-3xl border bg-red-50 border-red-200 flex items-start gap-5 shadow-sm">
              <div className="p-3 rounded-2xl bg-red-100 text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-gray-900 uppercase tracking-tight text-base mb-1">Status: REJECTED — Action Required</h3>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">
                  Your application was rejected. {feedback ? `Feedback: "${feedback}".` : ''} Please update your documents below and resubmit.
                </p>
              </div>
            </div>
          )}
          {/* -- Multi-Step Verification Form -- */}
          {showForm && (
            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-white overflow-hidden">
              <div className="p-10">
                <StepIndicator />
                <form onSubmit={handleSubmit} className="space-y-8">

                  {/* STEP 1: Identity & Personal */}
                  {currentStep === 1 && (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Personal Info */}
                        <div className="space-y-5">
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                            <User className="w-4 h-4 inline mr-2" />Personal Information
                          </label>
                          <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-50 focus:border-ethiopian-gold transition-all outline-none" required />
                          <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-50 focus:border-ethiopian-gold transition-all outline-none" required />
                          <input name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-50 focus:border-ethiopian-gold transition-all outline-none" required />
                          <textarea name="address" placeholder="Residential Address / Workshop Location" value={formData.address} onChange={handleInputChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-50 focus:border-ethiopian-gold transition-all outline-none" rows="3" required />
                        </div>
                        {/* Identity Upload */}
                        <div className="space-y-5">
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4 inline mr-2" />Identity Document
                          </label>
                          <div className="border-2 border-dashed border-gray-200 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center hover:border-ethiopian-gold hover:bg-amber-50/30 transition-all relative cursor-pointer group h-[280px]">
                            {previews.identity ? (
                              <div className="relative w-full h-full flex items-center justify-center">
                                {previews.identity === 'file' ? (
                                  <div className="flex flex-col items-center text-ethiopian-gold">
                                    <FileText className="w-16 h-16" />
                                    <p className="mt-2 font-bold text-sm">{files.identity?.name}</p>
                                  </div>
                                ) : (
                                  <img src={previews.identity} className="max-h-full rounded-2xl shadow-lg border-4 border-white" alt="ID preview" />
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <div className="p-5 bg-amber-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                  <Upload className="w-10 h-10 text-ethiopian-gold" />
                                </div>
                                <p className="text-sm text-gray-900 font-bold">Upload ID or Passport</p>
                                <p className="text-xs text-gray-400 mt-2">National ID or Passport (PDF or Image)</p>
                              </div>
                            )}
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'identity')} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* STEP 2: Proof of Work */}
                  {currentStep === 2 && (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Product Photos */}
                        <div>
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
                            <ImageIcon className="w-4 h-4 inline mr-2" />Handmade Product Photos (Max 5)
                          </label>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {previews.productPhotos.map((src, i) => (
                              <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm border-2 border-white">
                                <img src={src} className="w-full h-full object-cover" alt="product" />
                                <button type="button" onClick={() => removeFile('productPhotos', i)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <AlertCircle className="w-6 h-6" />
                                </button>
                              </div>
                            ))}
                            {previews.productPhotos.length < 5 && (
                              <label className="flex flex-col items-center justify-center aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-amber-50 hover:border-ethiopian-gold transition-all group">
                                <PlusCircle className="w-6 h-6 text-gray-300 group-hover:text-ethiopian-gold" />
                                <input type="file" multiple className="sr-only" onChange={(e) => handleFileChange(e, 'productPhotos')} />
                              </label>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 italic">Photos of finished items you intend to sell.</p>
                        </div>
                        {/* Work Videos */}
                        <div>
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-4">
                            <Video className="w-4 h-4 inline mr-2" />Work Process Evidence (Max 2)
                          </label>
                          <label className="flex flex-col items-center justify-center w-full h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] cursor-pointer hover:border-ethiopian-gold hover:bg-amber-50/30 transition-all group">
                            <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                              <Video className="w-8 h-8 text-ethiopian-gold" />
                            </div>
                            <span className="text-sm text-gray-900 font-bold mt-3">Upload Crafting Video</span>
                            <input type="file" multiple accept="video/*" className="sr-only" onChange={(e) => handleFileChange(e, 'workVideos')} />
                          </label>
                          <div className="mt-4 space-y-2">
                            {files.workVideos.map((f, i) => (
                              <div key={i} className="flex items-center justify-between text-xs font-bold bg-amber-50 p-3 rounded-xl border border-amber-100">
                                <span className="truncate max-w-[200px]">{f.name}</span>
                                <button type="button" onClick={() => removeFile('workVideos', i)} className="text-red-500 hover:text-red-700">Delete</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* STEP 3: Business & Payment */}
                  {currentStep === 3 && (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Business Info */}
                        <div className="space-y-6">
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                            <Briefcase className="w-4 h-4 inline mr-2" />Business & Tax Information
                          </label>
                          <input name="businessName" placeholder="Brand / Workshop Name" value={formData.businessName} onChange={handleInputChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-50 outline-none transition-all" />
                          <input name="tinNumber" placeholder="TIN Number (Taxpayer Identification)" value={formData.tinNumber} onChange={handleInputChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-amber-50 outline-none transition-all" />
                          <label className={`flex items-center gap-4 p-5 bg-white rounded-[1.5rem] border shadow-sm cursor-pointer hover:border-ethiopian-gold transition-all group ${!files.tradeLicense ? 'border-red-200 bg-red-50/30' : 'border-green-200 bg-green-50/30'}`}>
                            <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform">
                              <FileText className="w-6 h-6 text-ethiopian-gold" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-black text-gray-900 uppercase">
                                Trade License <span className="text-red-500">*</span>
                              </p>
                              {files.tradeLicense
                                ? <p className="text-[10px] text-green-600 font-bold">✓ {files.tradeLicense.name}</p>
                                : <p className="text-[10px] text-red-500 font-bold">Required — Upload your business license</p>}
                            </div>
                            <input type="file" className="sr-only" onChange={(e) => {
                              handleFileChange(e, 'tradeLicense');
                              setFieldErrors(prev => ({ ...prev, tradeLicense: '' }));
                            }} />
                          </label>
                          {fieldErrors.tradeLicense && (
                            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 -mt-2">
                              <AlertCircle className="w-3 h-3" /> {fieldErrors.tradeLicense}
                            </p>
                          )}
                          <label className="flex items-center gap-4 p-5 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm cursor-pointer hover:border-ethiopian-gold transition-all group">
                            <div className="p-3 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform">
                              <FileText className="w-6 h-6 text-ethiopian-gold" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-black text-gray-900 uppercase">TIN Certificate (Optional)</p>
                              <p className="text-[10px] text-gray-400">{files.tinCertificate ? files.tinCertificate.name : 'Upload TIN certificate if available'}</p>
                            </div>
                            <input type="file" className="sr-only" onChange={(e) => handleFileChange(e, 'tinCertificate')} />
                          </label>
                        </div>
                        {/* Payment Details */}
                        <div className="space-y-6">
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">
                            <CreditCard className="w-4 h-4 inline mr-2" />Payment Details
                          </label>
                          <select name="bankName" value={formData.bankName} onChange={handleInputChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white transition-all appearance-none">
                            <option value="">Select Bank / Wallet</option>
                            <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                            <option value="Abyssinia">Bank of Abyssinia</option>
                            <option value="Awash">Awash International Bank</option>
                            <option value="Dashen">Dashen Bank</option>
                            <option value="Telebirr">Telebirr (Mobile Money)</option>
                            <option value="M-PESA">M-PESA Safaricom</option>
                          </select>
                          <div>
                            <input
                              name="accountNumber"
                              placeholder="Bank Account Number (13–16 digits)"
                              value={formData.accountNumber}
                              onChange={handleInputChange}
                              inputMode="numeric"
                              maxLength={16}
                              className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none focus:bg-white transition-all ${fieldErrors.accountNumber ? 'border-red-300 focus:ring-4 focus:ring-red-50' : 'border-gray-100 focus:ring-4 focus:ring-amber-50'}`}
                            />
                            {fieldErrors.accountNumber && (
                              <p className="mt-1 text-[10px] text-red-500 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {fieldErrors.accountNumber}
                              </p>
                            )}
                          </div>
                          <div>
                            <input
                              name="telebirrNumber"
                              placeholder="Telebirr Number (09xxxxxxxx or 07xxxxxxxx)"
                              value={formData.telebirrNumber}
                              onChange={handleInputChange}
                              inputMode="numeric"
                              maxLength={10}
                              className={`w-full px-5 py-4 bg-gray-50 border rounded-2xl outline-none focus:bg-white transition-all ${fieldErrors.telebirrNumber ? 'border-red-300 focus:ring-4 focus:ring-red-50' : 'border-gray-100 focus:ring-4 focus:ring-amber-50'}`}
                            />
                            {fieldErrors.telebirrNumber && (
                              <p className="mt-1 text-[10px] text-red-500 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {fieldErrors.telebirrNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* STEP 4: Review & Submit */}
                  {currentStep === 4 && (
                    <div>
                      <div className="bg-gray-50/50 rounded-[2rem] p-10 border border-gray-100">
                        <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                          <CheckCircle className="w-8 h-8 text-green-500" /> Final Confirmation
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                          <div className="space-y-4">
                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Owner Name</p>
                              <p className="font-black text-gray-900">{formData.firstName} {formData.lastName}</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Business Name</p>
                              <p className="font-black text-gray-900">{formData.businessName || 'Not Set'}</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Phone</p>
                              <p className="font-black text-gray-900">{formData.phone || 'Not Set'}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">TIN Number</p>
                              <p className="font-black text-gray-900">{formData.tinNumber || 'Not Set'}</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Payout Method</p>
                              <p className="font-black text-gray-900">{formData.bankName || 'Not Set'} {formData.accountNumber ? `- ${formData.accountNumber}` : ''}</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Documents Uploaded</p>
                              <p className="font-black text-gray-900">
                                ID: {files.identity ? '✅' : '❌'} &nbsp;
                                License: {files.tradeLicense ? '✅' : '❌'} &nbsp;
                                Photos: {files.productPhotos.length}/5 &nbsp;
                                Videos: {files.workVideos.length}/2
                              </p>
                            </div>
                          </div>
                        </div>
                        <label className="flex items-start gap-4 cursor-pointer group bg-white p-5 rounded-2xl border border-gray-100 hover:border-ethiopian-gold transition-all">
                          <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleInputChange} className="mt-1 w-6 h-6 rounded-lg border-gray-200 text-ethiopian-gold focus:ring-ethiopian-gold transition-all" />
                          <span className="text-xs font-bold text-gray-600 leading-relaxed">
                            I legally certify that all provided documents are authentic. I agree to EthioCraft Global's Terms of Service and the 5% flat commission policy on all successful sales.
                          </span>
                        </label>
                        <button
                          type="submit"
                          disabled={submitting || !files.tradeLicense || !files.identity}
                          className="w-full mt-10 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <div className="flex items-center justify-center gap-3">
                              <LoadingSpinner size="small" light /> Processing...
                            </div>
                          ) : !files.identity ? (
                            'Identity Document Required'
                          ) : !files.tradeLicense ? (
                            'Trade License Required to Submit'
                          ) : (
                            'Submit Secure Application'
                          )}
                        </button>
                        {(!files.identity || !files.tradeLicense) && (
                          <p className="mt-3 text-[10px] text-red-500 font-bold text-center flex items-center justify-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {!files.identity ? 'Upload your Identity Document (Step 1) to enable submission.' : 'Upload your Trade License (Step 3) to enable submission.'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-10 border-t border-gray-100 mt-10">
                    {currentStep > 1 && (
                      <button type="button" onClick={() => setCurrentStep(prev => prev - 1)} className="flex items-center gap-3 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-900 transition-colors">
                        <ChevronLeft className="w-5 h-5" /> Previous Step
                      </button>
                    )}
                    {currentStep < 4 && (
                      <button type="button" onClick={() => setCurrentStep(prev => prev + 1)} className="ml-auto bg-ethiopian-gold text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-lg hover:bg-amber-600 transition-all">
                        Continue <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                </form>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center p-8 border-t border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
              EthioCraft Global Trust & Safety Protocol
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ArtisanVerification;
