#!/usr/bin/env node

/**
 * seed.js – Peuple Strapi avec les données de développement depuis backend/data/*.json
 *
 * Usage :  npm run seed                             (depuis la racine)
 *          node seed.js
 *
 * ⚠️  Nécessite que Strapi tourne sur STRAPI_URL (défaut: http://localhost:1337)
 *     et qu'un admin soit déjà créé.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────────
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN
  || '81fa8d8d37c6be0538193845de5d69c9b6237a1198b5d8c775d3cceb758b3954d3c5de63d816350d7c1315fdf686efdb2d92fc63907f3eac4a6d190490727b9d6c83bba6422240934a3dc395c1a614c68f6453ea146ebf1927ebda95b82bbc99fe9ee521670d648b6b137e8e874b872c70d40018e934fc1b6bcca63168ead71f';
const DATA_DIR = path.join(__dirname, 'data');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(icon, msg) {
  console.log(`  ${icon}  ${msg}`);
}

function loadJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'));
}

async function apiRequest(endpoint, { method = 'GET', body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
  };

  const res = await fetch(`${STRAPI_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const errorMsg = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    throw new Error(`${method} ${endpoint} → ${res.status}\n${errorMsg}`);
  }

  return data;
}

// ─── Nettoyage des données existantes ────────────────────────────────────────
async function cleanCollection(apiPath, label) {
  try {
    const res = await apiRequest(`/api/${apiPath}?pagination[pageSize]=100`);
    const items = res.data || [];
    if (items.length === 0) return;

    log('🧹', `${C.dim}Suppression de ${items.length} ${label}...${C.reset}`);
    for (const item of items) {
      const docId = item.documentId || item.id;
      await apiRequest(`/api/${apiPath}/${docId}`, { method: 'DELETE' });
    }
  } catch (err) {
    log('⚠️', `${C.yellow}Nettoyage ${label} ignoré: ${err.message}${C.reset}`);
  }
}

// ─── Seed Functions ──────────────────────────────────────────────────────────
async function seedLocations() {
  const locations = loadJSON('locations.json');
  const created = {};

  for (const loc of locations) {
    const res = await apiRequest('/api/locations', {
      method: 'POST',
      body: { data: loc },
    });
    created[loc.name] = res.data.documentId;
  }

  log('📍', `${C.green}${Object.keys(created).length} lieux créés${C.reset}`);
  return created;
}

async function seedFacilitators() {
  const facilitators = loadJSON('facilitators.json');
  const created = {};

  for (const fac of facilitators) {
    const { _authorizedActivities, ...data } = fac;
    const res = await apiRequest('/api/facilitators', {
      method: 'POST',
      body: { data },
    });
    created[fac.email] = {
      documentId: res.data.documentId,
      _authorizedActivities: _authorizedActivities || [],
    };
  }

  log('👨‍🏫', `${C.green}${Object.keys(created).length} animateurs créés${C.reset}`);
  return created;
}

async function seedParticipants() {
  const participants = loadJSON('participants.json');
  const created = {};

  for (const part of participants) {
    const res = await apiRequest('/api/participants', {
      method: 'POST',
      body: { data: part },
    });
    created[part.email] = res.data.documentId;
  }

  log('👥', `${C.green}${Object.keys(created).length} participants créés${C.reset}`);
  return created;
}

async function seedActivityTemplates(facilitatorsMap) {
  const templates = loadJSON('activity-templates.json');
  const created = {};

  for (const tpl of templates) {
    const { _authorizedFacilitators, ...data } = tpl;

    // Résoudre les documentIds des animateurs autorisés
    const facilitatorIds = (_authorizedFacilitators || [])
      .map((email) => facilitatorsMap[email]?.documentId)
      .filter(Boolean);

    const res = await apiRequest('/api/activity-templates', {
      method: 'POST',
      body: {
        data: {
          ...data,
          authorizedFacilitators: facilitatorIds,
        },
      },
    });
    created[tpl.name] = res.data.documentId;
  }

  log('🎯', `${C.green}${Object.keys(created).length} modèles d'activité créés${C.reset}`);
  return created;
}

async function seedRoomSessions(locationsMap, facilitatorsMap, participantsMap) {
  const sessions = loadJSON('room-sessions.json');
  const createdMap = {};

  for (const sess of sessions) {
    const { _location, _manager, _participants, date } = sess;
    const locationId = locationsMap[_location];
    const managerId = facilitatorsMap[_manager]?.documentId;
    const participantIds = (_participants || [])
      .map((email) => participantsMap[email])
      .filter(Boolean);

    if (!locationId || !managerId) {
      log('⚠️', `${C.yellow}Session ignorée: lieu="${_location}" ou gestionnaire="${_manager}" introuvable${C.reset}`);
      continue;
    }

    const res = await apiRequest('/api/room-sessions', {
      method: 'POST',
      body: {
        data: {
          date,
          location: locationId,
          manager: managerId,
          participants: participantIds,
        },
      },
    });
    const key = `${date}|${locationId}`;
    createdMap[key] = res.data.documentId;
  }

  log('🚪', `${C.green}${Object.keys(createdMap).length} sessions de salle créées${C.reset}`);
  return createdMap;
}

async function seedTimeSlots(locationsMap, activitiesMap, facilitatorsMap, participantsMap, roomSessionsMap) {
  const slots = loadJSON('time-slots.json');
  let count = 0;
  let errors = 0;

  for (const slot of slots) {
    const { _activity, _location, _facilitators, _participants, ...dates } = slot;

    const locationId = locationsMap[_location];
    const activityId = activitiesMap[_activity];
    const facilitatorIds = (_facilitators || [])
      .map((email) => facilitatorsMap[email]?.documentId)
      .filter(Boolean);
    const participantIds = (_participants || [])
      .map((email) => participantsMap[email])
      .filter(Boolean);

    if (!locationId || !activityId) {
      log('⚠️', `${C.yellow}Ignoré: lieu="${_location}" ou activité="${_activity}" introuvable${C.reset}`);
      errors++;
      continue;
    }

    const dateStr = dates.startDate ? dates.startDate.slice(0, 10) : null;
    const roomSessionId = dateStr ? roomSessionsMap[`${dateStr}|${locationId}`] : null;

    try {
      await apiRequest('/api/time-slots', {
        method: 'POST',
        body: {
          data: {
            ...dates,
            location: locationId,
            activityTemplate: activityId,
            facilitators: facilitatorIds,
            participants: participantIds,
            ...(roomSessionId ? { roomSession: roomSessionId } : {}),
          },
        },
      });
      count++;
    } catch (err) {
      errors++;
      log('❌', `${C.red}${_activity} @ ${_location}: ${err.message}${C.reset}`);
    }
  }

  log('📅', `${C.green}${count} créneaux créés${C.reset}${errors ? ` ${C.yellow}(${errors} erreur(s))${C.reset}` : ''}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}║      ⚡ AetherScheduler — Seed Database         ║${C.reset}`);
  console.log(`${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}`);
  console.log('');
  log('🌐', `Strapi: ${C.bold}${STRAPI_URL}${C.reset}`);
  console.log('');

  // 1. Vérification de la connexion
  log('🔑', `Token API: ${C.dim}${API_TOKEN.slice(0, 12)}...${C.reset}`);
  try {
    await apiRequest('/api/locations?pagination[pageSize]=1');
    log('✅', 'Connexion à Strapi réussie');
  } catch (err) {
    throw new Error(`Impossible de se connecter à Strapi.\n  → Vérifiez que Strapi tourne sur ${STRAPI_URL}\n  → Vérifiez votre API Token\n  → ${err.message}`);
  }
  console.log('');

  // 2. Nettoyage (ordre inverse des dépendances)
  log('🧹', `${C.yellow}Nettoyage des collections existantes...${C.reset}`);
  await cleanCollection('time-slots', 'créneaux');
  await cleanCollection('room-sessions', 'sessions de salle');
  await cleanCollection('activity-templates', 'activités');
  await cleanCollection('participants', 'participants');
  await cleanCollection('facilitators', 'animateurs');
  await cleanCollection('locations', 'lieux');
  console.log('');

  // 3. Seed (ordre des dépendances)
  log('🌱', `${C.yellow}Injection des données de développement...${C.reset}`);
  console.log('');
  const locationsMap = await seedLocations();
  const facilitatorsMap = await seedFacilitators();
  const participantsMap = await seedParticipants();
  const activitiesMap = await seedActivityTemplates(facilitatorsMap);
  const roomSessionsMap = await seedRoomSessions(locationsMap, facilitatorsMap, participantsMap);
  await seedTimeSlots(locationsMap, activitiesMap, facilitatorsMap, participantsMap, roomSessionsMap);

  console.log('');
  console.log(`${C.cyan}──────────────────────────────────────────────────${C.reset}`);
  log('🎉', `${C.green}${C.bold}Seed terminé avec succès !${C.reset}`);
  log('🔗', `Admin: ${C.bold}${STRAPI_URL}/admin${C.reset}`);
  console.log('');
}

main().catch((err) => {
  console.error(`\n${C.red}❌ Erreur fatale:\n${err.message}${C.reset}\n`);
  process.exit(1);
});
