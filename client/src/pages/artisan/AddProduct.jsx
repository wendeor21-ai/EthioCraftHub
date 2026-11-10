/**
 * Add Product Page for EthioCraft Global
 * 
 * Allows artisans to add new products to their catalog
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';
import { productAPI, aiAPI, userAPI } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import toast from 'react-hot-toast';

// Helper for generating unique SKUs
const generateECGSKU = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ECG-${year}-${random}`;
};

const AddProduct = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // step 1=Product Info, 2=Media, 3=Craft/Cultural, 4=Variations, 5=Inventory/Shipping, 6=SEO, 7=Review
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoWarning, setVideoWarning] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // unified form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    price: '',
    category: '',
    subcategory: '',
    originRegion: '',
    originZone: '',
    materials: '',
    dimensions: '',
    craftingTime: '',
    story: '',
    careInstructions: '',
    weight: '',
    videoUrl: '',
    customizable: false,
    tags: '',
    culturalTags: '',
    stock: 10,
    isAvailable: true,
    seo: {
      title: '',
      description: '',
      keywords: ''
    },
    shipping: {
      weight: '',
      shippingClass: '',
      estimatedDelivery: '',
      lowStockThreshold: 5
    }
  });

  // variations array kept separately for convenience
  // Each variation now supports sku, price, and image
  const [variations, setVariations] = useState([]);

  // dynamic product specifications (colors, sizes, custom labels)
  const [options, setOptions] = useState([]);

  // images stored as objects {url,isPrimary,originalFile}
  const [images, setImages] = useState([]);

  // Load draft from localStorage if any, UNLESS we are in Edit Mode
  useEffect(() => {
    if (isEditMode) return; // Ignore drafts when editing an existing product
    const draft = localStorage.getItem('addProductDraft');
    if (draft) {
      try {
        const data = JSON.parse(draft);
        setFormData(prev => ({ ...prev, ...data.formData }));
        if (data.images) {
          let valid = data.images.filter(img => img.url && !img.url.startsWith('blob:'));
          if (valid.length !== data.images.length) {
            toast.warning('Some draft images could not be restored; please re-upload them.');
          }
          valid = valid.map(img => ({ url: img.url, isPrimary: img.isPrimary }));
          setImages(valid);
        }
        if (data.variations) setVariations(data.variations);
        if (data.options) setOptions(data.options);
      } catch (_) { }
    }
  }, [isEditMode]);

  // Fetch Existing Product Data for Edit Mode
  useEffect(() => {
    if (!isEditMode) return;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const response = await fetch(API_ENDPOINTS.PRODUCTS.BY_ID(id), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Failed to fetch product');
        
        const data = await response.json();
        const product = data.product || data;
        
        // Pre-populate Form Data
        setFormData({
          _id: product._id,
          name: product.name || '',
          slug: product.slug || '',
          shortDescription: product.shortDescription || product.description?.substring(0, 150) || '',
          description: product.description || '',
          price: product.price || '',
          category: product.category || '',
          subcategory: product.subcategory || '',
          originRegion: product.originRegion || '',
          originZone: product.originZone || '',
          materials: product.materials || '',
          dimensions: product.dimensions || '',
          craftingTime: product.craftingTime || '',
          story: product.story || '',
          careInstructions: product.careInstructions || '',
          weight: product.weight || '',
          videoUrl: product.videoUrl || '',
          customizable: product.customizable || false,
          tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
          culturalTags: Array.isArray(product.culturalTags) ? product.culturalTags.join(', ') : '',
          stock: product.inventory?.quantity || 0,
          isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
          seo: product.seo || { title: '', description: '', keywords: '' },
          shipping: product.shipping || { weight: '', shippingClass: '', estimatedDelivery: '', lowStockThreshold: 5 }
        });

        // Pre-populate Variations
        if (product.variations && Array.isArray(product.variations)) {
          setVariations(product.variations);
        }

        // Pre-populate Options
        if (product.options && Array.isArray(product.options)) {
          setOptions(product.options);
        }

        // Pre-populate Images
        if (product.images && Array.isArray(product.images)) {
          setImages(product.images.map(img => ({
            url: img.url,
            isPrimary: img.isPrimary || false
          })));
        }

        // Ensure at least one primary image exists if images are present
        setImages(prev => {
           if (prev.length > 0 && !prev.some(i => i.isPrimary)) {
               const newArr = [...prev];
               newArr[0].isPrimary = true;
               return newArr;
           }
           return prev;
        });

      } catch (err) {
        console.error('Error fetching product for edit:', err);
        setError('Failed to load product details for editing');
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, isEditMode]);

  // Auto-save draft to localStorage whenever relevant data changes
  // We avoid saving any image objects that reference local blob URLs or file handles,
  // since those cannot be restored on page reload. Only persist images that have
  // already been uploaded (i.e. have a server URL).
  useEffect(() => {
    const cleanImages = images
      .filter(img => img.url && !img.url.startsWith('blob:'))
      .map(img => ({ url: img.url, isPrimary: img.isPrimary }));

    const payload = { formData, images: cleanImages, variations, options };
    localStorage.setItem('addProductDraft', JSON.stringify(payload));
  }, [formData, images, variations, options]);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { state: { from: { pathname: '/artisan/add-product' } } });
      return;
    }
    if (user.role !== 'artisan') {
      navigate('/dashboard');
      return;
    }
  }, [isAuthenticated, user, navigate]);

  const categories = [
    'Textiles',
    'Jewelry',
    'Pottery',
    'Basketry',
    'Wood Crafts',
    'Leather Goods',
    'Metalwork',
    'Paintings'
  ];

  const subcategories = {
    Textiles: ["Traditional Clothing", "Scarves", "Blankets", "Table Runners", "Wall Hangings"],
    Jewelry: ["Necklaces", "Bracelets", "Earrings", "Rings", "Traditional Ornaments"],
    Pottery: ["Bowls", "Vases", "Plates", "Ceremonial Items", "Decorative Pieces"],
    Basketry: ["Storage Baskets", "Decorative Baskets", "Trays", "Containers", "Art Pieces"],
    "Wood Crafts": ["Furniture", "Utensils", "Sculptures", "Decorative Items", "Tools"],
    "Leather Goods": ["Bags", "Shoes", "Belts", "Wallets", "Decorative Items"],
    Metalwork: ["Jewelry", "Tools", "Decorative Items", "Ceremonial Objects", "Utensils"],
    Paintings: ["Religious Icons", "Cultural Scenes", "Portraits", "Abstract Art", "Traditional Art"],
  };

  const regionsAndZones = {
    'Addis Ababa': ['Arada', 'Addis Ketema', 'Akaki-Kality', 'Bole', 'Gullele', 'Kirkos', 'Kolfe Keranio', 'Lideta', 'Nifas Silk-Lafto', 'Yeka'],
    'Afar': ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'],
    'Amhara': ['North Gondar', 'South Gondar', 'North Wollo', 'South Wollo', 'North Shewa', 'East Gojjam', 'West Gojjam', 'Wag Hemra', 'Awi', 'Oromia Zone'],
    'Benishangul-Gumuz': ['Asosa', 'Kamashi', 'Metekel'],
    'Dire Dawa': ['Dire Dawa'],
    'Gambela': ['Agnewak', 'Nuwer', 'Mezhenger'],
    'Harari': ['Harar'],
    'Oromia': ['Arsi', 'Bale', 'Borena', 'East Hararghe', 'West Hararghe', 'East Shewa', 'West Shewa', 'North Shewa', 'East Wollega', 'West Wollega', 'Horo Guduru Wollega', 'Kellem Wollega', 'Illu Aba Bora', 'Jimma', 'Guji', 'West Guji'],
    'Sidama': ['Huwela-Tula', 'Aleta Wendo', 'Dara', 'Belsa'],
    'Somali': ['Afder', 'Degahbur', 'Gode', 'Jijiga', 'Korahe', 'Liben', 'Shabelle', 'Warder'],
    'South Ethiopia': ['Gamo', 'Gofa', 'Wolayta', 'South Omo', 'Konso'],
    'South West Ethiopia': ['Keffa', 'Sheka', 'Bench Maji', 'Dawro', 'Konta'],
    'Tigray': ['Central Tigray', 'Eastern Tigray', 'North Western Tigray', 'Southern Tigray', 'Western Tigray', 'Mekelle']
  };

  const ethiopianRegions = Object.keys(regionsAndZones);

  const isValidVideoUrl = (v) => {
    if (!v) return true;
    // youtube, youtu.be, vimeo, facebook/watch or facebook/videos, or direct mp4
    const re = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|facebook\.com)(\/(watch|videos)\/|\/).+/i;
    if (re.test(v)) return true;
    if (/\.mp4($|\?)/i.test(v)) return true;
    return false;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Support nested objects (e.g., seo.title, shipping.weight)
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
      return;
    }

    let parsedValue = value;
    if (type === 'number') {
      parsedValue = value === '' ? '' : parseFloat(value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parsedValue
    }));

    if (name === 'videoUrl') {
      if (value && !isValidVideoUrl(value)) {
        setVideoWarning('Unsupported video link; use YouTube, Vimeo, Facebook or an MP4 URL');
      } else {
        setVideoWarning('');
      }
    }
  };

  const handleImageUpload = (files, viewType = 'general') => {
    const arr = Array.from(files);
    const imageObjects = arr.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      return {
        url: previewUrl,
        isPrimary: (images.length === 0 && index === 0) || viewType === 'front',
        viewType: index === 0 ? viewType : 'general',
        originalFile: file,
      };
    });

    setImages(prev => {
      let updated = [...prev];
      if (viewType === 'front') {
        // Replace existing front image if any, or add to start
        updated = updated.filter(img => img.viewType !== 'front');
        updated.unshift(imageObjects[0]);
      } else if (viewType === 'back') {
        // Replace existing back image if any, or add after front
        updated = updated.filter(img => img.viewType !== 'back');
        const frontIdx = updated.findIndex(img => img.viewType === 'front');
        if (frontIdx !== -1) {
          updated.splice(frontIdx + 1, 0, imageObjects[0]);
        } else {
          updated.unshift(imageObjects[0]);
        }
      } else {
        updated = [...updated, ...imageObjects];
      }

      // ensure one primary (prefer front)
      const hasFront = updated.some(i => i.viewType === 'front');
      updated = updated.map((img, i) => ({
        ...img,
        isPrimary: hasFront ? img.viewType === 'front' : (i === 0)
      }));

      return updated;
    });
  };

  const handleFileInputChange = (e) => {
    handleImageUpload(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  // variation helpers
  const addVariation = () => {
    setVariations(prev => [...prev, {
      size: '',
      color: '',
      colorHex: '',
      quantity: 1,
      sku: '',
      price: '',
      image: ''
    }]);
  };

  const updateVariation = (idx, key, value) => {
    setVariations(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };

  const removeVariation = (idx) => {
    setVariations(prev => prev.filter((_, i) => i !== idx));
  };

  // custom options helpers
  const addOption = () => {
    setOptions(prev => [...prev, { name: '', values: '' }]);
  };

  const updateOption = (idx, key, value) => {
    setOptions(prev => {
      const copy = [...prev];
      copy[idx][key] = value;
      return copy;
    });
  };

  const removeOption = (idx) => {
    setOptions(prev => prev.filter((_, i) => i !== idx));
  };


  // helper: upload any new files to the backend before saving product
  const uploadPendingImages = async () => {
    // reset state
    setIsUploading(false);

    // detect orphan blobs (no real File to upload) and stop early
    const orphanBlobs = images.filter(
      img =>
        img.url &&
        img.url.startsWith('blob:') &&
        !(img.originalFile && img.originalFile instanceof File)
    );
    if (orphanBlobs.length > 0) {
      throw new Error(
        'One or more images need to be re-uploaded. Please remove and add them again before publishing.'
      );
    }

    // only upload images with an actual File object attached
    const filesToUpload = images.filter(
      img => img.originalFile && img.originalFile instanceof File
    );
    if (filesToUpload.length === 0) {
      setIsUploading(false);
      return images;
    }

    setIsUploading(true);
    const fd = new FormData();
    filesToUpload.forEach(f => fd.append('files', f.originalFile));

    try {
      const resp = await userAPI.uploadFiles(fd);
      // userAPI.uploadFiles returns the axios response object
      const data = resp.data;
      const uploadedPaths = data.files || [];

      // replace preview urls with server paths
      let uploadIndex = 0;
      const newImages = images.map(img => {
        if (img.originalFile) {
          const newUrl = uploadedPaths[uploadIndex++] || img.url;
          return { url: newUrl, isPrimary: img.isPrimary };
        }
        return img; // already uploaded
      });

      setImages(newImages);
      return newImages;
    } catch (err) {
      console.error('Image upload error:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const submitProduct = async (status) => {
    setLoading(true);
    setError('');

    try {
      // Only 5 required fields for publish; all others are optional
      if (status === 'active') {
        if (!formData.name || formData.name.trim().length < 3) {
          setError('Product name is required and must be at least 3 characters.');
          setLoading(false); return;
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
          setError('Price is required and must be greater than 0.');
          setLoading(false); return;
        }
        if (!formData.category) {
          setError('Please select a category.');
          setLoading(false); return;
        }
        if (images.length === 0) {
          setError('At least one product image is required.');
          setLoading(false); return;
        }
        if (!formData.description || formData.description.trim().length < 5) {
          setError('A short product description (at least 5 characters) is required.');
          setLoading(false); return;
        }
        // materials, story, dimensions, etc. are optional
      }

      // Upload pending images
      const finalImages = await uploadPendingImages();
      if (finalImages.some(img => img.url && img.url.startsWith('blob:'))) {
        throw new Error('Image upload synchronization failed. Please retry.');
      }

      // Helper: convert strings to numbers
      const castNumber = (val) => {
        if (val === '' || val === null || val === undefined) return undefined;
        const n = parseFloat(val);
        return isNaN(n) ? undefined : n;
      };

      // Clean cultural tags and general tags
      const cleanTags = (str) => {
        if (!str) return [];
        if (Array.isArray(str)) return str;
        return str.split(',').map(t => t.trim()).filter(Boolean);
      };

      // Generate a unique slug from the product name
      const baseSlug = formData.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Ensure specific uniqueness by appending a partial timestamp or random string
      const uniqueSuffix = Date.now().toString(36).toUpperCase();
      const uniqueSlug = (baseSlug || 'product') + '-' + uniqueSuffix;

      const productData = {
        ...formData,
        slug: formData.slug || uniqueSlug,
        price: castNumber(formData.price),
        stock: castNumber(formData.stock) || 0,
        craftingTime: castNumber(formData.craftingTime) || 0,
        tags: cleanTags(formData.tags),
        culturalTags: cleanTags(formData.culturalTags),
        images: finalImages,
        inventory: {
          quantity: castNumber(formData.stock) || 0,
        },
        variations: variations.map(v => ({
          size: v.size,
          color: v.color,
          colorHex: v.colorHex || '#000000',
          quantity: castNumber(v.quantity) || 0,
          sku: v.sku || generateECGSKU(),
          price: v.price ? castNumber(v.price) : castNumber(formData.price),
          image: v.image
        })),
        options: options.map(o => ({
          name: o.name,
          values: Array.isArray(o.values) ? o.values : o.values.split(',').map(val => val.trim()).filter(Boolean)
        })),
        seo: {
          title: formData.seo?.title || formData.name,
          description: formData.seo?.description || formData.shortDescription,
          keywords: formData.seo?.keywords || ''
        },
        shipping: {
          weight: castNumber(formData.shipping?.weight),
          shippingClass: formData.shipping?.shippingClass || 'standard',
          estimatedDelivery: formData.shipping?.estimatedDelivery || '',
          lowStockThreshold: castNumber(formData.shipping?.lowStockThreshold) || 5
        },
        status,
      };

      console.log('🚀 Publishing Masterpiece:', productData);

      if (formData._id) {
        await productAPI.updateProduct(formData._id, productData);
      } else {
        await productAPI.createProduct(productData);
      }

      localStorage.removeItem('addProductDraft');
      const msg = status === 'draft' ? 'Heritage draft saved.' : 'Product details synchronized successfully.';
      navigate('/artisan/dashboard', { state: { message: msg }, replace: true });
    } catch (err) {
      console.error('Submission failed', err);
      const code = err.response?.data?.code;
      const status = err.response?.status;
      // Verification-specific errors → show dedicated modal instead of inline error
      if (code === 'VERIFICATION_REQUIRED' || (status === 403 && code === 'ARTISAN_ONLY') || status === 403) {
        setVerificationModalOpen(true);
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Connection lost. Please try again.';
        setError(errorMsg);

        // Specific toast for duplicates to guide the user
        if (err.response?.data?.code === 'DUPLICATE_PRODUCT' || 
            err.response?.data?.code === 'DUPLICATE_ENTRY' || 
            errorMsg.toLowerCase().includes('already exists')) {
          toast.error("Product name or SKU already exists. Use the 'Generate' button for a new unique SKU or change the name.", {
            duration: 6000,
            icon: '⚠️'
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => submitProduct('draft');
  const handlePublish = () => submitProduct('active');

  const handleGenerateDescription = async () => {
    setAiLoading(true);
    try {
      const title = formData.name.trim();
      const tagsArr = formData.culturalTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      const materials = formData.materials || '';
      const story = formData.story || '';
      const res = await aiAPI.generateDescription(title, tagsArr, materials, story);
      if (res.data && res.data.description) {
        setFormData(prev => ({ ...prev, description: res.data.description }));
      }
    } catch (err) {
      console.error('AI description error', err);
      // prefer the detailed message if available, otherwise fall back
      const msg =
        err.response?.data?.details ||
        err.response?.data?.message ||
        err.message ||
        'Failed to generate description';
      toast.error(`AI Assist: ${msg}`);
    } finally {
      setAiLoading(false);
    }
  };

  const openPreview = () => setPreviewOpen(true);
  const closePreview = () => setPreviewOpen(false);

  const renderPreview = () => (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-8 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Left: Image Side */}
        <div className="md:w-1/2 bg-gray-50 relative min-h-[300px] md:min-h-0">
          {images.length > 0 ? (
            <img
              src={(images.find(img => img.isPrimary) || images[0]).url}
              alt="Main Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
              <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="font-bold uppercase tracking-widest text-xs">No Imagery Uploaded</p>
            </div>
          )}

          <div className="absolute top-8 left-8">
            <span className="px-4 py-2 bg-white/90 backdrop-blur-md text-gray-900 text-[10px] font-black rounded-full tracking-widest uppercase shadow-sm">
              Artisan Preview
            </span>
          </div>

          {formData.originRegion && (
            <div className="absolute bottom-8 left-8">
              <div className="bg-ethiopian-gold/90 backdrop-blur-md px-4 py-2 rounded-xl text-white shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-tighter opacity-80 mb-0.5">Handcrafted in</p>
                <p className="font-bold text-sm tracking-tight">{formData.originRegion}, Ethiopia</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Info Side */}
        <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto space-y-8 bg-white custom-scrollbar text-left relative">
          <div className="space-y-4">
            <button
              onClick={closePreview}
              className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all sticky top-0 float-right mb-4 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center space-x-2 text-ethiopian-gold">
              <span className="text-[10px] font-black uppercase tracking-widest">{formData.category || 'Category'}</span>
              <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
              <span className="text-[10px] font-black uppercase tracking-widest">{formData.subcategory || 'Artistry'}</span>
            </div>

            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">{formData.name || 'Untitled Masterpiece'}</h1>
            <p className="text-2xl font-light text-gray-500 tracking-tighter">ETB {formData.price || '0.00'}</p>
          </div>

          <div className="space-y-4 border-t border-gray-50 pt-8">
            <p className="text-sm text-gray-600 leading-relaxed font-medium italic">
              "{formData.shortDescription || 'A brief glimpse into the artisan\'s soul...'}"
            </p>
            <div className="text-gray-700 text-sm leading-relaxed space-y-4 whitespace-pre-wrap">
              {formData.description || 'Full narrative pending... This is where the story of your craft comes to life for the world.'}
            </div>
          </div>

          {variations.length > 0 && (
            <div className="space-y-4 pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Available Options</p>
              <div className="flex flex-wrap gap-2">
                {variations.map((v, i) => (
                  <div key={i} className="px-4 py-2 border border-gray-100 rounded-xl text-xs font-bold bg-gray-50 text-gray-700 flex items-center space-x-2">
                    {v.colorHex && <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: v.colorHex }}></div>}
                    <span>{v.size || v.color || 'Standard'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4">
            {formData.materials && (
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Materials</p>
                <p className="text-sm font-bold text-gray-800">{formData.materials}</p>
              </div>
            )}
            {formData.dimensions && (
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Dimensions</p>
                <p className="text-sm font-bold text-gray-800">{formData.dimensions}</p>
              </div>
            )}
          </div>

          <button
            disabled
            className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-bold tracking-tight shadow-xl shadow-gray-200 opacity-50 cursor-not-allowed"
          >
            Add to Bag (Preview Only)
          </button>

          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            EthioCraft Global Artist Collective
          </p>
        </div>
      </div>
    </div>
  );

  // Show loading if authentication is being checked
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Verification gate — unverified artisans cannot add products
  const isVerified = user?.verification?.status === 'approved';

  // UI rendering below
  return (
    <div className="min-h-screen bg-gray-50/50 py-8 pb-32">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <button
              onClick={() => navigate('/artisan/dashboard')}
              className="text-gray-500 hover:text-gray-700 mb-2 flex items-center text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('add_product.back_to_dashboard')}
            </button>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {isEditMode ? t('add_product.page_title_edit') : t('add_product.page_title_create')}
            </h1>
            <p className="text-gray-500 mt-1">
              {isEditMode ? t('add_product.page_subtitle_edit') : t('add_product.page_subtitle_create')}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center shadow-sm"
            >
              {t('add_product.save_draft')}
            </button>
            <button
              type="button"
              onClick={openPreview}
              className="px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center shadow-md shadow-gray-200"
            >
              {t('add_product.preview')}
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} className="mb-6 shadow-sm border-red-100" />}

        {/* Verification gate banner */}
        {!isVerified && (
          <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-xl shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-red-800">Account Not Verified</p>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                Your account must be approved by Admin before you can publish products.
                You can save drafts, but the <strong>Publish</strong> button will remain disabled until your verification is approved.
              </p>
              <button
                onClick={() => navigate('/artisan/verification')}
                className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-black rounded-xl hover:bg-red-700 transition-all"
              >
                Go to Verification →
              </button>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative px-2">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div key={s} className="flex flex-col items-center relative z-10 w-full first:w-auto last:w-auto">
                <div
                  onClick={() => s <= step && setStep(s)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 cursor-pointer ${step >= s
                    ? 'bg-ethiopian-gold border-ethiopian-gold text-white shadow-lg'
                    : 'bg-white border-gray-200 text-gray-400'
                    }`}
                >
                  {step > s ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                <span className={`text-[10px] uppercase font-bold mt-3 tracking-widest hidden md:block ${step >= s ? 'text-ethiopian-gold' : 'text-gray-400'}`}>
                  {[
                    t('add_product.steps.info'),
                    t('add_product.steps.media'),
                    t('add_product.steps.craft'),
                    t('add_product.steps.variants'),
                    t('add_product.steps.inventory'),
                    t('add_product.steps.seo'),
                    t('add_product.steps.review')
                  ][s - 1]}
                </span>
              </div>
            ))}
            {/* Progress line background */}
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-gray-200 -z-0">
              <div
                className="h-full bg-ethiopian-gold transition-all duration-700 ease-in-out"
                style={{ width: `${((step - 1) / 6) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Product Information */}
            {step === 1 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-5">
                  <h2 className="text-xl font-bold text-gray-900">{t('add_product.product_basics')}</h2>
                  <p className="text-gray-400 text-sm">{t('add_product.product_basics_sub')}</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.product_name')}</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={(e) => {
                        handleInputChange(e);
                        // Auto-slug: only for new products
                        if (!isEditMode && (!formData.slug || formData.slug === formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))) {
                          const s = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                          setFormData(prev => ({ ...prev, slug: s }));
                        }
                      }}
                      required
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all text-gray-900 font-medium"
                      placeholder={t('add_product.product_name_placeholder')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.category')}</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                      >
                        <option value="">{t('add_product.select_category')}</option>
                        {categories.map(c => (<option key={c} value={c}>{c}</option>))}
                      </select>
                    </div>

                    {formData.category && (
                      <div className="animate-fade-in">
                        <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.subcategory')}</label>
                        <select
                          name="subcategory"
                          value={formData.subcategory}
                          onChange={handleInputChange}
                          className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                        >
                          <option value="">{t('add_product.select_subcategory')}</option>
                          {(subcategories[formData.category] || []).map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.origin_region')}</label>
                      <select
                        name="originRegion"
                        value={formData.originRegion}
                        onChange={(e) => {
                          handleInputChange(e);
                          setFormData(prev => ({ ...prev, originZone: '' })); // Reset zone when region changes
                        }}
                        required
                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                      >
                        <option value="">{t('add_product.select_region')}</option>
                        {ethiopianRegions.map(r => (<option key={r} value={r}>{r}</option>))}
                      </select>
                    </div>

                    <div className={formData.originRegion ? 'animate-fade-in' : 'opacity-50 pointer-events-none'}>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.origin_zone')}</label>
                      <select
                        name="originZone"
                        value={formData.originZone}
                        onChange={handleInputChange}
                        required={!!formData.originRegion}
                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                      >
                        <option value="">{t('add_product.select_zone')}</option>
                        {(regionsAndZones[formData.originRegion] || []).map(z => (<option key={z} value={z}>{z}</option>))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.base_price')}</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-gray-400">ETB</span>
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          required
                          min="0"
                          step="0.01"
                          className="w-full pl-16 pr-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.short_description')}</label>
                    <textarea
                      name="shortDescription"
                      value={formData.shortDescription}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      maxLength={200}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all resize-none font-medium"
                      placeholder={t('add_product.short_description_placeholder')}
                    />
                    <div className="text-right text-[10px] text-gray-400 mt-2 font-bold tracking-widest uppercase">
                      {formData.shortDescription.length} / 200
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-gray-700">{t('add_product.full_description')}</label>
                      <button
                        type="button"
                        onClick={handleGenerateDescription}
                        disabled={aiLoading}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1.5 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span>{aiLoading ? t('add_product.ai_generating') : t('add_product.ai_storyteller')}</span>
                      </button>
                    </div>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={8}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium leading-relaxed"
                      placeholder={t('add_product.full_description_placeholder')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Media Management */}
            {step === 2 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-5">
                  <h2 className="text-xl font-bold text-gray-900">{t('add_product.product_media')}</h2>
                  <p className="text-gray-400 text-sm">{t('add_product.product_media_sub')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Front View Slot */}
                  <div 
                    onClick={() => document.getElementById('frontInput').click()}
                    className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer group ${images.some(img => img.viewType === 'front') ? 'border-ethiopian-gold bg-amber-50/10' : 'border-gray-100 hover:border-ethiopian-gold hover:bg-amber-50/20'}`}
                  >
                    {images.find(img => img.viewType === 'front') ? (
                      <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden shadow-lg mb-4">
                        <img src={images.find(img => img.viewType === 'front').url} alt="Front View" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold uppercase tracking-widest">{t('add_product.front_view')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-gray-300 group-hover:text-ethiopian-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <p className="text-gray-700 font-bold">{t('add_product.front_view')}</p>
                    <p className="text-gray-400 text-xs mt-1">{t('add_product.front_view_sub')}</p>
                    <input id="frontInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files, 'front')} />
                  </div>

                  {/* Back View Slot */}
                  <div 
                    onClick={() => document.getElementById('backInput').click()}
                    className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer group ${images.some(img => img.viewType === 'back') ? 'border-ethiopian-gold bg-amber-50/10' : 'border-gray-100 hover:border-ethiopian-gold hover:bg-amber-50/20'}`}
                  >
                    {images.find(img => img.viewType === 'back') ? (
                      <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden shadow-lg mb-4">
                        <img src={images.find(img => img.viewType === 'back').url} alt="Back View" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold uppercase tracking-widest">{t('add_product.back_view')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-gray-300 group-hover:text-ethiopian-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <p className="text-gray-700 font-bold">{t('add_product.back_view')}</p>
                    <p className="text-gray-400 text-xs mt-1">{t('add_product.back_view_sub')}</p>
                    <input id="backInput" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files, 'back')} />
                  </div>
                </div>

                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('fileInput').click()}
                  className="border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center hover:border-ethiopian-gold hover:bg-amber-50/20 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-gray-300 group-hover:text-ethiopian-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-bold">{t('add_product.add_more_views')}</p>
                  <p className="text-gray-400 text-xs mt-1">{t('add_product.add_more_views_sub')}</p>
                  <input
                    id="fileInput"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((img, idx) => (
                      <div key={idx} className={`relative group aspect-square rounded-2xl overflow-hidden border-2 transition-all ${img.isPrimary ? 'border-ethiopian-gold ring-4 ring-ethiopian-gold/10' : 'border-transparent shadow-sm'}`}>
                        <img src={img.url} alt="preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          {!img.isPrimary && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setImages(prev => prev.map((item, i) => ({ ...item, isPrimary: i === idx })));
                              }}
                              className="p-2 bg-white rounded-full text-ethiopian-gold hover:bg-ethiopian-gold hover:text-white transition-all transform hover:scale-110"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImages(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-2 bg-white rounded-full text-red-600 hover:bg-red-600 hover:text-white transition-all transform hover:scale-110"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        {img.isPrimary && (
                          <div className="absolute top-3 left-3 px-2 py-0.5 bg-ethiopian-gold text-white text-[10px] font-black rounded-lg tracking-widest shadow-lg">
                            {t('add_product.set_primary').toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2V8a2 2 0 002 2z" />
                    </svg>
                    <label className="text-sm font-bold text-gray-700">{t('add_product.video_showcase')}</label>
                  </div>
                  <input
                    type="text"
                    name="videoUrl"
                    value={formData.videoUrl}
                    onChange={handleInputChange}
                    className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                    placeholder={t('add_product.video_placeholder')}
                  />
                  {videoWarning && <p className="text-xs text-red-500 font-bold">{videoWarning}</p>}
                </div>
              </div>
            )}

            {/* Section 3: Craft & Cultural Details */}
            {step === 3 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-5">
                  <h2 className="text-xl font-bold text-gray-900">{t('add_product.craft_culture')}</h2>
                  <p className="text-gray-400 text-sm">{t('add_product.craft_culture_sub')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.materials')}</label>
                    <input
                      type="text"
                      name="materials"
                      value={formData.materials}
                      onChange={handleInputChange}
                      required
                      placeholder={t('add_product.materials_placeholder')}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.dimensions')}</label>
                    <input
                      type="text"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleInputChange}
                      required
                      placeholder={t('add_product.dimensions_placeholder')}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.crafting_time')}</label>
                    <input
                      type="number"
                      name="craftingTime"
                      value={formData.craftingTime}
                      onChange={handleInputChange}
                      placeholder={t('add_product.crafting_time_placeholder')}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.cultural_tags')}</label>
                    <input
                      type="text"
                      name="culturalTags"
                      value={formData.culturalTags}
                      onChange={handleInputChange}
                      placeholder={t('add_product.cultural_tags_placeholder')}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.artisan_story')}</label>
                    <textarea
                      name="story"
                      value={formData.story}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder={t('add_product.artisan_story_placeholder')}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.care_instructions')}</label>
                    <textarea
                      name="careInstructions"
                      value={formData.careInstructions}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder={t('add_product.care_instructions_placeholder')}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Variations Management */}
            {step === 4 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('add_product.variants_title')}</h2>
                    <p className="text-gray-400 text-sm">{t('add_product.variants_sub')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariation}
                    className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center text-sm shadow-md"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('add_product.new_variant')}
                  </button>
                </div>

                {variations.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">{t('add_product.no_variants')}</p>
                    <p className="text-gray-400 text-sm">Add options like Small, Medium, Large or Red, Blue.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {variations.map((v, idx) => (
                      <div key={idx} className="bg-gray-50/50 rounded-[2rem] p-6 border border-gray-100 relative group animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="md:col-span-1 space-y-4">
                            <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('add_product.variant_size')}</label>
                              <input
                                type="text"
                                value={v.size}
                                placeholder="e.g. Medium"
                                onChange={e => updateVariation(idx, 'size', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-ethiopian-gold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('add_product.variant_color')}</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={v.colorHex}
                                  onChange={e => updateVariation(idx, 'colorHex', e.target.value)}
                                  className="w-12 h-12 border-none bg-transparent cursor-pointer rounded-xl overflow-hidden shrink-0"
                                />
                                <input
                                  type="text"
                                  value={v.color}
                                  placeholder="Harar Gold"
                                  onChange={e => updateVariation(idx, 'color', e.target.value)}
                                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-ethiopian-gold"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('add_product.base_price')}</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">ETB</span>
                              <input
                                type="number"
                                value={v.price || formData.price}
                                onChange={e => updateVariation(idx, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-ethiopian-gold"
                              />
                            </div>
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('add_product.variant_stock')}</label>
                            <input
                              type="number"
                              value={v.quantity}
                              onChange={e => updateVariation(idx, 'quantity', parseInt(e.target.value) || 0)}
                              min="0"
                              className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-ethiopian-gold"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('add_product.variant_sku')}</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={v.sku}
                                placeholder="Optional (Auto-generated)"
                                onChange={e => updateVariation(idx, 'sku', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-[10px] font-black tracking-widest text-gray-500 focus:ring-2 focus:ring-ethiopian-gold pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => updateVariation(idx, 'sku', generateECGSKU())}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-ethiopian-gold transition-colors"
                                title="Generate Unique SKU"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariation(idx)}
                          className="absolute -top-3 -right-3 w-8 h-8 bg-white text-gray-300 hover:text-red-500 rounded-full shadow-lg border border-gray-100 flex items-center justify-center transition-all hover:scale-110"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}


                {/* Custom Options / Specifications Builder */}
                <div className="border-t border-gray-50 pt-8 mt-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{t('add_product.custom_specs')}</h3>
                      <p className="text-gray-400 text-sm">{t('add_product.custom_specs_sub')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={addOption}
                      className="px-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center text-sm shadow-sm border border-gray-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('add_product.add_label')}
                    </button>
                  </div>

                  {options.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                      <p className="text-gray-500 text-sm font-medium">No custom labels applied.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {options.map((option, idx) => (
                        <div key={idx} className="flex gap-4 items-start bg-gray-50 p-4 rounded-2xl border border-gray-100 relative group">
                          <div className="w-1/3">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Label Name</label>
                            <input
                              type="text"
                              value={option.name}
                              placeholder="e.g. Frame Material"
                              onChange={e => updateOption(idx, 'name', e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-ethiopian-gold"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Choices (Comma separated)</label>
                            <input
                              type="text"
                              value={Array.isArray(option.values) ? option.values.join(', ') : option.values}
                              placeholder="e.g. Oak, Metal, Glass"
                              onChange={e => updateOption(idx, 'values', e.target.value)}
                              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-ethiopian-gold"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 5: Inventory & Shipping */}
            {step === 5 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-5">
                  <h2 className="text-xl font-bold text-gray-900">{t('add_product.logistics_shipping')}</h2>
                  <p className="text-gray-400 text-sm">{t('add_product.logistics_shipping_sub')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.total_quantity')}</label>
                      <input
                        type="number"
                        name="stock"
                        value={formData.stock}
                        onChange={handleInputChange}
                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.low_stock_level')}</label>
                      <input
                        type="number"
                        name="shipping.lowStockThreshold"
                        value={formData.shipping.lowStockThreshold}
                        onChange={handleInputChange}
                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                        placeholder="Notify me at 5 pieces"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.weight_kg')}</label>
                      <div className="relative">
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">kg</span>
                        <input
                          type="number"
                          name="shipping.weight"
                          value={formData.shipping.weight}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full pl-5 pr-12 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.shipping_class')}</label>
                      <select
                        name="shipping.shippingClass"
                        value={formData.shipping.shippingClass}
                        onChange={handleInputChange}
                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                      >
                        <option value="standard">{t('add_product.shipping_standard')}</option>
                        <option value="express">{t('add_product.shipping_express')}</option>
                        <option value="heavy">{t('add_product.shipping_heavy')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.estimated_delivery')}</label>
                  <input
                    type="text"
                    name="shipping.estimatedDelivery"
                    value={formData.shipping.estimatedDelivery}
                    onChange={handleInputChange}
                    placeholder="e.g. 7-14 Business Days"
                    className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Section 6: SEO Optimization */}
            {step === 6 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-5">
                  <h2 className="text-xl font-bold text-gray-900">{t('add_product.discovery_seo')}</h2>
                  <p className="text-gray-400 text-sm">{t('add_product.discovery_seo_sub')}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.meta_title')}</label>
                    <input
                      type="text"
                      name="seo.title"
                      value={formData.seo.title}
                      onChange={handleInputChange}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                      placeholder={t('add_product.meta_title')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.meta_description')}</label>
                    <textarea
                      name="seo.description"
                      value={formData.seo.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium resize-none"
                      placeholder={t('add_product.meta_description')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('add_product.meta_keywords')}</label>
                    <input
                      type="text"
                      name="seo.keywords"
                      value={formData.seo.keywords}
                      onChange={handleInputChange}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                      placeholder="ethiopian, artisan, handwoven, luxury"
                    />
                  </div>
                </div>

                {/* Search Result Preview */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-4">{t('add_product.google_preview')}</p>
                  <div className="space-y-1">
                    <p className="text-blue-700 text-xl font-medium hover:underline cursor-pointer truncate">
                      {formData.seo.title || formData.name || 'Your Product Title'}
                    </p>
                    <p className="text-green-800 text-sm truncate">
                      https://ethiocraft.global/products/{formData.slug}
                    </p>
                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                      {formData.seo.description || formData.shortDescription || 'Your masterpiece, crafted with heritage and hope for the world.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 7: Final Review */}
            {step === 7 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-8 animate-fade-in shadow-sm">
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{t('add_product.ready_to_shine')}</h2>
                  <p className="text-gray-500 max-w-sm mx-auto mt-2">{t('add_product.ready_to_shine_sub')}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('add_product.steps.media')}</p>
                    <p className="text-lg font-bold text-gray-900">{images.length}</p>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('add_product.steps.variants')}</p>
                    <p className="text-lg font-bold text-gray-900">{variations.length}</p>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('add_product.publish')}</p>
                    <p className="text-lg font-bold text-green-600">Draft</p>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('add_product.category').replace('*', '').trim()}</p>
                    <p className="text-lg font-bold text-gray-900 truncate px-2">{formData.category || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-8 py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('add_product.previous')}
                </button>
              ) : <div></div>}

              {step < 7 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-10 py-3.5 bg-ethiopian-gold text-white font-black rounded-2xl hover:bg-ethiopian-earth transition-all shadow-lg shadow-ethiopian-gold/20 flex items-center"
                >
                  {t('add_product.continue')}
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={loading || isUploading || !isVerified}
                    className="px-12 py-3.5 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                  >
                    {isUploading ? t('add_product.uploading') : loading ? (isEditMode ? t('add_product.updating') : t('add_product.publishing')) : (isEditMode ? t('add_product.update_product') : t('add_product.publish_mastery'))}
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  {!isVerified && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 bg-gray-900 text-white text-xs rounded-xl text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {t('add_product.verification_required')}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8 text-left">
            {/* Sidebar Cards */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <svg className="w-5 h-5 text-ethiopian-gold mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                {t('add_product.artisan_tips')}
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1 italic text-left">{t('add_product.cultural_detail')}</p>
                  <p className="text-sm leading-relaxed text-gray-200">{t('add_product.cultural_detail_sub')}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1 italic text-left">{t('add_product.photography')}</p>
                  <p className="text-sm leading-relaxed text-gray-200">{t('add_product.photography_sub')}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-3xl p-8 border border-amber-100">
              <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('add_product.trust_guarantee')}
              </h3>
              <p className="text-sm text-amber-800/80 leading-relaxed">
                {t('add_product.trust_guarantee_sub')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {previewOpen && renderPreview()}

      {/* Verification In Progress Modal */}
      {verificationModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">{t('add_product.verification_title')}</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              {t('add_product.verification_sub')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setVerificationModalOpen(false)}
                className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                {t('add_product.close')}
              </button>
              <button
                onClick={() => navigate('/artisan/verification')}
                className="flex-1 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black hover:bg-gray-700 transition-all"
              >
                {t('add_product.go_to_verification')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProduct;