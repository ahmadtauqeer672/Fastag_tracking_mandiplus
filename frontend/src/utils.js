export function timeAgo(dateStr) {
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function statusClass(status) {
  if (!status) return 'idle';
  const s = status.toLowerCase().replace(/\s+/g, '-');
  if (s.includes('transit')) return 'in-transit';
  if (s.includes('halt')) return 'halted';
  if (s.includes('reach')) return 'reached';
  if (s.includes('active')) return 'active';
  if (s.includes('fail')) return 'failed';
  return 'idle';
}

// Display label for a user role, e.g. "transporter" -> "Transporter", "ceo" -> "CEO".
export function roleLabel(role) {
  if (!role) return '';
  if (role === 'ceo') return 'CEO';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
