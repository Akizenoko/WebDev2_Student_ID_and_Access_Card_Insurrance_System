export function formatFullName(p, { lastFirst = false } = {}) {
  if (!p) return 'Unknown';
  const middle = p.middle_name?.trim();
  const suffix = p.suffix?.trim();
  if (lastFirst) {
    const initial = middle ? ` ${middle[0].toUpperCase()}.` : '';
    return `${p.last_name}, ${p.first_name}${initial}${suffix ? ` ${suffix}` : ''}`;
  }
  return [p.first_name, middle, p.last_name, suffix].filter(Boolean).join(' ');
}