// Get the next Sunday (week ending date)
function getNextSunday() {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + daysUntilSunday);
  return sunday.toISOString().split('T')[0];
}

// Get last Sunday (most recent completed week)
function getLastSunday() {
  const today = new Date();
  const day = today.getDay();
  const daysBack = day === 0 ? 7 : day;
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - daysBack);
  return lastSunday.toISOString().split('T')[0];
}

// Get current week's Sunday (this week's ending date)
function getCurrentWeekEndingDate() {
  return getNextSunday();
}

// Format date nicely e.g. "Jan 26"
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Check if today is Monday
function isMonday() {
  return new Date().getDay() === 1;
}

module.exports = { getNextSunday, getLastSunday, getCurrentWeekEndingDate, formatDate, isMonday };
