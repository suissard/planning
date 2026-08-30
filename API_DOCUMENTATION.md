# 📖 Documentation Complète de l'API & Règles Métier (AetherScheduler)

Cette documentation fournit une référence exhaustive et détaillée pour l'API REST du backend **AetherScheduler** (propulsé par **Strapi v5**). Elle détaille l'ensemble des routes, méthodes HTTP, structures de données, paramètres de requête, relations, ainsi que **toutes les contraintes et règles de validation métier strictes** appliquées côté serveur et côté client.

---

## 📑 Table des Matières

1. [Architecture Globale & Conventions](#1-architecture-globale--conventions)
2. [Authentification, Sécurité & Droits d'Accès](#2-authentification-sécurité--droits-daccès)
3. [Moteur de Requête REST Strapi 5 (Paramètres Communs)](#3-moteur-de-requête-rest-strapi-5-paramètres-communs)
4. [Routes Détaillées & Règles Métier par Ressource](#4-routes-détaillées--règles-métier-par-ressource)
   - [4.1. Créneaux Horaires & Planning (`/api/time-slots`)](#41-créneaux-horaires--planning-apitime-slots)
     - *Le Moteur des 6 Contraintes Métier (`lifecycles.js`)*
     - *Détail des validations, erreurs et payloads*
   - [4.2. Lieux & Salles (`/api/locations`)](#42-lieux--salles-apilocations)
   - [4.3. Modèles d'Activités (`/api/activity-templates`)](#43-modèles-dactivités-apiactivity-templates)
   - [4.4. Animateurs & Intervenants (`/api/facilitators`)](#44-animateurs--intervenants-apifacilitators)
   - [4.5. Participants & Bénéficiaires (`/api/participants`)](#45-participants--bénéficiaires-apiparticipants)
   - [4.6. Sessions d'Ouverture de Salle (`/api/room-sessions`)](#46-sessions-douverture-de-salle-apiroom-sessions)
   - [4.7. Trames Hebdomadaires Récurrentes (`/api/room-session-templates`)](#47-trames-hebdomadaires-récurrentes-apiroom-session-templates)
   - [4.8. Authentification & Utilisateurs (`/api/auth` & `/api/users`)](#48-authentification--utilisateurs-apiauth--apiusers)
   - [4.9. Pointages & Émargements (`/api/check-ins`)](#49-pointages--émargements-apicheck-ins)
5. [Spécifications des Formats JSON Complexes](#5-spécifications-des-formats-json-complexes)
   - [5.1. Disponibilités Hebdomadaires (`weeklyAvailabilities`)](#51-disponibilités-hebdomadaires-weeklyavailabilities)
   - [5.2. Indisponibilités Ponctuelles & Congés (`specificUnavailabilities`)](#52-indisponibilités-ponctuelles--congés-specificunavailabilities)
   - [5.3. Fermetures Hebdomadaires (`weeklyClosures`)](#53-fermetures-hebdomadaires-weeklyclosures)
   - [5.4. Fermetures Exceptionnelles (`specificClosures`)](#54-fermetures-exceptionnelles-specificclosures)
6. [Gestion des Erreurs, Codes HTTP & Notifications Frontend](#6-gestion-des-erreurs-codes-http--notifications-frontend)
7. [Guide d'Exemples & Requêtes cURL / Axios](#7-guide-dexemples--requêtes-curl--axios)

---

## 1. Architecture Globale & Conventions

### 1.1. Informations Générales
- **Base URL locale** : `http://localhost:1337/api`
- **Variable d'environnement Frontend** : `VITE_STRAPI_URL` (ex: `http://localhost:1337`)
- **Format d'échange** : `application/json` (UTF-8)
- **Fuseau horaire de référence pour les calculs d'horaires et de jours** : `Europe/Paris`

### 1.2. Gestion des Identifiants dans Strapi 5
Dans Strapi 5, chaque enregistrement possède deux identifiants distincts :
1. **`documentId`** *(String)* : Identifiant universel unique alphanumérique (ex: `"c9k2m1q8abcde123"`). **C'est cet identifiant qui doit être utilisé dans les routes d'API individuelles (`GET /:documentId`, `PUT /:documentId`, `DELETE /:documentId`).**
2. **`id`** *(Integer)* : Clé primaire numérique de la base de données SQL sous-jacente.

### 1.3. Format Standard des Requêtes d'Écriture (POST / PUT)
Toutes les mutations de données doivent obligatoirement encapsuler le corps de la requête dans un objet JSON racine `"data"` :
```json
{
  "data": {
    "name": "Salle Cézanne",
    "capacity": 20
  }
}
```

### 1.4. Format Standard des Réponses de l'API
Pour une collection (`GET /api/locations`) :
```json
{
  "data": [
    {
      "id": 1,
      "documentId": "c9k2m1q8abcde123",
      "name": "Salle Cézanne",
      "capacity": 20,
      "createdAt": "2026-08-20T10:00:00.000Z",
      "updatedAt": "2026-08-23T12:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

Pour une entité unitaire (`GET /api/locations/c9k2m1q8abcde123`) :
```json
{
  "data": {
    "id": 1,
    "documentId": "c9k2m1q8abcde123",
    "name": "Salle Cézanne",
    "capacity": 20,
    "createdAt": "2026-08-20T10:00:00.000Z",
    "updatedAt": "2026-08-23T12:00:00.000Z"
  },
  "meta": {}
}
```

### 1.5. Gestion des Relations (Strapi 5 Document Service)
Pour associer ou dissocier des relations dans un payload `POST` ou `PUT`, Strapi 5 accepte plusieurs syntaxes :
- **Syntaxe directe (recommandée)** : Passer un tableau de `documentId` (ou un `documentId` unitaire pour les relations ManyToOne).
  ```json
  {
    "data": {
      "location": "c9k2m1q8abcde123",
      "facilitators": ["f7b1c2d3e4f5a6b7", "f9k8j7h6g5f4e3d2"]
    }
  }
  ```
- **Syntaxe d'opérations relationnelles (`set`, `connect`, `disconnect`)** :
  ```json
  {
    "data": {
      "participants": {
        "connect": ["p1a2b3c4d5e6f7a8"],
        "disconnect": ["p9z8y7x6w5v4u3t2"]
      }
    }
  }
  ```

---

## 2. Authentification, Sécurité & Droits d'Accès

L'API utilise le plugin officiel `@strapi/plugin-users-permissions` avec des jetons JWT (**Bearer Token**).

### 2.1. Header HTTP d'Authentification
Toutes les requêtes nécessitant des droits doivent inclure le token JWT :
```http
Authorization: Bearer <VOTRE_TOKEN_JWT>
```

### 2.2. Configuration Automatique des Droits (`backend/src/index.js`)
Au démarrage du serveur Strapi, le hook `bootstrap()` attribue automatiquement les permissions CRUD (`find`, `findOne`, `create`, `update`, `delete`) sur l'ensemble des 7 entités de planification :
- **Rôle `authenticated`** : Toujours autorisé sur toutes les ressources.
- **Rôle `public`** : Autorisé automatiquement en mode développement (`NODE_ENV=development`) pour faciliter les tests et l'intégration locale.

---

## 3. Moteur de Requête REST Strapi 5 (Paramètres Communs)

Toutes les routes `GET /api/<ressource>` prennent en charge les paramètres d'URL de Strapi 5 :

### 3.1. Population des Relations (`populate`)
Par défaut, Strapi ne renvoie pas les données des relations liées. Vous devez explicitement les demander :
- Récupérer toutes les relations de premier niveau :
  `GET /api/time-slots?populate=*`
- Récupérer des relations ciblées :
  `GET /api/time-slots?populate[location]=true&populate[facilitators]=true&populate[participants]=true`
- Population imbriquée :
  `GET /api/time-slots?populate[activityTemplate][populate][authorizedFacilitators]=true`

### 3.2. Filtrage Avancé (`filters`)
| Opérateur | Signification | Exemple |
|---|---|---|
| `$eq` | Égalité | `?filters[name][$eq]=Yoga` |
| `$ne` | Différence | `?filters[documentId][$ne]=c9k2m1q8...` |
| `$in` | Dans un tableau | `?filters[id][$in][0]=1&filters[id][$in][1]=2` |
| `$notIn` | Hors d'un tableau | `?filters[id][$notIn][0]=5` |
| `$null` | Est nul (`true`/`false`) | `?filters[manager][$null]=false` |
| `$notNull` | N'est pas nul | `?filters[manager][$notNull]=true` |
| `$lt` | Strictement inférieur | `?filters[startDate][$lt]=2026-08-31T23:59:59.000Z` |
| `$lte` | Inférieur ou égal | `?filters[capacity][$lte]=20` |
| `$gt` | Strictement supérieur | `?filters[endDate][$gt]=2026-08-01T00:00:00.000Z` |
| `$gte` | Supérieur ou égal | `?filters[startDate][$gte]=2026-08-01T00:00:00.000Z` |
| `$contains` | Contient (sensible à la casse) | `?filters[name][$contains]=Salle` |
| `$containsi` | Contient (insensible à la casse) | `?filters[name][$containsi]=cézanne` |
| `$and` / `$or` | Combinaisons logiques | `?filters[$and][0][startDate][$gte]=...&filters[$and][1][endDate][$lte]=...` |

### 3.3. Tri (`sort`)
- Tri ascendant : `?sort=lastName:asc`
- Tri multi-critères : `?sort=lastName:asc,firstName:asc` ou `?sort[0]=date:asc&sort[1]=createdAt:desc`

### 3.4. Pagination (`pagination`)
- Par page : `?pagination[page]=1&pagination[pageSize]=100`
- Décalage : `?pagination[start]=0&pagination[limit]=50`
- Charger un grand volume : `?pagination[pageSize]=5000`

---

## 4. Routes Détaillées & Règles Métier par Ressource

---

### 4.1. Créneaux Horaires & Planning (`/api/time-slots`)

Le **TimeSlot** est le cœur décisionnel de l'application. Il représente une occurrence planifiée liant un intervalle de temps, une salle (`Location`), un modèle d'activité (`ActivityTemplate`), des animateurs (`Facilitators`) et des participants (`Participants`).

#### 🛣️ Endpoints disponibles

| Méthode | Route | Action | Description |
|---|---|---|---|
| `GET` | `/api/time-slots` | `find` | Liste des créneaux (filtrable par date, lieu, etc.) |
| `GET` | `/api/time-slots/:documentId` | `findOne` | Détail complet d'un créneau |
| `POST` | `/api/time-slots` | `create` | Création d'un créneau avec validation stricte |
| `PUT` | `/api/time-slots/:documentId` | `update` | Modification d'un créneau avec validation stricte |
| `DELETE` | `/api/time-slots/:documentId` | `delete` | Suppression d'un créneau |

#### 📋 Schéma de Données (`TimeSlot`)

| Attribut | Type | Obligatoire | Description & Contraintes |
|---|---|---|---|
| `startDate` | DateTime ISO-8601 | **Oui** | Début de l'activité (ex: `2026-08-25T09:00:00.000Z`) |
| `endDate` | DateTime ISO-8601 | **Oui** | Fin de l'activité (ex: `2026-08-25T11:00:00.000Z`) |
| `location` | Relation `manyToOne` | **Oui** | Salle / Espace physique accueillant l'activité |
| `activityTemplate` | Relation `manyToOne` | **Oui** | Modèle d'activité associé |
| `facilitators` | Relation `manyToMany` | Non | Liste des animateurs affectés |
| `participants` | Relation `manyToMany` | Non | Liste des participants inscrits |
| `roomSession` | Relation `manyToOne` | Non | Session d'ouverture de salle journalière rattachée |

---

#### 🛡️ Le Moteur de Validation des Contraintes Métier (`lifecycles.js`)

Avant chaque création (`beforeCreate`) et chaque mise à jour (`beforeUpdate`), le fichier `backend/src/api/time-slot/content-types/time-slot/lifecycles.js` exécute un ensemble de **règles et contraintes d'intégrité métier**. Si une condition critique est violée, la requête est rejetée avec un code **HTTP 400 Bad Request** (`ValidationError`).

```
                              ┌────────────────────────────────────────┐
                              │ Requête POST / PUT /api/time-slots     │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │ 0. Dates Valides ?                               │
                         │    startDate < endDate (dates ISO conformes)     │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │ 1. Contrainte d'Espace (Capacité Salle)          │
                         │    nb_participants <= Location.capacity          │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │ 2. Contrainte de Capacité Max d'Activité         │
                         │    nb_participants <= Activity.maxParticipants   │
                         │    (Le minimum requis ne bloque plus la création)│
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │ 3. Disponibilité de la Salle (Location)          │
                         │    - Dans [globalOpeningStart, globalOpeningEnd] │
                         │    - Jour non présent dans weeklyClosures        │
                         │    - Pas de chevauchement avec specificClosures  │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────┐
                         │ 4. Disponibilités Humaines & Double Booking      │
                         │    - Créneau inclus dans weeklyAvailabilities    │
                         │    - Pas de congés (specificUnavailabilities)    │
                         │    - Pas de conflit avec un autre TimeSlot actif │
                         └────────────────────────┬─────────────────────────┘
                                                  │
                                                  ▼
                                       [ ✅ ENREGISTREMENT OK ]
```

---

#### 🔍 Détail Exhaustif des Contraintes du TimeSlot

##### 🔹 Contrainte 0 : Validité Temporelle Fondamentale
- **Règle** : `startDate` et `endDate` doivent être des dates ISO valides, et `startDate` doit être **strictement antérieure** à `endDate`.
- **Message d'erreur** :
  - `"Validation Error: Start and end dates must be valid dates."`
  - `"Validation Error: Start date must be strictly before end date."`

##### 🔹 Contrainte 1 : Espace (Capacité Physique de la Salle)
- **Règle** : Le nombre total de participants inscrits ne doit pas dépasser la capacité d'accueil maximale de la salle (`location.capacity`).
- **Message d'erreur** :
  - `"Space Constraint Violated: Assigned participants (X) exceeds location capacity (Y)."`

##### 🔹 Contrainte 2 : Capacité Propre à l'Activité (Max Participants)
- **Règle** : Le nombre de participants inscrits ne doit pas dépasser le plafond maximal (`activityTemplate.maxParticipants`). Le minimum (`minParticipants`) n'est plus bloquant à la création pour permettre des brouillons ou des créneaux en cours d'inscription.
- **Message d'erreur** :
  - `"Activity Capacity Violated: Registered participants (X) exceeds standard maximum (Y)."`

*(Note : La contrainte de durée minimale standard et la vérification exclusive des compétences d'animateurs ont également été assouplies à l'enregistrement pour offrir une souplesse totale de planification).*

##### 🔹 Contrainte 3 : Disponibilité Temporelle du Lieu / Salle
- **Règle A (Période Globale)** : L'intégralité du créneau doit être comprise dans l'intervalle `[location.globalOpeningStart, location.globalOpeningEnd]`.
  - *Erreur* : `"Location Availability Violated: Slot falls outside global open period (START to END)."`
- **Règle B (Fermeture Hebdomadaire)** : Le jour de la semaine (calculé en heure locale `Europe/Paris`, où 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi) ne doit pas figurer dans le tableau `location.weeklyClosures`.
  - *Erreur* : `"Location Availability Violated: Location is closed on weekly closure days (0, 6)."`
- **Règle C (Fermeture Exceptionnelle)** : Le créneau ne doit avoir aucune intersection avec les plages d'indisponibilité listées dans `location.specificClosures` (`startDate < clEnd && endDate > clStart`).
  - *Erreur* : `"Location Availability Violated: Overlaps specific closure period (START to END)."`

##### 🔹 Contrainte 4 : Disponibilités Humaines & Détection des Doublons (Double Booking)
Pour chaque animateur et pour chaque participant :
1. **Monojour & Plage Hebdomadaire (`weeklyAvailabilities`)** :
   - Le créneau ne doit pas s'étendre sur deux jours civils différents.
   - La personne doit avoir une plage horaire configurée pour le jour de la semaine concerné (`"0"` à `"6"`).
   - L'heure de début et l'heure de fin du créneau (ex: `09:30` - `11:30`) doivent être **entièrement incluses** dans l'une des plages disponibles (ex: `09:00 - 12:00`).
   - *Erreur* : `"Weekly Availability Violated: [Participant|Facilitator] \"[Nom]\" is not scheduled to be available during HH:MM - HH:MM."`
2. **Congés & Absences Ponctuelles (`specificUnavailabilities`)** :
   - Le créneau ne doit pas chevaucher une période de congé ou d'absence déclarée.
   - *Erreur* : `"Weekly Availability Violated: [Participant|Facilitator] \"[Nom]\" has a specific unavailability period booked (START to END)."`
3. **Double Réservation (Double Booking)** :
   - Le système vérifie en base de données si l'animateur ou le participant est déjà inscrit sur un autre créneau en conflit (`slot.startDate < endDate && slot.endDate > startDate`).
   - *Erreur* : `"Human Availability Violated: [Participant|Facilitator] \"[Nom]\" is already booked in another slot (START - END)."`

---

#### 💡 Exemples de Payloads (`/api/time-slots`)

##### Création d'un créneau horaire valide :
```http
POST /api/time-slots
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "data": {
    "startDate": "2026-08-26T09:00:00.000Z",
    "endDate": "2026-08-26T11:00:00.000Z",
    "location": "c9k2m1q8abcde123",
    "activityTemplate": "m5p4n8x2lkjhgf99",
    "facilitators": ["f7b1c2d3e4f5a6b7"],
    "participants": ["p1a2b3c4d5e6f7a8", "p9z8y7x6w5v4u3t2"]
  }
}
```

##### Modification d'un créneau (mise à jour des participants) :
```http
PUT /api/time-slots/ts11223344556677
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "data": {
    "participants": ["p1a2b3c4d5e6f7a8", "p3b4c5d6e7f8a9b0"]
  }
}
```

---

### 4.2. Lieux & Salles (`/api/locations`)

Représente les salles physiques, ateliers, gymnases ou locaux hébergeant les activités.

#### 🛣️ Endpoints disponibles

| Méthode | Route | Action | Description |
|---|---|---|---|
| `GET` | `/api/locations` | `find` | Liste des lieux (options : `?populate=*`) |
| `GET` | `/api/locations/:documentId` | `findOne` | Détail d'un lieu |
| `POST` | `/api/locations` | `create` | Créer un nouveau lieu |
| `PUT` | `/api/locations/:documentId` | `update` | Modifier un lieu existant |
| `DELETE` | `/api/locations/:documentId` | `delete` | Supprimer un lieu |

#### 📋 Schéma & Attributs (`Location`)

| Attribut | Type | Requis | Contraintes | Description |
|---|---|---|---|---|
| `name` | String | **Oui** | Non vide | Nom du lieu (ex: `"Salle Cézanne"`) |
| `address` | String | Non | - | Adresse physique ou localisation |
| `capacity` | Integer | **Oui** | `min: 1` | Capacité maximale d'accueil simultanée |
| `globalOpeningStart` | Date (YYYY-MM-DD) | **Oui** | - | Date de début de validité de l'ouverture |
| `globalOpeningEnd` | Date (YYYY-MM-DD) | **Oui** | `>= globalOpeningStart` | Date de fin de validité de l'ouverture |
| `weeklyClosures` | JSON (Array) | Non | Valeurs `0` à `6` | Jours de fermeture hebdomadaire récurrents |
| `specificClosures` | JSON (Array) | Non | Objets `{ startDate, endDate, reason }` | Fermetures exceptionnelles / travaux |
| `timeSlots` | Relation `oneToMany` | Non | - | Créneaux d'activité planifiés dans ce lieu |
| `roomSessions` | Relation `oneToMany` | Non | - | Sessions journalières d'ouverture de cette salle |

#### 💡 Exemple de Payload (Création d'un lieu) :
```json
POST /api/locations
{
  "data": {
    "name": "Atelier Numérique",
    "address": "Bâtiment B - Étage 1",
    "capacity": 12,
    "globalOpeningStart": "2026-01-01",
    "globalOpeningEnd": "2026-12-31",
    "weeklyClosures": [0, 6],
    "specificClosures": [
      {
        "startDate": "2026-08-01T00:00:00.000Z",
        "endDate": "2026-08-15T23:59:59.000Z",
        "reason": "Maintenance informatique estivale"
      }
    ]
  }
}
```

---

### 4.3. Modèles d'Activités (`/api/activity-templates`)

Définit les gabarits d'activités, cours, ateliers ou séances avec leurs règles pédagogiques, de durée et d'effectifs.

#### 🛣️ Endpoints disponibles

| Méthode | Route | Action | Description |
|---|---|---|---|
| `GET` | `/api/activity-templates` | `find` | Liste des modèles (`?populate[authorizedFacilitators]=true`) |
| `GET` | `/api/activity-templates/:documentId` | `findOne` | Détail d'un modèle |
| `POST` | `/api/activity-templates` | `create` | Créer un modèle |
| `PUT` | `/api/activity-templates/:documentId` | `update` | Modifier un modèle |
| `DELETE` | `/api/activity-templates/:documentId` | `delete` | Supprimer un modèle |

#### 📋 Schéma & Attributs (`ActivityTemplate`)

| Attribut | Type | Requis | Contraintes | Description |
|---|---|---|---|---|
| `name` | String | **Oui** | Non vide | Nom du cours / atelier (ex: `"Yoga Doux"`) |
| `standardDuration` | Integer | **Oui** | `min: 1` | Durée minimale exigée en minutes (ex: 60, 90, 120) |
| `minParticipants` | Integer | **Oui** | `min: 0` | Effectif minimum de participants |
| `maxParticipants` | Integer | **Oui** | `>= minParticipants` | Effectif maximum de participants |
| `authorizedFacilitators` | Relation `manyToMany` | Non | - | Liste des animateurs autorisés à animer ce cours |
| `tags` | JSON (Array) | Non | - | Étiquettes (ex: `["Bien-être", "Sport"]`) |
| `timeSlots` | Relation `oneToMany` | Non | - | Créneaux créés d'après ce modèle |

#### 💡 Exemple de Payload :
```json
POST /api/activity-templates
{
  "data": {
    "name": "Peinture & Aquarelle",
    "standardDuration": 90,
    "minParticipants": 2,
    "maxParticipants": 8,
    "tags": ["Arts Plastiques", "Créativité"],
    "authorizedFacilitators": ["f7b1c2d3e4f5a6b7", "f9k8j7h6g5f4e3d2"]
  }
}
```

---

### 4.4. Animateurs & Intervenants (`/api/facilitators`)

Gère les animateurs, formateurs, intervenants ou bénévoles encadrant les activités.

#### 🛣️ Endpoints disponibles

| Méthode | Route | Action | Description |
|---|---|---|---|
| `GET` | `/api/facilitators` | `find` | Liste des animateurs (tri recommandé : `?sort=lastName:asc,firstName:asc`) |
| `GET` | `/api/facilitators/:documentId` | `findOne` | Détail d'un animateur |
| `POST` | `/api/facilitators` | `create` | Créer un animateur |
| `PUT` | `/api/facilitators/:documentId` | `update` | Modifier un animateur |
| `DELETE` | `/api/facilitators/:documentId` | `delete` | Supprimer un animateur |

#### 📋 Schéma & Attributs (`Facilitator`)

| Attribut | Type | Requis | Contraintes | Description |
|---|---|---|---|---|
| `firstName` | String | **Oui** | Non vide | Prénom de l'animateur |
| `lastName` | String | **Oui** | Non vide | Nom de famille |
| `email` | Email | **Oui** | `unique: true` | Adresse e-mail (doit être unique) |
| `skills` | Text | Non | - | Compétences, diplômes, notes |
| `weeklyAvailabilities` | JSON | Non | Objet clé-valeur | Plages de présence récurrentes de la semaine |
| `specificUnavailabilities` | JSON (Array) | Non | Objets dates ISO | Congés, absences ou indisponibilités ponctuelles |
| `authorizedActivities` | Relation `manyToMany` | Non | - | Modèles d'activités pour lesquels il est qualifié |
| `timeSlots` | Relation `manyToMany` | Non | - | Créneaux sur lesquels il intervient |
| `managedRoomSessions` | Relation `oneToMany` | Non | - | Sessions de salle dont il est le référent |

---

### 4.5. Participants & Bénéficiaires (`/api/participants`)

Gère les participants, élèves, clients ou bénéficiaires inscrits aux activités.

#### 🛣️ Endpoints disponibles

| Méthode | Route | Action | Description |
|---|---|---|---|
| `GET` | `/api/participants` | `find` | Liste complète des participants |
| `GET` | `/api/participants/:documentId` | `findOne` | Fiche d'un participant |
| `POST` | `/api/participants` | `create` | Créer un participant |
| `PUT` | `/api/participants/:documentId` | `update` | Modifier un participant |
| `DELETE` | `/api/participants/:documentId` | `delete` | Supprimer un participant |

#### 📋 Schéma & Attributs (`Participant`)

| Attribut | Type | Requis | Contraintes | Description |
|---|---|---|---|---|
| `firstName` | String | **Oui** | Non vide | Prénom du participant |
| `lastName` | String | **Oui** | Non vide | Nom de famille |
| `email` | Email | **Oui** | `unique: true` | Adresse e-mail (unique) |
| `weeklyAvailabilities` | JSON | Non | Objet | Plages de présence/disponibilité récurrentes |
| `specificUnavailabilities` | JSON (Array) | Non | Objets dates ISO | Absences déclarées |
| `timeSlots` | Relation `manyToMany` | Non | - | Créneaux d'activités auxquels il participe |

---

### 4.6. Sessions d'Ouverture de Salle (`/api/room-sessions`)

Représente l'ouverture journalière d'une salle avec un animateur référent (`manager`) et la cohorte de participants/bénéficiaires accueillis pour la journée.

#### 🛣️ Endpoints disponibles

| Méthode | Route | Action | Description |
|---|---|---|---|
| `GET` | `/api/room-sessions` | `find` | Liste des sessions de salle (filtrable par date ou lieu) |
| `GET` | `/api/room-sessions/:documentId` | `findOne` | Détail d'une session de salle |
| `POST` | `/api/room-sessions` | `create` | Créer une session journalière |
| `PUT` | `/api/room-sessions/:documentId` | `update` | Mettre à jour une session |
| `DELETE` | `/api/room-sessions/:documentId` | `delete` | Supprimer une session |

#### 📋 Schéma & Attributs (`RoomSession`)

| Attribut | Type | Requis | Description |
|---|---|---|---|
| `date` | Date (YYYY-MM-DD) | **Oui** | Date du jour de la session |
| `location` | Relation `manyToOne` | Non | Salle concernée |
| `manager` | Relation `manyToOne` | Non | Animateur référent responsable de la salle ce jour-là |
| `participants` | Relation `manyToMany` | Non | Bénéficiaires affectés à la salle pour la journée |
| `timeSlots` | Relation `oneToMany` | Non | Créneaux d'activités déroulés durant cette session |

#### 🛡️ Règles Métier & Bonnes Pratiques
- **Filtrage par date :** `GET /api/room-sessions?filters[date][$eq]=2026-08-26&populate=*`
- **Filtrage par période :** `GET /api/room-sessions?filters[date][$gte]=2026-08-01&filters[date][$lte]=2026-08-31&populate=*`
- **Non-duplication du référent :** Un même animateur ne doit pas être manager de deux salles distinctes le même jour.
- **Non-duplication du participant :** Un participant ne doit pas être affecté à deux salles différentes sur la même journée.

---

### 4.7. Trames Hebdomadaires Récurrentes (`/api/room-session-templates`)

Permet de définir la **semaine type** (gabarit récurrent) pour préconfigurer automatiquement l'ouverture des salles, les responsables réguliers et les bénéficiaires chaque jour de la semaine.

#### 🛣️ Endpoints disponibles

| Méthode | Route | Action | Description |
|---|---|---|---|
| `GET` | `/api/room-session-templates` | `find` | Liste des gabarits récurrents (`?populate=*`) |
| `GET` | `/api/room-session-templates/:documentId` | `findOne` | Détail d'un gabarit récurrent |
| `POST` | `/api/room-session-templates` | `create` | Créer un gabarit |
| `PUT` | `/api/room-session-templates/:documentId` | `update` | Modifier un gabarit |
| `DELETE` | `/api/room-session-templates/:documentId` | `delete` | Supprimer un gabarit |

#### 📋 Schéma & Attributs (`RoomSessionTemplate`)

| Attribut | Type | Requis | Contraintes | Description |
|---|---|---|---|---|
| `dayOfWeek` | Integer | **Oui** | `min: 1, max: 7` | Jour de la semaine (1 = Lundi, 2 = Mardi, ..., 7 = Dimanche) |
| `location` | Relation `manyToOne` | Non | - | Salle assignée récurrente |
| `manager` | Relation `manyToOne` | Non | - | Animateur référent récurrent |
| `participants` | Relation `manyToMany` | Non | - | Bénéficiaires réguliers affectés |
| `isActive` | Boolean | Non | Défaut: `true` | Active ou désactive la génération depuis ce gabarit |
| `notes` | String | Non | - | Remarques ou consignes spécifiques |

---

### 4.8. Authentification & Utilisateurs (`/api/auth` & `/api/users`)

#### 🛣️ Endpoints disponibles

| Méthode | Route | Description | Corps de Requête Requis |
|---|---|---|---|
| `POST` | `/api/auth/local` | Connexion utilisateur (renvoie token JWT et infos) | `identifier` (email ou username), `password` |
| `POST` | `/api/auth/local/register` | Inscription d'un nouveau compte | `username`, `email`, `password` |
| `GET` | `/api/users/me` | Profil de l'utilisateur connecté | Header `Authorization: Bearer <TOKEN>` requis |
| `PUT` | `/api/users/:id` | Modifier les données d'un profil | Champs utilisateur modifiables |

---

### 4.9. Pointages & Émargements (`/api/check-ins`)

L'entité `check-in` enregistre la présence réelle des bénéficiaires/participants aux animations programmées (créneaux horaires `time-slot`), leurs heures d'arrivée et de départ (permettant les allers-retours / passages multiples en cours de journée), ainsi que les observations et remarques qualitatives de l'équipe d'animation.

#### 🏗️ Structure des Données

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `isPresent` | `Boolean` | Oui (défaut: `true`) | Indique si le participant était effectivement présent ou absent à l'animation. |
| `checkInTime` | `DateTime` | Non | Heure d'arrivée / début de présence du passage. |
| `checkOutTime` | `DateTime` | Non | Heure de départ / fin de présence du passage (permet de noter le départ puis de créer un nouveau passage lors d'un retour). |
| `comment` | `Text` | Non | Observation comportementale, réaction ou note libre sur le participant pendant le passage. |
| `timeSlot` | `Relation (ManyToOne)` | Oui | Créneau horaire (`time-slot`) de l'animation concernée. |
| `participant` | `Relation (ManyToOne)` | Oui | Bénéficiaire / participant (`participant`) concerné. |

#### 🛣️ Endpoints disponibles

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/check-ins` | Liste paginée des pointages (avec filtres par créneau, date ou participant). |
| `GET` | `/api/check-ins/:documentId` | Détail d'un pointage unitaire. |
| `POST` | `/api/check-ins` | Créer un nouveau pointage / passage d'émargement. |
| `PUT` | `/api/check-ins/:documentId` | Mettre à jour un pointage existant (arrivée, départ, commentaire). |
| `DELETE` | `/api/check-ins/:documentId` | Supprimer un enregistrement de pointage. |

#### 📦 Exemples de Payloads

**1. Enregistrement d'une arrivée (`POST /api/check-ins`) :**
```json
{
  "data": {
    "isPresent": true,
    "checkInTime": "2026-08-30T09:15:00.000Z",
    "checkOutTime": null,
    "comment": "Très bonne participation, très souriant(e) dès le début de l'atelier.",
    "timeSlot": "s1a2b3c4d5e6f7a8",
    "participant": "p9z8y7x6w5v4u3t2"
  }
}
```

**2. Enregistrement d'un départ (`PUT /api/check-ins/:documentId`) :**
```json
{
  "data": {
    "checkOutTime": "2026-08-30T11:30:00.000Z",
    "comment": "Parti(e) à 11h30 pour son rendez-vous extérieur."
  }
}
```

**3. Enregistrement d'un retour / 2nd passage le même jour (`POST /api/check-ins`) :**
```json
{
  "data": {
    "isPresent": true,
    "checkInTime": "2026-08-30T14:00:00.000Z",
    "checkOutTime": "2026-08-30T16:30:00.000Z",
    "comment": "De retour pour l'activité de l'après-midi, très en forme.",
    "timeSlot": "s1a2b3c4d5e6f7a8",
    "participant": "p9z8y7x6w5v4u3t2"
  }
}
```

---

## 5. Spécifications des Formats JSON Complexes

Plusieurs champs des entités stockent des configurations avancées au format JSON.

---

### 5.1. Disponibilités Hebdomadaires (`weeklyAvailabilities`)
Stocké sur les **Facilitators** et les **Participants**.

- **Format des clés** : Chaîne numérique représentant le jour de la semaine :
  - `"0"` : Dimanche
  - `"1"` : Lundi
  - `"2"` : Mardi
  - `"3"` : Mercredi
  - `"4"` : Jeudi
  - `"5"` : Vendredi
  - `"6"` : Samedi
- **Format des valeurs** : Tableau d'objets contenant les bornes au format `HH:MM` (notation 24h).

```json
{
  "1": [
    { "start": "08:30", "end": "12:00" },
    { "start": "13:30", "end": "17:30" }
  ],
  "2": [
    { "start": "09:00", "end": "18:00" }
  ],
  "3": [
    { "start": "09:00", "end": "12:30" }
  ],
  "4": [
    { "start": "14:00", "end": "19:00" }
  ],
  "5": [
    { "start": "08:30", "end": "16:30" }
  ]
}
```

---

### 5.2. Indisponibilités Ponctuelles & Congés (`specificUnavailabilities`)
Stocké sur les **Facilitators** et les **Participants**.

Tableau d'intervalles temporels d'absence. Les dates doivent être fournies au format ISO-8601 UTC ou avec fuseau horaire explicite.

```json
[
  {
    "startDate": "2026-08-10T00:00:00.000Z",
    "endDate": "2026-08-20T23:59:59.000Z",
    "reason": "Congés annuels d'été"
  },
  {
    "startDate": "2026-09-04T14:00:00.000Z",
    "endDate": "2026-09-04T18:00:00.000Z",
    "reason": "Formation continue externe"
  }
]
```

---

### 5.3. Fermetures Hebdomadaires (`weeklyClosures`)
Stocké sur les **Locations**.

Tableau d'entiers représentant les jours habituels de fermeture (0 = Dimanche à 6 = Samedi).

```json
[0, 6]
```
*(Dans cet exemple, la salle est fermée tous les samedis et dimanches).*

---

### 5.4. Fermetures Exceptionnelles (`specificClosures`)
Stocké sur les **Locations**.

Tableau d'intervalles de fermetures exceptionnelles pour travaux, jours fériés ou inventaire.

```json
[
  {
    "startDate": "2026-07-14T00:00:00.000Z",
    "endDate": "2026-07-14T23:59:59.000Z",
    "reason": "Fête Nationale"
  },
  {
    "startDate": "2026-12-24T12:00:00.000Z",
    "endDate": "2026-12-31T23:59:59.000Z",
    "reason": "Fermeture annuelle d'hiver"
  }
]
```

---

## 6. Gestion des Erreurs, Codes HTTP & Notifications Frontend

### 6.1. Codes de Statut HTTP

| Code HTTP | Libellé | Signification dans AetherScheduler |
|---|---|---|
| `200 OK` | Succès | Requête `GET` ou `PUT` exécutée avec succès. |
| `201 Created` | Ressource créée | Requête `POST` réussie. |
| `204 No Content` | Supprimé | Requête `DELETE` réussie. |
| `400 Bad Request` | Requête Invalide | **Violation d'une règle métier** (capacité, horaires, compétences, double réservation) ou format de données erroné. |
| `401 Unauthorized` | Non Authentifié | Jeton JWT absent, invalide ou expiré. |
| `403 Forbidden` | Droits Insuffisants | Rôle non autorisé à effectuer cette action. |
| `404 Not Found` | Introuvable | `documentId` ou ressource introuvable. |
| `409 Conflict` | Conflit | Conflit d'intégrité (ex: email déjà existant). |
| `500 Server Error` | Erreur Interne | Erreur non interceptée sur le serveur Strapi. |

---

### 6.2. Structure Standard d'une Réponse d'Erreur Strapi 5

Lorsqu'une contrainte métier est violée dans `lifecycles.js`, Strapi renvoie la structure suivante :

```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Human Availability Violated: Facilitator \"Sophie Martin\" is already booked in another slot (2026-08-26T09:00:00.000Z - 2026-08-26T11:00:00.000Z).",
    "details": {}
  }
}
```

---

### 6.3. Traitement & Traduction Frontend (`apiNotificationHelper.js`)

Le client Vue.js intercepte automatiquement toutes les réponses HTTP via Axios :
- **Sur succès de mutation (POST / PUT / DELETE)** : Affiche un toast de confirmation adapté (ex: `"Créneau horaire créé avec succès !"`).
- **Sur erreur HTTP (400, 401, 403, 404, 500)** : Extrait automatiquement `error.response.data.error.message` et affiche un toast rouge avec le motif exact en français clair.

---

## 7. Guide d'Exemples & Requêtes cURL / Axios

### 7.1. Authentification & Récupération d'un Token
```bash
curl -X POST http://localhost:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com",
    "password": "MotDePasseSecurise123!"
  }'
```

### 7.2. Récupérer les Créneaux d'un Mois avec Relations
```bash
curl -X GET "http://localhost:1337/api/time-slots?filters[startDate][\$gte]=2026-08-01T00:00:00.000Z&filters[endDate][\$lte]=2026-08-31T23:59:59.000Z&populate=*" \
  -H "Authorization: Bearer <TOKEN>"
```

### 7.3. Créer un Créneau en JavaScript (Axios)
```javascript
import api from '@/services/api';

async function createTimeSlot() {
  try {
    const response = await api.post('/time-slots', {
      data: {
        startDate: '2026-08-26T14:00:00.000Z',
        endDate: '2026-08-26T16:00:00.000Z',
        location: 'c9k2m1q8abcde123',
        activityTemplate: 'm5p4n8x2lkjhgf99',
        facilitators: ['f7b1c2d3e4f5a6b7'],
        participants: ['p1a2b3c4d5e6f7a8', 'p9z8y7x6w5v4u3t2']
      }
    });
    console.log('Créneau créé avec succès :', response.data.data);
  } catch (error) {
    console.error('Erreur de validation :', error.response?.data?.error?.message);
  }
}
```

---

## 🎯 Synthèse des Bonnes Pratiques

1. **Toujours respecter l'encapsulation `{ "data": { ... } }`** lors des requêtes d'écriture (`POST`, `PUT`).
2. **Toujours cibler le `documentId`** pour les requêtes unitaires (`GET /api/time-slots/:documentId`, `PUT`, `DELETE`).
3. **Systématiquement préciser `populate=*`** ou les relations ciblées pour recevoir les objets imbriqués.
4. **Vérifier les contraintes métier en amont** (capacités de salle, disponibilités, compétences requises) pour garantir une expérience utilisateur fluide et sans rejet backend.
