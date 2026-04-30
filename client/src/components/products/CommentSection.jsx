import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { trackCategoryWeight } from '../../utils/trackingUtils';

const CommentSection = ({ productId, productCategory, reviews = [], averageRating = 0, onReviewAdded }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please login to leave a review');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Comment must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post(`/products/${productId}/reviews`, {
        rating,
        comment: comment.trim()
      });

      // Track category weight for recommendations (user showed interest by commenting)
      if (productCategory) {
        trackCategoryWeight(productCategory, rating);
      }

      // Reset form
      setComment('');
      setRating(5);
      setShowForm(false);
      
      // Notify parent component
      if (onReviewAdded) {
        onReviewAdded(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (currentRating, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoveredStar(star)}
            onMouseLeave={() => interactive && setHoveredStar(0)}
            className={`text-2xl ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <span className={
              star <= (interactive ? (hoveredStar || rating) : currentRating)
                ? 'text-yellow-400'
                : 'text-gray-300'
            }>
              ★
            </span>
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="mt-8 border-t pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Customer Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {renderStars(Math.round(averageRating))}
              <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-gray-600">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
            </div>
          )}
        </div>
        
        {user && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Write Your Review</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Rating</label>
            {renderStars(rating, true)}
          </div>

          <div className="mb-4">
            <label htmlFor="comment" className="block text-sm font-medium mb-2">
              Your Review
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this product..."
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={10}
              maxLength={1000}
            />
            <p className="text-sm text-gray-500 mt-1">
              {comment.length}/1000 characters (minimum 10)
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || comment.trim().length < 10}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setComment('');
                setRating(5);
                setError('');
              }}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="border-b pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{review.userName}</p>
                  <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                </div>
                {renderStars(review.rating)}
              </div>
              <p className="text-gray-700 mt-2">{review.comment}</p>
            </div>
          ))
        )}
      </div>

      {/* Zema AI Integration Note */}
      {reviews.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Zema AI Insight:</span> These reviews help Zema AI understand product quality and customer satisfaction to provide better recommendations.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
