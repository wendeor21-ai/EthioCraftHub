/**
 * Verify Artisans Page for EthioCraft Global Admin
 * 
 * Allows admins to review and approve/reject artisan verification requests
 */

import { useState, useEffect } from 'react';
import { getFileUrl } from '../../utils/getFileUrl';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Briefcase, 
  ImageIcon, 
  Video, 
  CreditCard, 
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Info,
  ChevronRight,
  Eye
} from 'lucide-react';



const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString();
};

// ── ReviewModal defined OUTSIDE parent so React never remounts it on re-render
const ReviewModal = ({ selectedRequest, feedback, setFeedback, onApprove, onReject, onClose }) => {
  if (!selectedRequest) return null;
  const v = selectedRequest.verification || {};
  const p = selectedRequest.profile || {};
  const b = p.businessInfo || {};
  const pay = selectedRequest.bankDetails || {};

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-amber-600 font-bold text-lg sm:text-xl">
              {p.firstName?.charAt(0)}
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-gray-900 leading-tight">{p.firstName} {p.lastName}</h2>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium">Verification Review • Submitted {formatDate(v.submittedAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full text-gray-400 font-bold text-base sm:text-lg leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Left Column: Personal & Identity */}
            <div className="space-y-4 sm:space-y-8">
              <section>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Personal & Identity
                </h3>
                <div className="bg-gray-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Email</span><span className="text-xs font-bold">{selectedRequest.email}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Phone</span><span className="text-xs font-bold">{p.phone || '—'}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Address</span><span className="text-xs font-bold text-right">{p.address?.street || '—'}</span></div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold mb-3">Identity Card / Passport</p>
                    {v.identityCard ? (
                      <a href={getFileUrl(v.identityCard)} target="_blank" rel="noreferrer" className="block relative group aspect-video rounded-2xl overflow-hidden border border-gray-200">
                        <img src={getFileUrl(v.identityCard)} className="w-full h-full object-cover" alt="ID" onError={(e) => { e.target.style.display='none'; }} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                          Click to Expand <ExternalLink className="w-3 h-3 ml-1" />
                        </div>
                      </a>
                    ) : (
                      <div className="p-4 bg-red-50 text-red-500 text-[10px] rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> No ID uploaded
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Proof of Work
                </h3>
                <div className="space-y-4">
                  <p className="text-xs font-bold">Product Photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(v.productPhotos || []).map((img, i) => (
                      <a key={i} href={getFileUrl(img)} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        <img src={getFileUrl(img)} className="w-full h-full object-cover" alt={`p-${i}`} />
                      </a>
                    ))}
                    {(!v.productPhotos || v.productPhotos.length === 0) && (
                      <div className="col-span-3 py-4 text-center text-gray-400 text-xs italic">No product photos submitted</div>
                    )}
                  </div>

                  <p className="text-xs font-bold mt-6">Work Process Videos</p>
                  <div className="space-y-2">
                    {(v.workVideos || []).map((vid, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-xl">
                        <div className="flex items-center gap-2 uppercase font-black text-[10px]"><Video className="w-4 h-4" /> Video {i + 1}</div>
                        <a href={getFileUrl(vid)} target="_blank" rel="noreferrer" className="text-[10px] font-bold underline">Watch Video</a>
                      </div>
                    ))}
                    {(!v.workVideos || v.workVideos.length === 0) && (
                      <div className="py-4 text-center text-gray-400 text-xs italic">No videos submitted</div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Business & Payment */}
            <div className="space-y-8">
              <section>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Business & Tax
                </h3>
                <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Business Name</span><span className="text-xs font-bold">{b.businessName || '—'}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">TIN Number</span><span className="text-xs font-bold text-amber-600">{b.tinNumber || '—'}</span></div>
                  <div className="mt-4 flex gap-2">
                    <div className="flex-1 p-3 bg-white border border-gray-100 rounded-2xl flex items-center gap-2">
                      <FileText className="w-4 h-4 text-ethiopian-gold" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold">Trade License</p>
                        {v.tradeLicense
                          ? <a href={getFileUrl(v.tradeLicense)} className="text-[10px] text-blue-500 underline" target="_blank" rel="noreferrer">Open File</a>
                          : <span className="text-[10px] text-red-500">Missing</span>}
                      </div>
                    </div>
                    <div className="flex-1 p-3 bg-white border border-gray-100 rounded-2xl flex items-center gap-2">
                      <FileText className="w-4 h-4 text-ethiopian-gold" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold">TIN Certificate</p>
                        {v.tinCertificate
                          ? <a href={getFileUrl(v.tinCertificate)} className="text-[10px] text-blue-500 underline" target="_blank" rel="noreferrer">Open File</a>
                          : <span className="text-[10px] text-red-500">Missing</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Payout & Payments
                </h3>
                <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Bank Name</span><span className="text-xs font-bold">{pay.bankName || '—'}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Account Number</span><span className="text-xs font-bold font-mono">{pay.accountNumber || '—'}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Telebirr Number</span><span className="text-xs font-bold">{pay.telebirrNumber || '—'}</span></div>
                </div>
              </section>

              <section className="bg-amber-50 rounded-3xl p-6 border border-amber-100/50">
                <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-4">Decision & Feedback</h3>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write a message to the artisan (e.g. why rejected, or a welcome note)"
                  className="w-full h-24 p-4 text-xs bg-white border border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-200/50 outline-none transition-all"
                />
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => onApprove(selectedRequest._id)}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => onReject(selectedRequest._id)}
                    className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VerifyArtisans = ({ insideDashboard, onSelectTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const fetchCounts = async () => {
    try {
      const res = await adminAPI.getDashboard();
      const stats = res.data.verifications || [];
      const c = { pending: 0, under_review: 0, approved: 0, rejected: 0, total: 0 };
      stats.forEach(s => {
        if (s._id === 'pending') c.pending = s.count;
        if (s._id === 'under_review') c.under_review = s.count;
        if (s._id === 'approved') c.approved = s.count;
        if (s._id === 'rejected') c.rejected = s.count;
      });
      c.total = c.pending + c.approved + c.rejected;
      setCounts(c);
    } catch (err) {
      // silently ignore
    }
  };

  const fetchRequests = async (currentFilter = filter) => {
    setLoading(true);
    setError('');
    try {
      const params = currentFilter && currentFilter !== 'all' ? { status: currentFilter } : {};
      const res = await adminAPI.getVerificationRequests(params);
      setVerificationRequests(res.data.verifications || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(filter);
    fetchCounts();
  }, [filter]);

  const handleApprove = async (requestId) => {
    try {
      await adminAPI.verifyArtisan(requestId, 'approved', feedback || 'Your verification has been approved. Welcome to EthioCraft Global!');
      toast.success('Artisan approved!');
      await fetchRequests(filter);
      await fetchCounts();
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      setFeedback('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (requestId) => {
    if (!feedback.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      await adminAPI.verifyArtisan(requestId, 'rejected', feedback);
      toast.success('Artisan rejected');
      await fetchRequests(filter);
      await fetchCounts();
      setIsReviewModalOpen(false);
      setSelectedRequest(null);
      setFeedback('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  };

  const filteredRequests = verificationRequests.filter(req => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (req.email || '').toLowerCase().includes(s) ||
      (req.profile?.firstName || '').toLowerCase().includes(s) ||
      (req.profile?.lastName || '').toLowerCase().includes(s) ||
      (req.profile?.businessInfo?.businessName || '').toLowerCase().includes(s)
    );
  });

  if (loading) return <div className={insideDashboard ? "py-12 flex items-center justify-center" : "min-h-screen flex items-center justify-center"}><LoadingSpinner size="large" /></div>;

  return (
    <div className={insideDashboard ? "bg-transparent py-2 w-full" : "min-h-screen bg-transparent py-8"}>
      <div className={insideDashboard ? "w-full" : "container mx-auto px-4 max-w-7xl"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Artisan Verifications</h1>
            <p className="text-xs text-gray-500 mt-0.5">Review and approve artisan accounts.</p>
          </div>
          
          <div className="flex items-center flex-wrap gap-1.5">
            {['pending', 'approved', 'rejected', 'all'].map(t => (
              <button 
                key={t} 
                onClick={() => setFilter(t)} 
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${filter === t ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-3.5 py-2 text-left">Artisan</th>
                  <th className="px-3.5 py-2 text-left">Business</th>
                  <th className="px-3.5 py-2 text-left">Docs</th>
                  <th className="px-3.5 py-2 text-left">Date</th>
                  <th className="px-3.5 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((r) => (
                  <tr key={r._id} className="group hover:bg-amber-50/30 transition-colors">
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 font-bold text-xs shrink-0">
                          {r.profile?.firstName?.charAt(0) || 'A'}
                        </div>
                        <div className="min-w-0">
                           <p className="text-xs font-bold text-gray-900 leading-tight">{r.profile?.firstName} {r.profile?.lastName}</p>
                           <p className="text-[10px] text-gray-500 truncate max-w-[140px]">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <p className="text-xs font-semibold text-gray-900 leading-tight">{r.profile?.businessInfo?.businessName || 'Freelance'}</p>
                      <p className="text-[10px] text-amber-700 font-medium">TIN: {r.profile?.businessInfo?.tinNumber || '—'}</p>
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                       <div className="flex gap-1 items-center">
                          {r.verification?.identityCard && <ShieldCheck className="w-3.5 h-3.5 text-green-600" />}
                          {r.verification?.productPhotos?.length > 0 && <ImageIcon className="w-3.5 h-3.5 text-blue-600" />}
                          {r.verification?.workVideos?.length > 0 && <Video className="w-3.5 h-3.5 text-purple-600" />}
                       </div>
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <p className="text-[10.5px] text-gray-500">{formatDate(r.verification?.submittedAt)}</p>
                    </td>
                    <td className="px-3.5 py-2 text-right">
                       <button
                         onClick={() => { setSelectedRequest(r); setIsReviewModalOpen(true); }}
                         className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-md text-[10.5px] font-semibold hover:bg-amber-100 transition-all border border-amber-200"
                       >
                         Review <Eye className="w-3.5 h-3.5" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRequests.length === 0 && (
              <div className="py-20 text-center">
                 <div className="inline-flex p-6 bg-gray-50 rounded-full mb-4"><Info className="w-12 h-12 text-gray-300" /></div>
                 <h3 className="text-xl font-bold text-gray-900">No requests found</h3>
                 <p className="text-sm text-gray-500 mt-2">All caught up! Check back later for new artisans.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {isReviewModalOpen && (
        <ReviewModal
          selectedRequest={selectedRequest}
          feedback={feedback}
          setFeedback={setFeedback}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => { setIsReviewModalOpen(false); setSelectedRequest(null); setFeedback(''); }}
        />
      )}
    </div>
  );
};

export default VerifyArtisans;
