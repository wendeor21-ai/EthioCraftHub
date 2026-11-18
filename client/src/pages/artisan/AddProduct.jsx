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

const AddProduct = ({ insideDashboard, onSelectTab }) => {
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

  // Background image uploader: starts uploading images immediately when selected
  // so by the time the artisan finishes the steps, the images are already uploaded!
  const uploadSingleImageInBackground = async (file, tempUrl) => {
    try {
      const fd = new FormData();
      fd.append('files', file);
      const resp = await userAPI.uploadFiles(fd);
      const uploadedPath = resp.data?.files?.[0];
      if (uploadedPath) {
        setImages(prev => prev.map(img => 
          img.url === tempUrl ? { ...img, url: uploadedPath, originalFile: null, isUploading: false } : img
        ));
      }
    } catch (err) {
      console.warn('Background upload will retry at publish:', err);
      setImages(prev => prev.map(img => 
        img.url === tempUrl ? { ...img, isUploading: false } : img
      ));
    }
  };

  const handleImageUpload = (files, viewType = 'general') => {
    const arr = Array.from(files);
    const imageObjects = arr.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      // Fire background upload right away for swift performance
      uploadSingleImageInBackground(file, previewUrl);
      return {
        url: previewUrl,
        isPrimary: (images.length === 0 && index === 0) || viewType === 'front',
        viewType: index === 0 ? viewType : 'general',
        originalFile: file,
        isUploading: true
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
      colorHex: '#C5A059',
      quantity: 1,
      sku: generateECGSKU(),
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
    setIsUploading(false);

    // Wait if any background upload is currently in flight (up to 3 seconds)
    const pendingBackground = images.some(img => img.isUploading);
    if (pendingBackground) {
      await new Promise(r => setTimeout(r, 1200));
    }

    // only upload images with an actual File object attached that haven't finished yet
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
      const data = resp.data;
      const uploadedPaths = data.files || [];

      // replace preview urls with server paths
      let uploadIndex = 0;
      const newImages = images.map(img => {
        if (img.originalFile) {
          const newUrl = uploadedPaths[uploadIndex++] || img.url;
          return { url: newUrl, isPrimary: img.isPrimary, originalFile: null, isUploading: false };
        }
        return img;
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
    let toastId = null;

    try {
      // Only essential fields required for publish; all others are strictly optional
      if (status === 'active') {
        if (!formData.name || formData.name.trim().length < 2) {
          setError('የምርት ስም ማስገባት ግዴታ ነው (Product name is required).');
          toast.error('እባክዎ የምርት ስም ያስገቡ');
          setStep(1);
          setLoading(false); return;
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
          setError('ትክክለኛ ዋጋ ማስገባት ግዴታ ነው (Price is required).');
          toast.error('እባክዎ ዋጋ ያስገቡ');
          setStep(1);
          setLoading(false); return;
        }
        if (!formData.category) {
          setError('ዘርፍ መምረጥ ግዴታ ነው (Please select a category).');
          toast.error('እባክዎ የምርት ዘርፍ ይምረጡ');
          setStep(1);
          setLoading(false); return;
        }
        if (images.length === 0) {
          setError('ቢያንስ አንድ የምርት ፎቶ ያስፈልጋል (At least one product image is required).');
          toast.error('እባክዎ ቢያንስ አንድ ፎቶ ያስገቡ');
          setStep(2);
          setLoading(false); return;
        }
        if (!formData.description || formData.description.trim().length < 5) {
          setError('የምርት መግለጫ ማስገባት ግዴታ ነው (Product description is required).');
          toast.error('እባክዎ የምርት መግለጫ ያስገቡ');
          setStep(1);
          setLoading(false); return;
        }
      }

      toastId = toast.loading(t('add_product.publishing_in_progress') || 'ምርቱን በማተም ላይ... እባክዎ ጥቂት ሰከንዶች ይጠብቁ');

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
      
      const uniqueSuffix = Date.now().toString(36).toUpperCase();
      const uniqueSlug = (baseSlug || 'product') + '-' + uniqueSuffix;

      // Filter out any blank variations or options
      const validVariations = variations
        .filter(v => (v.size && v.size.trim()) || (v.color && v.color.trim()) || v.sku)
        .map(v => ({
          size: v.size || '',
          color: v.color || '',
          colorHex: v.colorHex || '#C5A059',
          quantity: castNumber(v.quantity) || 1,
          sku: v.sku || generateECGSKU(),
          price: v.price ? castNumber(v.price) : castNumber(formData.price),
          image: v.image || ''
        }));

      const validOptions = options
        .filter(o => o.name && o.name.trim())
        .map(o => ({
          name: o.name.trim(),
          values: Array.isArray(o.values) 
            ? o.values 
            : o.values.split(',').map(val => val.trim()).filter(Boolean)
        }));

      const safeShortDesc = formData.shortDescription?.trim() 
        ? formData.shortDescription.trim() 
        : formData.description?.substring(0, 150) || '';

      const productData = {
        ...formData,
        shortDescription: safeShortDesc,
        slug: formData.slug || uniqueSlug,
        price: castNumber(formData.price),
        stock: castNumber(formData.stock) || 10,
        craftingTime: castNumber(formData.craftingTime) || 0,
        tags: cleanTags(formData.tags),
        culturalTags: cleanTags(formData.culturalTags),
        images: finalImages,
        inventory: {
          quantity: castNumber(formData.stock) || 10,
        },
        variations: validVariations,
        options: validOptions,
        seo: {
          title: formData.seo?.title || formData.name,
          description: formData.seo?.description || safeShortDesc,
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

      if (toastId) toast.dismiss(toastId);
      toast.success(t('add_product.publishing_success') || 'ምርቱ በተሳካ ሁኔታ ታትሟል!');

      localStorage.removeItem('addProductDraft');
      const msg = status === 'draft' ? 'Heritage draft saved.' : 'Product details synchronized successfully.';
      navigate('/artisan/dashboard', { state: { message: msg }, replace: true });
    } catch (err) {
      if (toastId) toast.dismiss(toastId);
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

  const handleContinue = () => {
    setError('');
    if (step === 1) {
      if (!formData.name || formData.name.trim().length < 2) {
        setError('እባክዎ የምርት ስም ያስገቡ (Product name is required, min 2 chars)');
        toast.error('እባክዎ የምርት ስም ያስገቡ');
        return;
      }
      if (!formData.category) {
        setError('እባክዎ የምርት ዘርፍ ይምረጡ (Please select a category)');
        toast.error('እባክዎ የምርት ዘርፍ ይምረጡ');
        return;
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        setError('እባክዎ ትክክለኛ የመነሻ ዋጋ ያስገቡ (Valid price is required)');
        toast.error('እባክዎ ዋጋ ያስገቡ');
        return;
      }
      if (!formData.description || formData.description.trim().length < 5) {
        setError('እባክዎ የምርት መግለጫ ያስገቡ (Description is required)');
        toast.error('እባክዎ የምርት መግለጫ ያስገቡ');
        return;
      }
    } else if (step === 2) {
      if (images.length === 0) {
        setError('እባክዎ ቢያንስ አንድ የምርት ፎቶ ያስገቡ (At least one product image is required)');
        toast.error('እባክዎ ቢያንስ 1 ምስል ያስገቡ');
        return;
      }
    }
    // Steps 3, 4, 5, 6 are ALL OPTIONAL! Advance smoothly!
    setStep(prev => Math.min(prev + 1, 7));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen bg-gray-50/50 py-4 sm:py-8 pb-24 sm:pb-32">
      <div className="container mx-auto px-3 sm:px-4 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <button
              onClick={() => (onSelectTab ? onSelectTab('dashboard') : navigate('/artisan/dashboard'))}
              className="text-gray-500 hover:text-gray-700 mb-1 sm:mb-2 flex items-center text-xs sm:text-sm font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('add_product.back_to_dashboard')}
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
              {isEditMode ? t('add_product.page_title_edit') : t('add_product.page_title_create')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
              {isEditMode ? t('add_product.page_subtitle_edit') : t('add_product.page_subtitle_create')}
            </p>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3.5 py-1.5 sm:px-5 sm:py-2.5 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all flex items-center shadow-xs"
            >
              {t('add_product.save_draft')}
            </button>
            <button
              type="button"
              onClick={openPreview}
              className="px-3.5 py-1.5 sm:px-5 sm:py-2.5 bg-gray-900 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl hover:bg-gray-800 transition-all flex items-center shadow-sm"
            >
              {t('add_product.preview')}
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} className="mb-4 sm:mb-6 shadow-sm border-red-100" />}

        {/* Verification gate banner */}
        {!isVerified && (
          <div className="mb-4 sm:mb-6 p-3.5 sm:p-5 bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl flex items-start gap-3 sm:gap-4">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg sm:rounded-xl shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-black text-red-800">Account Not Verified</p>
              <p className="text-[11px] sm:text-xs text-red-700 mt-1 leading-relaxed">
                Your account must be approved by Admin before you can publish products.
                You can save drafts, but the <strong>Publish</strong> button will remain disabled until your verification is approved.
              </p>
              <button
                onClick={() => navigate('/artisan/verification')}
                className="mt-2.5 px-3 py-1 sm:px-4 sm:py-1.5 bg-red-600 text-white text-xs font-black rounded-lg sm:rounded-xl hover:bg-red-700 transition-all"
              >
                Go to Verification →
              </button>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between relative px-2">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div key={s} className="flex flex-col items-center relative z-10 w-full first:w-auto last:w-auto">
                <div
                  onClick={() => s <= step && setStep(s)}
                  className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 cursor-pointer text-xs sm:text-sm font-bold ${step >= s
                    ? 'bg-ethiopian-gold border-ethiopian-gold text-white shadow-md'
                    : 'bg-white border-gray-200 text-gray-400'
                    }`}
                >
                  {step > s ? (
                    <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                <span className={`text-[9px] sm:text-[10px] uppercase font-bold mt-1.5 sm:mt-2.5 tracking-wider hidden md:block ${step >= s ? 'text-ethiopian-gold' : 'text-gray-400'}`}>
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
            <div className="absolute top-3.5 sm:top-5 left-4 right-4 sm:left-8 sm:right-8 h-0.5 bg-gray-200 -z-0">
              <div
                className="h-full bg-ethiopian-gold transition-all duration-700 ease-in-out"
                style={{ width: `${((step - 1) / 6) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            {/* Section 1: Product Information */}
            {step === 1 && (
              <div className="bg-white rounded-xl sm:rounded-3xl border border-gray-100 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-3 sm:pb-5">
                  <h2 className="text-base sm:text-xl font-bold text-gray-900">{t('add_product.product_basics')}</h2>
                  <p className="text-gray-400 text-xs sm:text-sm mt-0.5">{t('add_product.product_basics_sub')}</p>
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
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          {t('add_product.subcategory')}
                          <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                            (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                          </span>
                        </label>
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
                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                      >
                        <option value="">{t('add_product.select_region')}</option>
                        {ethiopianRegions.map(r => (<option key={r} value={r}>{r}</option>))}
                      </select>
                    </div>

                    <div className={formData.originRegion ? 'animate-fade-in' : 'opacity-50 pointer-events-none'}>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {t('add_product.origin_zone')}
                        <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                          (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                        </span>
                      </label>
                      <select
                        name="originZone"
                        value={formData.originZone}
                        onChange={handleInputChange}
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
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('add_product.short_description')}
                      <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                        (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                      </span>
                    </label>
                    <textarea
                      name="shortDescription"
                      value={formData.shortDescription}
                      onChange={handleInputChange}
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
              <div className="bg-white rounded-xl sm:rounded-3xl border border-gray-100 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-3 sm:pb-5">
                  <h2 className="text-base sm:text-xl font-bold text-gray-900">{t('add_product.product_media')}</h2>
                  <p className="text-gray-400 text-xs sm:text-sm mt-0.5">{t('add_product.product_media_sub')}</p>
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
                    <p className="text-gray-700 font-bold">
                      {t('add_product.back_view')}
                      <span className="ml-1.5 text-[11px] font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                      </span>
                    </p>
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
                  <p className="text-gray-700 font-bold">
                    {t('add_product.add_more_views')}
                    <span className="ml-1.5 text-[11px] font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                    </span>
                  </p>
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
                        {img.isUploading && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                            <span className="text-[10px] font-bold tracking-wider">በማስገባት ላይ...</span>
                          </div>
                        )}
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
                    <label className="text-sm font-bold text-gray-700">
                      {t('add_product.video_showcase')}
                      <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                      </span>
                    </label>
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

            {/* Section 3: Craft & Cultural Details (All strictly optional) */}
            {step === 3 && (
              <div className="bg-white rounded-xl sm:rounded-3xl border border-gray-100 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-3 sm:pb-5">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h2 className="text-base sm:text-xl font-bold text-gray-900">{t('add_product.craft_culture')}</h2>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-bold rounded-full">
                      {t('add_product.optional_badge')}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm mt-0.5">{t('add_product.craft_culture_sub')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('add_product.materials')}
                      <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                        (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="materials"
                      value={formData.materials}
                      onChange={handleInputChange}
                      placeholder={t('add_product.materials_placeholder')}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('add_product.dimensions')}
                      <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                        (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleInputChange}
                      placeholder={t('add_product.dimensions_placeholder')}
                      className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('add_product.crafting_time')}
                      <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                        (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                      </span>
                    </label>
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
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('add_product.cultural_tags')}
                      <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                        (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                      </span>
                    </label>
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
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('add_product.artisan_story')}
                      <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                        (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                      </span>
                    </label>
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
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      {t('add_product.care_instructions')}
                      <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                        (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                      </span>
                    </label>
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

            {/* Section 4: Variations & Custom Specifications (All strictly optional) */}
            {step === 4 && (
              <div className="bg-white rounded-xl sm:rounded-3xl border border-gray-100 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-100 pb-3 sm:pb-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <h2 className="text-base sm:text-xl font-bold text-gray-900">{t('add_product.variants_title')}</h2>
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-bold rounded-full">
                        {t('add_product.optional_badge')}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{t('add_product.variants_sub')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariation}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-xl transition-all flex items-center text-sm shadow-md shadow-amber-600/20 active:scale-95 shrink-0"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('add_product.new_variant')}
                  </button>
                </div>

                {variations.length === 0 ? (
                  <div className="text-center py-12 bg-amber-50/40 rounded-3xl border-2 border-dashed border-amber-200/60 p-6">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm text-amber-600">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <p className="text-gray-700 font-bold text-sm">{t('add_product.no_variants')}</p>
                    <p className="text-gray-500 text-xs mt-1 max-w-md mx-auto">
                      ምርትዎ የተለያየ መጠን ወይም ቀለም ከሌለው ይህን ክፍል ምንም ሳይሞሉ በደህና ማለፍ ይችላሉ።
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5">
                    {variations.map((v, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl p-6 border border-amber-200/80 shadow-sm relative space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            አማራጭ #{idx + 1} (Variant #{idx + 1})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeVariation(idx)}
                            className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {t('add_product.remove')}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('add_product.variant_size')}</label>
                            <input
                              type="text"
                              value={v.size}
                              placeholder={t('add_product.variant_size_placeholder')}
                              onChange={e => updateVariation(idx, 'size', e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('add_product.variant_color')}</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={v.colorHex || '#C5A059'}
                                onChange={e => updateVariation(idx, 'colorHex', e.target.value)}
                                className="w-10 h-10 border border-gray-200 bg-white cursor-pointer rounded-xl overflow-hidden shrink-0 p-0.5"
                                title="ቀለም ይምረጡ"
                              />
                              <input
                                type="text"
                                value={v.color}
                                placeholder={t('add_product.variant_color_placeholder')}
                                onChange={e => updateVariation(idx, 'color', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('add_product.variant_price')}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">ETB</span>
                              <input
                                type="number"
                                value={v.price !== '' ? v.price : ''}
                                placeholder={formData.price ? `${formData.price}` : '0.00'}
                                onChange={e => updateVariation(idx, 'price', e.target.value)}
                                className="w-full pl-11 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('add_product.variant_stock')}</label>
                            <input
                              type="number"
                              value={v.quantity}
                              min="0"
                              placeholder={t('add_product.variant_stock_placeholder')}
                              onChange={e => updateVariation(idx, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="pt-1">
                          <span className="text-[10px] text-gray-400 font-mono tracking-wider">
                            SKU: {v.sku || 'በራሱ የሚሞላ (Auto-generated)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}


                {/* Custom Options / Specifications Builder */}
                <div className="border-t border-gray-100 pt-8 mt-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{t('add_product.custom_specs')}</h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                          {t('add_product.optional_badge')}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm mt-1">{t('add_product.custom_specs_sub')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={addOption}
                      className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all flex items-center text-sm shadow-sm active:scale-95 shrink-0"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('add_product.add_label')}
                    </button>
                  </div>

                  {options.length === 0 ? (
                    <div className="text-center py-8 bg-blue-50/30 rounded-2xl border-2 border-dashed border-blue-200/50 p-6">
                      <p className="text-gray-600 text-sm font-semibold">{t('add_product.no_custom_specs')}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        ምሳሌ፡ ደንበኞች የክፈፍ አይነት ወይም የጥልፍ ቀለም እንዲመርጡ ከፈለጉ "+ አዲስ ምርጫ አክል" የሚለውን ይጫኑ።
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {options.map((option, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative space-y-3">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
                                {idx + 1}
                              </span>
                              ልዩ ምርጫ #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeOption(idx)}
                              className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              {t('add_product.remove')}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">{t('add_product.spec_name')}</label>
                              <input
                                type="text"
                                value={option.name}
                                placeholder={t('add_product.spec_name_placeholder')}
                                onChange={e => updateOption(idx, 'name', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">{t('add_product.spec_values')}</label>
                              <input
                                type="text"
                                value={Array.isArray(option.values) ? option.values.join(', ') : option.values}
                                placeholder={t('add_product.spec_values_placeholder')}
                                onChange={e => updateOption(idx, 'values', e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white"
                              />
                            </div>
                          </div>

                          {/* Live Interactive Chip Preview */}
                          {option.values && (
                            <div className="pt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">ቅድመ እይታ (Preview):</span>
                              {(Array.isArray(option.values) ? option.values : option.values.split(','))
                                .map(v => v.trim())
                                .filter(Boolean)
                                .map((val, chipIdx) => (
                                  <span key={chipIdx} className="px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold rounded-lg shadow-2xs">
                                    ✓ {val}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 5: Inventory & Shipping */}
            {step === 5 && (
              <div className="bg-white rounded-xl sm:rounded-3xl border border-gray-100 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-3 sm:pb-5">
                  <h2 className="text-base sm:text-xl font-bold text-gray-900">{t('add_product.logistics_shipping')}</h2>
                  <p className="text-gray-400 text-xs sm:text-sm mt-0.5">{t('add_product.logistics_shipping_sub')}</p>
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
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {t('add_product.low_stock_level')}
                        <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                        </span>
                      </label>
                      <input
                        type="number"
                        name="shipping.lowStockThreshold"
                        value={formData.shipping.lowStockThreshold}
                        onChange={handleInputChange}
                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                        placeholder="ምሳሌ፡ 5"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {t('add_product.weight_kg')}
                        <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">kg</span>
                        <input
                          type="number"
                          name="shipping.weight"
                          value={formData.shipping.weight}
                          onChange={handleInputChange}
                          step="0.01"
                          placeholder="ምሳሌ፡ 0.5"
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {t('add_product.estimated_delivery')}
                    <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      (አማራጭ — ሳይሞሉ ማለፍ ይችላሉ)
                    </span>
                  </label>
                  <input
                    type="text"
                    name="shipping.estimatedDelivery"
                    value={formData.shipping.estimatedDelivery}
                    onChange={handleInputChange}
                    placeholder="ምሳሌ፡ ከ3-7 የስራ ቀናት (3-7 Business Days)"
                    className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-ethiopian-gold transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {/* Section 6: SEO Optimization (Optional) */}
            {step === 6 && (
              <div className="bg-white rounded-xl sm:rounded-3xl border border-gray-100 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in shadow-sm">
                <div className="border-b border-gray-50 pb-3 sm:pb-5">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h2 className="text-base sm:text-xl font-bold text-gray-900">{t('add_product.discovery_seo')}</h2>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-bold rounded-full">
                      {t('add_product.optional_badge')}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm mt-0.5">{t('add_product.discovery_seo_sub')}</p>
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
              <div className="bg-white rounded-xl sm:rounded-3xl border border-gray-100 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in shadow-sm">
                <div className="text-center py-6 sm:py-10">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-6">
                    <svg className="w-7 h-7 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{t('add_product.ready_to_shine')}</h2>
                  <p className="text-gray-500 text-xs sm:text-sm max-w-sm mx-auto mt-1 sm:mt-2">{t('add_product.ready_to_shine_sub')}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 p-3.5 sm:p-6 bg-gray-50 rounded-xl sm:rounded-3xl border border-gray-100">
                  <div className="text-center">
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('add_product.steps.media')}</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{images.length}</p>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('add_product.steps.variants')}</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{variations.length}</p>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('add_product.publish')}</p>
                    <p className="text-base sm:text-lg font-bold text-green-600">Draft</p>
                  </div>
                  <div className="text-center border-l border-gray-200">
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('add_product.category').replace('*', '').trim()}</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900 truncate px-1 sm:px-2">{formData.category || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-3 sm:pt-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 sm:px-8 sm:py-3.5 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl hover:bg-gray-50 transition-all flex items-center shadow-xs"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('add_product.previous')}
                </button>
              ) : <div></div>}

              {step < 7 ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="px-5 py-2 sm:px-10 sm:py-3.5 bg-ethiopian-gold text-white text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl hover:bg-ethiopian-earth transition-all shadow-md shadow-ethiopian-gold/20 flex items-center"
                >
                  {t('add_product.continue')}
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={loading || isUploading || !isVerified}
                    className="px-6 py-2 sm:px-12 sm:py-3.5 bg-green-600 text-white text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl hover:bg-green-700 transition-all shadow-md shadow-green-600/20 flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                  >
                    {isUploading ? t('add_product.uploading') : loading ? (isEditMode ? t('add_product.updating') : t('add_product.publishing')) : (isEditMode ? t('add_product.update_product') : t('add_product.publish_mastery'))}
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5 sm:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div className="space-y-4 sm:space-y-8 text-left">
            {/* Sidebar Cards */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 text-white shadow-lg">
              <h3 className="text-sm sm:text-lg font-bold mb-3 sm:mb-4 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-ethiopian-gold mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                {t('add_product.artisan_tips')}
              </h3>
              <div className="space-y-2.5 sm:space-y-4">
                <div className="p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-2xl border border-white/10">
                  <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest mb-1 italic text-left">{t('add_product.cultural_detail')}</p>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-200">{t('add_product.cultural_detail_sub')}</p>
                </div>
                <div className="p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-2xl border border-white/10">
                  <p className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest mb-1 italic text-left">{t('add_product.photography')}</p>
                  <p className="text-xs sm:text-sm leading-relaxed text-gray-200">{t('add_product.photography_sub')}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-amber-100">
              <h3 className="text-sm sm:text-lg font-bold text-amber-900 mb-2 sm:mb-4 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('add_product.trust_guarantee')}
              </h3>
              <p className="text-xs sm:text-sm text-amber-800/80 leading-relaxed">
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