import { STORAGE_KEYS } from './attuneMode';

export interface MentalHistoryItem {
  id: string;
  date: string;
  summaryText: string;
  themes: string[];
}

export function readMentalHistory(): MentalHistoryItem[] {
  try {
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.MENTAL_HISTORY) || '[]');
    if (!Array.isArray(entries)) return [];
    return entries.filter((item): item is MentalHistoryItem =>
      typeof item?.id === 'string' && typeof item.date === 'string' &&
      Number.isFinite(Date.parse(item.date)) && typeof item.summaryText === 'string' &&
      Array.isArray(item.themes) && item.themes.every((theme: unknown) => typeof theme === 'string'));
  } catch {
    return [];
  }
}

export function saveMentalHistory(item: MentalHistoryItem): MentalHistoryItem[] {
  const history = readMentalHistory().filter(entry => entry.id !== item.id);
  history.push(item);
  localStorage.setItem(STORAGE_KEYS.MENTAL_HISTORY, JSON.stringify(history));
  localStorage.setItem(STORAGE_KEYS.LATEST_MENTAL, JSON.stringify({
    dateTr: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
    primaryTheme: item.themes.join(' • ') || 'Günlük paylaşım',
    sessionCount: history.length,
    summaryText: item.summaryText,
    recommendation: 'Kayıtlı görüşme özeti'
  }));
  return history;
}
