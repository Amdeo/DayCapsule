export const buildFtsContentMatchQuery = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const terms = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"*`);

  return terms.length > 0 ? terms.join(' AND ') : null;
};
