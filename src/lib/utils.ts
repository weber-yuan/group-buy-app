export function formatDate(dateStr: string): string {
  const hasTime = dateStr.includes('T');
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  if (!hasTime) return datePart;
  return `${datePart} ${d.getHours()} 點`;
}

export function getDaysLeft(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  if (!endDate.includes('T')) end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isExpired(endDate: string): boolean {
  return getDaysLeft(endDate) < 0;
}

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function getLabel(index: number): string {
  return LABELS[index] || String(index + 1);
}

const FAKE_NAMES = ['王小明', '李美麗', '張大華', '陳志偉', '林淑芬', '黃建國', '劉宗翰', '吳芷宜', '周俊傑', '許雅婷'];
export function randomFakeName(): string {
  return FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
}

/** image_url field stores either a plain URL string or a JSON array of URLs */
export function parseImages(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  try {
    const parsed = JSON.parse(imageUrl);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // plain string URL
  }
  return [imageUrl];
}
