// Helper to build the correct file URL for uploaded documents/images.
// Derives the server origin from REACT_APP_API_URL (stripping the /api
// suffix) so that it always matches the axios baseURL used elsewhere.
// Falls back to localhost:5000 — the default PORT in server.js.
export function getFileUrl(filePath) {
  if (!filePath) return null;
  // Already an absolute URL — return as-is
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  // Strip trailing /api (or /api/) to get the bare origin
  const baseUrl = apiUrl.replace(/\/api\/?$/, "");
  return `${baseUrl}${filePath.startsWith("/") ? filePath : `/${filePath}`}`;
}
