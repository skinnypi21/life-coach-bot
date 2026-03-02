// Simple keyword-based NLP parser
// Detects which life pillar is being referenced and extracts progress values

const PILLAR_KEYWORDS = {
  physical_health: [
    'gym', 'workout', 'exercise', 'run', 'ran', 'jog', 'walk', 'walked',
    'swim', 'swam', 'bike', 'biked', 'yoga', 'stretch', 'lift', 'lifted',
    'physical', 'health', 'sleep', 'slept', 'steps', 'hiit', 'crossfit',
    'weights', 'cardio', 'active', 'sport', 'tennis', 'basketball', 'soccer',
    'push-up', 'pull-up', 'pushup', 'pullup', 'squat', 'plank'
  ],
  mental_health: [
    'meditat', 'therapy', 'therapist', 'journal', 'journaled', 'breathe',
    'breathing', 'mindful', 'mindfulness', 'stress', 'anxious', 'anxiety',
    'calm', 'relax', 'rest', 'mental', 'mood', 'feelings', 'emotions',
    'self-care', 'selfcare', 'gratitude', 'grateful', 'reflect', 'reflection'
  ],
  social_life: [
    'friend', 'friends', 'family', 'call', 'called', 'text', 'texted',
    'hangout', 'hung out', 'dinner', 'lunch', 'coffee', 'meet', 'met',
    'social', 'party', 'event', 'date', 'mom', 'dad', 'sister', 'brother',
    'cousin', 'reunion', 'catch up', 'caught up', 'visited', 'visit'
  ],
  meaningful_job: [
    'work', 'worked', 'job', 'project', 'meeting', 'presentation',
    'deadline', 'client', 'colleague', 'boss', 'office', 'career',
    'promotion', 'interview', 'applied', 'application', 'resume',
    'skill', 'training', 'course', 'certification', 'professional',
    'networking', 'network', 'portfolio', 'accomplish', 'finish'
  ],
  hobbies: [
    'hobby', 'hobbies', 'side project', 'side hustle', 'creative',
    'art', 'draw', 'drew', 'paint', 'painted', 'music', 'play guitar',
    'played guitar', 'piano', 'sing', 'sang', 'cook', 'cooked', 'bake',
    'baked', 'garden', 'gardened', 'photo', 'photography', 'write',
    'wrote', 'code', 'coded', 'build', 'built', 'craft', 'crafted',
    'game', 'gamed', 'video game'
  ],
  intellectual_stimulation: [
    'read', 'reading', 'book', 'article', 'podcast', 'documentary',
    'learn', 'learned', 'study', 'studied', 'research', 'researched',
    'lecture', 'class', 'workshop', 'seminar', 'intellectual', 'think',
    'thought', 'idea', 'concept', 'philosophy', 'history', 'science',
    'ted talk', 'audiobook', 'pages', 'chapters', 'minutes of reading'
  ],
  meaning_purpose: [
    'purpose', 'meaning', 'volunteer', 'volunteered', 'donate', 'donated',
    'cause', 'impact', 'contribute', 'contributed', 'mission', 'vision',
    'values', 'legacy', 'inspire', 'inspired', 'community', 'help someone',
    'helped someone', 'giving back', 'church', 'spiritual', 'spirituality'
  ],
  romantic_love: [
    'partner', 'girlfriend', 'boyfriend', 'wife', 'husband', 'spouse',
    'relationship', 'romance', 'romantic', 'love', 'date night', 'anniversary',
    'affection', 'quality time', 'together', 'couple', 'intimacy'
  ],
  financial: [
    'save', 'saved', 'saving', 'invest', 'invested', 'investing', 'budget',
    'budgeted', 'money', 'finance', 'financial', 'debt', 'credit', 'expense',
    'spend', 'spent', 'income', 'salary', 'earning', 'profit', 'loss',
    'stock', 'crypto', 'retirement', '401k', 'ira', 'account', 'bank'
  ],
  manifesto_life_design: [
    'manifesto', 'life design', 'vision board', 'goal setting', 'plan',
    'planned', 'strategy', 'strategic', 'quarterly', 'annual', 'review',
    'reflect on life', 'big picture', 'priorities', 'values check',
    'life review', 'audit', 'life audit'
  ],
  trying_something_new: [
    'new', 'first time', 'first time ever', 'never before', 'try', 'tried',
    'experiment', 'experimented', 'explore', 'explored', 'adventure',
    'spontaneous', 'random', 'different', 'unusual', 'challenge', 'challenged',
    'outside comfort zone', 'comfort zone', 'brave', 'courageous'
  ]
};

const BLOCKER_KEYWORDS = [
  'blocked', 'blocker', "can't", 'cannot', 'stuck', 'struggling',
  'difficult', 'hard time', 'problem', 'issue', 'obstacle', 'barrier',
  "don't know how", 'not sure how', 'challenge', 'frustrated', 'overwhelmed',
  "haven't been able", 'failed', 'keep failing', 'procrastinat'
];

const NUMBER_WORDS = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'once': 1, 'twice': 2
};

// Detect which pillar(s) are mentioned in a message
function detectPillar(message) {
  const lower = message.toLowerCase();
  const scores = {};

  for (const [pillar, keywords] of Object.entries(PILLAR_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += keyword.split(' ').length; // multi-word phrases score higher
      }
    }
    if (score > 0) scores[pillar] = score;
  }

  if (Object.keys(scores).length === 0) return null;

  // Return the pillar with the highest score
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

// Extract a numeric progress value from the message
function extractNumber(message) {
  const lower = message.toLowerCase();

  // Look for explicit numbers first (e.g., "30 minutes", "5 pages", "3 times")
  const numMatch = lower.match(/\b(\d+)\s*(min|minutes?|hours?|pages?|times?|reps?|sets?|miles?|km|kilometers?|lbs?|pounds?|days?|sessions?|chapters?|books?|articles?|podcasts?)\b/);
  if (numMatch) return parseInt(numMatch[1]);

  // Look for plain numbers
  const plainMatch = lower.match(/\b(\d+)\b/);
  if (plainMatch) return parseInt(plainMatch[1]);

  // Look for number words
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (lower.includes(word)) return value;
  }

  // Default: if they mention doing the thing, count it as 1
  return 1;
}

// Detect if the message contains a blocker
function detectBlocker(message) {
  const lower = message.toLowerCase();
  return BLOCKER_KEYWORDS.some(keyword => lower.includes(keyword));
}

// Parse a free-form message and return structured data
function parseMessage(message) {
  const pillar = detectPillar(message);
  const value = pillar ? extractNumber(message) : null;
  const hasBlocker = detectBlocker(message);

  return {
    pillar,
    value,
    hasBlocker,
    raw: message
  };
}

// Detect if a goal text is trackable and extract its target value
// e.g. "Workout 3x" → { trackable: true, target: 3 }
// e.g. "Give the right amount of effort" → { trackable: false, target: 1 }
function detectTrackable(goalText) {
  if (!goalText) return { trackable: false, target: 1 };
  const text = goalText.toLowerCase();
  const patterns = [
    { re: /(\d+)\s*x\b/,             target: null  }, // "4x", "3x"
    { re: /(\d+)\s*times/,           target: null  }, // "3 times"
    { re: /(\d+)\s*pages/,           target: null  }, // "100 pages"
    { re: /(\d+)\s*(min|minutes)/,   target: null  }, // "30 min"
    { re: /(\d+)\s*(hour|hr)s?/,     target: null  }, // "2 hours"
    { re: /(\d+)\s*days/,            target: null  }, // "5 days"
    { re: /(\d+)\s*sessions?/,       target: null  }, // "3 sessions"
    { re: /every\s*(single\s*)?day/, target: 7     }, // "every day", "every single day"
    { re: /daily/,                   target: 7     }, // "daily"
  ];
  for (const p of patterns) {
    const m = text.match(p.re);
    if (m) {
      return { trackable: true, target: p.target !== null ? p.target : parseInt(m[1]) };
    }
  }
  return { trackable: false, target: 1 };
}

module.exports = { parseMessage, detectPillar, extractNumber, detectBlocker, detectTrackable, PILLAR_KEYWORDS };
