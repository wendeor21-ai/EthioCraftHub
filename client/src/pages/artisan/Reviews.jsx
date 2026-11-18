/**
 * Professional Reviews & Ratings Management System
 * Allows artisans to view, reply to, and manage customer reviews
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Star,
  MessageSquare,
  Flag,
  TrendingUp,
  Award,
  AlertTriangle,
  Send,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const Reviews = ({ insideDashboard = false, onSelectTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, 5star, 4star, 3star, 2star, 1star
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [flaggingReview, setFlaggingReview] = useState(null);
  const [flagReason, setFlagReason] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reviews/artisan');
      setReviews(response.data.data.reviews);
      setAnalytics(response.data.data.analytics);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (reviewId) => {
    if (!replyText.trim() || replyText.trim().length < 10) {
      toast.error('Reply must be at least 10 characters');
      return;
    }

    try {
      await api.post(`/reviews/${reviewId}/reply`, {
        reply: replyText.trim()
      });
      
      toast.success('Reply posted successfully');
      setReplyingTo(null);
      setReplyText('');
      fetchReviews();
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    }
  };

  const handleFlag = async (reviewId) => {
    if (!flagReason.trim() || flagReason.trim().length < 10) {
      toast.error('Please provide a reason (at least 10 characters)');
      return;
    }

    try {
      await api.post(`/reviews/${reviewId}/flag`, {
        reason: flagReason.trim()
      });
      
      toast.success('Review flagged for admin review');
      setFlaggingReview(null);
      setFlagReason('');
      fetchReviews();
    } catch (error) {
      console.error('Error flagging review:', error);
      toast.error('Failed to flag review');
    }
  };

  const getStarColor = (rating) => {
    if (rating >= 4) return 'text-green-500';
    if (rating === 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRatingBadge = (rating) => {
    const colors = {
      5: 'bg-green-100 text-green-800',
      4: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      2: 'bg-orange-100 text-orange-800',
      1: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colors[rating]}`}>
        {rating} {rating === 1 ? 'Star' : 'Stars'}
      </span>
    );
  };

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true;
    const starRating = parseInt(filter.replace('star', ''));
    return review.rating === starRating;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={insideDashboard ? "pb-6" : "min-h-screen bg-gray-50 py-6"}>
      <div className={insideDashboard ? "w-full" : "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8"}>
        {/* Header */}
        <div className="mb-4">
          {!insideDashboard && (
            <button
              onClick={() => navigate('/artisan/dashboard')}
              className="text-ethiopian-gold hover:text-ethiopian-earth mb-2 text-xs font-medium"
            >
              ← Back to Dashboard
            </button>
          )}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Reviews & Ratings</h1>
              <p className="text-xs text-gray-500 mt-0.5">Manage customer feedback and build trust</p>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-4">
            {/* Average Rating */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 hover:shadow transition-shadow">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">Average Rating</p>
                  <div className="flex items-center mt-1">
                    <p className="text-base sm:text-lg font-black text-gray-900">{analytics.averageRating}</p>
                    <Star className="w-4 h-4 text-yellow-500 ml-1 fill-current shrink-0" />
                  </div>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Total Reviews */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 hover:shadow transition-shadow">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">Total Reviews</p>
                  <p className="text-base sm:text-lg font-black text-gray-900 mt-1">{analytics.totalReviews}</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>

            {/* 5-Star Reviews */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 hover:shadow transition-shadow">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">5-Star Reviews</p>
                  <p className="text-base sm:text-lg font-black text-green-600 mt-1">
                    {analytics.ratingDistribution[5]}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </div>

            {/* 1-Star Reviews */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 hover:shadow transition-shadow">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">1-Star Reviews</p>
                  <p className="text-base sm:text-lg font-black text-red-600 mt-1">
                    {analytics.ratingDistribution[1]}
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rating Distribution */}
        {analytics && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 sm:p-4 mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-2.5">Rating Distribution</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = analytics.ratingDistribution[rating];
                const percentage = analytics.totalReviews > 0 
                  ? (count / analytics.totalReviews) * 100 
                  : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-14 shrink-0">
                      <span className="text-xs font-semibold text-gray-700">{rating}</span>
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-16 text-right shrink-0">
                      {count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Rated Products */}
        {analytics && analytics.topRatedProducts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 sm:p-4 mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-2.5 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-ethiopian-gold" />
              Top Rated Products
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {analytics.topRatedProducts.map(product => (
                <div key={product.id} className="border border-gray-100 rounded-lg p-2.5 hover:shadow-sm transition-shadow bg-gray-50/50">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-20 sm:h-24 object-cover rounded-md mb-2"
                    />
                  )}
                  <p className="font-semibold text-gray-900 text-xs mb-1.5 line-clamp-1">{product.name}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                      <span className="text-xs font-bold text-gray-900">{product.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{product.reviewCount} rev</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex flex-nowrap -mb-px overflow-x-auto px-2">
              {[
                { key: 'all', label: 'All Reviews', count: reviews.length },
                { key: '5star', label: '5 Stars', count: reviews.filter(r => r.rating === 5).length },
                { key: '4star', label: '4 Stars', count: reviews.filter(r => r.rating === 4).length },
                { key: '3star', label: '3 Stars', count: reviews.filter(r => r.rating === 3).length },
                { key: '2star', label: '2 Stars', count: reviews.filter(r => r.rating === 2).length },
                { key: '1star', label: '1 Star', count: reviews.filter(r => r.rating === 1).length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    filter === tab.key
                      ? 'border-ethiopian-gold text-ethiopian-gold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 bg-gray-100 px-1.5 py-0.5 rounded-full text-[10px]">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-3">
          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">No Reviews Yet</h3>
              <p className="text-xs text-gray-500">
                {filter === 'all' 
                  ? 'Your products haven\'t received any reviews yet'
                  : `No ${filter.replace('star', '-star')} reviews found`}
              </p>
            </div>
          ) : (
            filteredReviews.map(review => (
              <div key={review._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-2.5 gap-2.5">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {review.productImage && (
                      <img
                        src={review.productImage}
                        alt={review.productName}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-gray-900">{review.userName}</h4>
                        {getRatingBadge(review.rating)}
                        {review.flagged?.isFlagged && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-semibold">
                            Flagged
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-0.5 truncate">
                        Product: <span className="font-semibold text-gray-900">{review.productName}</span>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < review.rating ? getStarColor(review.rating) + ' fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-700 my-2 leading-relaxed bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/60">{review.comment}</p>

                {/* Artisan Reply */}
                {review.artisanReply ? (
                  <div className="bg-blue-50/70 border-l-2 border-blue-500 p-2.5 sm:p-3 rounded-r-lg my-2 text-xs">
                    <p className="font-bold text-blue-900 mb-0.5">Your Reply:</p>
                    <p className="text-blue-800 leading-relaxed">{review.artisanReply.text}</p>
                    <p className="text-[10px] text-blue-500 mt-1">
                      Replied on {new Date(review.artisanReply.repliedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : replyingTo === review._id ? (
                  <div className="bg-gray-50 p-3 rounded-lg my-2 border border-gray-200">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your reply... (minimum 10 characters)"
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-ethiopian-gold focus:border-ethiopian-gold resize-none bg-white"
                      rows="2"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleReply(review._id)}
                        disabled={replyText.trim().length < 10}
                        className="px-3 py-1.5 bg-ethiopian-gold text-white text-xs font-semibold rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Post Reply
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Flag Modal */}
                {flaggingReview === review._id && (
                  <div className="bg-red-50 p-3 rounded-lg my-2 border border-red-200">
                    <p className="text-xs font-bold text-red-900 mb-1.5">Report this review:</p>
                    <textarea
                      value={flagReason}
                      onChange={(e) => setFlagReason(e.target.value)}
                      placeholder="Explain why this review is inappropriate... (minimum 10 characters)"
                      className="w-full p-2.5 text-xs border border-red-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 resize-none bg-white"
                      rows="2"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleFlag(review._id)}
                        disabled={flagReason.trim().length < 10}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Submit Report
                      </button>
                      <button
                        onClick={() => {
                          setFlaggingReview(null);
                          setFlagReason('');
                        }}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {!review.artisanReply && replyingTo !== review._id && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setReplyingTo(review._id)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Reply
                    </button>
                    {!review.flagged?.isFlagged && (
                      <button
                        onClick={() => setFlaggingReview(review._id)}
                        className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5 border border-red-100"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Reviews;
