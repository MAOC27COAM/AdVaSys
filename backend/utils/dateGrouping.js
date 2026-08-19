const LIMA_TIMEZONE = 'America/Lima';

const limaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LIMA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const limaTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  timeZone: LIMA_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const limaDisplayDateFormatter = new Intl.DateTimeFormat('es-PE', {
  timeZone: LIMA_TIMEZONE,
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

/**
 * Returns YYYY-MM-DD for a Date in America/Lima.
 */
const getLimaDateKey = (date) => limaDateFormatter.format(new Date(date));

/**
 * Returns HH:mm:ss for a Date in America/Lima.
 */
const getLimaTimeLabel = (date) => limaTimeFormatter.format(new Date(date));

/**
 * Returns a human-readable date label in America/Lima.
 */
const getLimaDisplayDateLabel = (date) => {
  const normalizedDate =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? `${date}T12:00:00`
      : date;

  return limaDisplayDateFormatter.format(new Date(normalizedDate));
};

/**
 * Groups items by Lima calendar day. Preserves insertion order within each day.
 * @param {Array} items
 * @param {(item: unknown) => Date|string} getDate
 * @param {(item: unknown) => unknown} mapItem
 */
const groupByLimaDay = (items, getDate, mapItem = (item) => item) => {
  const dayMap = new Map();

  for (const item of items) {
    const dateKey = getLimaDateKey(getDate(item));
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, []);
    }
    dayMap.get(dateKey).push(mapItem(item));
  }

  return Array.from(dayMap.entries())
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, dayItems]) => ({
      date,
      displayDate: getLimaDisplayDateLabel(date),
      items: dayItems,
    }));
};

module.exports = {
  LIMA_TIMEZONE,
  getLimaDateKey,
  getLimaTimeLabel,
  getLimaDisplayDateLabel,
  groupByLimaDay,
};
