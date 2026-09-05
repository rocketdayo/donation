import { TicketRecord } from '../types';

/**
 * Normalizes user input:
 * - Converts full-width alphanumeric to half-width (ｅ.g. ｓ２５５８３ -> s25583, ２５５８３ -> 25583)
 * - Trims both half-width and full-width spaces
 * - Lowercases all characters
 */
export function normalizeQueryString(str: string): string {
  if (!str) return '';
  return str
    // Convert full-width alphanumeric to half-width
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    // Remove full-width and half-width leading/trailing spaces
    .replace(/^[\s\u3000]+|[\s\u3000]+$/g, '')
    .toLowerCase();
}

/**
 * Finds a matching ticket based on:
 * 1. Full email match (e.g. s25583@stu.seikyo.ed.jp)
 * 2. Student ID / Account username match before '@' (e.g. s25583)
 * 3. Raw student numbers without leading 's' (e.g. 25583 matches s25583@...)
 * 4. Domain auto-completion (e.g. s25583 + @stu.seikyo.ed.jp)
 * 5. Ticket number exact match if input is "#12" or pure number matching ticketNumber
 */
export function findMatchingTicket(
  query: string,
  tickets: TicketRecord[]
): { ticket: TicketRecord | null; matchedBy: 'exact_email' | 'student_id' | 'number_without_s' | 'ticket_number' | null } {
  const q = normalizeQueryString(query);
  if (!q || tickets.length === 0) {
    return { ticket: null, matchedBy: null };
  }

  // 1. Exact email match
  const exactEmail = tickets.find(t => normalizeQueryString(t.email) === q);
  if (exactEmail) {
    return { ticket: exactEmail, matchedBy: 'exact_email' };
  }

  // 2. Student ID match (before @ in email, e.g. s25583)
  const byUsername = tickets.find(t => {
    const userPart = normalizeQueryString(t.email).split('@')[0];
    return userPart === q;
  });
  if (byUsername) {
    return { ticket: byUsername, matchedBy: 'student_id' };
  }

  // 3. Number without 's' (e.g. user entered "25583", ticket email username is "s25583")
  if (/^\d{3,6}$/.test(q)) {
    const withS = `s${q}`;
    const byWithS = tickets.find(t => {
      const userPart = normalizeQueryString(t.email).split('@')[0];
      return userPart === withS;
    });
    if (byWithS) {
      return { ticket: byWithS, matchedBy: 'number_without_s' };
    }
  }

  // 4. If user entered "s25583", and ticket email username without 's' is "25583"
  if (/^s\d{3,6}$/.test(q)) {
    const withoutS = q.slice(1);
    const byWithoutS = tickets.find(t => {
      const userPart = normalizeQueryString(t.email).split('@')[0];
      return userPart === withoutS;
    });
    if (byWithoutS) {
      return { ticket: byWithoutS, matchedBy: 'student_id' };
    }
  }

  // 5. Domain auto-completed match
  if (!q.includes('@')) {
    const autoEmail = `${q}@stu.seikyo.ed.jp`;
    const byAutoEmail = tickets.find(t => normalizeQueryString(t.email) === autoEmail);
    if (byAutoEmail) {
      return { ticket: byAutoEmail, matchedBy: 'student_id' };
    }
  }

  // 6. Name match fallback if exact
  const byName = tickets.find(t => normalizeQueryString(t.name) === q);
  if (byName) {
    return { ticket: byName, matchedBy: 'student_id' };
  }

  return { ticket: null, matchedBy: null };
}
