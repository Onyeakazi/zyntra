import i18n from 'i18next';

/**
 * Formats a post's created_at timestamp into a relative or human-readable format.
 * Examples: "Just now", "15m", "1h", "yesterday at 8:40AM", "2days", "Oct 15 at 8:40AM"
 * 
 * @param {string | Date} dateInput - The ISO timestamp or Date object to format.
 * @returns {string} The formatted date/time string.
 */
export const formatPostTime = (dateInput) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  const activeLang = (i18n.language || 'en').toLowerCase().split('-')[0];

  const formatTime = (d) => {
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes}${ampm}`;
  };

  // Less than 1 minute ago
  if (diffSecs < 60) {
    if (activeLang === 'es') return "Ahora mismo";
    if (activeLang === 'fr') return "À l'instant";
    if (activeLang === 'pt') return "Agora mesmo";
    return "Just now";
  }

  // Less than 1 hour ago (minutes representation)
  if (diffMins < 60) {
    return `${diffMins}m`;
  }

  // Less than 24 hours ago (hours representation)
  if (diffHours < 24) {
    const isSameDay = now.getDate() === date.getDate() &&
                      now.getMonth() === date.getMonth() &&
                      now.getFullYear() === date.getFullYear();
    if (isSameDay) {
      return `${diffHours}h`;
    }
  }

  // Check if Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.getDate() === date.getDate() &&
                      yesterday.getMonth() === date.getMonth() &&
                      yesterday.getFullYear() === date.getFullYear();

  if (isYesterday) {
    if (activeLang === 'es') return `ayer a las ${formatTime(date)}`;
    if (activeLang === 'fr') return `hier à ${formatTime(date)}`;
    if (activeLang === 'pt') return `ontem às ${formatTime(date)}`;
    return `yesterday at ${formatTime(date)}`;
  }

  // Calculate days difference
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfNow - startOfDate) / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    if (activeLang === 'es') return `${diffDays} días`;
    if (activeLang === 'fr') return `${diffDays} jours`;
    if (activeLang === 'pt') return `${diffDays} dias`;
    return `${diffDays}days`; // e.g. "2days"
  }

  // Older than 7 days: show month, day and time
  const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const esMonths = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const frMonths = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const ptMonths = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  let month = enMonths[date.getMonth()];
  if (activeLang === 'es') month = esMonths[date.getMonth()];
  else if (activeLang === 'fr') month = frMonths[date.getMonth()];
  else if (activeLang === 'pt') month = ptMonths[date.getMonth()];

  const day = date.getDate();
  const timeStr = formatTime(date);

  const atWord = activeLang === 'es' ? 'a las' : activeLang === 'fr' ? 'à' : activeLang === 'pt' ? 'às' : 'at';

  if (now.getFullYear() === date.getFullYear()) {
    return `${month} ${day} ${atWord} ${timeStr}`;
  } else {
    return `${month} ${day}, ${date.getFullYear()} ${atWord} ${timeStr}`;
  }
};
