const { errors } = require('@strapi/utils');
const { ValidationError } = errors;

module.exports = {
  async beforeCreate(event) {
    try {
      await validateTimeSlot(event.params.data, null);
    } catch (err) {
      require('fs').writeFileSync('error.log', err.stack || err.toString());
      throw err;
    }
  },

  async beforeUpdate(event) {
    try {
      const currentId = event.params.where?.documentId || event.params.where?.id;
      await validateTimeSlot(event.params.data, currentId);
    } catch (err) {
      require('fs').writeFileSync('error.log', err.stack || err.toString());
      throw err;
    }
  }
};

function extractSingleId(val) {
  if (val && typeof val === 'object') {
    return val.documentId !== undefined ? val.documentId : val.id;
  }
  return val;
}

function extractIds(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(v => extractSingleId(v)).filter(Boolean);
  }
  if (typeof val === 'object') {
    if (val.set) {
      return extractIds(val.set);
    }
    if (val.connect) {
      return extractIds(val.connect);
    }
    const single = extractSingleId(val);
    if (single !== undefined) return [single];
  }
  return [val];
}

async function resolveToDocumentIds(uid, val) {
  const rawIds = extractIds(val);
  if (rawIds.length === 0) return [];
  
  const numericIds = rawIds.filter(id => typeof id === 'number' || /^\d+$/.test(id)).map(id => parseInt(id, 10));
  const stringIds = rawIds.filter(id => typeof id === 'string' && !/^\d+$/.test(id));
  
  const documentIds = new Set(stringIds);
  
  if (numericIds.length > 0) {
    const results = await strapi.documents(uid).findMany({
      filters: { id: { $in: numericIds } },
      fields: ['documentId']
    });
    for (const item of results) {
      if (item.documentId) {
        documentIds.add(item.documentId);
      }
    }
  }
  
  return Array.from(documentIds);
}

async function resolveRelation(uid, val, currentItems = []) {
  if (val === undefined) {
    return currentItems.map(item => item.documentId);
  }
  
  if (val && typeof val === 'object' && !Array.isArray(val) && !val.documentId && !val.id) {
    let ids = currentItems.map(item => item.documentId);
    
    if (val.disconnect) {
      const toRemove = await resolveToDocumentIds(uid, val.disconnect);
      ids = ids.filter(id => !toRemove.includes(id));
    }
    if (val.connect) {
      const toAdd = await resolveToDocumentIds(uid, val.connect);
      ids = [...new Set([...ids, ...toAdd])];
    }
    if (val.set) {
      ids = await resolveToDocumentIds(uid, val.set);
    }
    return ids;
  }
  
  return await resolveToDocumentIds(uid, val);
}

/**
 * Validates all constraints before creating/updating a TimeSlot in Strapi 5.
 */
async function validateTimeSlot(data, currentId) {
  require('fs').writeFileSync('data.log', JSON.stringify({ data, currentId }, null, 2));
  // 1. Resolve current values if this is an update and some fields are omitted
  const currentSlot = currentId 
    ? await strapi.documents('api::time-slot.time-slot').findOne({
        documentId: currentId,
        populate: ['location', 'activityTemplate', 'participants', 'facilitators']
      })
    : null;

  const startDate = new Date(data.startDate !== undefined ? data.startDate : currentSlot?.startDate);
  const endDate = new Date(data.endDate !== undefined ? data.endDate : currentSlot?.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new ValidationError("Validation Error: Start and end dates must be valid dates.");
  }
  if (startDate >= endDate) {
    throw new ValidationError("Validation Error: Start date must be strictly before end date.");
  }

  // 2. Resolve relationships IDs (documentId in Strapi 5)
  const locationIds = await resolveRelation('api::location.location', data.location, currentSlot?.location ? [currentSlot.location] : []);
  const locationId = locationIds[0];

  const activityTemplateIds = await resolveRelation('api::activity-template.activity-template', data.activityTemplate, currentSlot?.activityTemplate ? [currentSlot.activityTemplate] : []);
  const activityTemplateId = activityTemplateIds[0];

  const participantIds = await resolveRelation('api::participant.participant', data.participants, currentSlot?.participants || []);
  const facilitatorIds = await resolveRelation('api::facilitator.facilitator', data.facilitators, currentSlot?.facilitators || []);

  if (!locationId) throw new ValidationError("Validation Error: A location is required for the time slot.");
  if (!activityTemplateId) throw new ValidationError("Validation Error: An activity template is required for the time slot.");

  // Fetch full records for checks using Strapi 5 Documents API
  const location = await strapi.documents('api::location.location').findOne({
    documentId: locationId
  });
  const activityTemplate = await strapi.documents('api::activity-template.activity-template').findOne({
    documentId: activityTemplateId,
    populate: ['authorizedFacilitators']
  });

  if (!location) throw new ValidationError("Validation Error: Specified location not found.");
  if (!activityTemplate) throw new ValidationError("Validation Error: Specified activity template not found.");

  // --- CONSTRAINT 1: Space Constraint (Location Capacity) ---
  if (participantIds.length > location.capacity) {
    throw new ValidationError(`Space Constraint Violated: Assigned participants (${participantIds.length}) exceeds location capacity (${location.capacity}).`);
  }

  // --- CONSTRAINT 2: Activity Capacity Constraint (Min/Max limit) ---
  if (participantIds.length < activityTemplate.minParticipants) {
    throw new ValidationError(`Activity Capacity Violated: Registered participants (${participantIds.length}) is below standard minimum (${activityTemplate.minParticipants}).`);
  }
  if (participantIds.length > activityTemplate.maxParticipants) {
    throw new ValidationError(`Activity Capacity Violated: Registered participants (${participantIds.length}) exceeds standard maximum (${activityTemplate.maxParticipants}).`);
  }

  // --- CONSTRAINT 3: Time Constraint (Standard Duration verification) ---
  const durationInMinutes = (endDate - startDate) / (1000 * 60);
  if (durationInMinutes < activityTemplate.standardDuration) {
    throw new ValidationError(`Time Constraint Violated: Time slot duration (${durationInMinutes} minutes) is shorter than activity's standard duration (${activityTemplate.standardDuration} minutes).`);
  }

  // --- CONSTRAINT 4: Skills Constraint (Authorized Facilitators) ---
  const authorizedIds = activityTemplate.authorizedFacilitators.map(f => f.documentId);
  for (const fid of facilitatorIds) {
    if (!authorizedIds.includes(fid)) {
      const facilitator = await strapi.documents('api::facilitator.facilitator').findOne({ documentId: fid });
      const name = facilitator ? `${facilitator.firstName} ${facilitator.lastName}` : `ID ${fid}`;
      throw new ValidationError(`Skills Constraint Violated: Facilitator "${name}" is not authorized for "${activityTemplate.name}".`);
    }
  }

  // --- CONSTRAINT 5: Location Availability Constraint ---
  const globalStart = new Date(location.globalOpeningStart);
  const globalEnd = new Date(location.globalOpeningEnd);
  if (startDate < globalStart || endDate > globalEnd) {
    throw new ValidationError(`Location Availability Violated: Slot falls outside global open period (${location.globalOpeningStart} to ${location.globalOpeningEnd}).`);
  }

  // Weekly closure check
  const weeklyClosures = location.weeklyClosures || [];
  const startDay = getTimeAndDayInParis(startDate).dayOfWeek;
  const endDay = getTimeAndDayInParis(endDate).dayOfWeek;
  if (weeklyClosures.includes(startDay) || weeklyClosures.includes(endDay)) {
    throw new ValidationError(`Location Availability Violated: Location is closed on weekly closure days (${weeklyClosures.join(', ')}).`);
  }

  // Specific closures check
  const specificClosures = location.specificClosures || [];
  for (const closure of specificClosures) {
    const clStart = new Date(closure.startDate);
    const clEnd = new Date(closure.endDate);
    if (startDate < clEnd && endDate > clStart) {
      throw new ValidationError(`Location Availability Violated: Overlaps specific closure period (${closure.startDate} to ${closure.endDate}).`);
    }
  }

  // --- CONSTRAINT 6: Human Availability Constraints & Overlaps ---
  // A. Participants check
  for (const pid of participantIds) {
    const participant = await strapi.documents('api::participant.participant').findOne({ documentId: pid });
    if (!participant) continue;

    const pName = `${participant.firstName} ${participant.lastName}`;
    checkWeeklyAvailability(pName, 'Participant', participant.weeklyAvailabilities, startDate, endDate);
    checkSpecificUnavailability(pName, 'Participant', participant.specificUnavailabilities, startDate, endDate);
  }

  // B. Facilitators check
  for (const fid of facilitatorIds) {
    const facilitator = await strapi.documents('api::facilitator.facilitator').findOne({ documentId: fid });
    if (!facilitator) continue;

    const fName = `${facilitator.firstName} ${facilitator.lastName}`;
    checkWeeklyAvailability(fName, 'Facilitator', facilitator.weeklyAvailabilities, startDate, endDate);
    checkSpecificUnavailability(fName, 'Facilitator', facilitator.specificUnavailabilities, startDate, endDate);
  }

  // C. Double Booking Overlap query
  const overlappingSlots = await strapi.documents('api::time-slot.time-slot').findMany({
    filters: {
      $and: [
        { startDate: { $lt: endDate.toISOString() } },
        { endDate: { $gt: startDate.toISOString() } },
        currentId ? { documentId: { $ne: currentId } } : {}
      ]
    },
    populate: ['participants', 'facilitators']
  });

  for (const slot of overlappingSlots) {
    // Overlapping participant conflict
    const slotPartIds = slot.participants.map(p => p.documentId);
    for (const pid of participantIds) {
      if (slotPartIds.includes(pid)) {
        const participant = await strapi.documents('api::participant.participant').findOne({ documentId: pid });
        throw new ValidationError(`Human Availability Violated: Participant "${participant.firstName} ${participant.lastName}" is already booked in another slot (${slot.startDate} - ${slot.endDate}).`);
      }
    }

    // Overlapping facilitator conflict
    const slotFacIds = slot.facilitators.map(f => f.documentId);
    for (const fid of facilitatorIds) {
      if (slotFacIds.includes(fid)) {
        const facilitator = await strapi.documents('api::facilitator.facilitator').findOne({ documentId: fid });
        throw new ValidationError(`Human Availability Violated: Facilitator "${facilitator.firstName} ${facilitator.lastName}" is already booked in another slot (${slot.startDate} - ${slot.endDate}).`);
      }
    }
  }
}

function checkWeeklyAvailability(name, type, availabilities, startDate, endDate) {
  if (!availabilities || Object.keys(availabilities).length === 0) return;

  const startParis = getTimeAndDayInParis(startDate);
  const endParis = getTimeAndDayInParis(endDate);

  const startDay = startParis.dayOfWeek.toString();
  const endDay = endParis.dayOfWeek.toString();

  if (startDay !== endDay) {
    throw new ValidationError(`Weekly Availability Violated: ${type} "${name}" scheduling spans multiple days.`);
  }

  const dayWindows = availabilities[startDay];
  if (!dayWindows || !Array.isArray(dayWindows) || dayWindows.length === 0) {
    throw new ValidationError(`Weekly Availability Violated: ${type} "${name}" has no availability configured for this weekday (${startDay}).`);
  }

  const startStr = startParis.timeStr;
  const endStr = endParis.timeStr;

  const isCovered = dayWindows.some(window => startStr >= window.start && endStr <= window.end);
  if (!isCovered) {
    throw new ValidationError(`Weekly Availability Violated: ${type} "${name}" is not scheduled to be available during ${startStr} - ${endStr}.`);
  }
}

function checkSpecificUnavailability(name, type, unavailabilities, startDate, endDate) {
  if (!unavailabilities || !Array.isArray(unavailabilities)) return;

  for (const period of unavailabilities) {
    const unStart = new Date(period.startDate);
    const unEnd = new Date(period.endDate);
    if (startDate < unEnd && endDate > unStart) {
      throw new ValidationError(`Weekly Availability Violated: ${type} "${name}" has a specific unavailability period booked (${period.startDate} to ${period.endDate}).`);
    }
  }
}

function getTimeAndDayInParis(date) {
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

  const hourStr = partMap.hour;
  const minuteStr = partMap.minute;
  const timeStr = `${hourStr}:${minuteStr}`;

  const parisYear = parseInt(partMap.year, 10);
  const parisMonth = parseInt(partMap.month, 10) - 1;
  const parisDay = parseInt(partMap.day, 10);

  const utcDate = new Date(Date.UTC(parisYear, parisMonth, parisDay));
  const dayOfWeek = utcDate.getUTCDay();

  return { timeStr, dayOfWeek };
}

