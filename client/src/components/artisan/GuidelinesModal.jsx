// GuidelinesModal — EthioCraft Global Official Artisan Guidelines

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Download, CheckCircle, AlertCircle, ChevronDown, XCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Amharic PDF via html2canvas ───────────────────────────────────────────────
const downloadGuidelinesPDF = async () => {
  // Build a hidden off-screen div with all Amharic content
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 794px;
    padding: 40px 50px;
    background: #ffffff;
    font-family: 'Segoe UI', 'Noto Sans Ethiopic', Arial, sans-serif;
    font-size: 13px;
    color: #1a1a1a;
    line-height: 1.7;
    box-sizing: border-box;
  `;

  container.innerHTML = `
    <!-- Cover banner -->
    <div style="background:#f5e6b4;padding:28px 30px 22px;border-radius:10px;margin-bottom:32px;">
      <div style="font-size:22px;font-weight:900;color:#501e05;margin-bottom:6px;">EthioCraft Global</div>
      <div style="font-size:14px;color:#7a4a10;margin-bottom:4px;">የአርቲሳን ኦፊሴላዊ መመሪያ — Official Artisan Guidelines</div>
      <div style="font-size:11px;color:#9a6a30;">ቀን፡ ${new Date().toLocaleDateString('am-ET')}</div>
    </div>

    <!-- Intro -->
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:20px 24px;margin-bottom:28px;text-align:center;">
      <div style="font-size:15px;font-weight:800;color:#92400e;margin-bottom:8px;">ለኢትዮ-ክራፍት ግሎባል አርቲሳኖች የተዘጋጀ ኦፊሴላዊ መመሪያ</div>
      <div style="font-size:12px;color:#78350f;">
        የኢትዮ-ክራፍት ግሎባል ቤተሰብ ስለሆኑ እናመሰግናለን! ይህ መድረክ የኢትዮጵያን ጥበብ ለአለም ለማስተዋወቅ
        የተመሰረተ ነው። ስራዎን ከመጀመርዎ በፊት የሚከተሉትን ህጎች በጥንቃቄ ያንብቡ።
      </div>
    </div>

    <!-- Section helper template (repeated below) -->

    <!-- 1 -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;border-bottom:2px solid #fbbf24;padding-bottom:6px;">
        <span style="background:#d97706;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0;">1</span>
        <span style="font-weight:800;font-size:13px;color:#1f2937;">የምዝገባ እና የማረጋገጫ ሂደት — Registration &amp; Verification</span>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:14px 18px;">
        <p style="margin:0 0 8px;"><strong>ግዴታ፡</strong> እያንዳንዱ አርቲሳን ህጋዊ መታወቂያ፣ <span style="color:#b45309;font-weight:700;">የንግድ ፈቃድ</span> እና የቲን (TIN) ሰርተፍኬት ማቅረብ ይኖርበታል።</p>
        <p style="margin:0 0 8px;"><strong>ሂደት፡</strong> ሰነዶችዎ በአስተዳዳሪው ተመርምረው እስኪጸድቁ ድረስ <span style="color:#d97706;font-weight:700;">"በጥበቃ ላይ" (Under Review)</span> ደረጃ ይሰጥዎታል (24–48 ሰዓታት)።</p>
        <p style="margin:0;color:#dc2626;font-weight:700;">⚠ ክልክል፡ እድሜው ከ18 ዓመት በታች የሆነ ሰው መመዝገብ አይችልም።</p>
      </div>
    </div>

    <!-- 2 -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;border-bottom:2px solid #fbbf24;padding-bottom:6px;">
        <span style="background:#d97706;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0;">2</span>
        <span style="font-weight:800;font-size:13px;color:#1f2937;">የምርት ጥራት እና አቀራረብ — Product Standards</span>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:14px 18px;">
        <p style="margin:0 0 8px;"><strong>ኦሪጅናልነት፡</strong> ምርቶች በኢትዮጵያ ውስጥ <strong>በእጅ የተሰሩ (Handcrafted)</strong> መሆን አለባቸው። ፋብሪካ-ሰራሽ ወይም የጥንት ቅርሶችን መሸጥ <span style="color:#dc2626;font-weight:700;">በጥብቅ የተከለከለ ነው።</span></p>
        <p style="margin:0;"><strong>ፎቶግራፍ፡</strong> የምርቶቹ ምስሎች ትክክለኛ መሆን አለባቸው። በሰው ሰራሽ አስተውሎት (AI) የተሰሩ ምስሎችን መጠቀም <span style="color:#dc2626;font-weight:700;">አይፈቀድም።</span></p>
      </div>
    </div>

    <!-- 3 -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;border-bottom:2px solid #fbbf24;padding-bottom:6px;">
        <span style="background:#d97706;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0;">3</span>
        <span style="font-weight:800;font-size:13px;color:#1f2937;">የደረጃ አሰጣጥ እና የቅድሚያ ታይነት — Ranking &amp; Visibility</span>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:14px 18px;">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;margin-bottom:8px;">
          <span style="font-weight:800;color:#166534;">✅ ንቁ አርቲሳን (Active):</span>
          <span style="color:#15803d;"> ትዕዛዝን በሰዓቱ የሚያደርስ — ምርቶቹ በፍለጋ ውጤቶች <strong>መጀመሪያ</strong> ላይ ይታያሉ።</span>
        </div>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;margin-bottom:8px;">
          <span style="font-weight:800;color:#92400e;">⚠️ ደካማ አርቲሳን (Inactive):</span>
          <span style="color:#b45309;"> ትዕዛዝ የሚያዘገይ — ምርቶቹ በፍለጋ ውጤቶች <strong>መጨረሻ</strong> ላይ ይታያሉ።</span>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;">
          <span style="font-weight:800;color:#991b1b;">❌ የታገደ አርቲሳን (Blocked):</span>
          <span style="color:#b91c1c;"> ህግ የጣሰ — ምርቶቹ ለደንበኛ <strong>አይታዩም።</strong></span>
        </div>
      </div>
    </div>

    <!-- 4 -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;border-bottom:2px solid #fbbf24;padding-bottom:6px;">
        <span style="background:#d97706;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0;">4</span>
        <span style="font-weight:800;font-size:13px;color:#1f2937;">የትዕዛዝ አፈጻጸም እና አቅርቦት — Delivery Rules</span>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:14px 18px;">
        <p style="margin:0 0 8px;">ትዕዛዝ በደረሰ በ<strong>5 የስራ ቀናት</strong> ውስጥ መላክ እና የመከታተያ ቁጥር (Tracking Number) ማያያዝ ግዴታ ነው።</p>
        <p style="margin:0;color:#dc2626;font-weight:700;">⚠ ከመድረኩ ውጪ ክፍያ መጠየቅ ወይም ግብይት መፈጸም ከባድ ቅጣት ያስከትላል — ሂሳቡ ይታገዳል።</p>
      </div>
    </div>

    <!-- 5 -->
    <div style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;border-bottom:2px solid #fbbf24;padding-bottom:6px;">
        <span style="background:#d97706;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0;">5</span>
        <span style="font-weight:800;font-size:13px;color:#1f2937;">የኮሚሽን ፖሊሲ — Commission Policy</span>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:14px 18px;">
        <p style="margin:0;">ኢትዮ-ክራፍት ግሎባል ከእያንዳንዱ ስኬታማ ሽያጭ ላይ <strong>5% ኮሚሽን</strong> ያስቀርባል። ክፍያዎች ወደ ተመዝጋቢ ባንክ ሂሳብ ወይም ቴሌብር ዋሌት <strong>በሳምንት</strong> ይላካሉ።</p>
      </div>
    </div>

    <!-- 6 -->
    <div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;border-bottom:2px solid #fbbf24;padding-bottom:6px;">
        <span style="background:#d97706;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0;">6</span>
        <span style="font-weight:800;font-size:13px;color:#1f2937;">የባንክ ሂሳብ መስፈርቶች — Bank Account Requirements</span>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:14px 18px;">
        <p style="margin:0 0 8px;">• የባንክ ሂሳብ ቁጥር፡ <strong>ከ13 እስከ 16 አሃዞች</strong> (CBE፣ አዋሽ፣ ዳሽን፣ አቢሲኒያ ወዘተ)።</p>
        <p style="margin:0;">• ቴሌብር / ሞባይል ሚኒ፡ ቁጥሩ <strong>09 ወይም 07</strong> ብሎ መጀመር አለበት፣ ትክክለኛ <strong>10 አሃዞች</strong>።</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-weight:800;color:#166534;font-size:12px;">
        እነዚህን መመሪያዎች በመቀበልዎ፣ ሁሉንም ፖሊሲዎች አንብበው፣ ተረድተው እና ለማክበር ተስማምተዋል ማለት ነው።
      </p>
    </div>
    <div style="text-align:center;color:#9ca3af;font-size:10px;">
      EthioCraft Global Trust &amp; Safety Protocol • በእጅ ጥበብ የተሰራ
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableW = pageW - margin * 2;
    const imgW = canvas.width;
    const imgH = canvas.height;
    const ratio = usableW / (imgW / 2); // divide by scale
    const scaledH = (imgH / 2) * ratio;

    let yPos = margin;
    let remaining = scaledH;

    while (remaining > 0) {
      const sliceH = Math.min(remaining, pageH - margin * 2);
      const srcY = (scaledH - remaining) / ratio * 2;
      const srcH = sliceH / ratio * 2;

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = imgW;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);

      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, yPos, usableW, sliceH);
      remaining -= sliceH;
      if (remaining > 0) {
        pdf.addPage();
        yPos = margin;
      }
    }

    pdf.save('EthioCraft_Global_Artisan_Guidelines.pdf');
  } finally {
    document.body.removeChild(container);
  }
};

// ── Modal Component ──────────────────────────────────────────────────────────
const GuidelinesModal = ({ onAccepted, onClose }) => {
  const navigate = useNavigate();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) setHasScrolled(true);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadGuidelinesPDF();
    } catch {
      toast.error('PDF ማውረድ አልተሳካም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setDownloading(false);
    }
  };

  const handleAccept = async () => {
    if (!hasScrolled) { toast.error('እባክዎ ወደ ታች ሸብልለው ሙሉ መመሪያውን ያንብቡ።'); return; }
    setAccepting(true);
    try {
      await api.patch('/users/accept-guidelines');
      toast.success('መመሪያዎቹ ተቀብለዋል። ወደ ኢትዮ-ክራፍት ግሎባል እንኳን ደህና መጡ!');
      if (onAccepted) onAccepted();
      navigate('/artisan/verification');
    } catch {
      toast.error('ምዝገባ አልተሳካም። እባክዎ እንደገና ይሞክሩ።');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 backdrop-blur-sm px-4 pt-[70px] pb-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden relative" style={{ maxHeight: 'calc(100vh - 82px)' }}>
        
        {/* Close button at the top right */}
        <button 
          onClick={onClose || onAccepted}
          className="absolute top-4 right-5 z-[210] p-2 bg-white/90 backdrop-blur-md rounded-full shadow-xl hover:bg-red-50 transition-all text-gray-400 hover:text-red-500 border border-gray-100"
          title="Dismiss"
        >
          <XCircle className="w-6 h-6" />
        </button>

        {/* ── Header ── */}
        <div className="shrink-0 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-6 py-4">
          {/* Row 1: icon + title */}
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
              <ShieldCheck className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-gray-900 leading-snug">
                ኢትዮ-ክራፍት ግሎባል &mdash; የአርቲሳን ኦፊሴላዊ መመሪያ
              </h2>
              <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                ከመቀጠልዎ በፊት ሙሉ ሰነዱን ያንብቡ &bull; Please read the full document before proceeding
              </p>
            </div>
          </div>
          {/* Row 2: download button full-width */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-700 transition-all shadow-md disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'በማውረድ ላይ...' : 'PDF አውርድ — Download PDF (አማርኛ)'}
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Welcome banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-sm font-black text-amber-900 leading-relaxed">
              ለኢትዮ-ክራፍት ግሎባል አርቲሳኖች የተዘጋጀ ኦፊሴላዊ መመሪያ
            </p>
            <p className="text-xs text-amber-800 mt-2 leading-relaxed">
              የኢትዮ-ክራፍት ግሎባል ቤተሰብ ስለሆኑ እናመሰግናለን! ይህ መድረክ የኢትዮጵያን ጥበብ ለአለም
              ለማስተዋወቅ የተመሰረተ ነው። ስራዎን ከመጀመርዎ በፊት የሚከተሉትን ህጎች በጥንቃቄ ያንብቡ።
            </p>
          </div>

          {/* Section 1 */}
          <section>
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">1</span>
              የምዝገባ እና የማረጋገጫ ሂደት — Registration &amp; Verification
            </h3>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-xs text-gray-700 leading-relaxed">
              <p><span className="font-black text-gray-900">ግዴታ፡</span> እያንዳንዱ አርቲሳን ህጋዊ መታወቂያ፣ <span className="font-bold text-amber-700">የንግድ ፈቃድ</span> እና የቲን (TIN) ሰርተፍኬት ማቅረብ ይኖርበታል።</p>
              <p><span className="font-black text-gray-900">ሂደት፡</span> ሰነዶችዎ በአስተዳዳሪው ተመርምረው እስኪጸድቁ ድረስ <span className="font-bold text-amber-600">"በጥበቃ ላይ" (Under Review)</span> የሚል ደረጃ ይሰጥዎታል (24–48 ሰዓታት)።</p>
              <p className="flex items-start gap-2 text-red-600 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ክልክል፡ እድሜው ከ18 ዓመት በታች የሆነ ሰው መመዝገብ አይችልም።
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">2</span>
              የምርት ጥራት እና አቀራረብ — Product Standards
            </h3>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-xs text-gray-700 leading-relaxed">
              <p><span className="font-black text-gray-900">ኦሪጅናልነት፡</span> ምርቶች በኢትዮጵያ ውስጥ <strong>በእጅ የተሰሩ (Handcrafted)</strong> መሆን አለባቸው። ፋብሪካ-ሰራሽ ወይም የጥንት ቅርሶችን መሸጥ <span className="font-bold text-red-600">በጥብቅ የተከለከለ ነው።</span></p>
              <p><span className="font-black text-gray-900">ፎቶግራፍ፡</span> የምርቶቹ ምስሎች ትክክለኛ መሆን አለባቸው። AI ምስሎችን መጠቀም <span className="font-bold text-red-600">አይፈቀድም።</span></p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">3</span>
              የደረጃ አሰጣጥ እና የቅድሚያ ታይነት — Ranking &amp; Visibility
            </h3>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-xs leading-relaxed">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                <span className="text-base shrink-0">✅</span>
                <div>
                  <p className="font-black text-green-800">ንቁ አርቲሳን (Active)</p>
                  <p className="text-green-700 mt-1">ትዕዛዝን በሰዓቱ የሚያደርስ — ምርቶቹ በፍለጋ ውጤቶች <strong>መጀመሪያ</strong> ላይ ይታያሉ።</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-base shrink-0">⚠️</span>
                <div>
                  <p className="font-black text-amber-800">ደካማ አርቲሳን (Inactive)</p>
                  <p className="text-amber-700 mt-1">ትዕዛዝ የሚያዘገይ — ምርቶቹ በፍለጋ ውጤቶች <strong>መጨረሻ</strong> ላይ ይታያሉ።</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <span className="text-base shrink-0">❌</span>
                <div>
                  <p className="font-black text-red-800">የታገደ አርቲሳን (Blocked)</p>
                  <p className="text-red-700 mt-1">ህግ የጣሰ — ምርቶቹ ለደንበኛ <strong>አይታዩም።</strong></p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">4</span>
              የትዕዛዝ አፈጻጸም እና አቅርቦት — Delivery Rules
            </h3>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-xs text-gray-700 leading-relaxed">
              <p>ትዕዛዝ በደረሰ በ<span className="font-black text-gray-900">5 የስራ ቀናት</span> ውስጥ መላክ እና የመከታተያ ቁጥር (Tracking Number) ማያያዝ ግዴታ ነው።</p>
              <p className="flex items-start gap-2 text-red-600 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ከመድረኩ ውጪ ክፍያ መጠየቅ ወይም ግብይት መፈጸም ከባድ ቅጣት ያስከትላል — ሂሳቡ ይታገዳል።
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">5</span>
              የኮሚሽን ፖሊሲ — Commission Policy
            </h3>
            <div className="bg-gray-50 rounded-2xl p-5 text-xs text-gray-700 leading-relaxed">
              <p>ኢትዮ-ክራፍት ግሎባል ከእያንዳንዱ ስኬታማ ሽያጭ ላይ <span className="font-black text-gray-900">5% ኮሚሽን</span> ያስቀርባል። ክፍያዎች ወደ ተመዝጋቢ ባንክ ሂሳብ ወይም ቴሌብር ዋሌት <span className="font-black">በሳምንት</span> ይላካሉ።</p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">6</span>
              የባንክ ሂሳብ መስፈርቶች — Bank Account Requirements
            </h3>
            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-xs text-gray-700 leading-relaxed">
              <p>• የባንክ ሂሳብ ቁጥር፡ <span className="font-black text-gray-900">ከ13 እስከ 16 አሃዞች</span> (CBE፣ አዋሽ፣ ዳሽን፣ አቢሲኒያ ወዘተ)።</p>
              <p>• ቴሌብር / ሞባይል ሚኒ፡ ቁጥሩ <span className="font-black text-gray-900">09 ወይም 07</span> ብሎ መጀመር አለበት፣ ትክክለኛ <span className="font-black text-gray-900">10 አሃዞች</span>።</p>
            </div>
          </section>

          {/* Scroll prompt */}
          {!hasScrolled && (
            <div className="flex flex-col items-center gap-2 py-3 text-gray-400 animate-bounce">
              <ChevronDown className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">ወደ ታች ሸብልለው ያንብቡ • Scroll to enable acceptance</span>
            </div>
          )}
        </div>

        {/* ── Footer / Accept ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 shrink-0">
          {!hasScrolled && (
            <p className="text-[10px] text-amber-600 font-bold text-center mb-3 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              ወደ ታች ሸብልለው ሙሉ መመሪያውን ካነበቡ በኋላ ቁልፉ ይነቃል።
            </p>
          )}
          <button
            onClick={handleAccept}
            disabled={!hasScrolled || accepting}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.1em] text-sm transition-all flex items-center justify-center gap-3 ${
              hasScrolled
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white hover:-translate-y-0.5 shadow-xl active:scale-[0.98] border border-amber-400'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {accepting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                በማስቀመጥ ላይ...
              </span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                ውሎቹን እና መመሪያዎቹን ተቀብያለሁ — I Accept the Terms &amp; Guidelines
              </>
            )}
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">
            EthioCraft Global Trust &amp; Safety Protocol • በእጅ ጥበብ የተሰራ
          </p>
        </div>

      </div>
    </div>
  );
};

export default GuidelinesModal;
