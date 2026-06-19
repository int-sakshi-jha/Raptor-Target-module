/** True when HTML has visible text or embedded media (image, table, etc.). */
export function hasRichTextContent(html: string | null | undefined): boolean {
  if (!html?.trim()) return false;

  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();

  if (text.length > 0) return true;

  return /<(img|table|video|iframe|svg|picture)\b/i.test(html);
}
