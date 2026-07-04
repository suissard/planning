# 🗓️ Moteur d'Agenda & Règles Métier (AetherScheduler)

Ce document décrit en détail le fonctionnement interne du moteur de planification d'AetherScheduler, ainsi que les modèles de données et les règles de validation appliquées lors de la création ou de la modification de créneaux horaires (`TimeSlot`).

Le moteur de validation est implémenté dans le hook de cycle de vie Strapi : [lifecycles.js](file:///c:/Users/Suissard/Desktop/Programmations/planning/backend/src/api/time-slot/content-types/time-slot/lifecycles.js).

---

## 📦 Les Modèles de Données

Le système est construit autour de 5 entités principales :

### 1. Lieux (`Location`)
Représente les ressources physiques (salles de cours, gymnases, ateliers, etc.).
- **Attributs clés** :
  - `name` (String) : Nom du lieu.
  - `capacity` (Integer) : Nombre maximal de personnes autorisées simultanément.
  - `globalOpeningStart` / `globalOpeningEnd` (Date) : Période globale d'ouverture du lieu.
  - `weeklyClosures` (JSON - Array d'entiers) : Jours de fermeture hebdomadaire (0 = Dimanche, 1 = Lundi, 2 = Mardi...).
  - `specificClosures` (JSON - Array d'objets) : Périodes de fermetures exceptionnelles (`startDate`, `endDate`).

### 2. Modèles d'Activité (`ActivityTemplate`)
Modèles définissant les types d'activités ou cours qui peuvent être planifiés.
- **Attributs clés** :
  - `name` (String) : Nom de l'activité.
  - `standardDuration` (Integer) : Durée standard minimale requise en minutes.
  - `minParticipants` / `maxParticipants` (Integer) : Limites d'inscriptions pour l'activité.
  - `authorizedFacilitators` (Relation Many-to-Many) : Liste des animateurs habilités à animer cette activité.

### 3. Animateurs (`Facilitator`)
Les professionnels ou bénévoles encadrant les activités.
- **Attributs clés** :
  - `firstName` / `lastName` / `email` (String/Email).
  - `skills` (Text) : Compétences ou qualifications de l'animateur.
  - `weeklyAvailabilities` (JSON) : Plages horaires de disponibilité par jour de la semaine (ex: `{"1": [{"start": "08:00", "end": "12:00"}]}`).
  - `specificUnavailabilities` (JSON) : Indisponibilités ponctuelles (`startDate`, `endDate`).

### 4. Participants (`Participant`)
Les clients ou bénéficiaires inscrits aux activités.
- **Attributs clés** :
  - `firstName` / `lastName` / `email` (String/Email).
  - `weeklyAvailabilities` (JSON) : Plages de disponibilité hebdomadaires.
  - `specificUnavailabilities` (JSON) : Indisponibilités ponctuelles.

### 5. Créneaux Horaires (`TimeSlot`)
L'entité centrale qui concrétise la planification. Elle associe :
- Un créneau temporel (`startDate`, `endDate`).
- Un lieu (`Location`).
- Une activité (`ActivityTemplate`).
- Un ou plusieurs animateurs (`Facilitators`).
- Un ou plusieurs participants (`Participants`).

---

## 🛡️ Les 6 Contraintes du Moteur de Validation

Chaque opération d'écriture (création ou modification) sur un `TimeSlot` déclenche les validations suivantes dans [lifecycles.js](file:///c:/Users/Suissard/Desktop/Programmations/planning/backend/src/api/time-slot/content-types/time-slot/lifecycles.js). Si l'une d'elles échoue, la transaction est annulée et une erreur explicite est renvoyée.

### 1. Contrainte d'Espace (Capacité du Lieu)
Le nombre de participants inscrits dans le créneau ne doit pas dépasser la capacité maximale définie pour le lieu (`Location.capacity`).
> **Erreur renvoyée** : `Space Constraint Violated: Assigned participants (X) exceeds location capacity (Y).`

### 2. Contrainte de Capacité de l'Activité
Le nombre de participants inscrits doit respecter les limites minimales (`minParticipants`) et maximales (`maxParticipants`) définies par le modèle d'activité.
> **Erreur renvoyée** : `Activity Capacity Violated: Registered participants (X) is below/exceeds standard limit.`

### 3. Contrainte de Durée Temporelle
La durée totale du créneau (différence entre `endDate` et `startDate`) doit être supérieure ou égale à la durée standard spécifiée dans le modèle d'activité (`standardDuration`).
> **Erreur renvoyée** : `Time Constraint Violated: Time slot duration (X minutes) is shorter than activity's standard duration (Y minutes).`

### 4. Contrainte de Compétences (Habilitation des Animateurs)
Tous les animateurs affectés au créneau doivent obligatoirement faire partie de la liste des animateurs autorisés (`authorizedFacilitators`) déclarée sur le modèle d'activité.
> **Erreur renvoyée** : `Skills Constraint Violated: Facilitator "Nom Prénom" is not authorized for "Nom Activité".`

### 5. Contrainte de Disponibilité du Lieu
Le créneau doit respecter les règles temporelles du lieu :
- Il doit être compris dans les dates d'ouverture globale du lieu (`globalOpeningStart` et `globalOpeningEnd`).
- Il ne doit pas tomber sur un jour de fermeture hebdomadaire (défini dans `weeklyClosures`).
- Il ne doit pas chevaucher une période de fermeture spécifique (définie dans `specificClosures`).
> **Erreur renvoyée** : `Location Availability Violated: ...`

### 6. Contraintes de Disponibilité Humaine et Chevauchement (Double Booking)
Pour chaque animateur et participant affecté :
1. **Disponibilité Hebdomadaire** : Le créneau doit être entièrement inclus dans l'une des fenêtres de disponibilité hebdomadaires définies pour la personne. Le créneau ne peut pas chevaucher plusieurs jours différents.
2. **Indisponibilité Spécifique** : Le créneau ne doit chevaucher aucune indisponibilité spécifique déclarée.
3. **Absence de Double Réservation** : Aucun animateur ou participant ne peut être planifié sur deux créneaux différents qui se chevauchent dans le temps.
> **Erreur renvoyée** : `Human Availability Violated: ... is already booked in another slot (...)`

---

## 🛠️ Exemples de formats de données JSON pour les configurations

Voici comment configurer les champs JSON (disponibilités, fermetures) dans l'interface d'administration ou via l'API :

### Disponibilités hebdomadaires (`weeklyAvailabilities`)
Clés de `"0"` (Dimanche) à `"6"` (Samedi). Les heures sont au format `HH:MM` :
```json
{
  "1": [
    { "start": "09:00", "end": "12:00" },
    { "start": "14:00", "end": "18:00" }
  ],
  "3": [
    { "start": "09:00", "end": "18:00" }
  ]
}
```

### Indisponibilités spécifiques ou fermetures spécifiques (`specificClosures` ou `specificUnavailabilities`)
Un tableau d'intervalles avec des dates ISO-8601 :
```json
[
  {
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-08-15T23:59:59.000Z"
  }
]
```
