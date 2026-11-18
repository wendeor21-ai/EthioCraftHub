/**
 * Moderate Products Page for EthioCraft Global Admin
 *
 * Table-based UI allowing admins to review, approve, edit, flag and cleanup products.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const ModerateProducts = ({ insideDashboard, onSelectTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [checklist, setChecklist] = useState({ imageQuality: false, correctCategory: false, validPrice: false, clearDescription: false });

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);

      const response = await fetch(`${API_BASE_URL}/api/admin/products?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setError('');
      } else {
        console.warn('Failed to fetch products from admin API');
        setProducts([]);
        setError('Failed to load products');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (p.name?.toLowerCase().includes(s) || p.category?.toLowerCase().includes(s) || p.artisan?.profile?.firstName?.toLowerCase().includes(s) || p.artisan?.profile?.lastName?.toLowerCase().includes(s));
    }
    return true;
  });

  const approveProduct = (productId) => {
    (async () => {
      try {
        await adminAPI.moderateProduct(productId, { action: 'approve', reason: `Approved by ${user?.email || 'admin'}. Checklist: ${JSON.stringify(checklist)}` });
        setProducts(prev => prev.map(p => p._id === productId ? { ...p, status: 'active', isFlagged: false } : p));
        toast.success('Product approved');
      } catch (err) {
        console.error('Approve failed', err);
        toast.error('Approve failed');
      }
    })();
  };

  const rejectProduct = (productId) => {
    (async () => {
      try {
        const reason = prompt('Reason for rejection (min 5 chars):');
        if (!reason || reason.length < 5) return toast.error('Provide a valid reason');
        await adminAPI.moderateProduct(productId, { action: 'reject', reason });
        setProducts(prev => prev.map(p => p._id === productId ? { ...p, status: 'inactive', isFlagged: true, flagReason: reason } : p));
        toast.success('Product rejected');
      } catch (err) {
        console.error('Reject failed', err);
        toast.error('Reject failed');
      }
    })();
  };

  const deleteProduct = (productId) => {
    if (!window.confirm('Are you sure you want to remove this product?')) return;
    (async () => {
      try {
        await adminAPI.moderateProduct(productId, { action: 'reject', reason: 'Removed by admin' });
        setProducts(prev => prev.filter(p => p._id !== productId));
        toast.success('Product removed');
      } catch (err) {
        console.error('Remove failed', err);
        toast.error('Remove failed');
      }
    })();
  };

  const flagProduct = (productId) => {
    (async () => {
      try {
        const reason = prompt('Reason for flagging this product (min 5 chars):');
        if (!reason || reason.length < 5) return toast.error('Provide valid reason');
        await adminAPI.moderateProduct(productId, { action: 'flag', reason });
        setProducts(prev => prev.map(p => p._id === productId ? { ...p, isFlagged: true, flagReason: reason } : p));
        toast.success('Product flagged');
      } catch (err) {
        console.error('Flag failed', err);
        toast.error('Flag failed');
      }
    })();
  };

  const openEdit = (product) => {
    setEditingProduct({ ...product });
    setChecklist({ imageQuality: false, correctCategory: false, validPrice: false, clearDescription: false });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editingProduct) return;
    try {
      const updates = { name: editingProduct.name, description: editingProduct.description, price: editingProduct.price, category: editingProduct.category };
      const reason = `Checklist: ${Object.entries(checklist).map(([k,v])=>`${k}:${v}`).join(',')}`;
      await adminAPI.moderateProduct(editingProduct._id, { action: 'edit', updates, reason });
      setProducts(prev => prev.map(p => p._id === editingProduct._id ? { ...p, ...updates } : p));
      setEditOpen(false);
      toast.success('Product updated');
    } catch (err) {
      console.error('Edit failed', err);
      toast.error('Edit failed');
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  const getStatusColor = (status) => ({ active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', flagged: 'bg-orange-100 text-orange-800', suspended: 'bg-red-100 text-red-800' }[status] || 'bg-gray-100 text-gray-800');

  if (loading) return (<div className={insideDashboard ? "py-12 flex items-center justify-center" : "min-h-screen flex items-center justify-center"}><LoadingSpinner size="large" /></div>);

  return (
    <div className={insideDashboard ? "bg-transparent py-2 w-full" : "min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8"}>
      <div className={insideDashboard ? "w-full" : "container mx-auto px-4 max-w-7xl"}>
        <div className="mb-6">
          {!insideDashboard && (
            <button onClick={() => navigate('/admin/dashboard')} className="text-amber-600 hover:text-amber-700 mb-3 flex items-center text-xs font-semibold">← Back to Dashboard</button>
          )}
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Moderate Products</h1>
          <p className="text-xs text-gray-500 mt-1">Review and manage product listings</p>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}

        {success && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">{success}</div>}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3.5 sm:p-5 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {['all','pending','flagged','active','inactive'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === s
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-2xs border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">Image</th>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Artisan</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Price</th>
                  <th className="px-3 py-2 text-left">Uploaded</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredProducts.map(p => (
                  <tr key={p._id} className={p.isFlagged? 'bg-orange-50/50' : 'hover:bg-amber-50/30 transition-colors'}>
                    <td className="px-3 py-1.5 whitespace-nowrap"><img src={p.images?.[0]?.url || '/images/placeholder.svg'} alt={p.name} className="w-9 h-8 object-cover rounded-md border border-gray-100" /></td>
                    <td className="px-3 py-1.5 whitespace-nowrap"><div className="font-semibold text-gray-900 text-xs leading-tight">{p.name}</div><div className="text-[10px] text-gray-500 truncate max-w-xs">{p.description}</div></td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-600">{p.artisan?.profile?.firstName} {p.artisan?.profile?.lastName}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-[11px] text-gray-600">{p.category}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-xs font-bold text-amber-700">{formatCurrency(p.price)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-[10.5px] text-gray-500">{formatDate(p.createdAt)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-xs font-medium space-x-1.5 text-right">
                      {p.status === 'pending' && (<button onClick={() => approveProduct(p._id)} className="text-green-600 hover:text-green-800 text-[11px] font-semibold">Approve</button>)}
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold">Edit</button>
                      <button onClick={() => flagProduct(p._id)} className="text-orange-600 hover:text-orange-800 text-[11px] font-semibold">Flag</button>
                      <button onClick={() => rejectProduct(p._id)} className="text-red-600 hover:text-red-800 text-[11px] font-semibold">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12"><p className="text-gray-500 text-xs">No products found matching your criteria</p></div>
          )}
        </div>

        {/* Edit Modal */}
        {editOpen && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-[95%] sm:w-11/12 md:w-3/4 lg:w-1/2 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Product</h2>
                <button onClick={() => setEditOpen(false)} className="text-gray-500 hover:text-gray-800">Close</button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input value={editingProduct.name} onChange={e=>setEditingProduct(prev=>({...prev, name: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />

                <label className="block text-sm font-medium text-gray-700 mt-4">Description</label>
                <textarea value={editingProduct.description} onChange={e=>setEditingProduct(prev=>({...prev, description: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" rows={4} />

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <input type="number" value={editingProduct.price} onChange={e=>setEditingProduct(prev=>({...prev, price: Number(e.target.value)}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input value={editingProduct.category} onChange={e=>setEditingProduct(prev=>({...prev, category: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-medium">Quality Compliance Checklist</h3>
                  <div className="mt-2 space-y-2">
                    {Object.keys(checklist).map(key => (
                      <label key={key} className="flex items-center space-x-2">
                        <input type="checkbox" checked={checklist[key]} onChange={e=>setChecklist(prev=>({...prev, [key]: e.target.checked}))} />
                        <span className="text-sm text-gray-700">{key === 'imageQuality' ? 'Image quality OK' : key === 'correctCategory' ? 'Correct category' : key === 'validPrice' ? 'Valid price' : 'Clear description'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex space-x-2">
                  <button onClick={submitEdit} className="px-4 py-2 bg-ethiopian-gold text-white rounded-md">Save</button>
                  <button onClick={() => { setEditingProduct(null); setEditOpen(false); }} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                  <button onClick={() => { if (editingProduct) { adminAPI.moderateProduct(editingProduct._id, { action: 'cleanup', removeImages: true }); toast('Cleanup requested'); setEditOpen(false); } }} className="ml-auto px-4 py-2 bg-red-600 text-white rounded-md">Cleanup & Remove Images</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ModerateProducts;
