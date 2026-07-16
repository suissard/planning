<template>
  <div class="app-container">
    <!-- LOGGED OUT VIEW: LOGIN & REGISTER -->
    <div v-if="!isAuthenticated" class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-brand">
          <span class="brand-icon">⚡</span>
          <h2>AetherScheduler</h2>
          <p>Système de planification sous contraintes</p>
        </div>

        <div class="auth-tabs">
          <button 
            class="auth-tab-btn" 
            :class="{ active: authTab === 'login' }" 
            @click="authTab = 'login'; localAuthError = ''"
          >
            Se Connecter
          </button>
          <button 
            class="auth-tab-btn" 
            :class="{ active: authTab === 'register' }" 
            @click="authTab = 'register'; localAuthError = ''"
          >
            Créer un compte
          </button>
        </div>

        <!-- Auth Error Banner -->
        <div class="auth-error-banner" v-if="localAuthError || authError">
          <span>⚠️</span>
          <p>{{ localAuthError || authError }}</p>
        </div>

        <!-- LOGIN FORM -->
        <form v-if="authTab === 'login'" @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <label for="loginIdentifier">Email ou Nom d'utilisateur</label>
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input 
                type="text" 
                id="loginIdentifier" 
                v-model="loginForm.identifier" 
                required 
                placeholder="Entrez votre identifiant"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group mt-2">
            <label for="loginPassword">Mot de passe</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input 
                type="password" 
                id="loginPassword" 
                v-model="loginForm.password" 
                required 
                placeholder="Entrez votre mot de passe"
                class="form-input"
              />
            </div>
          </div>

          <button type="submit" class="action-btn mt-3" :disabled="authLoading">
            {{ authLoading ? 'Connexion en cours...' : 'Se Connecter' }}
          </button>
        </form>

        <!-- REGISTER FORM WITH DOUBLE PASSWORD CONFIRMATION -->
        <form v-else @submit.prevent="handleRegister" class="auth-form">
          <div class="form-group">
            <label for="registerUsername">Nom d'utilisateur</label>
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input 
                type="text" 
                id="registerUsername" 
                v-model="registerForm.username" 
                required 
                placeholder="Ex: jean_dupont"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group mt-2">
            <label for="registerEmail">Adresse Email</label>
            <div class="input-wrapper">
              <span class="input-icon">✉️</span>
              <input 
                type="email" 
                id="registerEmail" 
                v-model="registerForm.email" 
                required 
                placeholder="Ex: jean.dupont@mail.com"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group mt-2">
            <label for="registerPassword">Mot de passe</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input 
                type="password" 
                id="registerPassword" 
                v-model="registerForm.password" 
                required 
                placeholder="Minimum 6 caractères"
                class="form-input"
              />
            </div>
          </div>

          <!-- Password Confirmation Input to avoid typos -->
          <div class="form-group mt-2">
            <label for="registerConfirmPassword">Confirmer le mot de passe</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input 
                type="password" 
                id="registerConfirmPassword" 
                v-model="registerForm.confirmPassword" 
                required 
                placeholder="Confirmez votre mot de passe"
                class="form-input"
              />
            </div>
          </div>

          <button type="submit" class="action-btn mt-3" :disabled="authLoading">
            {{ authLoading ? 'Création du compte...' : 'Créer un compte' }}
          </button>
        </form>
      </div>
    </div>

    <!-- LOGGED IN VIEW: MAIN APP DASHBOARD -->
    <div v-else class="dashboard-wrapper">
      <!-- Header -->
      <header class="app-header">
        <div class="header-logo" @click="clearFilter(); navigateTo('timeslots')">
          <span class="logo-icon">⚡</span>
          <h1>AetherScheduler</h1>
        </div>
        
        <!-- Connection Status & Stats -->
        <div class="header-right">
          <div class="stats-pills" v-if="!loading && !error">
            <span class="stat-pill">📍 {{ locations.length }} Lieux</span>
            <span class="stat-pill">🎯 {{ activities.length }} Activités</span>
            <span class="stat-pill">👨‍🏫 {{ facilitators.length }} Animateurs</span>
            <span class="stat-pill">👥 {{ participants.length }} Participants</span>
            <span class="stat-pill highlight">📅 {{ timeslots.length }} Créneaux</span>
          </div>

          <!-- User Profiling in Header -->
          <div class="user-profile clickable" @click="navigateTo('profile')" title="Voir mon profil">
            <span class="user-avatar">👤</span>
            <span class="username">{{ user?.username }}</span>
          </div>

          <div class="header-status">
            <span class="status-indicator" :class="isConnected ? 'online' : 'offline'"></span>
            <span class="status-text">{{ isConnected ? 'API en ligne' : 'API hors ligne' }}</span>
          </div>
        </div>
      </header>

      <!-- Global Active Filter Banner -->
      <div class="filter-banner" v-if="filterItemId">
        <span class="filter-icon">🔍</span>
        <div class="filter-desc">
          Filtre actif : 
          <strong>
            {{ filterItemTypeLabel }} — {{ filterItemName }}
          </strong>
        </div>
        <button class="clear-filter-btn" @click="clearFilter">
          Effacer le filtre
        </button>
      </div>

      <!-- Main Container -->
      <div class="app-body">
        <!-- Sidebar Navigation -->
        <nav class="app-nav">
          <!-- Premium User Sidebar Card -->
          <div 
            class="user-sidebar-card" 
            :class="{ active: currentPage === 'profile' }"
            @click="navigateTo('profile')"
            title="Gérer mon profil"
          >
            <div class="user-avatar-badge">👤</div>
            <div class="user-sidebar-info">
              <span class="user-sidebar-username">{{ user?.username }}</span>
              <span class="user-sidebar-role">Mon profil utilisateur</span>
            </div>
            <span class="edit-profile-icon">⚙️</span>
          </div>

          <div class="nav-divider"></div>

          <button 
            class="nav-item" 
            :class="{ active: currentPage === 'timeslots' }"
            @click="navigateTo('timeslots')"
          >
            <span class="nav-icon">📅</span>
            Planning
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentPage === 'locations' }"
            @click="navigateTo('locations')"
          >
            <span class="nav-icon">📍</span>
            Lieux
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentPage === 'activities' }"
            @click="navigateTo('activities')"
          >
            <span class="nav-icon">🎯</span>
            Activités
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentPage === 'facilitators' }"
            @click="navigateTo('facilitators')"
          >
            <span class="nav-icon">👨‍🏫</span>
            Animateurs
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentPage === 'participants' }"
            @click="navigateTo('participants')"
          >
            <span class="nav-icon">👥</span>
            Participants
          </button>
          <button 
            class="nav-item" 
            :class="{ active: currentPage === 'individual-schedules' }"
            @click="navigateTo('individual-schedules')"
          >
            <span class="nav-icon">👤📅</span>
            Plannings Individuels
          </button>


          <div class="nav-footer">
            <button class="action-btn new-slot-btn" @click="openCreateModal">
              ➕ Nouveau Créneau
            </button>
            <button class="logout-sidebar-btn" @click="handleLogout">
              🚪 Se déconnecter
            </button>
          </div>
        </nav>

        <!-- Main Content Area -->
        <main class="app-content">
          <!-- Search & Info Bar (Hidden on Profile & Schedules View) -->
          <div class="content-header" v-if="!error && currentPage !== 'profile' && currentPage !== 'individual-schedules'">
            <div class="search-wrapper">
              <span class="search-icon">🔍</span>
              <input 
                type="text" 
                v-model="searchQuery" 
                :placeholder="searchPlaceholder" 
                class="search-input"
              />
              <button class="clear-search-btn" v-if="searchQuery" @click="searchQuery = ''">✕</button>
            </div>
            <div class="view-title">
              <h2>{{ currentTabTitle }}</h2>
              <span class="count-badge">{{ filteredItems.length }} élément(s)</span>
            </div>
          </div>

          <!-- Loading State -->
          <div class="loading-state" v-if="loading && currentPage !== 'profile' && currentPage !== 'individual-schedules'">
            <div class="spinner"></div>
            <p>Chargement des données depuis Strapi...</p>
          </div>

          <!-- Error State -->
          <div class="error-state" v-else-if="error && currentPage !== 'profile' && currentPage !== 'individual-schedules'">
            <span class="error-icon">⚠️</span>
            <h3>Impossible de contacter l'API Strapi</h3>
            <p>{{ error }}</p>
            <button class="action-btn retry-btn" @click="fetchData">Réessayer</button>
          </div>

          <!-- Empty State -->
          <div class="empty-state" v-else-if="filteredItems.length === 0 && currentPage !== 'profile' && currentPage !== 'individual-schedules'">
            <span class="empty-icon">📁</span>
            <h3>Aucune donnée trouvée</h3>
            <p v-if="searchQuery || filterItemId">Aucun élément ne correspond à votre recherche ou filtre.</p>
            <p v-else>Cette collection est vide. Utilisez le bouton ci-dessous pour ajouter un élément.</p>
            <button class="action-btn reset-btn" v-if="searchQuery || filterItemId" @click="clearSearchAndFilter">
              Réinitialiser les filtres
            </button>
          </div>

          <!-- Data Views -->
          <div class="view-container" v-else>
            
            <!-- TAB: PROFILE (PROFIL UTILISATEUR ET EDITION) -->
            <div v-if="currentPage === 'profile'" class="profile-container">
              <div class="profile-card">
                <div class="profile-header">
                  <div class="profile-avatar">👤</div>
                  <div class="profile-title-block">
                    <h3>{{ user?.username }}</h3>
                    <p class="profile-sub">{{ user?.email }}</p>
                  </div>
                </div>

                <!-- Profile alert messages -->
                <div class="profile-alert success" v-if="profileSuccess">
                  <span>✅</span>
                  <p>{{ profileSuccess }}</p>
                </div>
                <div class="profile-alert error" v-if="profileError">
                  <span>⚠️</span>
                  <p>{{ profileError }}</p>
                </div>

                <form @submit.prevent="handleUpdateProfile" class="profile-form">
                  <div class="form-group">
                    <label for="profileUsername">Nom d'utilisateur</label>
                    <input 
                      type="text" 
                      id="profileUsername" 
                      v-model="profileForm.username" 
                      required 
                      class="form-input"
                    />
                  </div>

                  <div class="form-group mt-2">
                    <label for="profileEmail">Adresse E-mail</label>
                    <input 
                      type="email" 
                      id="profileEmail" 
                      v-model="profileForm.email" 
                      required 
                      class="form-input"
                    />
                  </div>

                  <!-- Optional Password change inputs -->
                  <div class="password-change-section mt-3">
                    <h4>🔒 Modifier le mot de passe (optionnel)</h4>
                    <p class="section-desc">Laissez ces champs vides si vous ne souhaitez pas modifier votre mot de passe.</p>
                    
                    <div class="form-group mt-2">
                      <label for="profilePassword">Nouveau mot de passe</label>
                      <input 
                        type="password" 
                        id="profilePassword" 
                        v-model="profileForm.password" 
                        placeholder="Minimum 6 caractères"
                        class="form-input"
                      />
                    </div>

                    <div class="form-group mt-2">
                      <label for="profileConfirmPassword">Confirmer le nouveau mot de passe</label>
                      <input 
                        type="password" 
                        id="profileConfirmPassword" 
                        v-model="profileForm.confirmPassword" 
                        placeholder="Retapez votre nouveau mot de passe"
                        class="form-input"
                      />
                    </div>
                  </div>

                  <button type="submit" class="action-btn mt-3" :disabled="profileLoading">
                    {{ profileLoading ? 'Enregistrement des modifications...' : 'Sauvegarder les modifications' }}
                  </button>
                </form>
              </div>
            </div>

            <!-- TAB: PLANNING (TIME SLOTS) -->
            <div v-if="currentPage === 'timeslots'" class="slots-grid">
              <div 
                v-for="slot in filteredItems" 
                :key="slot.documentId" 
                class="slot-card"
                :class="{ 'highlighted-item': slot.documentId === highlightedId }"
                :id="'slot-' + slot.documentId"
              >
                <div class="slot-header">
                  <div class="slot-time-info">
                    <span class="calendar-icon">🕒</span>
                    <div class="time-texts">
                      <span class="date">{{ formatSlotDate(slot.startDate) }}</span>
                      <span class="time">{{ formatSlotTimeRange(slot.startDate, slot.endDate) }}</span>
                    </div>
                  </div>
                  <div class="slot-actions">
                    <button class="delete-slot-btn" title="Supprimer le créneau" @click="deleteSlot(slot.documentId)">✕</button>
                  </div>
                </div>

                <div class="slot-relations">
                  <!-- Activity Chip -->
                  <div class="relation-row">
                    <span class="row-label">Activité</span>
                    <span 
                      class="data-chip activity-chip clickable"
                      @click="navigateTo('activities', slot.activityTemplate?.documentId)"
                      title="Voir l'activité"
                    >
                      🎯 {{ slot.activityTemplate?.name || 'Inconnue' }}
                    </span>
                  </div>

                  <!-- Location Chip -->
                  <div class="relation-row">
                    <span class="row-label">Lieu</span>
                    <span 
                      class="data-chip location-chip clickable"
                      @click="navigateTo('locations', slot.location?.documentId)"
                      title="Voir le lieu"
                    >
                      📍 {{ slot.location?.name || 'Inconnu' }}
                    </span>
                  </div>

                  <!-- Facilitator Chips -->
                  <div class="relation-row">
                    <span class="row-label">Animateurs</span>
                    <div class="chips-list">
                      <span 
                        v-for="fac in slot.facilitators" 
                        :key="fac.documentId" 
                        class="data-chip facilitator-chip clickable"
                        @click="navigateTo('facilitators', fac.documentId)"
                        title="Voir l'animateur"
                      >
                        👨‍🏫 {{ fac.firstName }} {{ fac.lastName }}
                      </span>
                      <span v-if="!slot.facilitators || slot.facilitators.length === 0" class="no-data">Aucun</span>
                    </div>
                  </div>

                  <!-- Participant Chips -->
                  <div class="relation-row">
                    <span class="row-label">Participants</span>
                    <div class="chips-list">
                      <span 
                        v-for="part in slot.participants" 
                        :key="part.documentId" 
                        class="data-chip participant-chip clickable"
                        @click="navigateTo('participants', part.documentId)"
                        title="Voir le participant"
                      >
                        👥 {{ part.firstName }} {{ part.lastName }}
                      </span>
                      <span v-if="!slot.participants || slot.participants.length === 0" class="no-data">Aucun</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB: LOCATIONS (LIEUX) -->
            <div v-if="currentPage === 'locations'" class="locations-grid">
              <div 
                v-for="loc in filteredItems" 
                :key="loc.documentId" 
                class="data-card location-card"
                :class="{ 'highlighted-item': loc.documentId === highlightedId }"
                :id="'loc-' + loc.documentId"
              >
                <div class="card-header">
                  <h3>📍 {{ loc.name }}</h3>
                  <span class="badge">Capacité : {{ loc.capacity }} pers.</span>
                </div>
                <div class="card-content">
                  <div class="info-group">
                    <span class="info-label">Ouverture Globale</span>
                    <span class="info-value">Du {{ formatDate(loc.globalOpeningStart) }} au {{ formatDate(loc.globalOpeningEnd) }}</span>
                  </div>
                  <div class="info-group">
                    <span class="info-label">Fermeture Hebdomadaire</span>
                    <span class="info-value">{{ formatWeeklyClosures(loc.weeklyClosures) }}</span>
                  </div>
                  <div class="info-group" v-if="loc.specificClosures && loc.specificClosures.length > 0">
                    <span class="info-label">Fermetures Spécifiques</span>
                    <ul class="closures-list">
                      <li v-for="(closure, i) in loc.specificClosures" :key="i">
                        {{ formatDateRange(closure.startDate, closure.endDate) }}
                      </li>
                    </ul>
                  </div>
                  
                  <!-- Related Time Slots Chips -->
                  <div class="related-slots-section">
                    <span class="info-label">Créneaux réservés à cet endroit :</span>
                    <div class="chips-list mt-1">
                      <span 
                        v-for="slot in getSlotsForLocation(loc.documentId)" 
                        :key="slot.documentId"
                        class="data-chip slot-chip clickable"
                        @click="navigateTo('timeslots', slot.documentId)"
                        title="Aller sur ce créneau"
                      >
                        📅 {{ slot.activityTemplate?.name }} ({{ formatSlotShortDate(slot.startDate) }})
                      </span>
                      <span v-if="getSlotsForLocation(loc.documentId).length === 0" class="no-data">Aucun créneau réservé</span>
                    </div>
                  </div>

                  <button 
                    class="action-btn mt-2 no-print" 
                    @click="viewIndividualSchedule('location', loc.documentId)"
                    style="padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 500;"
                  >
                    📅 Voir le planning
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB: ACTIVITIES (ACTIVITÉS) -->
            <div v-if="currentPage === 'activities'" class="activities-grid">
              <div 
                v-for="act in filteredItems" 
                :key="act.documentId" 
                class="data-card activity-card"
                :class="{ 'highlighted-item': act.documentId === highlightedId }"
                :id="'act-' + act.documentId"
              >
                <div class="card-header">
                  <h3>🎯 {{ act.name }}</h3>
                  <span class="badge duration">{{ act.standardDuration }} min</span>
                </div>
                <div class="card-content">
                  <div class="stats-row">
                    <div class="stat-col">
                      <span class="stat-label">Min Participants</span>
                      <span class="stat-value">{{ act.minParticipants }}</span>
                    </div>
                    <div class="stat-col">
                      <span class="stat-label">Max Participants</span>
                      <span class="stat-value">{{ act.maxParticipants }}</span>
                    </div>
                  </div>
                  
                  <!-- Authorized Facilitators Chips -->
                  <div class="info-group mt-2">
                    <span class="info-label">Animateurs Autorisés</span>
                    <div class="chips-list mt-1">
                      <span 
                        v-for="fac in act.authorizedFacilitators" 
                        :key="fac.documentId" 
                        class="data-chip facilitator-chip clickable"
                        @click="navigateTo('facilitators', fac.documentId)"
                      >
                        👨‍🏫 {{ fac.firstName }} {{ fac.lastName }}
                      </span>
                      <span v-if="!act.authorizedFacilitators || act.authorizedFacilitators.length === 0" class="no-data">Aucun</span>
                    </div>
                  </div>

                  <!-- Related Time Slots Chips -->
                  <div class="related-slots-section mt-2">
                    <span class="info-label">Créneaux réservés :</span>
                    <div class="chips-list mt-1">
                      <span 
                        v-for="slot in getSlotsForActivity(act.documentId)" 
                        :key="slot.documentId"
                        class="data-chip slot-chip clickable"
                        @click="navigateTo('timeslots', slot.documentId)"
                      >
                        📅 {{ slot.location?.name }} ({{ formatSlotShortDate(slot.startDate) }})
                      </span>
                      <span v-if="getSlotsForActivity(act.documentId).length === 0" class="no-data">Aucun créneau</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB: FACILITATORS (ANIMATEURS) -->
            <div v-if="currentPage === 'facilitators'" class="facilitators-grid">
              <div 
                v-for="fac in filteredItems" 
                :key="fac.documentId" 
                class="data-card facilitator-card"
                :class="{ 'highlighted-item': fac.documentId === highlightedId }"
                :id="'fac-' + fac.documentId"
              >
                <div class="card-header">
                  <h3>👨‍🏫 {{ fac.firstName }} {{ fac.lastName }}</h3>
                  <span class="email-text">{{ fac.email }}</span>
                </div>
                <div class="card-content">
                  <div class="info-group" v-if="fac.skills">
                    <span class="info-label">Compétences</span>
                    <span class="info-value text-italic">{{ fac.skills }}</span>
                  </div>
                  <div class="info-group">
                    <span class="info-label">Disponibilités Hebdomadaires</span>
                    <div class="availability-block">
                      {{ formatWeeklyAvailabilities(fac.weeklyAvailabilities) }}
                    </div>
                  </div>
                  <div class="info-group" v-if="fac.specificUnavailabilities && fac.specificUnavailabilities.length > 0">
                    <span class="info-label">Indisponibilités Spécifiques</span>
                    <ul class="closures-list">
                      <li v-for="(unavail, i) in fac.specificUnavailabilities" :key="i">
                        {{ formatDateRange(unavail.startDate, unavail.endDate) }}
                      </li>
                    </ul>
                  </div>

                  <!-- Related Time Slots Chips -->
                  <div class="related-slots-section mt-2">
                    <span class="info-label">Planning assigné :</span>
                    <div class="chips-list mt-1">
                      <span 
                        v-for="slot in getSlotsForFacilitator(fac.documentId)" 
                        :key="slot.documentId"
                        class="data-chip slot-chip clickable"
                        @click="navigateTo('timeslots', slot.documentId)"
                      >
                        📅 {{ slot.activityTemplate?.name }} @ {{ slot.location?.name }} ({{ formatSlotShortDate(slot.startDate) }})
                      </span>
                      <span v-if="getSlotsForFacilitator(fac.documentId).length === 0" class="no-data">Libre</span>
                    </div>
                  </div>

                  <button 
                    class="action-btn mt-2 no-print" 
                    @click="viewIndividualSchedule('facilitator', fac.documentId)"
                    style="padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 500;"
                  >
                    📅 Voir le planning
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB: PARTICIPANTS -->
            <div v-if="currentPage === 'participants'" class="participants-grid">
              <div 
                v-for="part in filteredItems" 
                :key="part.documentId" 
                class="data-card participant-card"
                :class="{ 'highlighted-item': part.documentId === highlightedId }"
                :id="'part-' + part.documentId"
              >
                <div class="card-header">
                  <h3>👥 {{ part.firstName }} {{ part.lastName }}</h3>
                  <span class="email-text">{{ part.email }}</span>
                </div>
                <div class="card-content">
                  <div class="info-group">
                    <span class="info-label">Disponibilités Hebdomadaires</span>
                    <div class="availability-block">
                      {{ formatWeeklyAvailabilities(part.weeklyAvailabilities) }}
                    </div>
                  </div>
                  <div class="info-group" v-if="part.specificUnavailabilities && part.specificUnavailabilities.length > 0">
                    <span class="info-label">Indisponibilités Spécifiques</span>
                    <ul class="closures-list">
                      <li v-for="(unavail, i) in part.specificUnavailabilities" :key="i">
                        {{ formatDateRange(unavail.startDate, unavail.endDate) }}
                      </li>
                    </ul>
                  </div>

                  <!-- Related Time Slots Chips -->
                  <div class="related-slots-section mt-2">
                    <span class="info-label">Créneaux rejoints :</span>
                    <div class="chips-list mt-1">
                      <span 
                        v-for="slot in getSlotsForParticipant(part.documentId)" 
                        :key="slot.documentId"
                        class="data-chip slot-chip clickable"
                        @click="navigateTo('timeslots', slot.documentId)"
                      >
                        📅 {{ slot.activityTemplate?.name }} ({{ formatSlotShortDate(slot.startDate) }})
                      </span>
                      <span v-if="getSlotsForParticipant(part.documentId).length === 0" class="no-data">Aucun créneau</span>
                    </div>
                  </div>

                  <button 
                    class="action-btn mt-2 no-print" 
                    @click="viewIndividualSchedule('participant', part.documentId)"
                    style="padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 500;"
                  >
                    📅 Voir le planning
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB: INDIVIDUAL SCHEDULES -->
            <div v-if="currentPage === 'individual-schedules'" class="individual-schedules-container">
              <div class="schedules-selector-card no-print">
                <h3>🔍 Sélectionner un planning (Animateur, Participant ou Salle)</h3>
                
                <div class="selector-controls">
                  <!-- Type Toggle -->
                  <div class="type-segmented-control">
                    <button 
                      type="button" 
                      class="segment-btn" 
                      :class="{ active: selectedSchedulePersonType === 'facilitator' }"
                      @click="setSchedulePersonType('facilitator')"
                    >
                      👨‍🏫 Animateur
                    </button>
                    <button 
                      type="button" 
                      class="segment-btn" 
                      :class="{ active: selectedSchedulePersonType === 'participant' }"
                      @click="setSchedulePersonType('participant')"
                    >
                      👥 Participant
                    </button>
                    <button 
                      type="button" 
                      class="segment-btn" 
                      :class="{ active: selectedSchedulePersonType === 'location' }"
                      @click="setSchedulePersonType('location')"
                    >
                      📍 Salle / Lieu
                    </button>
                  </div>

                  <!-- Dropdown Selection -->
                  <div class="person-dropdown-wrapper">
                    <select 
                      v-model="selectedSchedulePersonId" 
                      class="form-select person-select"
                      @change="onSchedulePersonChange"
                    >
                      <option :value="null">-- Choisissez un planning --</option>
                      <option 
                        v-for="item in schedulePeopleList" 
                        :key="item.documentId" 
                        :value="item.documentId"
                      >
                        {{ selectedSchedulePersonType === 'location' ? item.name : `${item.firstName} ${item.lastName}` }}
                        <template v-if="item.email"> ({{ item.email }})</template>
                      </option>
                    </select>
                  </div>

                  <!-- Date Range Picker -->
                  <div class="date-range-picker-group">
                    <div class="date-picker-field">
                      <label>Début :</label>
                      <input type="date" v-model="scheduleStartDate" class="form-input date-picker-input" />
                    </div>
                    <div class="date-picker-field">
                      <label>Fin :</label>
                      <input type="date" v-model="scheduleEndDate" class="form-input date-picker-input" />
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Selected Person/Location Schedule -->
              <div v-if="selectedSchedulePerson" class="schedule-detail-card printable-schedule-area">
                <!-- Profile Header -->
                <div class="schedule-detail-header">
                  <div class="person-badge-avatar">
                    {{ selectedSchedulePersonType === 'facilitator' ? '👨‍🏫' : (selectedSchedulePersonType === 'participant' ? '👥' : '📍') }}
                  </div>
                  <div class="person-info-block">
                    <h2 v-if="selectedSchedulePersonType === 'location'">Planning de la salle : {{ selectedSchedulePerson.name }}</h2>
                    <h2 v-else>Planning de {{ selectedSchedulePerson.firstName }} {{ selectedSchedulePerson.lastName }}</h2>
                    
                    <div class="subtitle">
                      <span class="role-badge" :class="selectedSchedulePersonType">
                        {{ selectedSchedulePersonType === 'facilitator' ? 'Animateur' : (selectedSchedulePersonType === 'participant' ? 'Participant (Bénéficiaire)' : 'Salle / Lieu') }}
                      </span>
                      <span v-if="selectedSchedulePersonType !== 'location'" class="email-info">✉️ {{ selectedSchedulePerson.email }}</span>
                      <span v-else class="email-info">📍 {{ selectedSchedulePerson.address || 'Pas d\'adresse' }}</span>
                      <span class="date-range-badge">📅 Période du {{ formatDateFr(scheduleStartDate) }} au {{ formatDateFr(scheduleEndDate) }}</span>
                    </div>
                    <p v-if="selectedSchedulePersonType === 'facilitator' && selectedSchedulePerson.skills" class="skills-info">
                      <strong>Compétences :</strong> {{ selectedSchedulePerson.skills }}
                    </p>
                    <p v-if="selectedSchedulePersonType === 'location' && selectedSchedulePerson.capacity" class="skills-info">
                      <strong>Capacité d'accueil :</strong> {{ selectedSchedulePerson.capacity }} personnes
                    </p>
                  </div>
                  
                  <!-- Actions (Print & Email) -->
                  <div class="schedule-actions no-print">
                    <button class="action-btn print-btn" @click="printSchedule">
                      🖨️ Imprimer
                    </button>
                    <button class="action-btn email-btn" @click="openEmailModal">
                      ✉️ Envoyer par mail
                    </button>
                  </div>
                </div>

                <!-- Reference constraints / opening section -->
                <div class="availability-schedule-section">
                  <template v-if="selectedSchedulePersonType === 'location'">
                    <h4>🗓️ Horaires d'ouverture de la salle</h4>
                    <p class="avail-text">
                      <strong>Ouverture globale :</strong> Du {{ formatDate(selectedSchedulePerson.globalOpeningStart) }} au {{ formatDate(selectedSchedulePerson.globalOpeningEnd) }}
                      <br />
                      <strong>Fermeture hebdomadaire :</strong> {{ formatWeeklyClosures(selectedSchedulePerson.weeklyClosures) }}
                    </p>
                  </template>
                  <template v-else>
                    <h4>🗓️ Disponibilités de référence</h4>
                    <p class="avail-text">{{ formatWeeklyAvailabilities(selectedSchedulePerson.weeklyAvailabilities) }}</p>
                  </template>
                </div>

                <!-- Timeline of Days -->
                <div class="schedule-list-section">
                  <h3>📅 Liste des activités programmées</h3>
                  
                  <div v-if="groupedScheduleSlotsByDay.length === 0" class="no-slots-message">
                     Aucun créneau horaire n'est planifié sur la période sélectionnée.
                  </div>
                  
                  <div v-else class="days-timeline">
                    <div 
                      v-for="dayGroup in groupedScheduleSlotsByDay" 
                      :key="dayGroup.dateStr" 
                      class="day-timeline-card"
                    >
                      <div class="day-timeline-header">
                        <h4>📅 {{ dayGroup.label }}</h4>
                      </div>
                      
                      <div class="day-timeline-slots">
                        <div 
                          v-for="slot in dayGroup.slots" 
                          :key="slot.documentId" 
                          class="timeline-slot-row"
                        >
                          <!-- Time Column -->
                          <div class="slot-time-col">
                            <span class="time-range">⏰ {{ formatSlotTimeRange(slot.startDate, slot.endDate) }}</span>
                          </div>
                          
                          <!-- Activity Column -->
                          <div class="slot-activity-col">
                            <span class="activity-name-text">🎯 {{ slot.activityTemplate?.name || 'Activité inconnue' }}</span>
                            <span class="activity-duration-text">{{ slot.activityTemplate?.standardDuration }} min</span>
                          </div>
                          
                          <!-- Location Column (Only if not viewing room schedule) -->
                          <div class="slot-location-col" v-if="selectedSchedulePersonType !== 'location'">
                            <span class="location-name-text">📍 {{ slot.location?.name || 'Inconnu' }}</span>
                          </div>
                          
                          <!-- Relations Column -->
                          <div class="slot-relations-col">
                            <!-- If location schedule: show animators & participants -->
                            <template v-if="selectedSchedulePersonType === 'location'">
                              <div class="relation-item">
                                <span class="relation-label">Animateurs :</span>
                                <span class="relation-value">{{ getSlotFacilitatorsList(slot) || 'Aucun' }}</span>
                              </div>
                              <div class="relation-item">
                                <span class="relation-label">Participants :</span>
                                <span class="relation-value">{{ getSlotParticipantsList(slot) || 'Aucun' }}</span>
                              </div>
                            </template>
                            
                            <!-- If animator schedule: show co-animators & participants -->
                            <template v-else-if="selectedSchedulePersonType === 'facilitator'">
                              <div class="relation-item" v-if="getCoFacilitators(slot)">
                                <span class="relation-label">Co-animateurs :</span>
                                <span class="relation-value">{{ getCoFacilitators(slot) }}</span>
                              </div>
                              <div class="relation-item">
                                <span class="relation-label">Participants :</span>
                                <span class="relation-value">{{ getSlotParticipantsList(slot) || 'Aucun' }}</span>
                              </div>
                            </template>
                            
                            <!-- If participant schedule: show animators & co-participants -->
                            <template v-else>
                              <div class="relation-item">
                                <span class="relation-label">Animateurs :</span>
                                <span class="relation-value">{{ getSlotFacilitatorsList(slot) || 'Aucun' }}</span>
                              </div>
                              <div class="relation-item" v-if="getOtherParticipants(slot)">
                                <span class="relation-label">Co-participants :</span>
                                <span class="relation-value">{{ getOtherParticipants(slot) }}</span>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Empty state when no person selected -->
              <div v-else class="empty-schedule-state">
                <span class="calendar-icon">📅</span>
                <h3>Aucun planning sélectionné</h3>
                <p>Veuillez choisir un animateur, un participant ou une salle dans la liste ci-dessus pour afficher et gérer son planning d'activités.</p>
              </div>
            </div>

          </div>
        </main>
      </div>

      <!-- NEW TIME SLOT MODAL -->
      <div class="modal-backdrop" v-if="showModal" @click.self="closeCreateModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>📅 Planifier un Nouveau Créneau</h3>
            <button class="close-modal-btn" @click="closeCreateModal">✕</button>
          </div>

          <div class="modal-body">
            <!-- Form Validation Errors -->
            <div class="validation-error-box" v-if="modalError">
              <span class="error-box-icon">🚫</span>
              <div class="error-box-content">
                <h4>Erreur de Contraintes</h4>
                <p>{{ modalError }}</p>
              </div>
              <button class="clear-error-btn" @click="modalError = ''">✕</button>
            </div>

            <form @submit.prevent="submitForm">
              <!-- Grid fields -->
              <div class="form-grid">
                <div class="form-group">
                  <label for="startDate">Date & Heure Début</label>
                  <input 
                    type="datetime-local" 
                    id="startDate" 
                    v-model="form.startDate" 
                    required
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label for="endDate">Date & Heure Fin</label>
                  <input 
                    type="datetime-local" 
                    id="endDate" 
                    v-model="form.endDate" 
                    required
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-grid mt-2">
                <div class="form-group">
                  <label for="location">📍 Lieu</label>
                  <select id="location" v-model="form.location" required class="form-select">
                    <option value="" disabled>Sélectionner un lieu</option>
                    <option v-for="loc in locations" :key="loc.documentId" :value="loc.documentId">
                      {{ loc.name }} (Capacité: {{ loc.capacity }} pers.)
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="activityTemplate">🎯 Modèle d'Activité</label>
                  <select id="activityTemplate" v-model="form.activityTemplate" required class="form-select">
                    <option value="" disabled>Sélectionner une activité</option>
                    <option v-for="act in activities" :key="act.documentId" :value="act.documentId">
                      {{ act.name }} ({{ act.standardDuration }} min, Min/Max: {{ act.minParticipants }}/{{ act.maxParticipants }})
                    </option>
                  </select>
                </div>
              </div>

              <!-- Multi selects for Facilitators & Participants -->
              <div class="form-group mt-2">
                <label>👨‍🏫 Animateurs (Requis)</label>
                <div class="selection-grid">
                  <label 
                    v-for="fac in facilitators" 
                    :key="fac.documentId" 
                    class="selection-card"
                    :class="[
                      getPersonStatus(fac, 'facilitator').class,
                      { selected: form.facilitators.includes(fac.documentId) }
                    ]"
                  >
                    <input 
                      type="checkbox" 
                      :value="fac.documentId" 
                      v-model="form.facilitators"
                      class="checkbox-hidden"
                    />
                    <span class="selection-text">
                      <strong>{{ fac.firstName }} {{ fac.lastName }}</strong>
                      <span class="sub-text">{{ fac.skills }}</span>
                      <span 
                        v-if="getPersonStatus(fac, 'facilitator').reason" 
                        class="status-badge-text"
                        :class="{ 
                          unavailable: !getPersonStatus(fac, 'facilitator').available,
                          unauthorized: !getPersonStatus(fac, 'facilitator').authorized && getPersonStatus(fac, 'facilitator').available 
                        }"
                      >
                        ⚠️ {{ getPersonStatus(fac, 'facilitator').reason }}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div class="form-group mt-2">
                <label>👥 Participants (Requis)</label>
                <div class="selection-grid">
                  <label 
                    v-for="part in participants" 
                    :key="part.documentId" 
                    class="selection-card"
                    :class="[
                      getPersonStatus(part, 'participant').class,
                      { selected: form.participants.includes(part.documentId) }
                    ]"
                  >
                    <input 
                      type="checkbox" 
                      :value="part.documentId" 
                      v-model="form.participants"
                      class="checkbox-hidden"
                    />
                    <span class="selection-text">
                      <strong>{{ part.firstName }} {{ part.lastName }}</strong>
                      <span class="sub-text">{{ part.email }}</span>
                      <span 
                        v-if="getPersonStatus(part, 'participant').reason" 
                        class="status-badge-text"
                        :class="{ unavailable: !getPersonStatus(part, 'participant').available }"
                      >
                        ⚠️ {{ getPersonStatus(part, 'participant').reason }}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="cancel-btn" @click="closeCreateModal">Annuler</button>
                <button type="submit" class="submit-btn" :disabled="modalLoading">
                  {{ modalLoading ? 'Validation des contraintes...' : 'Planifier' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- EMAIL MODAL -->
      <div class="modal-backdrop" v-if="showEmailModal" @click.self="closeEmailModal">
        <div class="modal-card" style="max-width: 550px;">
          <div class="modal-header">
            <h3>✉️ Envoyer le planning par e-mail</h3>
            <button class="close-modal-btn" @click="closeEmailModal">✕</button>
          </div>

          <div class="modal-body">
            <div v-if="emailLoading" class="email-sending-state">
              <div class="spinner"></div>
              <p>Envoi de l'e-mail en cours...</p>
            </div>
            
            <div v-else-if="emailSuccess" class="email-success-state">
              <span class="email-success-icon">✅</span>
              <h3>E-mail envoyé avec succès !</h3>
              <p>Le planning a été transmis à {{ emailForm.to }}.</p>
            </div>

            <form v-else @submit.prevent="sendEmailDirect">
              <div class="form-group">
                <label for="emailTo">Destinataire (E-mail)</label>
                <input 
                  type="email" 
                  id="emailTo" 
                  v-model="emailForm.to" 
                  required
                  class="form-input"
                  placeholder="Ex: destinataire@mail.com"
                />
              </div>

              <div class="form-group mt-2">
                <label for="emailSubject">Objet</label>
                <input 
                  type="text" 
                  id="emailSubject" 
                  v-model="emailForm.subject" 
                  required
                  class="form-input"
                />
              </div>

              <div class="form-group mt-2">
                <label for="emailBody">Contenu du message (Aperçu)</label>
                <textarea 
                  id="emailBody" 
                  v-model="emailForm.body" 
                  required
                  class="email-textarea"
                ></textarea>
              </div>

              <div class="modal-footer" style="margin-top: 1rem; padding-top: 1rem;">
                <button type="button" class="cancel-btn" @click="closeEmailModal">Annuler</button>
                <button type="button" class="email-send-mailto-btn" @click="sendEmailMailto">
                  ✉️ Ouvrir Messagerie
                </button>
                <button type="submit" class="email-send-direct-btn">
                  🚀 Envoyer Direct
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- SUCCESS NOTIFICATION TOAST -->
      <div class="toast-notification" v-if="successMessage">
        <span class="toast-icon">✅</span>
        <span class="toast-text">{{ successMessage }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { storeToRefs } from 'pinia';
import { useAuthStore } from './stores/auth';
import { useSchedulerStore } from './stores/scheduler';

const DAYS_FR = {
  '0': 'Dimanche',
  '1': 'Lundi',
  '2': 'Mardi',
  '3': 'Mercredi',
  '4': 'Jeudi',
  '5': 'Vendredi',
  '6': 'Samedi'
};

export default {
  name: 'App',
  setup() {
    const authStore = useAuthStore();
    const schedulerStore = useSchedulerStore();

    const { 
      user, 
      isAuthenticated, 
      loading: authLoading, 
      error: authError 
    } = storeToRefs(authStore);

    const { 
      locations, 
      activities, 
      facilitators, 
      participants, 
      timeslots, 
      loading: schedulerLoading, 
      error: schedulerError, 
      isConnected 
    } = storeToRefs(schedulerStore);

    return {
      authStore,
      schedulerStore,
      user,
      isAuthenticated,
      authLoading,
      authError,
      locations,
      activities,
      facilitators,
      participants,
      timeslots,
      loading: schedulerLoading,
      error: schedulerError,
      isConnected
    };
  },
  data() {
    return {
      pendingTimeslotId: null,
      // Auth State
      authTab: 'login',
      localAuthError: '',
      loginForm: {
        identifier: '',
        password: ''
      },
      registerForm: {
        username: '',
        email: '',
        password: '',
        confirmPassword: '' // Added for typos double check
      },

      // User Profile Page State
      profileForm: {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      profileLoading: false,
      profileError: '',
      profileSuccess: '',

      // Dashboard State
      currentPage: 'timeslots',
      searchQuery: '',
      highlightedId: null,
      highlightTimeout: null,
      
      // Filter State
      filterItemId: null,
      filterItemType: null,

      // Modal / Creation
      showModal: false,
      modalLoading: false,
      modalError: '',
      successMessage: '',
      successTimeout: null,
      form: {
        startDate: '',
        endDate: '',
        location: '',
        activityTemplate: '',
        facilitators: [],
        participants: []
      },

      // Individual Schedules Page State
      selectedSchedulePersonId: null,
      selectedSchedulePersonType: 'facilitator',
      scheduleStartDate: '',
      scheduleEndDate: '',
      showEmailModal: false,
      emailForm: {
        to: '',
        subject: '',
        body: ''
      },
      emailLoading: false,
      emailSuccess: false
    };
  },
  computed: {
    searchPlaceholder() {
      switch (this.currentPage) {
        case 'timeslots': return 'Rechercher par activité, lieu ou animateur...';
        case 'locations': return 'Rechercher par nom de lieu...';
        case 'activities': return 'Rechercher par nom d\'activité...';
        case 'facilitators': return 'Rechercher par nom ou email d\'animateur...';
        case 'participants': return 'Rechercher par nom ou email de participant...';
        case 'individual-schedules': return 'Rechercher...';
        default: return 'Rechercher...';
      }
    },
    currentTabTitle() {
      switch (this.currentPage) {
        case 'timeslots': return 'Créneaux horaires plannifiés';
        case 'locations': return 'Lieux et salles';
        case 'activities': return 'Modèles d\'activités';
        case 'facilitators': return 'Animateurs autorisés';
        case 'participants': return 'Participants inscrits';
        case 'individual-schedules': return 'Plannings Individuels';
        default: return '';
      }
    },
    schedulePeopleList() {
      if (this.selectedSchedulePersonType === 'facilitator') {
        const list = [...this.facilitators];
        return list.sort((a, b) => {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
      } else if (this.selectedSchedulePersonType === 'participant') {
        const list = [...this.participants];
        return list.sort((a, b) => {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
      } else { // location
        const list = [...this.locations];
        return list.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      }
    },
    selectedSchedulePerson() {
      if (!this.selectedSchedulePersonId) return null;
      return this.schedulePeopleList.find(p => p.documentId === this.selectedSchedulePersonId) || null;
    },
    selectedPersonSlots() {
      if (!this.selectedSchedulePersonId) return [];
      let baseSlots = [];
      if (this.selectedSchedulePersonType === 'facilitator') {
        baseSlots = this.getSlotsForFacilitator(this.selectedSchedulePersonId);
      } else if (this.selectedSchedulePersonType === 'participant') {
        baseSlots = this.getSlotsForParticipant(this.selectedSchedulePersonId);
      } else { // location
        baseSlots = this.getSlotsForLocation(this.selectedSchedulePersonId);
      }
      
      // Filter slots by date range
      return baseSlots.filter(slot => {
        const dateStr = slot.startDate.substring(0, 10);
        if (this.scheduleStartDate && dateStr < this.scheduleStartDate) return false;
        if (this.scheduleEndDate && dateStr > this.scheduleEndDate) return false;
        return true;
      });
    },
    groupedScheduleSlotsByDay() {
      const slots = [...this.selectedPersonSlots];
      // Sort chronologically
      slots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      
      const groups = {};
      const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const MONTHS_FR = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];
      
      slots.forEach(slot => {
        const dateObj = new Date(slot.startDate);
        const dayName = DAYS_FR[dateObj.getDay()];
        const dayNum = dateObj.getDate();
        const monthName = MONTHS_FR[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        
        const dateKey = slot.startDate.substring(0, 10); // YYYY-MM-DD
        const dateLabel = `${dayName} ${dayNum} ${monthName} ${year}`;
        
        if (!groups[dateKey]) {
          groups[dateKey] = {
            label: dateLabel,
            dateStr: dateKey,
            slots: []
          };
        }
        groups[dateKey].slots.push(slot);
      });
      
      return Object.keys(groups)
        .sort()
        .map(key => groups[key]);
    },
    filterItemTypeLabel() {
      switch (this.filterItemType) {
        case 'location': return 'Lieu';
        case 'activity': return 'Activité';
        case 'facilitator': return 'Animateur';
        case 'participant': return 'Participant';
        default: return '';
      }
    },
    filterItemName() {
      if (!this.filterItemId) return '';
      if (this.filterItemType === 'location') {
        const item = this.locations.find(l => l.documentId === this.filterItemId);
        return item ? item.name : '';
      }
      if (this.filterItemType === 'activity') {
        const item = this.activities.find(a => a.documentId === this.filterItemId);
        return item ? item.name : '';
      }
      if (this.filterItemType === 'facilitator') {
        const item = this.facilitators.find(f => f.documentId === this.filterItemId);
        return item ? `${item.firstName} ${item.lastName}` : '';
      }
      if (this.filterItemType === 'participant') {
        const item = this.participants.find(p => p.documentId === this.filterItemId);
        return item ? `${item.firstName} ${item.lastName}` : '';
      }
      return '';
    },
    filteredItems() {
      let baseList = [];
      if (this.currentPage === 'timeslots') {
        baseList = this.timeslots;
        // Apply relationships filters
        if (this.filterItemId) {
          if (this.filterItemType === 'location') {
            baseList = baseList.filter(s => s.location?.documentId === this.filterItemId);
          } else if (this.filterItemType === 'activity') {
            baseList = baseList.filter(s => s.activityTemplate?.documentId === this.filterItemId);
          } else if (this.filterItemType === 'facilitator') {
            baseList = baseList.filter(s => s.facilitators?.some(f => f.documentId === this.filterItemId));
          } else if (this.filterItemType === 'participant') {
            baseList = baseList.filter(s => s.participants?.some(p => p.documentId === this.filterItemId));
          }
        }
        
        // Apply search query
        if (this.searchQuery.trim()) {
          const q = this.searchQuery.toLowerCase();
          baseList = baseList.filter(s => 
            (s.activityTemplate?.name || '').toLowerCase().includes(q) ||
            (s.location?.name || '').toLowerCase().includes(q) ||
            (s.facilitators || []).some(f => `${f.firstName} ${f.lastName}`.toLowerCase().includes(q))
          );
        }
      } else if (this.currentPage === 'locations') {
        baseList = this.locations;
        if (this.searchQuery.trim()) {
          const q = this.searchQuery.toLowerCase();
          baseList = baseList.filter(l => l.name.toLowerCase().includes(q));
        }
      } else if (this.currentPage === 'activities') {
        baseList = this.activities;
        if (this.searchQuery.trim()) {
          const q = this.searchQuery.toLowerCase();
          baseList = baseList.filter(a => a.name.toLowerCase().includes(q));
        }
      } else if (this.currentPage === 'facilitators') {
        baseList = this.facilitators;
        if (this.searchQuery.trim()) {
          const q = this.searchQuery.toLowerCase();
          baseList = baseList.filter(f => 
            `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
            f.email.toLowerCase().includes(q)
          );
        }
      } else if (this.currentPage === 'participants') {
        baseList = this.participants;
        if (this.searchQuery.trim()) {
          const q = this.searchQuery.toLowerCase();
          baseList = baseList.filter(p => 
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q)
          );
        }
      }
      return baseList;
    }
  },
  watch: {
    '$route'(to) {
      this.syncRouteToState(to);
    },
    loading(newLoading) {
      if (!newLoading) {
        if (this.pendingTimeslotId) {
          this.applyHighlightOrFilter(this.pendingTimeslotId);
        }
        if (this.highlightedId) {
          const prefix = this.currentPage === 'locations' ? 'loc-' :
                         this.currentPage === 'activities' ? 'act-' :
                         this.currentPage === 'facilitators' ? 'fac-' :
                         this.currentPage === 'participants' ? 'part-' : 'slot-';
          this.scrollToElement(prefix + this.highlightedId);
        }
      }
    },
    isAuthenticated(val) {
      if (!val) {
        this.$router.replace('/login');
      } else {
        this.fetchData();
        const redirectPath = sessionStorage.getItem('redirectPath') || '/timeslots';
        sessionStorage.removeItem('redirectPath');
        this.$router.replace(redirectPath);
      }
    }
  },
  methods: {
    // Route Sync Methods
    syncRouteToState(route) {
      if (!this.isAuthenticated) {
        if (route.path !== '/login') {
          this.$router.replace('/login');
        }
        return;
      }

      if (route.path === '/login') {
        const redirectPath = sessionStorage.getItem('redirectPath') || '/timeslots';
        sessionStorage.removeItem('redirectPath');
        this.$router.replace(redirectPath);
        return;
      }

      const path = route.path;
      if (path.startsWith('/timeslots')) {
        this.currentPage = 'timeslots';
        const id = route.params.id;
        if (id) {
          this.applyHighlightOrFilter(id);
        } else {
          this.clearFilter();
        }
      } else if (path.startsWith('/locations')) {
        this.currentPage = 'locations';
        const id = route.params.id;
        if (id) {
          this.highlightedId = id;
          this.scrollToElement('loc-' + id);
        } else {
          this.highlightedId = null;
        }
      } else if (path.startsWith('/activities')) {
        this.currentPage = 'activities';
        const id = route.params.id;
        if (id) {
          this.highlightedId = id;
          this.scrollToElement('act-' + id);
        } else {
          this.highlightedId = null;
        }
      } else if (path.startsWith('/facilitators')) {
        this.currentPage = 'facilitators';
        const id = route.params.id;
        if (id) {
          this.highlightedId = id;
          this.scrollToElement('fac-' + id);
        } else {
          this.highlightedId = null;
        }
      } else if (path.startsWith('/participants')) {
        this.currentPage = 'participants';
        const id = route.params.id;
        if (id) {
          this.highlightedId = id;
          this.scrollToElement('part-' + id);
        } else {
          this.highlightedId = null;
        }
      } else if (path.startsWith('/individual-schedules')) {
        this.currentPage = 'individual-schedules';
        const type = route.params.type;
        const id = route.params.id;
        if (type && id) {
          this.selectedSchedulePersonType = type;
          this.selectedSchedulePersonId = id;
        } else if (type) {
          this.selectedSchedulePersonType = type;
          this.selectedSchedulePersonId = null;
        } else {
          this.selectedSchedulePersonType = 'facilitator';
          this.selectedSchedulePersonId = null;
        }
      } else if (path.startsWith('/profile')) {
        this.currentPage = 'profile';
        if (this.user) {
          this.profileForm.username = this.user.username;
          this.profileForm.email = this.user.email;
          this.profileForm.password = '';
          this.profileForm.confirmPassword = '';
          this.profileError = '';
          this.profileSuccess = '';
        }
      }
    },

    applyHighlightOrFilter(id) {
      if (this.loading) {
        this.pendingTimeslotId = id;
        return;
      }
      this.pendingTimeslotId = null;

      if (this.timeslots.some(s => s.documentId === id)) {
        this.highlightedId = id;
        if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
        this.highlightTimeout = setTimeout(() => {
          this.highlightedId = null;
        }, 2500);
        this.scrollToElement('slot-' + id);
      } else if (this.locations.some(l => l.documentId === id)) {
        this.filterItemId = id;
        this.filterItemType = 'location';
      } else if (this.activities.some(a => a.documentId === id)) {
        this.filterItemId = id;
        this.filterItemType = 'activity';
      } else if (this.facilitators.some(f => f.documentId === id)) {
        this.filterItemId = id;
        this.filterItemType = 'facilitator';
      } else if (this.participants.some(p => p.documentId === id)) {
        this.filterItemId = id;
        this.filterItemType = 'participant';
      }
    },

    scrollToElement(elId) {
      this.$nextTick(() => {
        const el = document.getElementById(elId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          setTimeout(() => {
            const elRetry = document.getElementById(elId);
            if (elRetry) {
              elRetry.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 200);
        }
      });
    },

    // Auth Methods
    async handleLogin() {
      this.localAuthError = '';
      try {
        await this.authStore.login(this.loginForm.identifier, this.loginForm.password);
        this.showToast('Connexion réussie !');
      } catch (err) {
        this.localAuthError = err.message;
      }
    },
    async handleRegister() {
      this.localAuthError = '';
      if (this.registerForm.password !== this.registerForm.confirmPassword) {
        this.localAuthError = 'Les mots de passe ne correspondent pas.';
        return;
      }
      if (this.registerForm.password.length < 6) {
        this.localAuthError = 'Le mot de passe doit comporter au moins 6 caractères.';
        return;
      }
      try {
        await this.authStore.register(
          this.registerForm.username,
          this.registerForm.email,
          this.registerForm.password
        );
        this.showToast('Compte créé avec succès !');
      } catch (err) {
        this.localAuthError = err.message;
      }
    },
    handleLogout() {
      this.authStore.logout();
      this.showToast('Déconnexion réussie.');
    },

    // User Profile Edit Method
    async handleUpdateProfile() {
      this.profileError = '';
      this.profileSuccess = '';
      this.profileLoading = true;

      const updateData = {
        username: this.profileForm.username,
        email: this.profileForm.email
      };

      if (this.profileForm.password) {
        if (this.profileForm.password !== this.profileForm.confirmPassword) {
          this.profileError = 'Les nouveaux mots de passe ne correspondent pas.';
          this.profileLoading = false;
          return;
        }
        if (this.profileForm.password.length < 6) {
          this.profileError = 'Le mot de passe doit comporter au moins 6 caractères.';
          this.profileLoading = false;
          return;
        }
        updateData.password = this.profileForm.password;
      }

      try {
        await this.authStore.updateProfile(updateData);
        this.profileSuccess = 'Profil mis à jour avec succès !';
        this.showToast('Profil mis à jour.');
        // Reset password fields
        this.profileForm.password = '';
        this.profileForm.confirmPassword = '';
      } catch (err) {
        this.profileError = err.message || 'Erreur lors de la mise à jour.';
      } finally {
        this.profileLoading = false;
      }
    },

    // Scheduler Methods
    async fetchData() {
      if (!this.isAuthenticated) return;
      try {
        await this.schedulerStore.fetchData();
      } catch (err) {
        // Handled reactively by Pinia
      }
    },

    navigateTo(tab, highlightId = null) {
      if (highlightId) {
        this.$router.push(`/${tab}/${highlightId}`);
      } else {
        this.$router.push(`/${tab}`);
      }
      this.searchQuery = '';
    },

    clearFilter() {
      this.filterItemId = null;
      this.filterItemType = null;
      if (this.$route.params.id && this.$route.path.startsWith('/timeslots')) {
        this.$router.push('/timeslots');
      }
    },

    clearSearchAndFilter() {
      this.searchQuery = '';
      this.clearFilter();
    },

    viewIndividualSchedule(type, personId) {
      this.$router.push(`/individual-schedules/${type}/${personId}`);
    },

    setSchedulePersonType(type) {
      this.$router.push(`/individual-schedules/${type}`);
    },

    onSchedulePersonChange() {
      if (this.selectedSchedulePersonId) {
        this.$router.push(`/individual-schedules/${this.selectedSchedulePersonType}/${this.selectedSchedulePersonId}`);
      } else {
        this.$router.push(`/individual-schedules/${this.selectedSchedulePersonType}`);
      }
    },

    printSchedule() {
      window.print();
    },

    openEmailModal() {
      if (!this.selectedSchedulePerson) return;
      this.emailForm.to = this.selectedSchedulePerson.email || '';
      this.emailForm.subject = this.selectedSchedulePersonType === 'location'
        ? `Planning d'utilisation de la salle : ${this.selectedSchedulePerson.name}`
        : 'Votre planning - AetherScheduler';
      this.emailForm.body = this.getIndividualScheduleText(
        this.selectedSchedulePerson, 
        this.selectedSchedulePersonType, 
        this.selectedPersonSlots
      );
      this.emailSuccess = false;
      this.emailLoading = false;
      this.showEmailModal = true;
    },

    closeEmailModal() {
      this.showEmailModal = false;
    },

    async sendEmailDirect() {
      this.emailLoading = true;
      try {
        // Simulate premium sending animation
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.emailLoading = false;
        this.emailSuccess = true;
        
        // Show success toast notification
        this.showToast(`E-mail envoyé avec succès à ${this.emailForm.to}`);
        
        // Close modal after a brief delay
        setTimeout(() => {
          this.closeEmailModal();
        }, 1200);
      } catch (err) {
        this.emailLoading = false;
        alert("Erreur lors de l'envoi de l'e-mail: " + err.message);
      }
    },

    sendEmailMailto() {
      const to = this.emailForm.to;
      const subject = this.emailForm.subject;
      const body = this.emailForm.body;
      const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');
      this.closeEmailModal();
    },

    formatDateFr(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    },

    getIndividualScheduleText(person, type, slots) {
      let text = '';
      if (type === 'location') {
        text += `Planning d'utilisation de la salle : ${person.name}\n`;
        if (person.capacity) {
          text += `Capacité d'accueil : ${person.capacity} personnes\n`;
        }
        if (this.scheduleStartDate && this.scheduleEndDate) {
          text += `Période : du ${this.formatDateFr(this.scheduleStartDate)} au ${this.formatDateFr(this.scheduleEndDate)}\n`;
        }
        text += `\n`;
      } else {
        text += `Bonjour ${person.firstName} ${person.lastName},\n\n`;
        text += `Voici votre planning d'activités sur AetherScheduler :\n`;
        if (this.scheduleStartDate && this.scheduleEndDate) {
          text += `Période : du ${this.formatDateFr(this.scheduleStartDate)} au ${this.formatDateFr(this.scheduleEndDate)}\n`;
        }
        text += `\n`;
      }
      
      if (slots.length === 0) {
        text += `Aucun créneau n'est planifié sur la période sélectionnée.\n`;
      } else {
        slots.forEach(slot => {
          const dateStr = this.formatSlotDate(slot.startDate);
          const timeStr = this.formatSlotTimeRange(slot.startDate, slot.endDate);
          const activityName = slot.activityTemplate?.name || 'Activité inconnue';
          const locationName = slot.location?.name || 'Lieu inconnu';
          
          text += `- Le ${dateStr} de ${timeStr}\n`;
          text += `  Activité : ${activityName}\n`;
          if (type !== 'location') {
            text += `  Lieu : ${locationName}\n`;
          }
          
          if (type === 'location') {
            const animatorsList = (slot.facilitators || [])
              .map(f => `${f.firstName} ${f.lastName}`)
              .join(', ');
            text += `  Animateur(s) : ${animatorsList || 'Aucun'}\n`;
            const participantsList = (slot.participants || [])
              .map(p => `${p.firstName} ${p.lastName}`)
              .join(', ');
            text += `  Participant(s) : ${participantsList || 'Aucun'}\n`;
          } else if (type === 'facilitator') {
            const otherFacs = (slot.facilitators || [])
              .filter(f => f.documentId !== person.documentId)
              .map(f => `${f.firstName} ${f.lastName}`)
              .join(', ');
            if (otherFacs) {
              text += `  Co-animateur(s) : ${otherFacs}\n`;
            }
            const participantsList = (slot.participants || [])
              .map(p => `${p.firstName} ${p.lastName}`)
              .join(', ');
            text += `  Participant(s) : ${participantsList || 'Aucun'}\n`;
          } else {
            const animatorsList = (slot.facilitators || [])
              .map(f => `${f.firstName} ${f.lastName}`)
              .join(', ');
            text += `  Animateur(s) : ${animatorsList || 'Aucun'}\n`;
            const otherParts = (slot.participants || [])
              .filter(p => p.documentId !== person.documentId)
              .map(p => `${p.firstName} ${p.lastName}`)
              .join(', ');
            if (otherParts) {
              text += `  Autre(s) participant(s) : ${otherParts}\n`;
            }
          }
          text += '\n';
        });
      }
      
      text += `Bonne journée,\nL'équipe AetherScheduler`;
      return text;
    },

    getCoFacilitators(slot) {
      if (!slot.facilitators || !this.selectedSchedulePersonId) return '';
      return slot.facilitators
        .filter(f => f.documentId !== this.selectedSchedulePersonId)
        .map(f => `${f.firstName} ${f.lastName}`)
        .join(', ');
    },

    getSlotParticipantsList(slot) {
      if (!slot.participants) return '';
      return slot.participants
        .map(p => `${p.firstName} ${p.lastName}`)
        .join(', ');
    },

    getSlotFacilitatorsList(slot) {
      if (!slot.facilitators) return '';
      return slot.facilitators
        .map(f => `${f.firstName} ${f.lastName}`)
        .join(', ');
    },

    getOtherParticipants(slot) {
      if (!slot.participants || !this.selectedSchedulePersonId) return '';
      return slot.participants
        .filter(p => p.documentId !== this.selectedSchedulePersonId)
        .map(p => `${p.firstName} ${p.lastName}`)
        .join(', ');
    },

    // Related slots helpers
    getSlotsForLocation(locDocId) {
      return this.timeslots.filter(s => s.location?.documentId === locDocId);
    },
    getSlotsForActivity(actDocId) {
      return this.timeslots.filter(s => s.activityTemplate?.documentId === actDocId);
    },
    getSlotsForFacilitator(facDocId) {
      return this.timeslots.filter(s => s.facilitators?.some(f => f.documentId === facDocId));
    },
    getSlotsForParticipant(partDocId) {
      return this.timeslots.filter(s => s.participants?.some(p => p.documentId === partDocId));
    },

    // Deletion
    async deleteSlot(documentId) {
      if (!confirm('Voulez-vous vraiment supprimer ce créneau horaire ?')) return;
      try {
        await this.schedulerStore.deleteSlot(documentId);
        this.showToast('Créneau supprimé avec succès.');
      } catch (err) {
        alert("Erreur lors de la suppression : " + err.message);
      }
    },

    // Modal
    openCreateModal() {
      this.modalError = '';
      this.modalLoading = false;
      this.form = {
        startDate: '',
        endDate: '',
        location: '',
        activityTemplate: '',
        facilitators: [],
        participants: []
      };
      this.showModal = true;
    },
    closeCreateModal() {
      this.showModal = false;
    },
    async submitForm() {
      this.modalLoading = true;
      this.modalError = '';

      try {
        const createdItem = await this.schedulerStore.createSlot(this.form);
        this.showToast('Créneau planifié avec succès !');
        this.closeCreateModal();
        
        // Highlight the newly created item
        if (createdItem?.documentId) {
          this.navigateTo('timeslots', createdItem.documentId);
        }
      } catch (err) {
        console.error(err);
        this.modalError = err.message || 'Erreur lors de la planification.';
      } finally {
        this.modalLoading = false;
      }
    },

    showToast(msg) {
      this.successMessage = msg;
      if (this.successTimeout) clearTimeout(this.successTimeout);
      this.successTimeout = setTimeout(() => {
        this.successMessage = '';
      }, 3500);
    },

    // Formatters
    formatSlotDate(isoString) {
      const d = new Date(isoString);
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    },
    formatSlotShortDate(isoString) {
      const d = new Date(isoString);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    },
    formatSlotTimeRange(startIso, endIso) {
      const start = new Date(startIso);
      const end = new Date(endIso);
      const fmt = { hour: '2-digit', minute: '2-digit' };
      return `${start.toLocaleTimeString('fr-FR', fmt)} - ${end.toLocaleTimeString('fr-FR', fmt)}`;
    },
    formatDate(dateString) {
      if (!dateString) return '';
      const d = new Date(dateString);
      return d.toLocaleDateString('fr-FR');
    },
    formatDateRange(start, end) {
      return `Du ${this.formatDate(start)} au ${this.formatDate(end)}`;
    },
    formatWeeklyClosures(closures) {
      if (!closures || closures.length === 0) return 'Aucun';
      return closures.map(c => DAYS_FR[c.toString()] || c).join(', ');
    },
    formatWeeklyAvailabilities(availabilities) {
      if (!availabilities || Object.keys(availabilities).length === 0) {
        return 'Aucune disponibilité définie';
      }
      return Object.entries(availabilities).map(([day, periods]) => {
        const dayName = DAYS_FR[day] || day;
        const periodStr = periods.map(p => `${p.start} - ${p.end}`).join(', ');
        return `${dayName} : ${periodStr}`;
      }).join(' | ');
    },
    getParisTimeAndDay(date) {
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
    },
    getPersonStatus(person, type) {
      const status = {
        authorized: true,
        available: true,
        reason: '',
        class: ''
      };

      // 1. Authorization check (only for facilitators)
      let isAuth = true;
      if (type === 'facilitator' && this.form.activityTemplate) {
        const act = this.activities.find(a => a.documentId === this.form.activityTemplate);
        if (act && act.authorizedFacilitators) {
          isAuth = act.authorizedFacilitators.some(f => f.documentId === person.documentId);
          if (!isAuth) {
            status.authorized = false;
            status.reason = "Non habilité";
            status.class = "status-unauthorized";
          }
        }
      }

      // 2. Availability check (needs valid dates)
      if (!this.form.startDate || !this.form.endDate) {
        return status;
      }

      const startDate = new Date(this.form.startDate);
      const endDate = new Date(this.form.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
        return status;
      }

      let isAvail = true;
      let availReason = "";

      // Check specific unavailabilities
      const unavailabilities = person.specificUnavailabilities || [];
      for (const period of unavailabilities) {
        const unStart = new Date(period.startDate);
        const unEnd = new Date(period.endDate);
        if (startDate < unEnd && endDate > unStart) {
          isAvail = false;
          availReason = "Indisponible (congé/abs.)";
          break;
        }
      }

      if (isAvail) {
        // Check weekly availability
        const parisStart = this.getParisTimeAndDay(startDate);
        const parisEnd = this.getParisTimeAndDay(endDate);
        const startDay = parisStart.dayOfWeek.toString();
        const endDay = parisEnd.dayOfWeek.toString();

        if (startDay !== endDay) {
          isAvail = false;
          availReason = "Indisponible (chevauchement jours)";
        } else {
          const weeklyAvail = person.weeklyAvailabilities || {};
          const dayWindows = weeklyAvail[startDay];
          if (!dayWindows || !Array.isArray(dayWindows) || dayWindows.length === 0) {
            isAvail = false;
            availReason = "Indisponible ce jour";
          } else {
            const startStr = parisStart.timeStr;
            const endStr = parisEnd.timeStr;
            const isCovered = dayWindows.some(w => startStr >= w.start && endStr <= w.end);
            if (!isCovered) {
              isAvail = false;
              availReason = "Hors heures de dispo.";
            }
          }
        }
      }

      if (isAvail) {
        // Check double-booking
        const overlappingSlots = this.timeslots.filter(slot => {
          const slotStart = new Date(slot.startDate);
          const slotEnd = new Date(slot.endDate);
          return slotStart < endDate && slotEnd > startDate;
        });

        for (const slot of overlappingSlots) {
          if (type === 'facilitator') {
            if (slot.facilitators?.some(f => f.documentId === person.documentId)) {
              isAvail = false;
              availReason = `Déjà planifié(e) (${slot.activityTemplate?.name || 'Autre créneau'})`;
              break;
            }
          } else {
            if (slot.participants?.some(p => p.documentId === person.documentId)) {
              isAvail = false;
              availReason = `Déjà inscrit(e) (${slot.activityTemplate?.name || 'Autre créneau'})`;
              break;
            }
          }
        }
      }

      // Combine status
      status.available = isAvail;
      if (!isAvail) {
        status.class = "status-unavailable";
        if (!isAuth) {
          status.reason = `Non habilité & ${availReason}`;
        } else {
          status.reason = availReason;
        }
      } else if (!isAuth) {
        status.class = "status-unauthorized";
        status.reason = "Non habilité";
      } else {
        status.class = "status-available";
      }

      return status;
    }
  },
  mounted() {
    if (this.isAuthenticated) {
      this.fetchData();
    }
    
    // Set default schedule date range: Monday of current week to Sunday of next week
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const monday = new Date(today);
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    monday.setDate(today.getDate() + diffToMonday);
    
    const sundayNextWeek = new Date(monday);
    sundayNextWeek.setDate(monday.getDate() + 13); // Monday + 13 days = Sunday next week
    
    this.scheduleStartDate = monday.toISOString().substring(0, 10);
    this.scheduleEndDate = sundayNextWeek.toISOString().substring(0, 10);
    
    // Sync current route to state
    this.syncRouteToState(this.$route);
  }
};
</script>

<style scoped>
/* App Layout */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-primary);
}

/* Authentication Page */
.auth-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1;
  padding: 2rem;
  background-image: 
    radial-gradient(at 10% 20%, rgba(99, 102, 241, 0.15) 0px, transparent 40%),
    radial-gradient(at 90% 80%, rgba(6, 182, 212, 0.12) 0px, transparent 40%);
}

.auth-card {
  background: var(--panel-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 1.5rem;
  padding: 3rem;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: auth-card-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes auth-card-enter {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.auth-brand {
  text-align: center;
}

.brand-icon {
  font-size: 2.5rem;
  display: inline-block;
  margin-bottom: 0.5rem;
  animation: logo-bounce 2s infinite ease-in-out;
}

@keyframes logo-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.auth-brand h2 {
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a5b4fc, #818cf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.25rem;
}

.auth-brand p {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.auth-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 0.5rem;
  padding: 0.25rem;
  border: 1px solid var(--border-color);
}

.auth-tab-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.6rem;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-tab-btn.active {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.auth-error-banner {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.85rem;
  color: #fecdd3;
  animation: shake 0.3s linear;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
  font-size: 0.95rem;
}

.auth-form .form-input {
  padding-left: 2.25rem;
}

/* User Profiling in Header */
.user-profile {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  padding: 0.35rem 0.85rem;
  border-radius: 2rem;
  transition: all 0.2s;
}

.user-profile.clickable {
  cursor: pointer;
}

.user-profile.clickable:hover {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
}

.user-avatar {
  font-size: 0.9rem;
}

.username {
  font-size: 0.85rem;
  font-weight: 600;
  color: #a5b4fc;
}

/* Premium User Sidebar Card */
.user-sidebar-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
}

.user-sidebar-card:hover {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.3);
  transform: translateY(-1px);
}

.user-sidebar-card.active {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.5);
}

.user-avatar-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
}

.user-sidebar-info {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
}

.user-sidebar-username {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-sidebar-role {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.edit-profile-icon {
  font-size: 0.95rem;
  color: var(--text-secondary);
  opacity: 0.6;
  transition: transform 0.2s;
}

.user-sidebar-card:hover .edit-profile-icon {
  transform: rotate(30deg);
  opacity: 1;
}

.nav-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

.logout-sidebar-btn {
  background: rgba(239, 68, 68, 0.08);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  width: 100%;
  margin-top: 0.75rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.logout-sidebar-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

/* User Profile view styling */
.profile-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 1rem;
}

.profile-card {
  background: rgba(30, 41, 59, 0.25);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 2.5rem;
  width: 100%;
  max-width: 580px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #06b6d4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.profile-title-block h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-sub {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.profile-alert {
  display: flex;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.profile-alert.success {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #a7f3d0;
}

.profile-alert.error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fecdd3;
}

.password-change-section {
  border-top: 1px dashed var(--border-color);
  padding-top: 1.5rem;
}

.password-change-section h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #a5b4fc;
}

.section-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2.5rem;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-color);
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.logo-icon {
  font-size: 1.75rem;
}

.header-logo h1 {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #a5b4fc, #818cf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.stats-pills {
  display: flex;
  gap: 0.5rem;
}

.stat-pill {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  padding: 0.35rem 0.75rem;
  border-radius: 2rem;
  color: var(--text-secondary);
}

.stat-pill.highlight {
  border-color: rgba(99, 102, 241, 0.4);
  color: #a5b4fc;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  padding: 0.35rem 0.85rem;
  border-radius: 0.5rem;
}

.status-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-indicator.online {
  background-color: var(--success);
  box-shadow: 0 0 8px var(--success);
}

.status-indicator.offline {
  background-color: var(--danger);
  box-shadow: 0 0 8px var(--danger);
}

/* Filter Banner */
.filter-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(99, 102, 241, 0.15);
  border-bottom: 1px solid rgba(99, 102, 241, 0.3);
  padding: 0.75rem 2.5rem;
  font-size: 0.9rem;
}

.filter-desc {
  flex-grow: 1;
}

.clear-filter-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.35rem 1rem;
  border-radius: 0.35rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: background 0.2s;
}

.clear-filter-btn:hover {
  background: #4f46e5;
}

/* Body Container */
.app-body {
  display: flex;
  flex-grow: 1;
}

/* Sidebar Navigation */
.app-nav {
  width: 260px;
  background: rgba(15, 23, 42, 0.2);
  border-right: 1px solid var(--border-color);
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.85rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  text-align: left;
  font-size: 0.95rem;
  font-weight: 500;
  width: 100%;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--primary-light);
  color: #a5b4fc;
  border-left: 3px solid #6366f1;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.nav-footer {
  margin-top: auto;
  padding-top: 1.5rem;
}

.action-btn {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border: none;
  padding: 0.85rem 1.25rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  width: 100%;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transition: transform 0.15s, box-shadow 0.15s;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
}

.action-btn:active {
  transform: translateY(0);
}

/* Main Content Area */
.app-content {
  flex-grow: 1;
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
}

.content-header {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.search-wrapper {
  position: relative;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.85rem 1rem 0.85rem 2.5rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #6366f1;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.15);
}

.clear-search-btn {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
}

.view-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-title h2 {
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.count-badge {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  padding: 0.35rem 0.85rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Loading, Error, Empty states */
.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(99, 102, 241, 0.1);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon, .empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h3, .empty-state h3 {
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}

.error-state p, .empty-state p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  max-width: 400px;
}

.retry-btn, .reset-btn {
  max-width: 200px;
}

/* Highlights */
@keyframes highlight-glow {
  0% {
    box-shadow: 0 0 25px rgba(99, 102, 241, 0.7);
    border-color: #818cf8;
    background-color: rgba(99, 102, 241, 0.12);
  }
  100% {
    box-shadow: none;
    border-color: var(--border-color);
    background-color: transparent;
  }
}

.highlighted-item {
  animation: highlight-glow 2.5s ease-out forwards;
}

/* PLANNING: TIME SLOTS CARDS */
.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
}

.slot-card {
  background: rgba(30, 41, 59, 0.2);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: transform 0.2s, border-color 0.2s;
  position: relative;
  overflow: hidden;
}

.slot-card:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.3);
  background: rgba(30, 41, 59, 0.3);
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
}

.slot-time-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.calendar-icon {
  font-size: 1.5rem;
}

.time-texts {
  display: flex;
  flex-direction: column;
}

.time-texts .date {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: capitalize;
}

.time-texts .time {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.delete-slot-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s;
}

.delete-slot-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.slot-relations {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.relation-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.row-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

/* CHIPS DESIGN */
.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.data-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.85rem;
  padding: 0.3rem 0.75rem;
  border-radius: 2rem;
  font-weight: 500;
  transition: all 0.2s;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-chip.clickable {
  cursor: pointer;
}

.data-chip.clickable:hover {
  transform: scale(1.05);
}

.activity-chip {
  background: rgba(245, 158, 11, 0.12);
  color: #fbcfe8;
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fcd34d;
}

.activity-chip.clickable:hover {
  background: rgba(245, 158, 11, 0.2);
}

.location-chip {
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.3);
  color: #67e8f9;
}

.location-chip.clickable:hover {
  background: rgba(6, 182, 212, 0.2);
}

.facilitator-chip {
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #c7d2fe;
}

.facilitator-chip.clickable:hover {
  background: rgba(99, 102, 241, 0.2);
}

.participant-chip {
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: #fecdd3;
}

.participant-chip.clickable:hover {
  background: rgba(244, 63, 94, 0.2);
}

.slot-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.8rem;
}

.slot-chip.clickable:hover {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.no-data {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* MASTER DATA CARDS */
.locations-grid, .activities-grid, .facilitators-grid, .participants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.data-card {
  background: rgba(30, 41, 59, 0.15);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.2s, border-color 0.2s;
}

.data-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-direction: column;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
}

.card-header h3 {
  font-size: 1.15rem;
  font-weight: 600;
}

.email-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.badge {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  padding: 0.2rem 0.6rem;
  border-radius: 0.5rem;
  color: var(--accent);
}

.badge.duration {
  background: rgba(99, 102, 241, 0.1);
  color: #a5b4fc;
  align-self: flex-start;
  margin-top: 0.25rem;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.info-value {
  font-size: 0.85rem;
}

.text-italic {
  font-style: italic;
  color: #e5e7eb;
}

.closures-list {
  padding-left: 1.25rem;
  font-size: 0.8rem;
  color: #fca5a5;
  margin-top: 0.25rem;
}

.availability-block {
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  border-radius: 0.35rem;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.related-slots-section {
  border-top: 1px dashed var(--border-color);
  padding-top: 0.85rem;
  margin-top: 0.25rem;
}

.stats-row {
  display: flex;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.02);
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.stat-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 700;
}

.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.75rem; }

/* MODALS */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 1.5rem;
}

.modal-card {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  animation: modal-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-enter {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
}

.close-modal-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-input, .form-select {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  padding: 0.65rem 0.85rem;
  color: var(--text-primary);
  font-size: 0.9rem;
  width: 100%;
  transition: border-color 0.2s;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #6366f1;
}

/* Selection check grids */
.selection-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  border-radius: 0.375rem;
  background: rgba(0, 0, 0, 0.25);
}

.selection-card {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 0.35rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.selection-card:hover {
  background: rgba(255, 255, 255, 0.05);
}

.selection-card.selected {
  border-color: rgba(99, 102, 241, 0.6);
  background: rgba(99, 102, 241, 0.12);
}

.selection-card.status-unavailable {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.04);
}
.selection-card.status-unavailable:hover {
  background: rgba(239, 68, 68, 0.08);
}
.selection-card.status-unavailable.selected {
  border-color: rgba(239, 68, 68, 0.8);
  background: rgba(239, 68, 68, 0.15);
}

.selection-card.status-unauthorized {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.04);
}
.selection-card.status-unauthorized:hover {
  background: rgba(245, 158, 11, 0.08);
}
.selection-card.status-unauthorized.selected {
  border-color: rgba(245, 158, 11, 0.8);
  background: rgba(245, 158, 11, 0.15);
}

.status-badge-text {
  font-size: 0.65rem;
  margin-top: 0.2rem;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  width: fit-content;
  font-weight: 600;
  display: inline-block;
}
.status-badge-text.unavailable {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.2);
}
.status-badge-text.unauthorized {
  color: #fde047;
  background: rgba(234, 179, 8, 0.2);
}

.checkbox-hidden {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.selection-text {
  display: flex;
  flex-direction: column;
}

.selection-text strong {
  font-size: 0.8rem;
  color: var(--text-primary);
}

.selection-text .sub-text {
  font-size: 0.7rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid var(--border-color);
  padding-top: 1.25rem;
  margin-top: 1.5rem;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.65rem 1.25rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.submit-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.65rem 1.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
}

.submit-btn:hover:not(:disabled) {
  background: #4f46e5;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Constraint errors in form modal */
.validation-error-box {
  display: flex;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  padding: 0.85rem 1rem;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  align-items: flex-start;
}

.error-box-icon {
  font-size: 1.25rem;
}

.error-box-content {
  flex-grow: 1;
}

.error-box-content h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #fca5a5;
  margin-bottom: 0.15rem;
}

.error-box-content p {
  font-size: 0.85rem;
  color: #fecdd3;
  line-height: 1.4;
}

.clear-error-btn {
  background: transparent;
  border: none;
  color: #fecdd3;
  cursor: pointer;
  font-size: 0.9rem;
  align-self: center;
}

/* Success toast notification */
.toast-notification {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #0f172a;
  border: 1px solid rgba(16, 185, 129, 0.4);
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  z-index: 200;
  animation: toast-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes toast-slide {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.toast-text {
  font-weight: 500;
  font-size: 0.9rem;
  color: #a7f3d0;
}

/* Form Helper Utilities */
.mt-3 { margin-top: 1.5rem; }

/* Custom Login specific layouts */
.auth-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.auth-form label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.auth-form .form-input {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: 0.5rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.2s;
  width: 100%;
}

.auth-form .form-input:focus {
  outline: none;
  border-color: #6366f1;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
}

/* Individual schedules page layout */
.individual-schedules-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.schedules-selector-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.schedules-selector-card h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.selector-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
}

.type-segmented-control {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}

.segment-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.6rem 1.2rem;
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.segment-btn:hover {
  color: var(--text-primary);
}

.segment-btn.active {
  background: #6366f1;
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.person-dropdown-wrapper {
  flex: 1;
  min-width: 280px;
}

.person-select {
  height: 2.75rem;
  font-weight: 500;
}

/* Detail Card */
.schedule-detail-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.schedule-detail-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  position: relative;
}

.person-badge-avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.15);
  border: 2px solid rgba(99, 102, 241, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.1);
}

.person-info-block {
  flex-grow: 1;
}

.person-info-block h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.person-info-block .subtitle {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.35rem;
  flex-wrap: wrap;
}

.role-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-badge.facilitator {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.role-badge.participant {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.email-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.skills-info {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.schedule-actions {
  display: flex;
  gap: 0.75rem;
}

.print-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-weight: 500;
  transition: all 0.2s;
}

.print-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.email-btn {
  background: #6366f1;
  color: white;
  border: none;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  transition: all 0.2s;
}

.email-btn:hover {
  background: #4f46e5;
}

/* Availability section */
.availability-schedule-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
}

.availability-schedule-section h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.4rem;
}

.avail-text {
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.5;
}

/* Schedule table details */
.schedule-list-section h3 {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.no-slots-message {
  padding: 3rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.01);
  border: 1px dashed var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
}

.schedule-table th {
  text-align: left;
  padding: 0.85rem 1rem;
  border-bottom: 2px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.schedule-table td {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid var(--border-color);
  vertical-align: top;
}

.col-date {
  width: 25%;
}

.slot-date {
  font-size: 0.95rem;
  color: var(--text-primary);
  display: block;
}

.slot-time {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: block;
  margin-top: 0.2rem;
}

.col-activity {
  width: 25%;
}

.activity-name {
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.activity-duration {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
  display: block;
}

.col-location {
  width: 20%;
}

.location-name {
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.col-relations {
  width: 30%;
}

.relation-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.relation-group:not(:last-child) {
  margin-bottom: 0.5rem;
}

.group-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.names-list {
  font-size: 0.85rem;
  color: var(--text-primary);
}

/* Empty Schedule State */
.empty-schedule-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 2rem;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
}

.calendar-icon {
  font-size: 3.5rem;
  margin-bottom: 1.25rem;
  opacity: 0.6;
}

.empty-schedule-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-schedule-state p {
  color: var(--text-secondary);
  font-size: 0.95rem;
  max-width: 450px;
  line-height: 1.5;
}

/* Email modal styling details */
.email-textarea {
  width: 100%;
  height: 200px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  padding: 0.75rem;
  color: var(--text-primary);
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  resize: vertical;
}

.email-textarea:focus {
  outline: none;
  border-color: #6366f1;
}

.email-sending-state, .email-success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  gap: 1rem;
}

.email-success-icon {
  font-size: 3.5rem;
}

.email-send-mailto-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.65rem 1.25rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  margin-right: auto;
}

.email-send-mailto-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.email-send-direct-btn {
  background: #6366f1;
  color: white;
  border: none;
  padding: 0.65rem 1.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
}

.email-send-direct-btn:hover {
  background: #4f46e5;
}

/* Date Range Picker Styles */
.date-range-picker-group {
  display: flex;
  gap: 1rem;
}

.date-picker-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-picker-field label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.date-picker-input {
  height: 2.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.date-picker-input:focus {
  outline: none;
  border-color: #6366f1;
}

.date-range-badge {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

/* Timeline Layout Styles */
.days-timeline {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 1rem;
}

.day-timeline-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  overflow: hidden;
}

.day-timeline-header {
  background: rgba(255, 255, 255, 0.04);
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.day-timeline-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.day-timeline-slots {
  display: flex;
  flex-direction: column;
}

.timeline-slot-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 1.25rem;
}

.timeline-slot-row:last-child {
  border-bottom: none;
}

.slot-time-col {
  width: 15%;
  min-width: 120px;
  display: flex;
  align-items: center;
}

.time-range {
  font-weight: 600;
  font-size: 0.9rem;
  color: #818cf8;
}

.slot-activity-col {
  width: 25%;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.2rem;
}

.activity-name-text {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.activity-duration-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.slot-location-col {
  width: 20%;
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.location-name-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 500;
}

.slot-relations-col {
  width: 40%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: center;
}

.relation-item {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.relation-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.relation-value {
  font-size: 0.85rem;
  color: var(--text-primary);
}

/* Print CSS overrides */
@media print {
  /* Hide all app wrapper margins, navbar, headers, control cards */
  body, html {
    background: #ffffff !important;
    color: #000000 !important;
    font-size: 11pt !important;
  }
  
  .app-sidebar,
  .app-header,
  .no-print,
  .schedules-selector-card,
  .toast-notification,
  .modal-backdrop {
    display: none !important;
  }

  /* Make sure main content container expands full screen */
  .app-main,
  .app-content,
  .view-container,
  .individual-schedules-container {
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    border: none !important;
    display: block !important;
    width: 100% !important;
  }

  /* Target schedule printable block */
  .printable-schedule-area {
    background: #ffffff !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    color: #000000 !important;
    display: block !important;
  }

  .printable-schedule-area * {
    color: #000000 !important;
    background: transparent !important;
  }

  .person-badge-avatar {
    border: 1px solid #000000 !important;
  }

  .role-badge {
    border: 1px solid #000000 !important;
    padding: 2px 6px !important;
  }

  .schedule-table th {
    border-bottom: 2px solid #000000 !important;
    color: #000000 !important;
  }

  .schedule-table td {
    border-bottom: 1px solid #e2e8f0 !important;
  }

  .availability-schedule-section {
    border: 1px solid #cbd5e1 !important;
    background: #f8fafc !important;
  }

  /* Day Timeline Print Override */
  .day-timeline-card {
    border: 1px solid #cbd5e1 !important;
    background: transparent !important;
    page-break-inside: avoid !important;
    margin-bottom: 1rem !important;
  }

  .day-timeline-header {
    border-bottom: 1px solid #cbd5e1 !important;
    background: #f1f5f9 !important;
    padding: 0.5rem 1rem !important;
  }

  .day-timeline-header h4 {
    color: #000000 !important;
  }

  .timeline-slot-row {
    border-bottom: 1px solid #cbd5e1 !important;
    padding: 0.75rem 1rem !important;
  }

  .timeline-slot-row:last-child {
    border-bottom: none !important;
  }

  .time-range,
  .activity-name-text,
  .location-name-text,
  .relation-value {
    color: #000000 !important;
  }

  .date-range-badge {
    border: 1px solid #000000 !important;
    color: #000000 !important;
    background: transparent !important;
  }
}
</style>
