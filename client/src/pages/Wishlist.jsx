/**
 * Wishlist Page for EthioCraft Global
 * 
 * Display and manage saved products
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { getBestProductImage } from '../utils/imageUtils';
import { 
  Heart, 
  ShoppingCart, 
  Trash2, 
  ArrowLeft,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const Wishlist = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { wishlistItems, toggleWishlist, loading } = useWishlist();
  const navigate = useNavigate();
  const [shakingItemId, setShakingItemId] = useState(null);

  const moveToCart = (product) => {
    const result = addToCart(product);

    if (result && result.error === 'SELECTION_REQUIRED') {
      setShakingItemId(product._id);
      setTimeout(() => setShakingItemId(null), 500);

      toast.error('Please select your preferred options first.', {
        icon: '🎨',
      });

      // Redirect after a short delay
      setTimeout(() => {
        navigate(`/products/${product._id}`);
      }, 700);
      return;
    }

    if (result) {
      toggleWishlist(product); // Assuming toggleWishlist removes it since it's already in the wishlist.
      toast.success('Moved to cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center">
            <Heart className="w-10 h-10 mr-3 text-red-500 fill-current" />
            My Wishlist
          </h1>
          <p className="text-gray-600">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>

        {/* Wishlist Items */}
        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((product) => (
              <div
                key={product._id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="h-2 bg-gradient-to-r from-green-600 via-amber-400 to-red-600"></div>
                
                {/* Product Image */}
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={getBestProductImage(product)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => toggleWishlist(product)}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-amber-600">
                      {product.price?.toFixed(2)} ETB
                    </span>
                    {product.stock > 0 ? (
                      <span className="text-sm text-green-600 font-medium">In Stock</span>
                    ) : (
                      <span className="text-sm text-red-600 font-medium">Out of Stock</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => moveToCart(product)}
                      disabled={product.stock === 0}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${shakingItemId === product._id ? 'animate-shake' : ''}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span className="text-sm font-semibold">Add to Cart</span>
                    </button>
                    <button
                      onClick={() => navigate(`/products/${product._id}`)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Heart className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-600 mb-6">
              Save your favorite items to your wishlist and shop them later
            </p>
            <button
              onClick={() => navigate('/products')}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
