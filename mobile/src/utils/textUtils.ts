export const containsUrdu = (text: string | null | undefined): boolean => {
  if (!text) return false;
  // Regex to match Arabic/Urdu Unicode block
  const urduRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return urduRegex.test(text);
};
