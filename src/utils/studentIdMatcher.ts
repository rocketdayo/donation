import { TicketRecord } from '../types';

export function normalizeQueryString(str: string): string {
  if (!str) return '';
  return str
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/^[\s\u3000]+|[\s\u3000]+$/g, '')
    .toLowerCase();
}

export function findMatchingTicket(
  query: string,
  tickets: TicketRecord[]
): { ticket: TicketRecord | null; matchedBy: 'exact_email' | 'student_id' | 'number_without_s' | 'ticket_number' | null } {
  const q = normalizeQueryString(query);
  if (!q || tickets.length === 0) {
    return { ticket: null, matchedBy: null };
  }

  const exactEmail = tickets.find(t => normalizeQueryString(t.email) === q);
  if (exactEmail) {
    return { ticket: exactEmail, matchedBy: 'exact_email' };
  }

  const byUsername = tickets.find(t => {
    const userPart = normalizeQueryString(t.email).split('@')[0];
    return userPart === q;
  });
  if (byUsername) {
    return { ticket: byUsername, matchedBy: 'student_id' };
  }

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

  if (!q.includes('@')) {
    const autoEmail = `${q}@stu.seikyo.ed.jp`;
    const byAutoEmail = tickets.find(t => normalizeQueryString(t.email) === autoEmail);
    if (byAutoEmail) {
      return { ticket: byAutoEmail, matchedBy: 'student_id' };
    }
  }

  const byName = tickets.find(t => normalizeQueryString(t.name) === q);
  if (byName) {
    return { ticket: byName, matchedBy: 'student_id' };
  }

  return { ticket: null, matchedBy: null };
}
