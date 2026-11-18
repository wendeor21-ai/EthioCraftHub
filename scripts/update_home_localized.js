const fs = require('fs');
const path = './client/src/pages/Home.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `  const getLocalized = (item, field, fallbackKey) => {
    if (!item) return fallbackKey ? t(fallbackKey) : '';
    // 1. Try language specific field (e.g. title_am)
    if (item[\`\${field}_\${currentLang}\`]) return item[\`\${field}_\${currentLang}\`];
    // 2. Try legacy field if current is English
    if (currentLang === 'en' && item[field]) return item[field];
    // 3. Fallback to global translation or legacy field as last resort
    return fallbackKey ? t(fallbackKey) : item[field] || '';
  };`;

const replacementStr = `  const getLocalized = (item, field, fallbackKey) => {
    if (!item) return fallbackKey ? t(fallbackKey) : '';
    // 1. Language specific field (e.g. title_am or title_en)
    if (item[\`\${field}_\${currentLang}\`]) return item[\`\${field}_\${currentLang}\`];
    // Special alias: subtitle <-> description
    if (field === 'subtitle') {
      if (item[\`description_\${currentLang}\`]) return item[\`description_\${currentLang}\`];
      if (item.subtitle) return item.subtitle;
      if (item.description) return item.description;
      if (item.description_en) return item.description_en;
    }
    if (field === 'title') {
      if (item.title) return item.title;
      if (item.title_en) return item.title_en;
    }
    // 2. Generic field or English fallback
    if (item[field]) return item[field];
    if (item[\`\${field}_en\`]) return item[\`\${field}_en\`];
    // 3. Fallback to dictionary
    return fallbackKey ? t(fallbackKey) : '';
  };`;

const normContent = content.replace(/\r\n/g, '\n');
const normTarget = targetStr.replace(/\r\n/g, '\n');
const normRepl = replacementStr.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const updated = normContent.replace(normTarget, normRepl);
  fs.writeFileSync(path, updated, 'utf8');
  console.log('Successfully updated Home.jsx getLocalized');
} else {
  console.log('Target not found in Home.jsx');
}

