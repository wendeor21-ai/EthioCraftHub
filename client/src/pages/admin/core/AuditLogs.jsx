import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const AuditLogs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  useEffect(()=>{ fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs');
      setLogs(res.data.logs || []);
    } catch (err) { console.error('fetch audit logs', err); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
        <h1 className="text-2xl font-bold mb-2">Audit & Security Logs</h1>
        <p className="text-gray-600 mb-4">Track admin actions and security events for compliance.</p>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center"><LoadingSpinner size="large" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map(l=> (
                    <tr key={l._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(l.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{l.adminEmail || l.adminId?.email || 'system'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{l.action}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{l.target || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate">{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
