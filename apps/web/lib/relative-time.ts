const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const diffDays = Math.floor(
    (now.getTime() - new Date(iso).getTime()) / MS_PER_DAY,
  );

  if (diffDays < 1) {
    return "hoje";
  }
  if (diffDays < 7) {
    return diffDays === 1 ? "1 dia atrás" : `${diffDays} dias atrás`;
  }
  if (diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    return weeks === 1 ? "1 semana atrás" : `${weeks} semanas atrás`;
  }
  if (diffDays < 365) {
    const months = Math.round(diffDays / 30);
    return months === 1 ? "1 mês atrás" : `${months} meses atrás`;
  }
  const years = Math.round(diffDays / 365);
  return years === 1 ? "1 ano atrás" : `${years} anos atrás`;
}
