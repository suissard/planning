/**
 * Helper to compute day-level availability for facilitators and participants.
 */

const DAY_NAMES = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche'
};

/**
 * Get day information from a date string 'YYYY-MM-DD'
 */
export function getWeekdayAndDate(dateStr) {
  if (!dateStr) return { jsDay: 1, dayKey: '1', dayKeyAlt: '1', dayName: 'Lundi' };
  
  // Parse YYYY-MM-DD safely
  const parts = dateStr.slice(0, 10).split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const dateObj = new Date(year, month, day, 12, 0, 0);
  const jsDay = dateObj.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  
  const dayKey = jsDay.toString(); // '0'..'6'
  const dayKeyAlt = jsDay === 0 ? '7' : jsDay.toString(); // '1'..'7' (ISO standard where Sunday is 7)
  const dayName = DAY_NAMES[jsDay] || 'ce jour';

  return { jsDay, dayKey, dayKeyAlt, dayName, dateObj };
}

/**
 * Check person (facilitator or participant) availability for a given date.
 * 
 * @param {Object} person - Facilitator or Participant object
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} type - 'facilitator' | 'participant'
 * @param {Array} otherSessions - List of room sessions to check double booking
 * @param {string|null} currentSessionId - ID/documentId of the current session being edited
 * @returns {Object} { available: boolean, reason: string, isWeeklyUnavailable: boolean, isSpecificUnavailable: boolean, isDoubleBooked: boolean, otherRoomName?: string }
 */
export function checkPersonDateAvailability(person, dateStr, type = 'participant', otherSessions = [], currentSessionId = null) {
  if (!person || !dateStr) {
    return { available: true, reason: '', isWeeklyUnavailable: false, isSpecificUnavailable: false, isDoubleBooked: false };
  }

  const pDocId = person.documentId || person.id;
  const { jsDay, dayKey, dayKeyAlt, dayName } = getWeekdayAndDate(dateStr);

  const parts = dateStr.slice(0, 10).split('-');
  const targetDateStart = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0);
  const targetDateEnd = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59);

  // 1. Check specific unavailabilities (congés / absences)
  const specificUnavails = person.specificUnavailabilities || person.unavailabilities || [];
  if (Array.isArray(specificUnavails) && specificUnavails.length > 0) {
    for (const period of specificUnavails) {
      if (!period.startDate || !period.endDate) continue;
      const unStart = new Date(period.startDate);
      const unEnd = new Date(period.endDate);
      if (targetDateStart <= unEnd && targetDateEnd >= unStart) {
        const reason = period.reason ? `Congé / Absence (${period.reason})` : 'Congé / Absence';
        return {
          available: false,
          reason,
          isWeeklyUnavailable: false,
          isSpecificUnavailable: true,
          isDoubleBooked: false
        };
      }
    }
  }

  // 2. Check weekly availabilities (planning hebdomadaire)
  const weekly = person.weeklyAvailabilities;
  if (weekly && typeof weekly === 'object' && Object.keys(weekly).length > 0) {
    // Check if user has any active slots across all days
    const hasAnyConfiguredDay = Object.values(weekly).some(v => Array.isArray(v) && v.length > 0);
    if (hasAnyConfiguredDay) {
      const dayWindows = (weekly[dayKey] && Array.isArray(weekly[dayKey]) && weekly[dayKey].length > 0) ? weekly[dayKey] :
                         (weekly[dayKeyAlt] && Array.isArray(weekly[dayKeyAlt]) && weekly[dayKeyAlt].length > 0) ? weekly[dayKeyAlt] : null;

      if (!dayWindows) {
        return {
          available: false,
          reason: `Non disponible le ${dayName}`,
          isWeeklyUnavailable: true,
          isSpecificUnavailable: false,
          isDoubleBooked: false
        };
      }
    }
  }

  // 3. Check double booking in other room sessions on the same date
  if (Array.isArray(otherSessions) && otherSessions.length > 0) {
    for (const sess of otherSessions) {
      if (sess.date !== dateStr) continue;
      const sDocId = sess.documentId || sess.id;
      if (currentSessionId && sDocId === currentSessionId) continue; // Ignore current session

      const roomName = sess.location?.name || 'Autre salle';

      if (type === 'facilitator') {
        const mgrId = sess.manager?.documentId || sess.manager?.id;
        if (mgrId && mgrId === pDocId) {
          return {
            available: false,
            reason: `Déjà référent (${roomName})`,
            isWeeklyUnavailable: false,
            isSpecificUnavailable: false,
            isDoubleBooked: true,
            otherRoomName: roomName
          };
        }
      } else {
        // Participant / Bénéficiaire
        const parts = sess.participants || [];
        const isAssigned = parts.some(p => (p.documentId || p.id) === pDocId);
        if (isAssigned) {
          return {
            available: false,
            reason: `Déjà inscrit(e) (${roomName})`,
            isWeeklyUnavailable: false,
            isSpecificUnavailable: false,
            isDoubleBooked: true,
            otherRoomName: roomName
          };
        }
      }
    }
  }

  return {
    available: true,
    reason: '',
    isWeeklyUnavailable: false,
    isSpecificUnavailable: false,
    isDoubleBooked: false
  };
}

/**
 * Format and sort person list with availability for a given date
 */
export function getEvaluatedPersonsList(persons = [], dateStr, type = 'participant', otherSessions = [], currentSessionId = null) {
  if (!Array.isArray(persons)) return [];

  const evaluated = persons.map(p => {
    const status = checkPersonDateAvailability(p, dateStr, type, otherSessions, currentSessionId);
    return {
      ...p,
      availabilityStatus: status,
      isAvailable: status.available,
      unavailabilityReason: status.reason
    };
  });

  // Sort: Available first, then Unavailable; alphabetical within groups
  return evaluated.sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    
    const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
    const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
    return nameA.localeCompare(nameB, 'fr');
  });
}
