export function getHighResImage(url: string, size = 800) {
  if (!url) return url;
  return url.replace(/(\d+x\d+)(?=(?:ia|bb)-75\.webp)/, `${size}x${size}`);
}
