/**
 * Zema AI Monitor - Admin Dashboard
 * 
 * Features:
 * - View all AI conversations
 * - Filter flagged conversations
 * - View analytics and usage stats
 * - Monitor security incidents
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { adminAPI } from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  UserIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ZemaAIMonitor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [violations, setViolations] = useState([]);
  const [decisionLogs, setDecisionLogs] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [settings, setSettings] = useState({ autoModerationEnabled: true, fraudDetectionEnabled: true, sensitivity: 'medium' });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'flagged'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'customer', 'artisan', 'admin'
  const [selectedLog, setSelectedLog] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchLogs();
      fetchAlerts();
      fetchPolicyViolations();
      fetchDecisionLogs();
      fetchSystemHealth();
      fetchSettings();
    }
  }, [user, filter, roleFilter]);

  // Poll logs every 30 seconds while admin is viewing (keep UI fresh)
  useEffect(() => {
    if (user?.role !== 'admin') return undefined;

    const interval = setInterval(() => {
      fetchLogs();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, filter, roleFilter]);

  const fetchAlerts = async () => {
    try {
      const res = await adminAPI.getZemaAlerts();
      setAlerts(res.data.alerts);
    } catch (err) { console.error('alerts', err); }
  };

  const fetchPolicyViolations = async () => {
    try { const res = await adminAPI.getZemaPolicyViolations(); setViolations(res.data.violations || []); } catch (err) { console.error('violations', err); }
  };

  const fetchDecisionLogs = async () => {
    try { const res = await adminAPI.getZemaDecisionLogs(); setDecisionLogs(res.data.logs || []); } catch (err) { console.error('decision logs', err); }
  };

  const fetchSystemHealth = async () => {
    try { const res = await adminAPI.getZemaSystemHealth(); setSystemHealth(res.data.health); } catch (err) { console.error('system health', err); }
  };

  const fetchSettings = async () => {
    try { const res = await adminAPI.getZemaSettings(); setSettings(res.data.settings || settings); } catch (err) { console.error('settings', err); }
  };

  const saveSettings = async (newSettings) => {
    try {
      const res = await adminAPI.updateZemaSettings(newSettings);
      setSettings(res.data.settings);
      toast.success('Settings saved');
    } catch (err) { console.error('save settings', err); toast.error('Failed to save settings'); }
  };

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  const fetchLogs = async () => {
    setLoading(true);
    const maxAttempts = 3;
    let attempt = 0;
    
    // Build query parameters
    const params = new URLSearchParams();
    if (filter === 'flagged') {
      params.append('flagged', 'true');
    }
    if (roleFilter !== 'all') {
      params.append('userRole', roleFilter);
    }
    params.append('limit', '50');
    
    const url = `/zema-ai/admin/logs?${params.toString()}`;

    while (attempt < maxAttempts) {
      try {
        const response = await api.get(url);
        const fetchedLogs = response.data.logs || [];
        setLogs(fetchedLogs);
        console.log('✅ Fetched', fetchedLogs.length, 'logs');
        
        // Calculate analytics from fetched logs
        calculateAnalyticsFromLogs(fetchedLogs);
        break;
      } catch (error) {
        const status = error.response?.status;
        console.error('Error fetching logs:', status || error.message, error);

        if (status === 429) {
          // Backoff and retry
          attempt += 1;
          setRetrying(true);
          const backoffMs = 1000 * Math.pow(2, attempt); // 2s, 4s, ...
          console.warn(`Rate limited when fetching logs - retrying in ${backoffMs}ms (attempt ${attempt})`);
          await wait(backoffMs);
          continue;
        }

        // non-retryable error
        break;
      }
    }

    setRetrying(false);
    setLoading(false);
  };

  // Calculate analytics from logs
  const calculateAnalyticsFromLogs = (logsList) => {
    if (!logsList || logsList.length === 0) {
      setAnalytics({
        totalQueries: 0,
        avgResponseTime: 0,
        totalTokens: 0,
        flaggedCount: 0
      });
      return;
    }

    const totalQueries = logsList.length;
    const totalResponseTime = logsList.reduce((sum, log) => sum + (log.responseTime || 0), 0);
    const avgResponseTime = totalQueries > 0 ? totalResponseTime / totalQueries : 0;
    const totalTokens = logsList.reduce((sum, log) => sum + (log.tokenCount || 0), 0);
    const flaggedCount = logsList.filter(log => log.flaggedForReview).length;

    setAnalytics({
      totalQueries,
      avgResponseTime,
      totalTokens,
      flaggedCount
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldCheckIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/admin/dashboard')} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back to Dashboard</button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Zema AI Security Monitor
              </h1>
              <p className="text-gray-600">
                Monitor AI conversations, security incidents, and usage analytics
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Queries</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.totalQueries || 0}
                  </p>
                </div>
                <ChatBubbleLeftRightIcon className="w-10 h-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.avgResponseTime ? `${Math.round(analytics.avgResponseTime)}ms` : '0ms'}
                  </p>
                </div>
                <ClockIcon className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Flagged</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.flaggedCount || 0}
                  </p>
                </div>
                <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tokens</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.totalTokens ? (analytics.totalTokens / 1000).toFixed(1) + 'K' : '0'}
                  </p>
                </div>
                <ChartBarIcon className="w-10 h-10 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* System Health & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Server Health</p>
            <p className="text-xl font-bold text-gray-900">{systemHealth ? `${Math.round(systemHealth.uptimeSec)}s uptime` : 'N/A'}</p>
            <p className="text-sm text-gray-500 mt-2">Memory: {systemHealth ? `${Math.round(systemHealth.memory.rss/1024/1024)} MB` : 'N/A'}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">AI Features</p>
            <div className="mt-3 space-y-3">
              <label className="flex items-center justify-between">
                <span>Auto-moderation</span>
                <input type="checkbox" checked={settings.autoModerationEnabled} onChange={e=> { const s = {...settings, autoModerationEnabled: e.target.checked}; setSettings(s); saveSettings(s); }} />
              </label>
              <label className="flex items-center justify-between">
                <span>Fraud Detection</span>
                <input type="checkbox" checked={settings.fraudDetectionEnabled} onChange={e=> { const s = {...settings, fraudDetectionEnabled: e.target.checked}; setSettings(s); saveSettings(s); }} />
              </label>
              <label className="flex items-center justify-between">
                <span>Alert Sensitivity</span>
                <select value={settings.sensitivity} onChange={e=> { const s = {...settings, sensitivity: e.target.value}; setSettings(s); saveSettings(s); }} className="border px-2 py-1 rounded">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 font-semibold mb-3">Quick Actions</p>
            <div className="mt-3 flex flex-col space-y-2">
              <button 
                onClick={() => {
                  fetchLogs();
                  toast.success('Logs refreshed');
                }} 
                className="px-3 py-2 bg-ethiopian-gold text-white rounded hover:bg-ethiopian-earth transition-colors"
              >
                Refresh Logs
              </button>
              <button 
                onClick={() => {
                  fetchAlerts();
                  toast.success('Alerts refreshed');
                }} 
                className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Refresh Alerts
              </button>
              <button 
                onClick={() => {
                  fetchSystemHealth();
                  toast.success('System health checked');
                }} 
                className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Check System
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex justify-between items-center px-6 py-4">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    filter === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Conversations ({logs.length})
                </button>
                <button
                  onClick={() => setFilter('flagged')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    filter === 'flagged'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Flagged ({analytics?.flaggedCount || 0})
                </button>
              </nav>
              
              {/* Role Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Filter by Role:</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="customer">Customer</option>
                  <option value="artisan">Artisan</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No conversations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Query
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Context
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.userId?.email || 'Anonymous'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.userRole}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.sanitizedQuery}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {log.conversationContext}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.flaggedForReview ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 flex items-center w-fit">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                            Flagged
                          </span>
                        ) : log.sanitizationApplied ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                            Sanitized
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Clean
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            {log.flaggedForReview ? '🚩 Review' : 'View'}
                          </button>
                          {log.flaggedForReview && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.post(`/zema-ai/admin/logs/${log._id}/retry`);
                                  toast.success('AI response regenerated');
                                  fetchLogs();
                                } catch (err) {
                                  console.error('Retry failed', err);
                                  toast.error('Retry failed');
                                }
                              }}
                              className="text-yellow-600 hover:text-yellow-900 font-medium"
                            >
                              Retry AI
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!window.confirm('Delete this log? This action cannot be undone.')) return;
                              try {
                                await api.delete(`/zema-ai/admin/logs/${log._id}`);
                                setLogs(prev => prev.filter(l => l._id !== log._id));
                                toast.success('Log deleted');
                                // Recalculate analytics
                                calculateAnalyticsFromLogs(logs.filter(l => l._id !== log._id));
                              } catch (err) {
                                console.error('Failed to delete log', err);
                                toast.error('Failed to delete log');
                              }
                            }}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alerts & Policy Violations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">AI Security Alerts</h3>
            {alerts ? (
              <div>
                <p className="text-sm text-gray-600">Suspicious IPs: {alerts.suspiciousIPs?.length || 0}</p>
                <div className="mt-3 max-h-48 overflow-auto">
                  {(alerts.suspiciousIPs||[]).map((ip,idx)=> (
                    <div key={idx} className="flex justify-between text-sm border-b py-2"><div>{ip._id}</div><div className="font-semibold">{ip.count}</div></div>
                  ))}
                </div>
              </div>
            ) : (<p className="text-sm text-gray-500">No alerts</p>)}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Auto-detected Policy Violations</h3>
            <div className="max-h-48 overflow-auto">
              {(violations||[]).map(v=> (
                <div key={v._id} className="border-b py-2">
                  <div className="text-sm font-medium">{v.sanitizedQuery}</div>
                  <div className="text-xs text-gray-500">Reason: {v.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Conversation Details</h3>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User Query</label>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      {selectedLog.userQuery}
                    </div>
                  </div>

                  {selectedLog.sanitizedQuery !== selectedLog.userQuery && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sanitized Query
                      </label>
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        {selectedLog.sanitizedQuery}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI Response</label>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      {(() => {
                        const aiResp = selectedLog.aiResponse || '';
                        const isError = aiResp.trim().toUpperCase().startsWith('ERROR:') || aiResp.toLowerCase().includes('error');

                        if (!aiResp) {
                          return <div className="text-sm text-red-600">No AI response available. You can retry generation.</div>;
                        }

                        if (isError) {
                          // show a friendly error block with collapsible details
                          return (
                            <div>
                              <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
                                <p className="text-sm text-red-800 font-medium mb-2">AI generation failed. Use <strong>Retry AI</strong> to attempt regeneration.</p>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setShowErrorDetails(s => !s)}
                                    className="px-3 py-1 bg-white border rounded text-sm"
                                  >
                                    {showErrorDetails ? 'Hide Details' : 'Show Error Details'}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(aiResp);
                                        window.alert('Error details copied to clipboard');
                                      } catch (err) {
                                        window.alert('Copy failed');
                                      }
                                    }}
                                    className="px-3 py-1 bg-white border rounded text-sm"
                                  >
                                    Copy Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      const blob = new Blob([aiResp], { type: 'text/plain' });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `zemaai-log-${selectedLog._id || Date.now()}.txt`;
                                      document.body.appendChild(a);
                                      a.click();
                                      a.remove();
                                      URL.revokeObjectURL(url);
                                    }}
                                    className="px-3 py-1 bg-white border rounded text-sm"
                                  >
                                    Download
                                  </button>
                                </div>

                                {showErrorDetails && (
                                  <pre className="mt-3 p-3 bg-white text-xs text-red-900 rounded whitespace-pre-wrap overflow-x-auto">{aiResp}</pre>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // normal successful response
                        return (
                          <div className="prose max-w-none">
                            <pre className="whitespace-pre-wrap text-sm">{aiResp}</pre>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Response Time</label>
                      <p className="text-sm text-gray-900">{selectedLog.responseTime}ms</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                      <p className="text-sm text-gray-900">{selectedLog.ipAddress || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const resp = await api.post(`/zema-ai/admin/logs/${selectedLog._id}/retry`);
                        if (resp.data?.success) {
                          const updated = resp.data.log;
                          setLogs(prev => prev.map(l => (l._id === updated._id ? updated : l)));
                          setSelectedLog(updated);
                          // refresh logs immediately so UI reflects backend state
                          fetchLogs();
                          window.alert('AI response regenerated');
                        } else {
                          window.alert('Failed to regenerate AI response');
                        }
                      } catch (err) {
                        console.error('Retry failed', err);
                        window.alert('Retry failed: ' + (err.response?.data?.error || err.message));
                      }
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    Retry AI
                  </button>
              <button
                onClick={async () => {
                  if (!window.confirm('Delete this log? This action cannot be undone.')) return;
                  try {
                    await api.delete(`/zema-ai/admin/logs/${selectedLog._id}`);
                    setLogs(prev => prev.filter(l => l._id !== selectedLog._id));
                    setSelectedLog(null);
                  } catch (err) {
                    console.error('Failed to delete log', err);
                    window.alert('Failed to delete log');
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Log
              </button>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZemaAIMonitor;
