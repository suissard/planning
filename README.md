# ⚡ AetherScheduler - Plateforme d'Agenda & Planification

AetherScheduler est une solution moderne de planification d'activités sous contraintes, s'appuyant sur une architecture conteneurisée.
Elle combine un backend d'administration puissant sous **Strapi v5** (Node.js & MySQL) et une interface utilisateur réactive développée en **Vue.js 3** avec **Vite**.

## 🏗️ Architecture du Projet
Le projet est entièrement orchestré avec **Docker Compose** et se divise en trois services principaux :
1. **Frontend (`frontend`)** : Application Web SPA développée en Vue 3, servie par Vite. (Port `5173`)
2. **Backend (`backend`)** : CMS Headless Strapi v5 exposant une API REST et hébergeant le moteur de validation des réservations. (Port `1337`)
3. **Database (`db`)** : Base de données MySQL 8.0 persistée localement pour stocker l'ensemble des données. (Port `3306`)

---

## 📂 Structure du Workspace
```
planning/
├── docker-compose.yml     # Configuration multi-conteneurs Docker
├── README.md              # Documentation générale du projet (ce fichier)
├── agend.md               # Guide détaillé du fonctionnement du moteur d'agenda et des contraintes (demandé par l'utilisateur)
├── agenda.md              # Lien/copie de agend.md pour assurer la bonne orthographe
├── backend/               # Code source du backend Strapi v5
│   ├── src/
│   │   └── api/           # Définitions des APIs et des modèles de données
│   │       ├── activity-template/
│   │       ├── facilitator/
│   │       ├── location/
│   │       ├── participant/
│   │       └── time-slot/ # Contient les lifecycles et la validation des créneaux
│   ├── Dockerfile.dev
│   └── package.json
└── frontend/              # Code source de l'interface Vue.js 3
    ├── src/
    │   ├── App.vue        # Composant principal (AetherScheduler)
    │   ├── main.js        # Point d'entrée de l'application
    │   └── index.css      # Design system & styles globaux
    ├── Dockerfile.dev
    └── package.json
```

---

## 🚀 Démarrage Rapide

### Prérequis
- Docker et Docker Compose installés sur votre machine.

### Lancer l'application
Pour démarrer tous les services en mode développement (avec rechargement automatique et volumes synchronisés) :
```bash
docker compose up --build
```

Une fois les conteneurs démarrés et stables :
- **Frontend** : Accessible sur [http://localhost:5173](http://localhost:5173)
- **Backend (Strapi Admin)** : Accessible sur [http://localhost:1337/admin](http://localhost:1337/admin)
- **Base de données (MySQL)** : Accessible sur le port `3306`

---

## 🛠️ Modèles de Données & Moteur de Contraintes
Le cœur fonctionnel du projet repose sur un système robuste de validation de créneaux horaires (`TimeSlots`). Chaque créneau lie une activité à un lieu, un ou plusieurs animateurs et des participants tout en vérifiant le respect strict de **6 contraintes majeures** (capacité physique, compétences, disponibilités des personnes, absence de double réservation, etc.).

Consultez le fichier [agend.md](file:///c:/Users/Suissard/Desktop/Programmations/planning/agend.md) à la racine pour une explication complète de la logique métier et du fonctionnement interne du moteur d'agenda.
