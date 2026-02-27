export const PILLARS = [
  { key: 'social_life', label: 'Social Life', emoji: '👥' },
  { key: 'physical_health', label: 'Physical Health', emoji: '💪' },
  { key: 'mental_health', label: 'Mental Health', emoji: '🧠' },
  { key: 'meaningful_job', label: 'Meaningful Job', emoji: '💼' },
  { key: 'hobbies', label: 'Hobbies', emoji: '🎨' },
  { key: 'manifesto_life_design', label: 'Life Design', emoji: '📋' },
  { key: 'intellectual_stimulation', label: 'Intellectual Stimulation', emoji: '📚' },
  { key: 'meaning_purpose', label: 'Meaning & Purpose', emoji: '🌟' },
  { key: 'romantic_love', label: 'Romantic Love', emoji: '❤️' },
  { key: 'financial', label: 'Financial', emoji: '💰' },
  { key: 'trying_something_new', label: 'Trying Something New', emoji: '🚀' },
] as const;

export type PillarKey = typeof PILLARS[number]['key'];

export interface Goal {
  pillar: PillarKey;
  goal: string;
  trackable: boolean;
  target: number;
  current: number;
  score: number;
}
