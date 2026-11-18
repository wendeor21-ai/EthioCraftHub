/**
 * Centralized Date & Time Utility for EthioCraft Global
 * 
 * Supports:
 * - Automatic Ethiopian Calendar (EC / ዓ.ም.) when language is Amharic ('am')
 * - Automatic Gregorian Calendar (GC) when language is English ('en') or others
 * - Traditional Ethiopian 12-hour Time cycle:
 *     Western 01:52 AM -> Ethiopian 7:52 (ከሌሊቱ 7:52)
 *     (Ethiopian hour = (Western Addis Ababa hour + 6) % 12 || 12)
 * - Standard Western 12-hour Time cycle:
 *     Western 01:52 AM -> 01:52 AM (in English mode)
 */

export const ETHIOPIAN_MONTHS = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

/**
 * Converts a Date object or string to Ethiopian Calendar components { year, month, day, monthName }
 */
export function getEthiopianDateComponents(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-ethiopic', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(d);
    let day, month, year;
    for (const p of parts) {
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'year') year = parseInt(p.value, 10);
    }
    if (day && month && year && year < 2050 && year > 1900) {
      const monthName = ETHIOPIAN_MONTHS[month - 1] || `ወር ${month}`;
      return { year, month, day, monthName };
    }
  } catch (_) {}

  // Fallback math calculation if Intl not available
  const gy = d.getUTCFullYear();
  const gm = d.getUTCMonth() + 1;
  const gd = d.getUTCDate();
  
  const isLeap = (gy % 4 === 3);
  const newYearDay = isLeap ? 12 : 11;
  
  let ey;
  if (gm < 9 || (gm === 9 && gd < newYearDay)) {
    ey = gy - 8;
  } else {
    ey = gy - 7;
  }

  const gMonthDays = [0, 31, (gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let daysFromSept11 = 0;
  if (gm >= 9) {
    if (gm === 9) daysFromSept11 = gd - newYearDay;
    else {
      daysFromSept11 = (30 - newYearDay) + gd;
      for (let m = 10; m < gm; m++) daysFromSept11 += gMonthDays[m];
    }
  } else {
    daysFromSept11 = (30 - newYearDay) + 31 + 30 + 31;
    for (let m = 1; m < gm; m++) daysFromSept11 += gMonthDays[m];
    daysFromSept11 += gd;
  }

  let em, ed;
  if (daysFromSept11 < 0) {
    em = 13;
    ed = 5 + daysFromSept11 + (isLeap ? 1 : 0);
  } else {
    em = Math.floor(daysFromSept11 / 30) + 1;
    ed = (daysFromSept11 % 30) + 1;
  }
  const monthName = ETHIOPIAN_MONTHS[em - 1] || `ወር ${em}`;
  return { year: ey, month: em, day: ed, monthName };
}

/**
 * Format Ethiopian Time (Habesha 12-hour cycle starting from sunrise 6:00 AM)
 * e.g., 01:52 AM Western -> 7:52 Night (ከሌሊቱ 7:52)
 */
export function getEthiopianTime(dateInput) {
  if (!dateInput) return { time: '', period: '', full: '', timeOnly: '' };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { time: '', period: '', full: '', timeOnly: '' };

  const utcHours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const addisHours = (utcHours + 3) % 24;

  const ethHour = (addisHours + 6) % 12 || 12;
  const minStr = String(minutes).padStart(2, '0');

  let period = 'ጥዋት';
  if (addisHours >= 0 && addisHours < 6) period = 'ከሌሊቱ';
  else if (addisHours >= 6 && addisHours < 12) period = 'ጥዋት';
  else if (addisHours >= 12 && addisHours < 16) period = 'ከሰዓት';
  else if (addisHours >= 16 && addisHours < 18) period = 'ከቀኑ';
  else period = 'ከምሽቱ';

  const timeOnly = `${ethHour}:${minStr}`;
  const full = `${period} ${timeOnly}`;

  return {
    time: timeOnly,
    timeOnly,
    period,
    full,
    rawHour: addisHours,
    rawMin: minutes,
    ethHour
  };
}

/**
 * Format Western Time (12-hour AM/PM)
 */
export function getWesternTime(dateInput) {
  if (!dateInput) return { time: '', period: '', full: '', timeOnly: '' };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { time: '', period: '', full: '', timeOnly: '' };

  const utcHours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const addisHours = (utcHours + 3) % 24;
  const westHour = (addisHours % 12) || 12;
  const minStr = String(minutes).padStart(2, '0');
  const period = addisHours >= 12 ? 'PM' : 'AM';
  const timeOnly = `${String(westHour).padStart(2, '0')}:${minStr} ${period}`;

  return {
    time: timeOnly,
    timeOnly,
    period,
    full: timeOnly
  };
}

/**
 * Main Formatter:
 * When lang is 'am' -> returns Ethiopian Calendar (EC) + Ethiopian Time (7:52)
 * When lang is 'en' (or other) -> returns Gregorian Calendar (GC) + Western Time (01:52 AM)
 */
export function formatOrderDateTime(dateInput, lang = null) {
  if (!dateInput) return { date: 'N/A', time: '', timeOnly: '', full: 'N/A', calendar: 'GC' };

  let currentLang = lang;
  if (!currentLang && typeof window !== 'undefined') {
    currentLang = localStorage.getItem('i18nextLng') || localStorage.getItem('language') || 'am';
  }
  const isAmharic = (currentLang || '').startsWith('am');

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return { date: String(dateInput), time: '', timeOnly: '', full: String(dateInput), calendar: 'GC' };
  }

  if (isAmharic) {
    // 🇪🇹 ETHIOPIAN CALENDAR (EC) & ETHIOPIAN TIME (e.g. 7:52)
    const ethComp = getEthiopianDateComponents(d);
    const ethTime = getEthiopianTime(d);
    
    const dateStr = ethComp 
      ? `${ethComp.monthName} ${ethComp.day}፣ ${ethComp.year} ዓ.ም.` 
      : `${d.toLocaleDateString('am-ET')} ዓ.ም.`;
    
    return {
      date: dateStr,
      time: ethTime.full,
      timeOnly: ethTime.time,
      full: `${dateStr} ${ethTime.full}`,
      calendar: 'EC',
      isAmharic: true
    };
  } else {
    // 🌐 GREGORIAN CALENDAR (GC) & WESTERN TIME (e.g. 01:52 AM)
    const gregDate = d.toLocaleDateString('en-GB', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const westTime = getWesternTime(d);

    return {
      date: gregDate,
      time: westTime.full,
      timeOnly: westTime.time,
      full: `${gregDate} ${westTime.full}`,
      calendar: 'GC',
      isAmharic: false
    };
  }
}

/**
 * Returns the full date-time string safely
 */
export function formatDateTimeFull(dateInput, lang = null) {
  const res = formatOrderDateTime(dateInput, lang);
  return res ? (res.full || res.date || '') : '';
}


