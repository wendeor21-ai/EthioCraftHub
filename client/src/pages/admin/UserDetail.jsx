import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchUser(userId);
  }, [userId]);

  const fetchUser = async (id) => {
    try {
      setLoading(true);
      const resp = await api.get(`/admin/users/${id}`);
      setUser(resp.data.user);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      alert('Failed to load user details');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center">← Back</button>
          <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-600 mt-2">View user profile and account information (password and sensitive fields hidden)</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">{user.profile?.firstName} {user.profile?.lastName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className="font-medium">{user.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Joined</p>
              <p className="font-medium">{new Date(user.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{user.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Profile</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{user.profile?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Bio</p>
              <p className="font-medium">{user.profile?.bio || '—'}</p>
            </div>
            {user.verification && (
              <div>
                <p className="text-sm text-gray-500">Verification</p>
                <p className="font-medium">{user.verification.status}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
