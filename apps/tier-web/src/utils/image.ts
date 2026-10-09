export function getHighResImage(url: string) {
  if (!url) return url;
  return url.replace(/(\d+x\d+)(?=(?:ia|bb)-75\.webp)/, '800x800');
}
