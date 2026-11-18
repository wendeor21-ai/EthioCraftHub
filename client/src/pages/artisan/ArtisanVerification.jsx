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
  ChevronLeft, Info, FileText, PlusCircle, Clock, RefreshCw,
  Lock, ExternalLink
} from 'lucide-react';

const ArtisanVerification = ({ insideDashboard = false, onSelectTab }) => {
  const { user, updateUser, refreshUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // If an admin navigates here, redirect them to admin verification portal
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin/verifications', { replace: true });
    }
  }, [user?.role, navigate]);

  // Guidelines gate — show modal until artisan has accepted (first time only)
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(() => {
    if (user?.hasAcceptedGuidelines === true) return true;
    if (user?.verification?.status === 'approved') return true;
    const uid = user?.id || user?._id || user?.email;
    if (uid && localStorage.getItem(`artisan_guidelines_accepted_${uid}`)) return true;
    if (localStorage.getItem('artisan_guidelines_accepted')) return true;
    return false;
  });

  // Sync once user loads from auth context
  useEffect(() => {
    const uid = user?.id || user?._id || user?.email;
    if (
      user?.hasAcceptedGuidelines === true ||
      user?.verification?.status === 'approved' ||
      (uid && localStorage.getItem(`artisan_guidelines_accepted_${uid}`)) ||
      localStorage.getItem('artisan_guidelines_accepted')
    ) {
      setGuidelinesAccepted(true);
    }
  }, [user]);

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

  // Derive status cleanly and exhaustively
  const currentStatus = (user?.verification?.status || 'not_submitted').toLowerCase().trim();
  const feedback = user?.verification?.feedback || '';

  // 1. Approved: status is approved/verified AND isVerified flag is true
  const isApproved = (currentStatus === 'approved' || currentStatus === 'verified') && user?.isVerified === true;
  // 2. Pending / Under review by admin
  const showPending = !isApproved && (currentStatus === 'pending' || currentStatus === 'under_review');
  // 3. Rejected by admin
  const isRejected = !isApproved && !showPending && currentStatus === 'rejected';
  // 4. Not submitted / new artisan: ANY artisan who is not approved, not pending, and not rejected
  const isNotSubmitted = !isApproved && !showPending && !isRejected;

  // The multi-step form is ALWAYS automatically visible for artisans who haven't submitted or who were rejected
  const showForm = isNotSubmitted || isRejected;
  const [refreshing, setRefreshing] = useState(false);

  // 24-Hour countdown calculation for pending status (counting down from 24h to 0s)
  const [timeLeft, setTimeLeft] = useState({ hours: 24, minutes: 0, seconds: 0, totalSeconds: 86400 });

  useEffect(() => {
    if (!showPending) return;

    const updateCountdown = () => {
      const submittedAt = user?.verification?.submittedAt
        ? new Date(user.verification.submittedAt).getTime()
        : Date.now();
      const targetTime = submittedAt + (24 * 60 * 60 * 1000);
      const diffMs = targetTime - Date.now();

      if (diffMs <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setTimeLeft({ hours, minutes, seconds, totalSeconds: totalSec });
    };

    updateCountdown();
    const timerId = setInterval(updateCountdown, 1000);
    return () => clearInterval(timerId);
  }, [showPending, user?.verification?.submittedAt]);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const refreshed = await refreshUser();
      const st = refreshed?.verification?.status?.toLowerCase?.() || '';
      if (st === 'approved' || refreshed?.isVerified) {
        toast.success('እንኳን ደስ አለዎት! መለያዎ ጸድቋል (Verification Approved)');
      } else if (st === 'rejected') {
        toast.error('የማረጋገጫ ጥያቄዎ ውድቅ ተደርጓል (Verification Rejected)');
      } else {
        toast('አሁንም በግምገማ ላይ ነው (Still under review)', { icon: '⏳' });
      }
    } catch {
      toast.error('ሁኔታውን ማደስ አልተሳካም');
    } finally {
      setRefreshing(false);
    }
  };

  // Pre-fill form with existing user profile data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.profile?.firstName || prev.firstName || '',
        lastName: user.profile?.lastName || prev.lastName || '',
        phone: user.profile?.phone || prev.phone || '',
        address: (typeof user.profile?.address === 'string' ? user.profile.address : user.profile?.address?.street) || prev.address || '',
        businessName: user.profile?.businessInfo?.businessName || prev.businessName || '',
        tinNumber: user.profile?.businessInfo?.tinNumber || prev.tinNumber || '',
        tradeLicenseNumber: user.profile?.businessInfo?.tradeLicenseNumber || prev.tradeLicenseNumber || '',
        bankName: user.bankDetails?.bankName || prev.bankName || '',
        accountNumber: user.bankDetails?.accountNumber || prev.accountNumber || '',
        telebirrNumber: user.bankDetails?.telebirrNumber || prev.telebirrNumber || '',
      }));
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

    // Check file sizes before uploading to give immediate friendly feedback
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allFiles = [
      files.identity, files.tradeLicense, files.tinCertificate,
      ...files.productPhotos, ...files.workVideos
    ].filter(Boolean);

    for (const f of allFiles) {
      if (f.size > maxFileSize) {
        toast.error(`ፋይሉ በጣም ትልቅ ነው (${f.name})። እባክዎ ከ50MB በታች የሆነ ቪዲዮ ወይም ፎቶ ያያይዙ።`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (files.identity) data.append('identity', files.identity);
      if (files.tradeLicense) data.append('tradeLicense', files.tradeLicense);
      if (files.tinCertificate) data.append('tinCertificate', files.tinCertificate);
      files.productPhotos.forEach(file => data.append('productPhotos', file));
      files.workVideos.forEach(file => data.append('workVideos', file));

      // Submit verification documents
      const response = await api.post('/artisan/verify-submit', data, {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 180000, // 3 minutes for media uploads over mobile networks
      });

      const updatedVerification = response.data?.verification || {
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      const updatedUser = response.data?.user || {
        ...user,
        verification: updatedVerification,
        profile: {
          ...user?.profile,
          businessInfo: {
            ...user?.profile?.businessInfo,
            businessName: formData.businessName,
            tinNumber: formData.tinNumber,
            tradeLicenseNumber: formData.tradeLicenseNumber,
          }
        },
        bankDetails: {
          ...user?.bankDetails,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          telebirrNumber: formData.telebirrNumber,
        }
      };

      if (updateUser) {
        updateUser(updatedUser);
      }
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (e) { }

      toast.success('የማረጋገጫ ሰነዶችዎ ገብተዋል! የ24 ሰዓት የቆጠራ ግምገማ ተጀምሯል።');

      try {
        await refreshUser();
      } catch (e) { }
    } catch (err) {
      console.error('❌ Verification submit error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Submission failed. Please try again.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step Indicator ────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
      {[1, 2, 3, 4].map(step => (
        <div key={step} className="flex flex-col items-center flex-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep === step ? 'bg-ethiopian-gold text-white shadow-lg ring-4 ring-orange-100' :
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
    <div className={insideDashboard ? "w-full" : "flex min-h-screen bg-gray-50"}>
      {/* Guidelines Modal — opens FIRST for new artisans until read and accepted */}
      {!guidelinesAccepted && (
        <GuidelinesModal
          onAccepted={async () => {
            setGuidelinesAccepted(true);
            const uid = user?.id || user?._id || user?.email;
            if (uid) localStorage.setItem(`artisan_guidelines_accepted_${uid}`, 'true');
            localStorage.setItem('artisan_guidelines_accepted', 'true');
            try {
              await refreshUser();
            } catch (e) { }
            toast.success('መመሪያዎቹን ተቀብለዋል። አሁን የማረጋገጫ ሰነዶችዎን ማስገባት ይችላሉ!');
          }}
          onClose={() => {
            setGuidelinesAccepted(true);
            const uid = user?.id || user?._id || user?.email;
            if (uid) localStorage.setItem(`artisan_guidelines_accepted_${uid}`, 'true');
            localStorage.setItem('artisan_guidelines_accepted', 'true');
          }}
        />
      )}

      {!insideDashboard && <Sidebar onCollapsedChange={setIsSidebarCollapsed} />}
      <main className={insideDashboard ? "w-full pb-8" : "flex-1 p-4 lg:p-8 overflow-x-hidden"}>
        <div className="max-w-4xl mx-auto">

          {/* ── Page Header ── */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Artisan Verification</h1>
              <p className="text-gray-500 text-sm">የአርቲሳን ማረጋገጫ • Legalize your business to start selling on EthioCraft Global.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm text-xs font-bold text-gray-500">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              SECURE GATEWAY
            </div>
          </div>

          {/* ── Approved Banner ── */}
          {isApproved && (
            <div className="mb-8 p-6 sm:p-8 rounded-3xl border bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-md">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="p-3 sm:p-4 rounded-2xl bg-green-100 text-green-700 shrink-0 shadow-sm">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <span className="inline-block px-3 py-1 bg-green-200 text-green-900 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                    ✅ ማረጋገጫው ጸድቋል • Status: Approved
                  </span>
                  <h3 className="font-black text-gray-900 text-lg sm:text-xl mb-1">
                    እንኳን ደስ አለዎት! መለያዎ ሙሉ በሙሉ ጸድቋል 🎉
                  </h3>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    የአስተዳዳሪ ማረጋገጫ ተጠናቋል፤ የአርቲሳን መመሪያዎችንም ተቀብለዋል። አሁን ሙሉውን የአርቲሳን ዳሽቦርድ በመጠቀም ምርቶችዎን ማከል፣ ማስተዳደር እና መሸጥ ይችላሉ።
                  </p>
                  <button
                    onClick={() => (onSelectTab ? onSelectTab('dashboard') : navigate('/artisan/dashboard'))}
                    className="mt-5 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span>ወደ አርቲሳን ዳሽቦርድ ይሂዱ (Go to Dashboard)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Pending / Under Review Banner with 24-Hour Countdown Timer ── */}
          {showPending && (
            <div className="mb-8 p-6 sm:p-8 rounded-3xl border bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/60 border-amber-300 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-amber-200/80">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-md shrink-0">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[11px] font-black uppercase tracking-wider mb-1">
                      በግምገማ ላይ • Pending Admin Approval
                    </span>
                    <h3 className="font-black text-gray-900 text-lg sm:text-xl">
                      የማረጋገጫ ሰነዶችዎ በአስተዳዳሪው እየተገመገሙ ነው
                    </h3>
                  </div>
                </div>

                <button
                  onClick={handleRefreshStatus}
                  disabled={refreshing}
                  className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 hover:bg-amber-100/70 text-amber-900 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  title="Check latest status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'በማደስ ላይ...' : 'ሁኔታውን አድስ (Refresh)'}</span>
                </button>
              </div>

              {/* 24-Hour Countdown Clock */}
              <div className="my-6">
                <p className="text-center text-xs font-bold text-amber-800 uppercase tracking-widest mb-3">
                  የቀረው ግምገማ ጊዜ (Countdown Timer — 24 Hour to 0s)
                </p>
                <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-sm mx-auto">
                  <div className="bg-white/90 backdrop-blur-sm border-2 border-amber-300 rounded-2xl p-3 sm:p-4 text-center shadow-md">
                    <span className="block text-2xl sm:text-4xl font-black text-amber-900 font-mono">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider">ሰዓት / Hours</span>
                  </div>
                  <div className="bg-white/90 backdrop-blur-sm border-2 border-amber-300 rounded-2xl p-3 sm:p-4 text-center shadow-md">
                    <span className="block text-2xl sm:text-4xl font-black text-amber-900 font-mono">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider">ደቂቃ / Mins</span>
                  </div>
                  <div className="bg-white/90 backdrop-blur-sm border-2 border-amber-300 rounded-2xl p-3 sm:p-4 text-center shadow-md">
                    <span className="block text-2xl sm:text-4xl font-black text-amber-900 font-mono">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 uppercase tracking-wider">ሰከንድ / Secs</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-amber-200 text-xs text-amber-950 space-y-2">
                <p className="font-semibold flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  የማረጋገጫ ሰነዶችዎ በተሳካ ሁኔታ ተልከዋል። የአስተዳዳሪ ቡድኑ ሰነዶችዎን ገምግሞ በ24 ሰዓት ውስጥ መለያዎን ያጸድቃል ወይም አስተያየት ይሰጥዎታል።
                </p>
                <p className="text-[11px] text-amber-800">
                  ማስታወሻ፡ አስተዳዳሪው መለያዎን እስኪያጸድቅ ድረስ ሌሎች የዳሽቦርድ ገጾች ለደህንነት ሲባል ተቆልፈው ይቆያሉ።
                </p>
              </div>
            </div>
          )}

          {/* ── Rejected Banner (Admin Reject with Comment) ── */}
          {isRejected && (
            <div className="mb-8 p-6 sm:p-8 rounded-3xl border bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-md">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-red-100 text-red-600 shrink-0">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                    ❌ ማረጋገጫው ውድቅ ተደርጓል • Status: Rejected
                  </span>
                  <h3 className="font-black text-gray-900 text-lg mb-2">
                    የማረጋገጫ ጥያቄዎ ውድቅ ተደርጓል — ማስተካከያ ያስፈልጋል
                  </h3>

                  {/* Admin feedback box */}
                  <div className="p-4 bg-white rounded-2xl border border-red-200 mb-4 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-1">
                      የአስተዳዳሪ አስተያየት (Admin Feedback / Reason):
                    </p>
                    <p className="text-sm font-semibold text-gray-800 italic">
                      "{feedback || 'የቀረቡት ሰነዶች አልተሟሉም ወይም ግልጽ አይደሉም። እባክዎ እንደገና በትክክል ሞልተው ያስገቡ።'}"
                    </p>
                  </div>

                  <p className="text-xs text-red-700 font-bold">
                    እባክዎ ከታች የቀረበውን ቅጽ በመጠቀም የተስተካከሉ ሰነዶችን እንደገና ሞልተው ያስገቡ።
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Multi-Step Verification Form (Opens Automatically for new or rejected artisans) ── */}
          {showForm && (
            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-white overflow-hidden">
              <div className="p-6 sm:p-10">
                <div className="pb-6 mb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-gray-900">
                        የማረጋገጫ ሰነዶች ማስገቢያ ቅጽ (Verification Application)
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        እባክዎ ሁሉንም መረጃዎች በትክክል ይሙሉ እና ህጋዊ ሰነዶችን ያያይዙ
                      </p>
                    </div>
                  </div>
                </div>
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
                          <span className="text-xs font-bold text-gray-700 leading-relaxed">
                            የቀረቡት ሰነዶች በሙሉ ትክክለኛና ህጋዊ መሆናቸውን አረጋግጣለሁ። የኢትዮ-ክራፍት ግሎባል የአጠቃቀም ደንቦችን እና የ5% የኮሚሽን ፖሊሲን ተቀብያለሁ። (I legally certify that all provided documents are authentic. I agree to EthioCraft Global's Terms of Service and 5% flat commission policy.)
                          </span>
                        </label>
                        <button
                          type="submit"
                          disabled={submitting || !files.tradeLicense || !files.identity}
                          className="w-full mt-10 bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.15em] shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed cursor-pointer border border-amber-500/50"
                        >
                          {submitting ? (
                            <div className="flex items-center justify-center gap-3">
                              <LoadingSpinner size="small" light /> <span>በማስኬድ ላይ... (Processing...)</span>
                            </div>
                          ) : !files.identity ? (
                            'የመታወቂያ ሰነድ ያስፈልጋል (Identity Document Required)'
                          ) : !files.tradeLicense ? (
                            'የንግድ ፈቃድ ያስፈልጋል (Trade License Required)'
                          ) : (
                            'ማመልከቻውን በአስተማማኝ ሁኔታ አስገባ — SUBMIT APPLICATION'
                          )}
                        </button>
                        {(!files.identity || !files.tradeLicense) && (
                          <p className="mt-3 text-xs text-amber-700 font-bold text-center flex items-center justify-center gap-1 bg-amber-50 py-2 px-4 rounded-xl border border-amber-200">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            {!files.identity ? 'ማመልከቻውን ለማስገባት እባክዎ መታወቂያዎን ያያይዙ (ደረጃ 1)።' : 'ማመልከቻውን ለማስገባት እባክዎ የንግድ ፈቃድዎን ያያይዙ (ደረጃ 3)።'}
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
