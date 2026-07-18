# 📋 Plan de Développement - AetherScheduler (Espace Admin)

Ce document liste les fonctionnalités et pages à réaliser pour mettre en service l'application AetherScheduler. Les tâches sont ordonnées par priorité, de l'infrastructure de base jusqu'aux fonctionnalités avancées, en couvrant pour chaque tâche les modifications requises côté Frontend (Vue.js 3 + Vuetify) et Backend (Strapi v5).

## 🚀 Phase 1 : Initialisation & Configuration de Base
Priorité : **Critique**

### 1.1 Configuration de l'UI (Vuetify)
*   **Objectif :** Mettre en place la bibliothèque de composants UI pour le frontend.
*   **Frontend (Vue.js) :**
    *   Installer Vuetify 3 et ses dépendances (MDI icons, etc.).
    *   Configurer le plugin Vuetify dans `src/main.js`.
    *   Créer un layout global de base (App Bar, Navigation Drawer) pour l'espace administrateur.
*   **Backend (Strapi) :** Aucune modification requise.

### 1.2 Configuration d'Axios et Pinia
*   **Objectif :** Préparer la communication API et la gestion d'état centralisée.
*   **Frontend (Vue.js) :**
    *   Configurer une instance Axios avec l'URL de base de l'API Strapi.
    *   Créer un store Pinia global (par exemple, pour gérer l'état de chargement et les notifications/erreurs).
*   **Backend (Strapi) :**
    *   S'assurer que la configuration CORS de Strapi autorise le port du frontend (5173).

## 🏗️ Phase 2 : Gestion des Entités de Base (CRUD)
Priorité : **Haute**

### 2.1 Gestion des Lieux (Locations)
*   **Objectif :** Pouvoir ajouter, modifier, lister et supprimer des lieux avec leurs contraintes de capacité et d'ouverture.
*   **Frontend :**
    *   **Page :** `/admin/locations` (Liste des lieux avec DataTable Vuetify).
    *   **Composant :** Formulaire de création/édition incluant des champs spécifiques pour les horaires d'ouverture (`globalOpeningStart`, `globalOpeningEnd`), et des éditeurs JSON pour `weeklyClosures` et `specificClosures`.
    *   **Store Pinia :** `locationStore.js` pour gérer les appels API.
*   **Backend :**
    *   S'assurer que les permissions CRUD (Create, Read, Update, Delete) sur l'entité `Location` sont accessibles pour l'API.

### 2.2 Gestion des Modèles d'Activité (Activity Templates)
*   **Objectif :** Configurer les types d'activités avec leurs prérequis de durée et de capacité.
*   **Frontend :**
    *   **Page :** `/admin/activities` (Liste des activités).
    *   **Composant :** Formulaire avec sélection des animateurs autorisés (Relation).
    *   **Store Pinia :** `activityStore.js`.
*   **Backend :**
    *   Configurer les permissions CRUD pour `ActivityTemplate`.

### 2.3 Gestion des Animateurs (Facilitators)
*   **Objectif :** Gérer le répertoire des animateurs, leurs compétences et disponibilités.
*   **Frontend :**
    *   **Page :** `/admin/facilitators` (Liste des animateurs).
    *   **Composant :** Formulaire d'édition avec interface permettant de définir graphiquement ou via des champs structurés les `weeklyAvailabilities` et `specificUnavailabilities` (JSON).
    *   **Store Pinia :** `facilitatorStore.js`.
*   **Backend :**
    *   Configurer les permissions CRUD pour `Facilitator`.

### 2.4 Gestion des Participants
*   **Objectif :** Gérer les clients inscrits aux activités et leurs disponibilités.
*   **Frontend :**
    *   **Page :** `/admin/participants` (Liste des participants).
    *   **Composant :** Formulaire similaire à celui des animateurs pour gérer les infos de base et les indisponibilités JSON.
    *   **Store Pinia :** `participantStore.js`.
*   **Backend :**
    *   Configurer les permissions CRUD pour `Participant`.

## 🗓️ Phase 3 : Planification et Créneaux (TimeSlots)
Priorité : **Très Haute (Cœur de métier)**

### 3.1 Vue Liste et Formulaire de Créneaux (TimeSlots)
*   **Objectif :** Interface textuelle/formulaire pour créer et modifier des créneaux horaires, déclenchant le moteur de contraintes.
*   **Frontend :**
    *   **Page :** `/admin/timeslots` (Liste classique des créneaux avec statuts et détails).
    *   **Composant :** Formulaire complexe permettant de :
        *   Choisir la date de début et de fin.
        *   Sélectionner le lieu, le modèle d'activité.
        *   Sélectionner plusieurs animateurs et participants (Autocomplétion).
    *   **Gestion des erreurs :** Intercepter les erreurs 400 renvoyées par Strapi (les 6 contraintes) et afficher des alertes (`v-alert` ou Snackbar Vuetify) claires à l'administrateur.
    *   **Store Pinia :** `timeSlotStore.js`.
*   **Backend :**
    *   S'assurer que les routes de création/mise à jour du `TimeSlot` utilisent le `populate` approprié pour que le frontend puisse afficher les relations.
    *   Le moteur de contraintes dans `lifecycles.js` étant déjà prévu, s'assurer que les messages d'erreur sont bien formattés et lisibles par le frontend.

### 3.2 Vue Calendrier (Scheduler interactif)
*   **Objectif :** Fournir une vue calendaire (jour/semaine/mois) pour visualiser la planification.
*   **Frontend :**
    *   **Page :** `/admin/calendar`.
    *   **Composant :** Intégration d'un composant de calendrier compatible Vue 3 / Vuetify (ex: v-calendar, QCalendar ou FullCalendar Vue).
    *   **Fonctionnalités :** Afficher les TimeSlots, possibilité de cliquer sur un créneau pour l'éditer.
*   **Backend :**
    *   Création de requêtes filtrées par plage de dates pour éviter de charger tous les créneaux lors du rendu du calendrier.

## 🔐 Phase 4 : Authentification & Espace Admin Sécurisé
Priorité : **Moyenne (Essentiel pour la prod)**

### 4.1 Login et Sécurisation des Routes
*   **Objectif :** Restreindre l'accès à l'application Vue.js aux utilisateurs authentifiés (Admins).
*   **Frontend :**
    *   **Page :** `/login` (Formulaire de connexion email/mot de passe).
    *   **Routeur (`vue-router`) :** Ajouter des "Navigation Guards" pour rediriger les utilisateurs non authentifiés vers la page de login.
    *   **Store Pinia :** `authStore.js` pour gérer le JWT et les informations de l'utilisateur.
    *   **Axios :** Ajouter un intercepteur pour injecter le token JWT (`Authorization: Bearer <token>`) dans chaque requête API.
*   **Backend :**
    *   Utiliser le plugin `users-permissions` de Strapi pour gérer les rôles (ex: Créer un rôle "Admin UI").
    *   Configurer les permissions pour que seules les requêtes authentifiées puissent accéder aux endpoints CRUD.

## 📈 Phase 5 : Améliorations UX et Tableaux de Bord
Priorité : **Basse (Évolutions futures)**

### 5.1 Dashboard d'Accueil (Vue d'ensemble)
*   **Objectif :** Donner à l'administrateur un résumé de l'activité.
*   **Frontend :**
    *   **Page :** `/admin/dashboard` (Route par défaut après login).
    *   **Composants :** Cartes statistiques (ex: "X créneaux prévus aujourd'hui", "X participants inscrits", "Taux de remplissage des lieux").
*   **Backend :**
    *   Créer une route custom (Custom Controller/Service dans Strapi) pour agréger ces statistiques de manière optimisée au lieu de faire de multiples appels côté client.

### 5.2 Assistant de Planification (Suggestions de Créneaux)
*   **Objectif :** Faciliter la création de créneaux.
*   **Frontend :** Lors de la création d'un créneau, ajouter un bouton "Trouver un créneau disponible".
*   **Backend :** Développer un endpoint custom dans Strapi qui prend en entrée une Activité et une durée, et qui retourne les premières disponibilités communes (Lieu, Animateur) en simulant les contraintes.
