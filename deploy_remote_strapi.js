#!/usr/bin/env node

/**
 * deploy_remote_strapi.js
 * 
 * Initialise le serveur Strapi distant (strapi.clavier.dev) :
 * 1. Création ordonnée des 9 collections via l'API Content-Type Builder
 * 2. Configuration des permissions d'accès (Public et Authenticated)
 * 3. Peuplement intégral (Seed) des données depuis data/*.json
 * 4. Contrôle qualité et validation
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

const STRAPI_URL = process.env.STRAPI_URL || process.env.VITE_STRAPI_URL || 'https://strapi.clavier.dev';
const ADMIN_TOKEN = process.env.STRAPI_ADMIN_TOKEN;
const CONTENT_API_TOKEN = process.env.STRAPI_API_TOKEN || process.env.STRAPI_CONTENT_API_TOKEN || process.env.VITE_STRAPI_API_TOKEN;
const DATA_DIR = path.join(__dirname, 'data');

if (!ADMIN_TOKEN) {
  console.error('\x1b[31m❌ Erreur : STRAPI_ADMIN_TOKEN manquant dans les variables d\'environnement ou le fichier .env\x1b[0m');
  process.exit(1);
}
if (!CONTENT_API_TOKEN) {
  console.error('\x1b[31m❌ Erreur : STRAPI_API_TOKEN manquant dans les variables d\'environnement ou le fichier .env\x1b[0m');
  process.exit(1);
}

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

async function waitHealthy(maxWaitSeconds = 60) {
  const start = Date.now();
  await new Promise(r => setTimeout(r, 2000));
  while ((Date.now() - start) / 1000 < maxWaitSeconds) {
    try {
      const res = await fetch(`${STRAPI_URL}/_health`, { signal: AbortSignal.timeout(4000) });
      if (res.status === 204) {
        return true;
      }
    } catch (e) {
      // Server is restarting
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Le serveur n'a pas répondu dans le délai imparti de ${maxWaitSeconds}s`);
}

async function adminRequest(endpoint, { method = 'GET', body } = {}) {
  const res = await fetch(`${STRAPI_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
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

async function contentApiRequest(endpoint, { method = 'GET', body } = {}) {
  const res = await fetch(`${STRAPI_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONTENT_API_TOKEN}`,
    },
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

// ─── DÉFINITION DES 9 COLLECTIONS ───────────────────────────────────────────
const CONTENT_TYPES_DEFINITIONS = [
  {
    singularName: 'location',
    contentType: {
      displayName: 'Location',
      singularName: 'location',
      pluralName: 'locations',
      draftAndPublish: false,
      kind: 'collectionType',
      collectionName: 'locations',
      description: 'Spatial resources (rooms, facilities, halls)',
      attributes: {
        name: { type: 'string', required: true },
        address: { type: 'string' },
        capacity: { type: 'integer', required: true, min: 1 },
        globalOpeningStart: { type: 'date', required: true },
        globalOpeningEnd: { type: 'date', required: true },
        weeklyClosures: { type: 'json' },
        specificClosures: { type: 'json' },
      },
    },
  },
  {
    singularName: 'facilitator',
    contentType: {
      displayName: 'Facilitator',
      singularName: 'facilitator',
      pluralName: 'facilitators',
      draftAndPublish: false,
      kind: 'collectionType',
      collectionName: 'facilitators',
      description: 'Instructors, hosts, or facilitators',
      attributes: {
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        email: { type: 'email', required: true, unique: true },
        skills: { type: 'text' },
        weeklyAvailabilities: { type: 'json' },
        specificUnavailabilities: { type: 'json' },
        user: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'plugin::users-permissions.user',
        },
      },
    },
  },
  {
    singularName: 'participant',
    contentType: {
      displayName: 'Participant',
      singularName: 'participant',
      pluralName: 'participants',
      draftAndPublish: false,
      kind: 'collectionType',
      collectionName: 'participants',
      description: 'Beneficiaries, clients, or participants',
      attributes: {
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        email: { type: 'email', required: true, unique: true },
        weeklyAvailabilities: { type: 'json' },
        specificUnavailabilities: { type: 'json' },
        user: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'plugin::users-permissions.user',
        },
      },
    },
  },
  {
    singularName: 'activity-template',
    contentType: {
      displayName: 'ActivityTemplate',
      singularName: 'activity-template',
      pluralName: 'activity-templates',
      draftAndPublish: false,
      kind: 'collectionType',
      collectionName: 'activity_templates',
      description: 'Templates of activities or courses',
      attributes: {
        name: { type: 'string', required: true },
        standardDuration: { type: 'integer', required: true, min: 1 },
        minParticipants: { type: 'integer', required: true, min: 0 },
        maxParticipants: { type: 'integer', required: true },
        tags: { type: 'json' },
        authorizedFacilitators: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::facilitator.facilitator',
          targetAttribute: 'authorizedActivities',
        },
      },
    },
  },
  {
    singularName: 'room-session',
    contentType: {
      displayName: 'RoomSession',
      singularName: 'room-session',
      pluralName: 'room-sessions',
      draftAndPublish: false,
      kind: 'collectionType',
      collectionName: 'room_sessions',
      description: 'Daily room opening session with assigned manager and beneficiaries',
      attributes: {
        date: { type: 'date', required: true },
        location: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::location.location',
          targetAttribute: 'roomSessions',
        },
        manager: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::facilitator.facilitator',
          targetAttribute: 'managedRoomSessions',
        },
        participants: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::participant.participant',
        },
      },
    },
  },
  {
    singularName: 'room-session-template',
    contentType: {
      displayName: 'RoomSessionTemplate',
      singularName: 'room-session-template',
      pluralName: 'room-session-templates',
      draftAndPublish: false,
      kind: 'collectionType',
      collectionName: 'room_session_templates',
      description: 'Standard recurring week template configuration for room openings',
      attributes: {
        dayOfWeek: { type: 'integer', required: true, min: 1, max: 7 },
        isActive: { type: 'boolean', default: true },
        notes: { type: 'string' },
        location: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::location.location',
        },
        manager: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::facilitator.facilitator',
        },
        participants: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::participant.participant',
        },
      },
    },
  },
  {
    singularName: 'time-slot',
    contentType: {
      displayName: 'TimeSlot',
      singularName: 'time-slot',
      pluralName: 'time-slots',
      draftAndPublish: false,
      kind: 'collectionType',
      collectionName: 'time_slots',
      description: 'Scheduled activity occurrences',
      attributes: {
        startDate: { type: 'datetime', required: true },
        endDate: { type: 'datetime', required: true },
        location: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::location.location',
          targetAttribute: 'timeSlots',
        },
        facilitators: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::facilitator.facilitator',
          targetAttribute: 'timeSlots',
        },
        participants: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::participant.participant',
          targetAttribute: 'timeSlots',
        },
        roomSession: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::room-session.room-session',
          targetAttribute: 'timeSlots',
        },
      },
    },
  },
  {
    singularName: 'scheduled-activity',
    contentType: {
      displayName: 'ScheduledActivity',
      singularName: 'scheduled-activity',
      pluralName: 'scheduled-activities',
      draftAndPublish: false,
      kind: 'collectionType',
      collectionName: 'scheduled_activities',
      description: 'Effective scheduled activity occurrences happening within a room time slot',
      attributes: {
        name: { type: 'string', required: true },
        startDate: { type: 'datetime', required: true },
        endDate: { type: 'datetime', required: true },
        description: { type: 'text' },
        tags: { type: 'json' },
        timeSlot: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::time-slot.time-slot',
          targetAttribute: 'scheduledActivities',
        },
        activityTemplate: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::activity-template.activity-template',
        },
        facilitators: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::facilitator.facilitator',
        },
        location: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::location.location',
        },
      },
    },
  },
  {
    singularName: 'check-in',
    contentType: {
      displayName: 'CheckIn',
      singularName: 'check-in',
      pluralName: 'check-ins',
      draftAndPublish: false,
      kind: 'collectionType',
      collectionName: 'check_ins',
      description: 'Participant attendance check-in & check-out records and comments',
      attributes: {
        isPresent: { type: 'boolean', default: true, required: true },
        checkInTime: { type: 'datetime' },
        checkOutTime: { type: 'datetime' },
        comment: { type: 'text' },
        timeSlot: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::time-slot.time-slot',
          targetAttribute: 'checkIns',
        },
        participant: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::participant.participant',
          targetAttribute: 'checkIns',
        },
      },
    },
  },
];

// ─── 1. CRÉATION DES COLLECTIONS ────────────────────────────────────────────
async function createCollections() {
  log('📦', `${C.cyan}${C.bold}Étape 1 : Création des 9 collections via Content-Type Builder...${C.reset}`);

  const ctList = await adminRequest('/content-type-builder/content-types');
  const existingUids = new Set(ctList.data.map(c => c.uid));

  for (const def of CONTENT_TYPES_DEFINITIONS) {
    const uid = `api::${def.singularName}.${def.singularName}`;
    if (existingUids.has(uid)) {
      log('ℹ️', `${C.dim}Collection ${uid} déjà présente, ignorée.${C.reset}`);
      continue;
    }

    log('⏳', `Création de ${C.bold}${uid}${C.reset}...`);
    try {
      await adminRequest('/content-type-builder/content-types', {
        method: 'POST',
        body: { contentType: def.contentType },
      });
    } catch (err) {
      // Si la connexion se coupe lors du restart ou renvoie 502/201
      log('ℹ️', `${C.dim}Requête envoyée (${err.message})...${C.reset}`);
    }

    log('🔄', `Attente du redémarrage du serveur Strapi...`);
    await waitHealthy();
    log('✅', `${C.green}Collection ${uid} créée et serveur synchronisé.${C.reset}`);
  }

  log('🎉', `${C.green}${C.bold}Toutes les collections sont en ligne et opérationnelles !${C.reset}\n`);
}

// ─── 2. CONFIGURATION DES RÔLES & PERMISSIONS ────────────────────────────────
async function configurePermissions() {
  log('🛡️', `${C.cyan}${C.bold}Étape 2 : Configuration des rôles et autorisations API (Public, Authenticated, Admin, Facilitator)...${C.reset}`);

  // 1. Assurer la présence des rôles Admin & Facilitator dans users-permissions
  let rolesRes = await adminRequest('/users-permissions/roles');
  const existingTypes = new Set(rolesRes.roles.map(r => r.type));

  if (!existingTypes.has('facilitator')) {
    log('➕', `Création du rôle users-permissions ${C.bold}Facilitator${C.reset}...`);
    await adminRequest('/users-permissions/roles', {
      method: 'POST',
      body: { name: 'Facilitator', description: 'Rôle Animateur / Intervenant', type: 'facilitator' }
    });
  }
  if (!existingTypes.has('admin')) {
    log('➕', `Création du rôle users-permissions ${C.bold}Admin${C.reset}...`);
    await adminRequest('/users-permissions/roles', {
      method: 'POST',
      body: { name: 'Admin', description: 'Rôle Administrateur', type: 'admin' }
    });
  }

  // Assurer la présence des rôles Admin & Facilitator dans admin/roles
  try {
    const adminRoles = await adminRequest('/admin/roles');
    const existingAdminNames = new Set(adminRoles.data.map(r => r.name));
    if (!existingAdminNames.has('Facilitator')) {
      await adminRequest('/admin/roles', {
        method: 'POST',
        body: { name: 'Facilitator', description: 'Facilitator role' }
      });
    }
    if (!existingAdminNames.has('Admin')) {
      await adminRequest('/admin/roles', {
        method: 'POST',
        body: { name: 'Admin', description: 'Administrator role' }
      });
    }
  } catch (e) {
    // Ignoré si déjà présent ou non autorisé
  }

  // Re-récupérer la liste à jour des rôles users-permissions
  rolesRes = await adminRequest('/users-permissions/roles');

  const planningApis = [
    'location',
    'facilitator',
    'participant',
    'activity-template',
    'room-session',
    'room-session-template',
    'time-slot',
    'scheduled-activity',
    'check-in'
  ];

  for (const roleMeta of rolesRes.roles) {
    log('🔑', `Configuration du rôle ${C.bold}${roleMeta.name}${C.reset}...`);
    const roleDetail = await adminRequest(`/users-permissions/roles/${roleMeta.id}`);
    const permissions = roleDetail.role.permissions || {};

    const isFacilitator = roleMeta.type === 'facilitator';

    for (const apiName of planningApis) {
      const apiKey = `api::${apiName}`;
      if (!permissions[apiKey]) permissions[apiKey] = { controllers: {} };
      if (!permissions[apiKey].controllers[apiName]) permissions[apiKey].controllers[apiName] = {};

      let actions = ['find', 'findOne', 'create', 'update', 'delete'];
      if (isFacilitator) {
        if (apiName === 'check-in') {
          actions = ['find', 'findOne', 'create', 'update', 'delete'];
        } else if (apiName === 'time-slot' || apiName === 'scheduled-activity') {
          actions = ['find', 'findOne', 'create', 'update'];
        } else {
          actions = ['find', 'findOne'];
        }
      }

      for (const act of actions) {
        permissions[apiKey].controllers[apiName][act] = { enabled: true };
      }
    }

    // Permissions sur users-permissions (profil / me)
    if (!permissions['plugin::users-permissions']) permissions['plugin::users-permissions'] = { controllers: {} };
    if (!permissions['plugin::users-permissions'].controllers['user']) permissions['plugin::users-permissions'].controllers['user'] = {};
    permissions['plugin::users-permissions'].controllers['user']['me'] = { enabled: true };
    if (!isFacilitator) {
      permissions['plugin::users-permissions'].controllers['user']['find'] = { enabled: true };
      permissions['plugin::users-permissions'].controllers['user']['findOne'] = { enabled: true };
    }

    await adminRequest(`/users-permissions/roles/${roleMeta.id}`, {
      method: 'PUT',
      body: { permissions }
    });
    log('✅', `${C.green}Permissions mises à jour pour ${roleMeta.name}${C.reset}`);
  }

  console.log('');
}

// ─── 3. SEEDING DES DONNÉES ────────────────────────────────────────────────
async function seedData() {
  log('🌱', `${C.cyan}${C.bold}Étape 3 : Injection des données complètes (Seed)...${C.reset}`);

  // 1. Lieux
  log('📍', `Création des lieux...`);
  const locations = loadJSON('locations.json');
  const locationsMap = {};
  for (const loc of locations) {
    const res = await contentApiRequest('/api/locations', {
      method: 'POST',
      body: { data: loc },
    });
    locationsMap[loc.name] = res.data.documentId;
  }
  log('✅', `${C.green}${Object.keys(locationsMap).length} lieux créés${C.reset}`);

  // Récupérer les rôles pour l'attribution des utilisateurs
  const rolesRes = await adminRequest('/users-permissions/roles');
  const facRole = rolesRes.roles.find(r => r.type === 'facilitator') || { id: 3 };
  const authRole = rolesRes.roles.find(r => r.type === 'authenticated') || { id: 1 };

  // Charger les utilisateurs existants pour éviter les doublons
  const existingUsers = await contentApiRequest('/api/users');
  const usersByEmail = new Map();
  for (const u of existingUsers) {
    usersByEmail.set(u.email.toLowerCase(), u);
  }

  async function getOrCreateUser(firstName, lastName, email, roleId) {
    const key = email.toLowerCase();
    if (usersByEmail.has(key)) {
      return usersByEmail.get(key);
    }
    const cleanUsername = (firstName + '_' + lastName)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase() + '_' + Math.floor(Math.random() * 1000);

    const newUser = await contentApiRequest('/api/users', {
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
    usersByEmail.set(key, newUser);
    return newUser;
  }

  // 2. Animateurs
  log('👨‍🏫', `Création des animateurs avec comptes utilisateurs associés...`);
  const facilitators = loadJSON('facilitators.json');
  const facilitatorsMap = {};
  for (const fac of facilitators) {
    const { _authorizedActivities, ...data } = fac;
    const user = await getOrCreateUser(fac.firstName, fac.lastName, fac.email, facRole.id);
    const res = await contentApiRequest('/api/facilitators', {
      method: 'POST',
      body: {
        data: {
          ...data,
          user: user.documentId,
        },
      },
    });
    facilitatorsMap[fac.email] = {
      documentId: res.data.documentId,
      _authorizedActivities: _authorizedActivities || [],
    };
  }
  log('✅', `${C.green}${Object.keys(facilitatorsMap).length} animateurs créés et liés à un utilisateur${C.reset}`);

  // 3. Participants
  log('👥', `Création des participants avec comptes utilisateurs associés...`);
  const participants = loadJSON('participants.json');
  const participantsMap = {};
  for (const part of participants) {
    const user = await getOrCreateUser(part.firstName, part.lastName, part.email, authRole.id);
    const res = await contentApiRequest('/api/participants', {
      method: 'POST',
      body: {
        data: {
          ...part,
          user: user.documentId,
        },
      },
    });
    participantsMap[part.email] = res.data.documentId;
  }
  log('✅', `${C.green}${Object.keys(participantsMap).length} participants créés et liés à un utilisateur${C.reset}`);

  // 4. Modèles d'activité
  log('🎯', `Création des modèles d'activités...`);
  const templates = loadJSON('activity-templates.json');
  const activitiesMap = {};
  for (const tpl of templates) {
    const { _authorizedFacilitators, ...data } = tpl;
    const facilitatorIds = (_authorizedFacilitators || [])
      .map(email => facilitatorsMap[email]?.documentId)
      .filter(Boolean);

    const res = await contentApiRequest('/api/activity-templates', {
      method: 'POST',
      body: {
        data: {
          ...data,
          authorizedFacilitators: facilitatorIds,
        },
      },
    });
    activitiesMap[tpl.name] = res.data.documentId;
  }
  log('✅', `${C.green}${Object.keys(activitiesMap).length} modèles d'activités créés${C.reset}`);

  // 5. Sessions de salle
  log('🚪', `Création des sessions de salle...`);
  const sessions = loadJSON('room-sessions.json');
  const roomSessionsMap = {};
  for (const sess of sessions) {
    const { _location, _manager, _participants, date } = sess;
    const locationId = locationsMap[_location];
    const managerId = facilitatorsMap[_manager]?.documentId;
    const participantIds = (_participants || [])
      .map(email => participantsMap[email])
      .filter(Boolean);

    if (!locationId || !managerId) continue;

    const res = await contentApiRequest('/api/room-sessions', {
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
    roomSessionsMap[`${date}|${locationId}`] = res.data.documentId;
  }
  log('✅', `${C.green}${Object.keys(roomSessionsMap).length} sessions de salle créées${C.reset}`);

  // 6. Modèles de semaine type
  log('⚡', `Création des modèles de semaine type...`);
  let roomSessionTemplates = [];
  try {
    roomSessionTemplates = loadJSON('room-session-templates.json');
  } catch (e) {}
  let rstCount = 0;
  for (const t of roomSessionTemplates) {
    const { _location, _manager, _participants, dayOfWeek, isActive, notes } = t;
    const locationId = locationsMap[_location];
    const managerId = facilitatorsMap[_manager]?.documentId || null;
    const participantIds = (_participants || [])
      .map(email => participantsMap[email])
      .filter(Boolean);

    if (!locationId) continue;

    await contentApiRequest('/api/room-session-templates', {
      method: 'POST',
      body: {
        data: {
          dayOfWeek,
          location: locationId,
          manager: managerId,
          participants: participantIds,
          isActive: isActive !== false,
          notes: notes || '',
        },
      },
    });
    rstCount++;
  }
  log('✅', `${C.green}${rstCount} modèles de semaine type créés${C.reset}`);

  // 7. Créneaux (TimeSlots) & Activités programmées
  log('📅', `Création des créneaux et activités programmées...`);
  const slots = loadJSON('time-slots.json');
  let slotCount = 0;
  let actCount = 0;
  const createdSlots = [];

  for (const slot of slots) {
    const { _activity, _location, _facilitators, _participants, ...dates } = slot;
    const locationId = locationsMap[_location];
    const activityId = activitiesMap[_activity];
    const facilitatorIds = (_facilitators || [])
      .map(email => facilitatorsMap[email]?.documentId)
      .filter(Boolean);
    const participantIds = (_participants || [])
      .map(email => participantsMap[email])
      .filter(Boolean);

    if (!locationId || !activityId) continue;

    const dateStr = dates.startDate ? dates.startDate.slice(0, 10) : null;
    const roomSessionId = dateStr ? roomSessionsMap[`${dateStr}|${locationId}`] : null;

    try {
      const resSlot = await contentApiRequest('/api/time-slots', {
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
        participantIds,
      });
      slotCount++;

      // Sous-activité programmée
      await contentApiRequest('/api/scheduled-activities', {
        method: 'POST',
        body: {
          data: {
            name: _activity,
            startDate: dates.startDate,
            endDate: dates.endDate,
            timeSlot: slotDocId,
            activityTemplate: activityId,
            location: locationId,
            facilitators: facilitatorIds,
          },
        },
      });
      actCount++;
    } catch (err) {
      log('⚠️', `${C.yellow}Créneau ${_activity} ignoré: ${err.message}${C.reset}`);
    }
  }
  log('✅', `${C.green}${slotCount} créneaux et ${actCount} activités programmées créés${C.reset}`);

  // 8. Émargements / Pointages (Check-ins)
  log('✍️', `Génération des pointages et émargements de test...`);
  const targetSlots = createdSlots.filter(s => s.participantIds.length > 0).slice(0, 15);
  const sampleComments = [
    'Arrivé par transport VSL',
    'En forme et très participatif',
    'Léger retard dû au transport',
    'A apprécié l’atelier',
    'Départ anticipé pour visite médicale',
    'Bonne humeur ce matin',
  ];

  let checkInCount = 0;
  for (const slot of targetSlots) {
    const startDt = new Date(slot.startDate);
    const endDt = new Date(slot.endDate);

    for (let i = 0; i < slot.participantIds.length; i++) {
      const partId = slot.participantIds[i];
      const isPresent = i % 7 !== 0;
      const checkInOffsetMin = (i * 3) % 20;
      const checkInTime = new Date(startDt.getTime() + checkInOffsetMin * 60000).toISOString();
      const hasDeparted = isPresent && i % 3 === 0;
      const checkOutTime = hasDeparted ? new Date(endDt.getTime() - 5 * 60000).toISOString() : null;
      const comment = i % 2 === 0 ? sampleComments[i % sampleComments.length] : '';

      try {
        await contentApiRequest('/api/check-ins', {
          method: 'POST',
          body: {
            data: {
              isPresent,
              checkInTime: isPresent ? checkInTime : null,
              checkOutTime,
              comment,
              timeSlot: slot.documentId,
              participant: partId,
            },
          },
        });
        checkInCount++;
      } catch (e) {}
    }
  }
  log('✅', `${C.green}${checkInCount} émargements/pointages créés${C.reset}\n`);
}

// ─── 4. CONTRÔLE ET VALIDATION ──────────────────────────────────────────────
async function verifyDeployment() {
  log('🔍', `${C.cyan}${C.bold}Étape 4 : Contrôle final et validation des données...${C.reset}`);

  const endpoints = [
    { path: '/api/locations', name: 'Lieux' },
    { path: '/api/facilitators', name: 'Animateurs' },
    { path: '/api/participants', name: 'Participants' },
    { path: '/api/activity-templates', name: 'Modèles d\'activités' },
    { path: '/api/room-sessions', name: 'Sessions de salle' },
    { path: '/api/room-session-templates', name: 'Trames semaine type' },
    { path: '/api/time-slots', name: 'Créneaux horaires' },
    { path: '/api/scheduled-activities', name: 'Activités programmées' },
    { path: '/api/check-ins', name: 'Émargements' },
  ];

  for (const ep of endpoints) {
    const res = await contentApiRequest(`${ep.path}?pagination[pageSize]=1`);
    const total = res.meta?.pagination?.total ?? res.data?.length ?? 0;
    log('📊', `${C.bold}${ep.name.padEnd(26)}${C.reset} : ${C.green}${total} enregistrements${C.reset}`);
  }

  // Vérification de la population d'un créneau
  const sampleSlot = await contentApiRequest('/api/time-slots?populate=*&pagination[pageSize]=1');
  if (sampleSlot.data && sampleSlot.data.length > 0) {
    const s = sampleSlot.data[0];
    const hasLocation = !!s.location;
    const hasFacilitators = Array.isArray(s.facilitators) && s.facilitators.length > 0;
    const hasActivities = Array.isArray(s.scheduledActivities) && s.scheduledActivities.length > 0;
    log('🔗', `Intégrité relationnelle créneau : Lieu=${hasLocation ? '✅' : '❌'}, Animateurs=${hasFacilitators ? '✅' : '❌'}, Sous-activités=${hasActivities ? '✅' : '❌'}`);
  }

  console.log('');
  log('🌟', `${C.green}${C.bold}Déploiement complet terminé avec succès sur ${STRAPI_URL} !${C.reset}`);
}

async function main() {
  console.log('');
  console.log(`${C.cyan}╔═══════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}║   ⚡ AetherScheduler — Déploiement Strapi distant API    ║${C.reset}`);
  console.log(`${C.cyan}╚═══════════════════════════════════════════════════════════╝${C.reset}`);
  console.log('');
  log('🌐', `Cible : ${C.bold}${STRAPI_URL}${C.reset}`);
  console.log('');

  await createCollections();
  await configurePermissions();
  await seedData();
  await verifyDeployment();
}

main().catch(err => {
  console.error(`\n${C.red}❌ Erreur de déploiement:\n${err.message}${C.reset}\n`);
  process.exit(1);
});
