import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

const ArtisanActivity = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[ArtisanActivity] Fetching audit logs...');
        const res = await fetch('/api/users/audit-logs?limit=50', { headers: { Authorization: `Bearer ${token}` } });
        console.log('[ArtisanActivity] Response status:', res.status);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const body = await res.json().catch(() => null) || {};
        console.log('[ArtisanActivity] Response body:', body);
        const list = body?.data?.logs || body?.logs || (Array.isArray(body) ? body : []);
        console.log('[ArtisanActivity] Extracted logs:', list.length, 'items');
        if (!cancelled) setLogs(list);
      } catch (err) {
        console.error('[ArtisanActivity] Error:', err);
        if (!cancelled) setError(err.message || 'Failed to load activity');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const open = (l) => {
    const details = l.details || {};
    const productId = details.productId || l.productId || (l.product && (l.product._id || l.product.id)) || null;
    const orderId = details.orderId || l.orderId || (l.order && (l.order._id || l.order.id)) || null;
    const artisanId = l.artisanId || l.userId || l.actorId || l.user || null;
    if (productId) return navigate(`/products/${productId}`);
    if (orderId) return navigate(`/orders/${orderId}`);
    if (artisanId && typeof artisanId === 'string') return navigate(`/artisan/${artisanId}`);
    return null;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 text-amber-600 hover:text-amber-700 font-medium flex items-center space-x-1 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Activity</h1>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {logs.length === 0 ? (
        <div className="text-gray-600">No recent activity.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((l, i) => {
            const details = l.details || {};
            const detailsText = details.productName || details.orderNumber || 
                               (typeof details === 'string' ? details : JSON.stringify(details));
            return (
              <button key={i} onClick={() => open(l)} className="w-full text-left p-4 bg-white rounded-lg border hover:shadow-sm flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">{l.message || l.action || l.event || l.type || 'Activity'}</div>
                  {detailsText && detailsText !== '{}' && <div className="text-sm text-gray-500">{detailsText}</div>}
                </div>
                <div className="text-sm text-gray-400">{l.timestamp ? new Date(l.timestamp).toLocaleString() : (l.createdAt ? new Date(l.createdAt).toLocaleString() : '')}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArtisanActivity;
