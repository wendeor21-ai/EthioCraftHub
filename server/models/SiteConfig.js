const mongoose = require('mongoose');

const siteConfigSchema = new mongoose.Schema({
  // Typically only one document exists, but we can query by key or just get the first
  configType: { type: String, default: 'homepage', unique: true },
  
  heroSlides: {
    type: [{
      title_en: { type: String, default: '' },
      title_am: { type: String, default: '' },
      title_or: { type: String, default: '' },
      title_ti: { type: String, default: '' },
      subtitle_en: { type: String, default: '' },
      subtitle_am: { type: String, default: '' },
      subtitle_or: { type: String, default: '' },
      subtitle_ti: { type: String, default: '' },
      description_en: { type: String, default: '' },
      description_am: { type: String, default: '' },
      description_or: { type: String, default: '' },
      description_ti: { type: String, default: '' },
      cta_en: { type: String, default: '' },
      cta_am: { type: String, default: '' },
      cta_or: { type: String, default: '' },
      cta_ti: { type: String, default: '' },
      badge_en: { type: String, default: '' },
      badge_am: { type: String, default: '' },
      badge_or: { type: String, default: '' },
      badge_ti: { type: String, default: '' },
      image: String,
      link: String,
      title: String, // Backward compatibility
      subtitle: String,
      description: String,
      cta: String,
      badge: String,
      hideDescription: { type: Boolean, default: false }
    }],
    default: [
      {
        title_en: "Discover Authentic Ethiopian Crafts",
        title_am: "ትክክለኛ የኢትዮጵያ የእጅ ጥበብ ውጤቶችን ያግኙ",
        title_or: "Oomisha harkaa Itoophiyaa isa dhugaa argadhu",
        title_ti: "ትክክለኛ ኢትዮጵያዊ ናይ ኢድ ጥበብ ስራሕቲ ርኸቡ",
        subtitle_en: "Handcrafted Treasures from the Heart of Africa",
        subtitle_am: "ከአፍሪካ እምብርት በእጅ የተሰሩ ውድ ቅርሶች",
        subtitle_or: "Qabeenya Harkaa Giddu-gala Afrikaa Irraa",
        subtitle_ti: "ካብ እምብርት ኣፍሪቃ ብኢድ ዝተሰርሑ ክቡራት ቅርሶች",
        description_en: "Connect with skilled artisans and discover unique pieces that blend traditions with contemporary design.",
        description_am: "ከባለሙያ የእጅ ባለሞያዎች ጋር የተገናኙ እና ወጎችን ከዘመናዊ ዲዛይን ጋር የሚያዋህዱ ልዩ ስራዎችን ያግኙ።",
        description_or: "Ogeessota harkaa waliin wal qunnamaa fi aadaa deizayinii ammayyaa waliin walitti makuun fakkiiwwan addaa argadhaa.",
        description_ti: "ምስ ክኢላታት ሰብ ሞያ ኢድ ተራኸቡ ከምኡ እውን ምስ ባህሊ ምስ ዘመናዊ ዲዛይን ዘወሃህዱ ፍሉያት ስራሕቲ ርኸቡ።",
        cta_en: "Explore Collection",
        cta_am: "ስብስቦችን ያስሱ",
        cta_or: "Kuusaa Ilaali",
        cta_ti: "ስብስባት ዳህስሱ",
        badge_en: "New Collection",
        badge_am: "አዲስ ስብስብ",
        badge_or: "Kuusaa Haaraa",
        badge_ti: "ሓድሽ ስብስብ",
        image: "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=1400&q=80",
        link: "/products"
      }
    ]
  },
  
  heritageTitle_en: { type: String, default: 'Preserving Ethiopian Cultural Heritage' },
  heritageTitle_am: { type: String, default: 'የኢትዮጵያን የባህል ቅርስ መጠበቅ' },
  heritageTitle_or: { type: String, default: 'Hamba Adaa Itoophiyaa Tiksuu' },
  heritageTitle_ti: { type: String, default: 'ባህላዊ ርስታትን ኢትዮጵያ ምሕላው' },
  
  heritageDescription_en: { 
    type: String, 
    default: 'Every product on EthioCraft Global comes with its cultural story, connecting you to the rich heritage and traditional techniques passed down through generations of Ethiopian artisans.' 
  },
  heritageDescription_am: { 
    type: String, 
    default: 'በኢትዮ-ክራፍት ግሎባል ላይ ያለ እያንዳንዱ ምርት የባህል ታሪኩን ይዞ ይቀርባል፣ ይህም ከትውልድ ወደ ትውልድ ከተላለፉ የበለፀጉ ቅርሶች እና ባህላዊ ቴክኒኮች ጋር ያገናኝዎታል።' 
  },
  heritageDescription_or: { 
    type: String, 
    default: 'Tokkoo tokkoon oomishaa EthioCraft Global irratti seenaa aadaa isaa waliin dhiyaata, kunis hambaa badhaadhina qabuufi malawwan aadaa dhalootaa dhalootatti dabarfaman waliin wal isini qunnamsiisa.' 
  },
  heritageDescription_ti: { 
    type: String, 
    default: 'ኣብ ኢትዮ-ክራፍት ግሎባል ዘሎ ነፍሲ ወከፍ ፍርያት ባህላዊ ታሪኹ ሒዙ ይቐርብ፣ እዚ ድማ ምስቲ ካብ ወለዶ ናብ ወለዶ ዝመሓላለፍ ሃብታም ባህላዊ ርስታትን ባህላዊ ሜላታትን የራኽበኩም።' 
  },
  
  heritageImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  },
  headerLogo: {
    type: String,
    default: ''
  },
  footerLogo: {
    type: String,
    default: ''
  },
  commissionRate: {
    type: Number,
    default: 5
  }
}, { timestamps: true });

module.exports = mongoose.model('SiteConfig', siteConfigSchema);
