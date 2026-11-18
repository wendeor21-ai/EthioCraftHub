/**
 * FAQ Page for EthioCraft Global
 * 
 * Frequently Asked Questions (የእርዳታ እና ድጋፍ ጥያቄዎች)
 * Fully mobile-first, responsive, and translated into Amharic
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Search,
  Package,
  CreditCard,
  Truck,
  User,
  Shield,
  MessageCircle,
  Sparkles,
  Phone,
  X
} from 'lucide-react';

const FAQ = () => {
  const navigate = useNavigate();
  const [openQuestion, setOpenQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'ሁሉም', enName: 'All', icon: HelpCircle },
    { id: 'orders', name: 'ትዕዛዞች', enName: 'Orders', icon: Package },
    { id: 'payments', name: 'ክፍያዎች', enName: 'Payments', icon: CreditCard },
    { id: 'shipping', name: 'ማጓጓዣና ርክክብ', enName: 'Shipping', icon: Truck },
    { id: 'account', name: 'የግል መለያ', enName: 'Account', icon: User },
    { id: 'security', name: 'ደህንነት', enName: 'Security', icon: Shield }
  ];

  const faqs = [
    {
      id: 1,
      category: 'orders',
      question: 'ትዕዛዝ እንዴት ማስገባት እችላለሁ? (How do I place an order?)',
      answer: 'የሚፈልጉትን ባህላዊ የዕደ-ጥበብ ምርት ይምረጡ፤ "ወደ ዘንቢል አክል" የሚለውን በመጫን ምርቶችን ካሰባሰቡ በኋላ ወደ ክፍያ (Checkout) ይቀጥሉ። አድራሻዎን እና የተመቻችዎትን የመክፈያ ዘዴ በመምረጥ ትዕዛዝዎን በቀላሉ ያጠናቅቁ።'
    },
    {
      id: 2,
      category: 'orders',
      question: 'ትዕዛዜን መሰረዝ ወይም ማስተካከል እችላለሁ? (Can I cancel or modify my order?)',
      answer: 'አዎ፣ ትዕዛዝ ባስገቡ በ24 ሰዓት ውስጥ የደንበኞች ድጋፍ ቡድናችንን በማነጋገር መሰረዝ ወይም ማስተካከል ይችላሉ። ትዕዛዙ ተዘጋጅቶ ከተላከ በኋላ መሰረዝ ባይቻልም፣ ዕቃው ከደረሰዎት በኋላ የመመለስ ሂደት መጀመር ይችላሉ።'
    },
    {
      id: 3,
      category: 'orders',
      question: 'የትዕዛዜን ሁኔታ እንዴት መከታተል እችላለሁ? (How do I track my order?)',
      answer: 'በፕሮፋይልዎ ስር ወደ "የእኔ ትዕዛዞች (My Orders)" በመግባት ከትዕዛዝዎ ጎን "ክትትል (Track)" የሚለውን ይጫኑ። የትዕዛዝዎን የደረሰበት ደረጃ እና የሚደርስበትን ግምታዊ ቀን በቅጽበት ማየት ይችላሉ።'
    },
    {
      id: 4,
      category: 'payments',
      question: 'ምን ዓይነት የመክፈያ ዘዴዎችን ትቀበላላችሁ? (What payment methods do you accept?)',
      answer: 'የሀገር ውስጥ እና የውጭ ክፍያዎችን እንደግፋለን፤ ቴሌብር (Telebirr)፣ የኢትዮጵያ ንግድ ባንክ (CBE)፣ ቻፓ (Chapa) እንዲሁም ዓለም አቀፍ የክሬዲት/ዴቢት ካርዶች (Visa, Mastercard) ተቀባይነት አላቸው። ሁሉም ክፍያዎች ደህንነታቸው የተጠበቀ ነው።'
    },
    {
      id: 5,
      category: 'payments',
      question: 'የክፍያ መረጃዬ ደህንነቱ የተጠበቀ ነው? (Is my payment secure?)',
      answer: 'በእርግጥ! ሁሉም የክፍያ ሂደቶች በከፍተኛ የSSL ምስጠራ (Encryption) እና በታመኑ የክፍያ መተላለፊያዎች የተጠበቁ ናቸው። የካርድዎን ወይም የባንክ ሂሳብዎን ሚስጥራዊ ቁጥሮች በሰርቨራችን ላይ በፍጹም አናስቀምጥም።'
    },
    {
      id: 6,
      category: 'payments',
      question: 'የገንዘብ ተመላሽ (Refund) እንዴት ይሰራል? (How do refunds work?)',
      answer: 'የተመለሰው ዕቃ በባለሙያው ተመርምሮ ከደረሰን በኋላ በ7-10 የሥራ ቀናት ውስጥ ገንዘብዎ በተከፈለበት መንገድ ይመለስልዎታል። ተመላሽ ለመጠየቅ የድጋፍ ቡድናችንን ያነጋግሩ።'
    },
    {
      id: 7,
      category: 'shipping',
      question: 'ዕቃው ለመድረስ ምን ያህል ጊዜ ይወስዳል? (How long does shipping take?)',
      answer: 'በኢትዮጵያ ውስጥ ባሉ ከተሞች መደበኛ ማድረሻ ከ2 እስከ 5 የሥራ ቀናት ይወስዳል። ለዓለም አቀፍ ደንበኞች እንደ ሀገሩ ርቀት ከ7 እስከ 15 የሥራ ቀናት ይወስዳል።'
    },
    {
      id: 8,
      category: 'shipping',
      question: 'ወደ ውጭ ሀገራት ዕቃዎችን ትልካላችሁ? (Do you ship internationally?)',
      answer: 'አዎ! የኢትዮጵያን ባህላዊ ምርቶች ወደ ተመረጡ የዓለም ሀገራት በታመኑ ዓለም አቀፍ የፖስታና የማጓጓዣ ድርጅቶች (DHL, EMS) በኩል እናደርሳለን። ዋጋውን እና የጊዜ ገደቡን በክፍያ ገጽ ላይ ማየት ይችላሉ።'
    },
    {
      id: 9,
      category: 'shipping',
      question: 'ዕቃው ቢጠፋ ወይም ተበላሽቶ ቢደርስ ምን ማድረግ አለብኝ? (What if my package is lost or damaged?)',
      answer: 'ዕቃው የደረሰበት ቀን ጀምሮ በ48 ሰዓታት ውስጥ የፎቶ ማስረጃ በማያያዝ ለድጋፍ ቡድናችን ያሳውቁን። ጉዳዩን ወዲያውኑ መርምረን አዲስ ዕቃ እንተካለን ወይም ሙሉ ክፍያዎን እንመልሳለን።'
    },
    {
      id: 10,
      category: 'account',
      question: 'አዲስ መለያ (Account) እንዴት መክፈት እችላለሁ? (How do I create an account?)',
      answer: 'ከላይ ያለውን "ይመዝገቡ (Register)" የሚለውን በመጫን ሙሉ ስምዎን፣ ኢሜይልዎን እና የሚስጥር ቁጥር በማስገባት በደቂቃዎች ውስጥ መለያዎን መክፈት ይችላሉ።'
    },
    {
      id: 11,
      category: 'account',
      question: 'የሚስጥር ቃሌን (Password) ብረሳው ምን ማድረግ አለብኝ? (I forgot my password. What should I do?)',
      answer: 'በመግቢያው ገጽ ላይ "የሚስጥር ቃል ረሳሁ (Forgot Password)" የሚለውን ይጫኑ፤ ኢሜይልዎን ሲያስገቡ አዲስ የሚስጥር ቃል ማስተካከያ ማስፈንጠሪያ ይላክልዎታል።'
    },
    {
      id: 12,
      category: 'account',
      question: 'የግል መረጃዬን እንዴት ማሻሻል እችላለሁ? (How do I update my profile information?)',
      answer: 'ወደ መለያዎ ገብተው "ፕሮፋይል (Profile)" የሚለውን በመምረጥ ስምዎን፣ ስልክ ቁጥርዎን እና የመኖሪያ አድራሻዎን በማንኛውም ጊዜ ማስተካከል ይችላሉ።'
    },
    {
      id: 13,
      category: 'security',
      question: 'የሚስጥር ቃሌን እንዴት መቀየር እችላለሁ? (How do I change my password?)',
      answer: 'በመለያዎ ገጽ ላይ ወደ "ደህንነት (Security)" በመግባት የነበረውን የሚስጥር ቃል እና አዲሱን በማስገባት በቀላሉ መቀየር ይችላሉ። የሚስጥር ቃልዎ ቢያንስ 8 ፊደላት/ቁጥሮች መሆን አለበት።'
    },
    {
      id: 14,
      category: 'security',
      question: 'የግል መረጃዬ ደህንነት እንዴት ይጠበቃል? (Is my personal information safe?)',
      answer: 'የደንበኞቻችን መረጃ ሚስጥራዊነት በከፍተኛ ደረጃ የተጠበቀ ነው። መረጃዎን ያለእርስዎ ፈቃድ ለማንኛውም ሶስተኛ ወገን አሳልፈን አንሰጥም።'
    },
    {
      id: 15,
      category: 'security',
      question: 'መለያዬን በቋሚነት መሰረዝ እችላለሁ? (How do I delete my account?)',
      answer: 'አዎ፣ መለያዎ እንዲሰረዝ ከፈለጉ የድጋፍ ቡድናችንን በኢሜይል ወይም በቀጥታ መልዕክት ያነጋግሩ፤ ጥያቄዎ ተረጋግጦ መረጃዎ ይሰረዛል።'
    }
  ];

  const toggleQuestion = (id) => {
    setOpenQuestion(openQuestion === id ? null : id);
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-16">
      {/* Top Brand Stripe */}
      <div className="h-1.5 bg-gradient-to-r from-green-600 via-amber-400 to-red-600 w-full" />

      <div className="max-w-3xl mx-auto px-4 pt-4 sm:pt-6">
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
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                ተደጋግመው የሚጠየቁ ጥያቄዎች (FAQs)
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                ስለ ግብይት፣ ክፍያ፣ ማድረሻ እና መለያዎ ፈጣን ምላሾች
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar - Mobile Compact */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2.5 mb-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ጥያቄዎችን እዚህ ይፈልጉ (Search FAQs)..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-gray-50/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter - Mobile Horizontal Scrolling Pill Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              በዘርፍ ይምረጡ (Categories)
            </span>
            <span className="text-[11px] text-gray-400 font-medium">
              {filteredFaqs.length} ጥያቄዎች
            </span>
          </div>

          {/* Horizontal scroll container with smooth touch scrolling */}
          <div className="flex space-x-2 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:gap-2 sm:space-x-0">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              const count = category.id === 'all' 
                ? faqs.length 
                : faqs.filter(f => f.category === category.id).length;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-sm border border-amber-600'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-amber-400 hover:bg-amber-50/40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                  <span>{category.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-amber-700/60 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-2.5 mb-6">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = openQuestion === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => toggleQuestion(faq.id)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-gray-50/70 transition-colors"
                  >
                    <div className="pr-3 flex-1">
                      <span className="font-semibold text-gray-900 text-xs sm:text-sm block">
                        {faq.question}
                      </span>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isOpen ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-1 bg-amber-50/20 border-t border-gray-100 animate-fadeIn">
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-normal">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-gray-700">
                የተፈለገው ጥያቄ አልተገኘም
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                እባክዎ የተለየ ቃል በመጠቀም ይፈልጉ ወይም ሁሉንም ጥያቄዎች ይመልከቱ
              </p>
              <button
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                className="mt-3 px-3.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors"
              >
                ሁሉንም አሳይ
              </button>
            </div>
          )}
        </div>

        {/* Quick Assistance Help Channels - Mobile Friendly 3 Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-base">💬</span>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                ተጨማሪ እርዳታ ይፈልጋሉ? (Need More Help?)
              </h3>
              <p className="text-[11px] text-gray-500">
                የሚፈልጉትን መልስ ካላገኙ ከታች ካሉት አማራጮች አንዱን ይጠቀሙ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Zema AI */}
            <button
              onClick={() => navigate('/zema-ai')}
              className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 hover:bg-amber-100/50 text-left transition-colors flex items-center space-x-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-amber-900 truncate">ዜማ AI ረዳት</h4>
                <p className="text-[10px] text-amber-700 truncate">ፈጣን ምላሽ በ AI</p>
              </div>
            </button>

            {/* Direct Chat / Messages */}
            <button
              onClick={() => navigate('/messages')}
              className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 hover:bg-blue-100/50 text-left transition-colors flex items-center space-x-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-blue-900 truncate">የቀጥታ መልዕክት</h4>
                <p className="text-[10px] text-blue-700 truncate">ከባለሙያ/አስተዳዳሪ ጋር</p>
              </div>
            </button>

            {/* Contact Support */}
            <button
              onClick={() => navigate('/contact-support')}
              className="p-3 rounded-lg border border-green-200 bg-green-50/40 hover:bg-green-100/50 text-left transition-colors flex items-center space-x-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-green-900 truncate">የደንበኞች ድጋፍ</h4>
                <p className="text-[10px] text-green-700 truncate">በስልክ እና ኢሜይል</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
