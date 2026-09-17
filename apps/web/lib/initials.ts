export function getInitials(
  name: string | null | undefined,
  fallback: string,
): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (words.length === 0) {
    return fallback.charAt(0).toUpperCase();
  }

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
