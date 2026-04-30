/**
 * Web Vitals Reporting for EthioCraft Global
 * 
 * Measures and reports performance metrics
 * Note: web-vitals package is optional - install with: npm install web-vitals
 */

const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Optional: Uncomment if you install web-vitals package
    // import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    //   getCLS(onPerfEntry);
    //   getFID(onPerfEntry);
    //   getFCP(onPerfEntry);
    //   getLCP(onPerfEntry);
    //   getTTFB(onPerfEntry);
    // });
  }
};

export default reportWebVitals;
