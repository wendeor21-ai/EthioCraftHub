// Helper to build the correct file URL for uploaded documents/images.
export function getFileUrl(filePath) {
  if (!filePath) return '';
  let path = String(filePath).trim();

  // Strip localhost or 127.0.0.1
  if (/^https?:\/\/localhost(:\d+)?/i.test(path)) {
    path = path.replace(/^https?:\/\/localhost(:\d+)?/i, '');
  }
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?/i.test(path)) {
    path = path.replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/i, '');
  }

  // If it's already an external HTTPS/HTTP URL (e.g. Cloudinary, Unsplash, S3)
  if (/^https?:\/\//i.test(path)) return path;

  // Relative path (like /uploads/filename.png)
  return path.startsWith('/') ? path : `/${path}`;
}

export default getFileUrl;
