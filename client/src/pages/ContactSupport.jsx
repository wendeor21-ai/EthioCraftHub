/**
 * Contact Support Page for EthioCraft Global
 * 
 * Mobile-friendly, compact form fields and typography,
 * fully translated to Amharic with clean Ethiopian brand styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageCircle, 
  Mail, 
  User, 
  FileText,
  Send,
  CheckCircle,
  HelpCircle,
  Clock,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supportAPI } from '../utils/api';

const ContactSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userMessages, setUserMessages] = useState([]);

  // Auto-fill user information if logged in
  useEffect(() => {
    if (user) {
      const firstName = user.profile?.firstName || '';
      const lastName = user.profile?.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      setFormData(prev => ({
        ...prev,
        name: prev.name || fullName || user.email || '',
        email: prev.email || user.email || ''
      }));
      fetchUserMessages();
    }
  }, [user]);

  const supportCategories = [
    { value: 'Order Issue', label: 'የትዕዛዝ ጉዳይ (Order Issue)' },
    { value: 'Payment Problem', label: 'የክፍያ ችግር (Payment Problem)' },
    { value: 'Shipping Inquiry', label: 'የማጓጓዣና ርክክብ ጥያቄ (Shipping Inquiry)' },
    { value: 'Account Help', label: 'የመለያ ድጋፍ (Account Help)' },
    { value: 'Product Question', label: 'የምርት ጥያቄ (Product Question)' },
    { value: 'Technical Issue', label: 'ቴክኒካዊ ችግር (Technical Issue)' },
    { value: 'Other', label: 'ሌላ ጉዳይ (Other)' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'እባክዎ ሙሉ ስምዎን ያስገቡ';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'እባክዎ ኢሜይልዎን ያስገቡ';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'ትክክለኛ የኢሜይል አድራሻ ያስገቡ';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'እባክዎ የጉዳዩን ርዕስ ይምረጡ';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'እባክዎ መልዕክትዎን ያስገቡ';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'መልዕክቱ ቢያንስ 10 ፊደላት መሆን አለበት';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('እባክዎ የተሳሳቱ መረጃዎችን ያስተካክሉ');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        subject: formData.subject,
        message: formData.message
      };

      await supportAPI.sendMessage(payload);

      setIsSubmitted(true);
      toast.success('የድጋፍ ጥያቄዎ በተሳካ ሁኔታ ተልኳል!');

      // Refresh list
      fetchUserMessages();

      // Reset form fields
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          subject: '',
          message: ''
        }));
        setIsSubmitted(false);
      }, 3500);
    } catch (error) {
      console.error('Error submitting support request:', error);
      toast.error('ጥያቄውን መላክ አልተቻለም፤ እባክዎ እንደገና ይሞክሩ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchUserMessages = async () => {
    try {
      const res = await supportAPI.getMessages();
      const msgs = res.data?.messages || [];
      setUserMessages(msgs);
    } catch (err) {
      console.error('Failed to load user messages', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-16">
      {/* Top Brand Stripe */}
      <div className="h-1 bg-gradient-to-r from-green-600 via-amber-400 to-red-600 w-full" />

      <div className="max-w-xl mx-auto px-4 pt-4 sm:pt-6">
        {/* Navigation & Header */}
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-600 hover:text-amber-800 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ተመለስ (Back)</span>
          </button>
          
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                የደንበኞች ድጋፍ አገልግሎት (Contact Support)
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5">
                ጥያቄዎን ወይም አስተያየትዎን ይላኩልን፤ ፈጣን ምላሽ እንሰጣለን
              </p>
            </div>
          </div>
        </div>

        {isSubmitted ? (
          /* Success State Card */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center animate-fadeIn my-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
              ጥያቄዎ በተሳካ ሁኔታ ደርሶናል!
            </h2>
            <p className="text-xs text-gray-600 mb-1">
              መልዕክትዎን ተቀብለናል፤ የድጋፍ ሰጪ ቡድናችን በተቻለ ፍጥነት ምላሽ ይሰጥዎታል።
            </p>
            <p className="text-[11px] text-gray-400 mb-4">
              ምላሹን በሜሴጅ ገጽዎ ላይ ማየት ይችላሉ
            </p>
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => navigate('/messages')}
                className="px-3.5 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-xs font-bold shadow-sm"
              >
                ወደ መልዕክቶች ይሂዱ
              </button>
              <button
                onClick={() => setIsSubmitted(false)}
                className="px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-semibold"
              >
                ሌላ መልዕክት ይጻፉ
              </button>
            </div>
          </div>
        ) : (
          /* Mobile-First Compact Contact Form */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-gray-700 mb-1">
                  <User className="w-3.5 h-3.5 inline mr-1 text-gray-500" />
                  ሙሉ ስም (Full Name) *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all ${
                    errors.name ? 'border-red-500 bg-red-50/20' : 'border-gray-200 bg-gray-50/30'
                  }`}
                  placeholder="ሙሉ ስምዎን ያስገቡ"
                />
                {errors.name && (
                  <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1">
                  <Mail className="w-3.5 h-3.5 inline mr-1 text-gray-500" />
                  የኢሜይል አድራሻ (Email Address) *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all ${
                    errors.email ? 'border-red-500 bg-red-50/20' : 'border-gray-200 bg-gray-50/30'
                  }`}
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.email}</p>
                )}
              </div>

              {/* Subject Category Select */}
              <div>
                <label htmlFor="subject" className="block text-xs font-bold text-gray-700 mb-1">
                  <FileText className="w-3.5 h-3.5 inline mr-1 text-gray-500" />
                  የጉዳዩ ርዕስ (Subject) *
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all ${
                    errors.subject ? 'border-red-500 bg-red-50/20' : 'border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <option value="">የጉዳዩን አይነት ይምረጡ (Select a category)</option>
                  {supportCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.subject}</p>
                )}
              </div>

              {/* Message Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="message" className="block text-xs font-bold text-gray-700">
                    <MessageSquare className="w-3.5 h-3.5 inline mr-1 text-gray-500" />
                    ዝርዝር መልዕክት (Message) *
                  </label>
                  <span className="text-[10px] text-gray-400">
                    {formData.message.length} ፊደላት (ቢያንስ 10)
                  </span>
                </div>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none ${
                    errors.message ? 'border-red-500 bg-red-50/20' : 'border-gray-200 bg-gray-50/30'
                  }`}
                  placeholder="ጥያቄዎን ወይም ያጋጠመዎትን ችግር እዚህ በዝርዝር ይጻፉ..."
                />
                {errors.message && (
                  <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.message}</p>
                )}
              </div>

              {/* Submit Button - Minimized & Touch Friendly */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-colors flex items-center justify-center space-x-1.5 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>በመላክ ላይ...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>የድጋፍ ጥያቄውን ላክ (Submit Request)</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* User's Previous Requests (Compact) */}
        {userMessages && userMessages.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>ያለፉ የድጋፍ ጥያቄዎችዎ ({userMessages.length})</span>
              </h3>
              <button
                onClick={() => navigate('/messages')}
                className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold"
              >
                ሁሉንም በቻት ይመልከቱ ›
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar">
              {userMessages.slice(0, 3).map((m) => (
                <div 
                  key={m._id} 
                  onClick={() => navigate('/messages')}
                  className="p-2.5 bg-gray-50/70 hover:bg-amber-50/40 rounded-lg border border-gray-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-900 truncate pr-2">
                      {m.subject}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(m.createdAt).toLocaleDateString('am-ET')}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-1 mb-1.5">
                    {m.message}
                  </p>
                  
                  {m.adminResponse ? (
                    <div className="bg-green-50 text-green-800 text-[10px] font-semibold px-2 py-1 rounded border border-green-200 flex items-center justify-between">
                      <span className="truncate">ምላሽ: {m.adminResponse}</span>
                      <span className="shrink-0 ml-1">✓ ተመልሷል</span>
                    </div>
                  ) : (
                    <span className="inline-block text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                      ⏳ ምላሽ በመጠባበቅ ላይ
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Reference Assistance Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => navigate('/faqs')}
            className="p-3 bg-white rounded-xl shadow-xs border border-gray-200 hover:border-amber-400 text-left transition-colors flex items-center space-x-2"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-gray-900 truncate">ጥያቄዎች (FAQs)</h4>
              <p className="text-[10px] text-gray-500 truncate">ፈጣን መልሶችን ያግኙ</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/messages')}
            className="p-3 bg-white rounded-xl shadow-xs border border-gray-200 hover:border-amber-400 text-left transition-colors flex items-center space-x-2"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-gray-900 truncate">የቀጥታ ውይይት</h4>
              <p className="text-[10px] text-gray-500 truncate">መልዕክቶችን ይመልከቱ</p>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContactSupport;
