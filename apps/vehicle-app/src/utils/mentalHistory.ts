import { appendHealthRecord, readHealthRecords } from './healthRecords';
import { STORAGE_KEYS, isMentalSummarySavingAllowed } from './attuneMode';

export interface MentalHistoryItem {
  id: string;
  date: string;
  summaryText: string;
  themes: string[];
  schemaVersion?: 2;
  completed?: boolean;
  consented?: boolean;
  moodTrend?: string;
  providerType?: string;
}

const MOOD_LABELS: Record<string, string> = { STRESSED: 'Gergin', TIRED: 'Yorgun', RELAXED: 'Rahat', NEUTRAL: 'Nötr' };
export function translateMood(text: string): string {
  return text.replace(/\b(STRESSED|TIRED|RELAXED|NEUTRAL)\b/gi, code => MOOD_LABELS[code.toUpperCase()]);
}

export function mentalThemeStats(history: MentalHistoryItem[]) {
  const completed = history.filter(item => item.schemaVersion === 2 && item.completed === true && item.consented === true);
  const counts = new Map<string, number>();
  for (const item of completed) for (const theme of new Set(item.themes.map(t => t.trim()).filter(Boolean))) {
    counts.set(theme, (counts.get(theme) || 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  // Largest remainders: rounded pie slices sum to 100; each session contributes once per unique theme.
  const rows = [...counts].map(([theme, count]) => ({ theme, count, percent: Math.floor(count / total * 100), fraction: count / total * 100 % 1 }));
  const order = [...rows].sort((a, b) => b.fraction - a.fraction || a.theme.localeCompare(b.theme));
  const remainder = total ? 100 - rows.reduce((sum, r) => sum + r.percent, 0) : 0;
  for (let i = 0; i < remainder; i++) order[i].percent++;
  return { sessions: completed.length, mentions: total, rows };
}

export function readMentalHistory(): MentalHistoryItem[] {
  try {
    const entries = readHealthRecords('mental');
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
  if (!isMentalSummarySavingAllowed()) throw new Error('SUMMARY_CONSENT_REQUIRED');
  const existing = localStorage.getItem(STORAGE_KEYS.MENTAL_HISTORY);
  const readable = readMentalHistory();
  if (existing !== null) {
    const parsed = JSON.parse(existing);
    // Refuse to replace unreadable user records with a seemingly empty new history.
    if (!Array.isArray(parsed) || parsed.length !== readable.length) throw new Error('EXISTING_HISTORY_UNREADABLE');
  }
  return appendHealthRecord('mental', item) as unknown as MentalHistoryItem[];
}
