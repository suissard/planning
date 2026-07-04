module.exports = {
  async beforeCreate(event) {
    await validateTimeSlot(event.params.data, null);
  },

  async beforeUpdate(event) {
    const currentId = event.params.where?.documentId || event.params.where?.id;
    await validateTimeSlot(event.params.data, currentId);
  }
};

function extractId(val) {
  if (val && typeof val === 'object') {
    return val.documentId || val.id;
  }
  return val;
}

/**
 * Validates all constraints before creating/updating a TimeSlot in Strapi 5.
 */
async function validateTimeSlot(data, currentId) {
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
    throw new Error("Validation Error: Start and end dates must be valid dates.");
  }
  if (startDate >= endDate) {
    throw new Error("Validation Error: Start date must be strictly before end date.");
  }

  // 2. Resolve relationships IDs (documentId in Strapi 5)
  let locationId = data.location !== undefined ? extractId(data.location) : currentSlot?.location?.documentId;
  let activityTemplateId = data.activityTemplate !== undefined ? extractId(data.activityTemplate) : currentSlot?.activityTemplate?.documentId;

  let participantIds = [];
  if (data.participants !== undefined) {
    if (Array.isArray(data.participants)) {
      participantIds = data.participants.map(extractId).filter(Boolean);
    } else if (data.participants && typeof data.participants === 'object') {
      let ids = currentSlot ? currentSlot.participants.map(p => p.documentId) : [];
      if (data.participants.disconnect) {
        const toRemove = data.participants.disconnect.map(extractId).filter(Boolean);
        ids = ids.filter(id => !toRemove.includes(id));
      }
      if (data.participants.connect) {
        const toAdd = data.participants.connect.map(extractId).filter(Boolean);
        ids = [...new Set([...ids, ...toAdd])];
      }
      participantIds = ids;
    }
  } else if (currentSlot) {
    participantIds = currentSlot.participants.map(p => p.documentId);
  }

  let facilitatorIds = [];
  if (data.facilitators !== undefined) {
    if (Array.isArray(data.facilitators)) {
      facilitatorIds = data.facilitators.map(extractId).filter(Boolean);
    } else if (data.facilitators && typeof data.facilitators === 'object') {
      let ids = currentSlot ? currentSlot.facilitators.map(f => f.documentId) : [];
      if (data.facilitators.disconnect) {
        const toRemove = data.facilitators.disconnect.map(extractId).filter(Boolean);
        ids = ids.filter(id => !toRemove.includes(id));
      }
      if (data.facilitators.connect) {
        const toAdd = data.facilitators.connect.map(extractId).filter(Boolean);
        ids = [...new Set([...ids, ...toAdd])];
      }
      facilitatorIds = ids;
    }
  } else if (currentSlot) {
    facilitatorIds = currentSlot.facilitators.map(f => f.documentId);
  }

  if (!locationId) throw new Error("Validation Error: A location is required for the time slot.");
  if (!activityTemplateId) throw new Error("Validation Error: An activity template is required for the time slot.");

  // Fetch full records for checks using Strapi 5 Documents API
  const location = await strapi.documents('api::location.location').findOne({
    documentId: locationId
  });
  const activityTemplate = await strapi.documents('api::activity-template.activity-template').findOne({
    documentId: activityTemplateId,
    populate: ['authorizedFacilitators']
  });

  if (!location) throw new Error("Validation Error: Specified location not found.");
  if (!activityTemplate) throw new Error("Validation Error: Specified activity template not found.");

  // --- CONSTRAINT 1: Space Constraint (Location Capacity) ---
  if (participantIds.length > location.capacity) {
    throw new Error(`Space Constraint Violated: Assigned participants (${participantIds.length}) exceeds location capacity (${location.capacity}).`);
  }

  // --- CONSTRAINT 2: Activity Capacity Constraint (Min/Max limit) ---
  if (participantIds.length < activityTemplate.minParticipants) {
    throw new Error(`Activity Capacity Violated: Registered participants (${participantIds.length}) is below standard minimum (${activityTemplate.minParticipants}).`);
  }
  if (participantIds.length > activityTemplate.maxParticipants) {
    throw new Error(`Activity Capacity Violated: Registered participants (${participantIds.length}) exceeds standard maximum (${activityTemplate.maxParticipants}).`);
  }

  // --- CONSTRAINT 3: Time Constraint (Standard Duration verification) ---
  const durationInMinutes = (endDate - startDate) / (1000 * 60);
  if (durationInMinutes < activityTemplate.standardDuration) {
    throw new Error(`Time Constraint Violated: Time slot duration (${durationInMinutes} minutes) is shorter than activity's standard duration (${activityTemplate.standardDuration} minutes).`);
  }

  // --- CONSTRAINT 4: Skills Constraint (Authorized Facilitators) ---
  const authorizedIds = activityTemplate.authorizedFacilitators.map(f => f.documentId);
  for (const fid of facilitatorIds) {
    if (!authorizedIds.includes(fid)) {
      const facilitator = await strapi.documents('api::facilitator.facilitator').findOne({ documentId: fid });
      const name = facilitator ? `${facilitator.firstName} ${facilitator.lastName}` : `ID ${fid}`;
      throw new Error(`Skills Constraint Violated: Facilitator "${name}" is not authorized for "${activityTemplate.name}".`);
    }
  }

  // --- CONSTRAINT 5: Location Availability Constraint ---
  const globalStart = new Date(location.globalOpeningStart);
  const globalEnd = new Date(location.globalOpeningEnd);
  if (startDate < globalStart || endDate > globalEnd) {
    throw new Error(`Location Availability Violated: Slot falls outside global open period (${location.globalOpeningStart} to ${location.globalOpeningEnd}).`);
  }

  // Weekly closure check
  const weeklyClosures = location.weeklyClosures || [];
  const startDay = startDate.getDay();
  const endDay = endDate.getDay();
  if (weeklyClosures.includes(startDay) || weeklyClosures.includes(endDay)) {
    throw new Error(`Location Availability Violated: Location is closed on weekly closure days (${weeklyClosures.join(', ')}).`);
  }

  // Specific closures check
  const specificClosures = location.specificClosures || [];
  for (const closure of specificClosures) {
    const clStart = new Date(closure.startDate);
    const clEnd = new Date(closure.endDate);
    if (startDate < clEnd && endDate > clStart) {
      throw new Error(`Location Availability Violated: Overlaps specific closure period (${closure.startDate} to ${closure.endDate}).`);
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
        throw new Error(`Human Availability Violated: Participant "${participant.firstName} ${participant.lastName}" is already booked in another slot (${slot.startDate} - ${slot.endDate}).`);
      }
    }

    // Overlapping facilitator conflict
    const slotFacIds = slot.facilitators.map(f => f.documentId);
    for (const fid of facilitatorIds) {
      if (slotFacIds.includes(fid)) {
        const facilitator = await strapi.documents('api::facilitator.facilitator').findOne({ documentId: fid });
        throw new Error(`Human Availability Violated: Facilitator "${facilitator.firstName} ${facilitator.lastName}" is already booked in another slot (${slot.startDate} - ${slot.endDate}).`);
      }
    }
  }
}

function checkWeeklyAvailability(name, type, availabilities, startDate, endDate) {
  if (!availabilities || Object.keys(availabilities).length === 0) return;

  const startDay = startDate.getDay().toString();
  const endDay = endDate.getDay().toString();

  if (startDay !== endDay) {
    throw new Error(`Weekly Availability Violated: ${type} "${name}" scheduling spans multiple days.`);
  }

  const dayWindows = availabilities[startDay];
  if (!dayWindows || !Array.isArray(dayWindows) || dayWindows.length === 0) {
    throw new Error(`Weekly Availability Violated: ${type} "${name}" has no availability configured for this weekday (${startDay}).`);
  }

  const pad = (n) => String(n).padStart(2, '0');
  const startStr = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
  const endStr = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

  const isCovered = dayWindows.some(window => startStr >= window.start && endStr <= window.end);
  if (!isCovered) {
    throw new Error(`Weekly Availability Violated: ${type} "${name}" is not scheduled to be available during ${startStr} - ${endStr}.`);
  }
}

function checkSpecificUnavailability(name, type, unavailabilities, startDate, endDate) {
  if (!unavailabilities || !Array.isArray(unavailabilities)) return;

  for (const period of unavailabilities) {
    const unStart = new Date(period.startDate);
    const unEnd = new Date(period.endDate);
    if (startDate < unEnd && endDate > unStart) {
      throw new Error(`Weekly Availability Violated: ${type} "${name}" has a specific unavailability period booked (${period.startDate} to ${period.endDate}).`);
    }
  }
}
