import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const CMSSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(()=>{ fetchCMS(); }, []);

  const fetchCMS = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/cms');
      setCategories(res.data.categories || []);
      setBanners(res.data.banners || []);
      setFeatured(res.data.featured || []);
    } catch (err) { console.error('fetch cms', err); }
    finally { setLoading(false); }
  };

  const toggleFeatured = async (id) => {
    try {
      await api.post(`/admin/cms/featured/${id}/toggle`);
      setFeatured(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
    } catch (err) { console.error('toggle featured', err); }
  };

  const deleteBanner = async (id) => {
    if (!window.confirm('Delete this banner? This will remove the image file.')) return;
    try {
      await api.delete(`/admin/cms/banners/${id}`);
      setBanners(prev => prev.filter(b => b._id !== id));
      alert('Banner removed');
    } catch (err) { console.error('delete banner', err); alert('Failed to delete banner'); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
        <h1 className="text-2xl font-bold mb-2">Content Management</h1>
        <p className="text-gray-600 mb-4">Manage categories, homepage banners and featured products.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Categories</h3>
            <div className="space-y-2 max-h-60 overflow-auto">
              {categories.map(c => (<div key={c._id} className="flex justify-between items-center"><div>{c.name}</div><div className="text-sm text-gray-500">{c.count || 0} products</div></div>))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Banners</h3>
            <div className="space-y-2 max-h-60 overflow-auto">
              {banners.map(b => (
                <div key={b._id} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{b.title}</div>
                    <div className="text-xs text-gray-500">{b.active? 'Active' : 'Inactive'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>toggleFeatured(b._id)} className="text-sm text-ethiopian-gold">{featured.includes(b._id)? 'Unfeature' : 'Feature'}</button>
                    <button onClick={()=>deleteBanner(b._id)} className="text-sm text-red-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Featured Products</h3>
            <div className="space-y-2 max-h-60 overflow-auto">
              {featured.map(id => (<div key={id} className="flex justify-between items-center"><div>{id}</div><button onClick={()=>toggleFeatured(id)} className="text-sm text-ethiopian-gold">Toggle</button></div>))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CMSSettings;
