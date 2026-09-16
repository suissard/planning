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

// ─── Chargement des variables d'environnement (.env) ─────────────────────────
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}
loadEnvFile(path.join(__dirname, '.env'));

// ─── Configuration ───────────────────────────────────────────────────────────
const STRAPI_URL = process.env.STRAPI_URL || process.env.VITE_STRAPI_URL || 'https://strapi.clavier.dev';
const API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.STRAPI_CONTENT_API_TOKEN || process.env.VITE_STRAPI_API_TOKEN;
const DATA_DIR = path.join(__dirname, 'data');

if (!API_TOKEN) {
  console.error('\x1b[31m❌ Erreur : STRAPI_API_TOKEN manquant dans les variables d\'environnement ou le fichier .env\x1b[0m');
  process.exit(1);
}

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
    let totalDeleted = 0;
    while (true) {
      const res = await apiRequest(`/api/${apiPath}?pagination[pageSize]=100`);
      const items = res.data || [];
      if (items.length === 0) break;

      for (const item of items) {
        const docId = item.documentId || item.id;
        await apiRequest(`/api/${apiPath}/${docId}`, { method: 'DELETE' });
        totalDeleted++;
      }
      if (items.length < 100) break;
    }
    if (totalDeleted > 0) {
      log('🧹', `${C.dim}Suppression de ${totalDeleted} ${label}...${C.reset}`);
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

async function getOrCreateUser(firstName, lastName, email, roleId, existingUsersMap) {
  const key = email.toLowerCase();
  if (existingUsersMap.has(key)) {
    return existingUsersMap.get(key);
  }
  const cleanUsername = (firstName + '_' + lastName)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase() + '_' + Math.floor(Math.random() * 1000);

  const newUser = await apiRequest('/api/users', {
    method: 'POST',
    body: {
      username: cleanUsername,
      email: email,
      password: 'Password123!',
      confirmed: true,
      blocked: false,
      role: roleId,
    },
  });
  existingUsersMap.set(key, newUser);
  return newUser;
}

async function loadExistingUsers() {
  try {
    const users = await apiRequest('/api/users');
    const map = new Map();
    for (const u of users) {
      map.set(u.email.toLowerCase(), u);
    }
    return map;
  } catch (e) {
    return new Map();
  }
}

async function seedFacilitators(existingUsersMap) {
  const facilitators = loadJSON('facilitators.json');
  const created = {};

  for (const fac of facilitators) {
    const { _authorizedActivities, ...data } = fac;
    let userDocId = null;
    try {
      const user = await getOrCreateUser(fac.firstName, fac.lastName, fac.email, 3, existingUsersMap);
      userDocId = user.documentId;
    } catch (e) {
      // ignore user creation error if role not matching
    }

    const res = await apiRequest('/api/facilitators', {
      method: 'POST',
      body: {
        data: {
          ...data,
          ...(userDocId ? { user: userDocId } : {}),
        },
      },
    });
    created[fac.email] = {
      documentId: res.data.documentId,
      _authorizedActivities: _authorizedActivities || [],
    };
  }

  log('👨‍🏫', `${C.green}${Object.keys(created).length} animateurs créés et liés à un utilisateur${C.reset}`);
  return created;
}

async function seedParticipants(existingUsersMap) {
  const participants = loadJSON('participants.json');
  const created = {};

  for (const part of participants) {
    let userDocId = null;
    try {
      const user = await getOrCreateUser(part.firstName, part.lastName, part.email, 1, existingUsersMap);
      userDocId = user.documentId;
    } catch (e) {}

    const res = await apiRequest('/api/participants', {
      method: 'POST',
      body: {
        data: {
          ...part,
          ...(userDocId ? { user: userDocId } : {}),
        },
      },
    });
    created[part.email] = res.data.documentId;
  }

  log('👥', `${C.green}${Object.keys(created).length} participants créés et liés à un utilisateur${C.reset}`);
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

async function seedRoomSessionTemplates(locationsMap, facilitatorsMap, participantsMap) {
  let templates = [];
  try {
    templates = loadJSON('room-session-templates.json');
  } catch (e) {
    return;
  }

  let count = 0;
  for (const t of templates) {
    const { _location, _manager, _participants, dayOfWeek, isActive, notes } = t;
    const locationId = locationsMap[_location];
    const managerId = facilitatorsMap[_manager]?.documentId || null;
    const participantIds = (_participants || [])
      .map((email) => participantsMap[email])
      .filter(Boolean);

    if (!locationId) continue;

    try {
      await apiRequest('/api/room-session-templates', {
        method: 'POST',
        body: {
          data: {
            dayOfWeek,
            location: locationId,
            manager: managerId,
            participants: participantIds,
            isActive: isActive !== false,
            notes: notes || ''
          }
        }
      });
      count++;
    } catch (e) {
      // ignore if route not ready
    }
  }
  log('⚡', `${C.green}${count} modèles de semaine type créés${C.reset}`);
}

async function seedTimeSlots(locationsMap, activitiesMap, facilitatorsMap, participantsMap, roomSessionsMap) {
  const slots = loadJSON('time-slots.json');
  let count = 0;
  let scheduledActCount = 0;
  let errors = 0;
  const createdSlots = [];

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
      // 1. Créer le créneau de salle (time-slot)
      const resSlot = await apiRequest('/api/time-slots', {
        method: 'POST',
        body: {
          data: {
            ...dates,
            location: locationId,
            facilitators: facilitatorIds,
            participants: participantIds,
            ...(roomSessionId ? { roomSession: roomSessionId } : {}),
          },
        },
      });

      const slotDocId = resSlot.data.documentId;
      createdSlots.push({
        documentId: slotDocId,
        startDate: dates.startDate,
        endDate: dates.endDate,
        locationId,
        activityId,
        activityName: _activity,
        facilitatorIds,
        participantIds
      });
      count++;

      // 2. Créer l'activité programmée (scheduled-activity) dans ce créneau
      try {
        await apiRequest('/api/scheduled-activities', {
          method: 'POST',
          body: {
            data: {
              name: _activity,
              startDate: dates.startDate,
              endDate: dates.endDate,
              timeSlot: slotDocId,
              activityTemplate: activityId,
              location: locationId,
              facilitators: facilitatorIds
            }
          }
        });
        scheduledActCount++;
      } catch (actErr) {
        log('⚠️', `${C.yellow}Activité programmée non créée pour ${_activity}: ${actErr.message}${C.reset}`);
      }

    } catch (err) {
      errors++;
      log('❌', `${C.red}${_activity} @ ${_location}: ${err.message}${C.reset}`);
    }
  }

  log('📅', `${C.green}${count} créneaux et ${scheduledActCount} activités programmées créés${C.reset}${errors ? ` ${C.yellow}(${errors} erreur(s))${C.reset}` : ''}`);
  return createdSlots;
}

async function seedCheckIns(createdSlots) {
  let count = 0;
  // Générer des pointages réalistes pour les créneaux du 1er au 3 septembre (ou premiers créneaux)
  const targetSlots = createdSlots.filter(s => s.participantIds.length > 0).slice(0, 15);

  const sampleComments = [
    'Arrivé par transport VSL',
    'En forme et très participatif',
    'Léger retard dû au transport',
    'A apprécié l’atelier',
    'Départ anticipé pour visite médicale',
    'Bonne humeur ce matin'
  ];

  for (const slot of targetSlots) {
    const startDt = new Date(slot.startDate);
    const endDt = new Date(slot.endDate);

    for (let i = 0; i < slot.participantIds.length; i++) {
      const partId = slot.participantIds[i];
      // 85% de présence, 15% d'absence
      const isPresent = i % 7 !== 0;

      const checkInOffsetMin = (i * 3) % 20; // 0..20 min après début
      const checkInTime = new Date(startDt.getTime() + checkInOffsetMin * 60000).toISOString();
      const hasDeparted = isPresent && (i % 3 === 0);
      const checkOutTime = hasDeparted ? new Date(endDt.getTime() - 5 * 60000).toISOString() : null;
      const comment = (i % 2 === 0) ? sampleComments[i % sampleComments.length] : '';

      try {
        await apiRequest('/api/check-ins', {
          method: 'POST',
          body: {
            data: {
              isPresent,
              checkInTime: isPresent ? checkInTime : null,
              checkOutTime,
              comment,
              timeSlot: slot.documentId,
              participant: partId
            }
          }
        });
        count++;
      } catch (e) {
        // ignore
      }
    }
  }

  log('✍️', `${C.green}${count} émargements/pointages de test créés${C.reset}`);
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
  await cleanCollection('check-ins', 'pointages');
  await cleanCollection('scheduled-activities', 'activités programmées');
  await cleanCollection('time-slots', 'créneaux');
  await cleanCollection('room-sessions', 'sessions de salle');
  await cleanCollection('room-session-templates', 'modèles semaine type');
  await cleanCollection('activity-templates', 'activités');
  await cleanCollection('participants', 'participants');
  await cleanCollection('facilitators', 'animateurs');
  await cleanCollection('locations', 'lieux');
  console.log('');

  // 3. Seed (ordre des dépendances)
  log('🌱', `${C.yellow}Injection des données de développement...${C.reset}`);
  console.log('');
  const existingUsersMap = await loadExistingUsers();
  const locationsMap = await seedLocations();
  const facilitatorsMap = await seedFacilitators(existingUsersMap);
  const participantsMap = await seedParticipants(existingUsersMap);
  const activitiesMap = await seedActivityTemplates(facilitatorsMap);
  const roomSessionsMap = await seedRoomSessions(locationsMap, facilitatorsMap, participantsMap);
  await seedRoomSessionTemplates(locationsMap, facilitatorsMap, participantsMap);
  const createdSlots = await seedTimeSlots(locationsMap, activitiesMap, facilitatorsMap, participantsMap, roomSessionsMap);
  await seedCheckIns(createdSlots);

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
