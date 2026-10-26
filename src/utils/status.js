export const STEPS = [
  { step: 1, key: 'submitted', title: 'Submitted', subtitle: 'Application & Docs Received' },
  { step: 2, key: 'processing', title: 'Processing', subtitle: 'Registrar Review & RFID Encoding' },
  { step: 3, key: 'ready', title: 'Ready for Pickup', subtitle: 'Available at Window 4' },
  { step: 4, key: 'released', title: 'Released', subtitle: 'Card Claimed by Student' },
];

export function getStepIndex(status) {
  const s = status?.toLowerCase();
  if (s === 'submitted') return 0;
  if (s === 'processing') return 1;
  if (s === 'ready') return 2;
  if (s === 'released') return 3;
  return -1;
}

export function isCardValidationOver(card) {
  if (!card) return false;
  if (card.status === 'expired') return true;
  if (!card.valid_until) return false;
  try {
    const validDate = new Date(card.valid_until);
    return !isNaN(validDate.getTime()) && validDate.getTime() < Date.now();
  } catch {
    return false;
  }
}
