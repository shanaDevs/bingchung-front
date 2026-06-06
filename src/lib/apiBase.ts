/** Backend origin without /api suffix (e.g. http://localhost:4000) */
export function getApiOrigin(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  return url.replace(/\/api\/?$/, '');
}
