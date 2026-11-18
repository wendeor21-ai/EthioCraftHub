const fs = require('fs');
const path = require('path');

// 1. Update Navbar.jsx
const navPath = path.join(__dirname, '..', 'client', 'src', 'components', 'common', 'Navbar.jsx');
if (fs.existsSync(navPath)) {
  let nav = fs.readFileSync(navPath, 'utf8');
  if (!nav.includes('getFileUrl')) {
    nav = "import { getFileUrl } from '../../utils/getFileUrl';\n" + nav;
  }
  // Replace the logo rendering logic to use getFileUrl cleanly
  nav = nav.replace(
    /\{headerLogo \|\| settings\.logoUrl \? \([\s\S]*?\<\![\s\S]*?\> \: \(/,
    `{headerLogo || settings.logoUrl ? (
                  <img
                    src={getFileUrl(headerLogo || settings.logoUrl)}
                    alt="logo"
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (`
  );
  fs.writeFileSync(navPath, nav, 'utf8');
  console.log('Navbar.jsx updated');
}

// 2. Update Home.jsx
const homePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'Home.jsx');
if (fs.existsSync(homePath)) {
  let home = fs.readFileSync(homePath, 'utf8');
  if (!home.includes('getFileUrl')) {
    home = "import { getFileUrl } from '../utils/getFileUrl';\n" + home;
  }
  home = home.replace(/src=\{slide\.image\}/g, 'src={getFileUrl(slide.image)}');
  fs.writeFileSync(homePath, home, 'utf8');
  console.log('Home.jsx updated');
}

// 3. Update Footer.jsx
const footerPath = path.join(__dirname, '..', 'client', 'src', 'components', 'common', 'Footer.jsx');
if (fs.existsSync(footerPath)) {
  let footer = fs.readFileSync(footerPath, 'utf8');
  if (!footer.includes('getFileUrl')) {
    footer = "import { getFileUrl } from '../../utils/getFileUrl';\n" + footer;
  }
  footer = footer.replace(
    /src=\{footerLogo\.startsWith\("\/"\) \? `\$\{api\.defaults\.baseURL\.replace\(\/\\\/api\\\/\?\$\/, ""\)\}\$\{footerLogo\}` : footerLogo\}/g,
    'src={getFileUrl(footerLogo)}'
  );
  fs.writeFileSync(footerPath, footer, 'utf8');
  console.log('Footer.jsx updated');
}

