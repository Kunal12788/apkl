/**
 * Dynamically computes a font size based on the character length of a string.
 * Helps prevent overflows when large numbers are displayed in dashboard cards.
 * 
 * @param text The text or number to evaluate
 * @param maxChars The character count threshold before scaling down starts
 * @param baseRem The default font size in rem
 * @param minRem The minimum font size to scale down to (so it remains readable)
 * @returns An inline style object with the computed fontSize
 */
export const fitText = (text: string | number, maxChars: number = 8, baseRem: number = 2.25, minRem: number = 1.25) => {
  const str = String(text);
  const len = str.length;
  if (len <= maxChars) {
    return { fontSize: `${baseRem}rem` };
  }
  const scale = maxChars / len;
  const size = Math.max(baseRem * scale, minRem);
  return { fontSize: `${size}rem` };
};
