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

const ModerateProducts = () => {
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
        setProducts(getMockProducts());
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
      setProducts(getMockProducts());
    } finally {
      setLoading(false);
    }
  };

  const getMockProducts = () => [
    {
      _id: 'prod001',
      name: 'Traditional Coffee Set',
      description: 'Handcrafted ceramic coffee set with traditional Ethiopian designs',
      price: 45.0,
      category: 'Pottery',
      artisan: { _id: 'user001', profile: { firstName: 'Sarah', lastName: 'Bekele' } },
      images: [{ url: '/images/coffee-set.svg', isPrimary: true }],
      status: 'active',
      inventory: { quantity: 10 },
      createdAt: '2026-01-20T10:00:00',
    },
    {
      _id: 'prod002',
      name: 'Handwoven Basket',
      description: 'Beautiful traditional basket made from natural fibers',
      price: 35.0,
      category: 'Basketry',
      artisan: { _id: 'user003', profile: { firstName: 'Emma', lastName: 'Tadesse' } },
      images: [{ url: '/images/basket.svg', isPrimary: true }],
      status: 'draft',
      inventory: { quantity: 15 },
      createdAt: '2026-02-05T14:30:00',
    },
  ];

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

  if (loading) return (<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
          <h1 className="text-3xl font-bold text-gray-900">Moderate Products</h1>
          <p className="text-gray-600 mt-2">Review and manage product listings</p>
        </div>

        {error && <ErrorMessage message={error} className="mb-6" />}

        {success && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">{success}</div>}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex space-x-2">
              {['all','pending','flagged','active','inactive'].map(s => (
                <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter===s?'bg-ethiopian-gold text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
              ))}
            </div>

            <div className="relative">
              <input type="text" placeholder="Search products..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent" />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artisan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map(p => (
                  <tr key={p._id} className={p.isFlagged? 'bg-orange-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap"><img src={p.images?.[0]?.url || '/images/placeholder.svg'} alt={p.name} className="w-16 h-12 object-cover rounded" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-gray-900">{p.name}</div><div className="text-sm text-gray-500">{p.description?.slice(0,80)}{p.description && p.description.length>80?'...':''}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.artisan?.profile?.firstName} {p.artisan?.profile?.lastName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-ethiopian-gold">{formatCurrency(p.price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(p.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {p.status === 'pending' && (<button onClick={() => approveProduct(p._id)} className="text-green-600 hover:text-green-900">Approve</button>)}
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button onClick={() => flagProduct(p._id)} className="text-orange-600 hover:text-orange-900">Flag</button>
                      <button onClick={() => rejectProduct(p._id)} className="text-red-600 hover:text-red-900">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12"><p className="text-gray-500">No products found matching your criteria</p></div>
          )}
        </div>

        {/* Edit Modal */}
        {editOpen && editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-3/4 lg:w-1/2 p-6">
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
