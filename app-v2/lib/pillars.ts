// Pillar identity — keys/labels/emoji mirror v1 (web/lib/pillars.ts); accent
// colors are new in v2 and used across cards, bars, pills, and chips.
export const PILLARS = [
  { key: 'social_life', label: 'Social Life', emoji: '👥', color: '#54a0f8' },
  { key: 'physical_health', label: 'Physical Health', emoji: '💪', color: '#f87066' },
  { key: 'mental_health', label: 'Mental Health', emoji: '🧠', color: '#a78bfa' },
  { key: 'meaningful_job', label: 'Meaningful Job', emoji: '💼', color: '#7c8cf8' },
  { key: 'hobbies', label: 'Hobbies', emoji: '🎨', color: '#fb923c' },
  { key: 'manifesto_life_design', label: 'Life Design', emoji: '📋', color: '#2dd4bf' },
  { key: 'intellectual_stimulation', label: 'Intellectual Stimulation', emoji: '📚', color: '#fde047' },
  { key: 'meaning_purpose', label: 'Meaning & Purpose', emoji: '🌟', color: '#f5b14c' },
  { key: 'romantic_love', label: 'Romantic Love', emoji: '❤️', color: '#f472b6' },
  { key: 'financial', label: 'Financial', emoji: '💰', color: '#4ade80' },
  { key: 'trying_something_new', label: 'Trying Something New', emoji: '🚀', color: '#22d3ee' },
] as const;

export type PillarKey = (typeof PILLARS)[number]['key'];
export type Pillar = (typeof PILLARS)[number];

export const pillarByKey = (key: string): Pillar | undefined =>
  PILLARS.find(p => p.key === key);

export interface Goal {
  pillar: PillarKey;
  goal: string;
  trackable: boolean;
  target: number;
  current: number;
  score: number;
  satisfaction: number;
}

// Non-trackable goals store a status code in {pillar}_current
// (schema unchanged; v1 never reads `current` for non-trackable goals):
// 0 = Not started, 1 = In progress, 2 = Done.
export const STATUS_LABELS = ['Not started', 'In progress', 'Done'] as const;
