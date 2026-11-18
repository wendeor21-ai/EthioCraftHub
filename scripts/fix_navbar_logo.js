const fs = require('fs');
const path = require('path');

const navPath = path.join(__dirname, '..', 'client', 'src', 'components', 'common', 'Navbar.jsx');
let nav = fs.readFileSync(navPath, 'utf8');

const target = `{headerLogo || settings.logoUrl ? (
                  (() => {
                    const url = headerLogo || settings.logoUrl;
                    if (url.startsWith('http')) {
                      return <img src={url} alt="logo" className="w-full h-full object-contain" />;
                    }
                    const apiRoot = api.defaults.baseURL.replace(/\\/api\\/?$/, '');
                    const src = url.startsWith('/') ? \`\${apiRoot}\${url}\` : \`\${apiRoot}/\${url}\`;
                    return <img src={src} alt="logo" className="w-full h-full object-contain" />;
                  })()
                ) : (
                  <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}`;

const replacement = `{headerLogo || settings.logoUrl ? (
                  <img
                    src={getFileUrl(headerLogo || settings.logoUrl)}
                    alt="logo"
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}`;

// normalize CRLF before replace
const navNorm = nav.replace(/\r\n/g, '\n');
const targetNorm = target.replace(/\r\n/g, '\n');

if (navNorm.includes(targetNorm)) {
  const result = navNorm.replace(targetNorm, replacement);
  fs.writeFileSync(navPath, result, 'utf8');
  console.log('Successfully replaced Navbar logo block!');
} else {
  console.log('Target not found in Navbar');
}

