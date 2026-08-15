<template>
  <div class="room-sessions-root printable-room-sessions">
    <!-- ════════════════ TOP HEADER CONTROLS (NO PRINT) ════════════════ -->
    <div class="view-header no-print">
      <div class="header-main">
        <div class="header-title-wrapper">
          <div class="header-icon-box">🚪</div>
          <div>
            <div class="title-with-pill">
              <h2>Gestion des Ouvertures de Salles</h2>
              <span class="mode-tag-pill">Admin</span>
            </div>
            <p class="subtitle">Pilotez les ouvertures, les gestionnaires référents et l'affectation des bénéficiaires.</p>
          </div>
        </div>

        <!-- VIEW SWITCHER BUTTONS -->
        <div class="view-switcher-pill">
          <button 
            type="button"
            class="view-pill-btn" 
            :class="{ active: viewMode === 'day' }" 
            @click="setViewMode('day')"
          >
            📆 Jour
          </button>
          <button 
            type="button"
            class="view-pill-btn" 
            :class="{ active: viewMode === 'week' }" 
            @click="setViewMode('week')"
          >
            📅 Semaine
          </button>
          <button 
            type="button"
            class="view-pill-btn" 
            :class="{ active: viewMode === 'month' }" 
            @click="setViewMode('month')"
          >
            🗓️ Mois
          </button>
        </div>
      </div>

      <!-- NAVIGATION & TOOLBAR ROW -->
      <div class="header-toolbar-row">
        <!-- Date Navigation Controls -->
        <div class="date-nav-group">
          <button type="button" class="nav-arrow-btn" @click="navigateDate(-1)" title="Période précédente">◄</button>
          <button type="button" class="today-btn" @click="goToToday" title="Revenir à aujourd'hui">Aujourd'hui</button>
          <button type="button" class="nav-arrow-btn" @click="navigateDate(1)" title="Période suivante">►</button>
          
          <div class="period-title-block">
            <span class="current-period-title">{{ periodTitle }}</span>
            <span v-if="viewMode === 'week'" class="period-subtitle">{{ weekDaysRangeLabel }}</span>
          </div>

          <!-- Date Picker input to jump anywhere -->
          <div class="direct-date-input-wrapper">
            <input 
              type="date" 
              :value="currentDateStr" 
              @change="onDirectDateChange" 
              class="direct-date-input" 
              title="Sélectionner une date précise"
            />
          </div>
        </div>

        <!-- ACTION TOOLS (Édition & Remplissage) -->
        <div class="action-tools-group">
          <button type="button" class="action-btn primary-btn" @click="openCreateModal()" title="Ouvrir une salle">
            ➕ Ouvrir une Salle
          </button>

          <button type="button" class="tool-btn template-btn" @click="openTemplateModal" title="Remplir automatiquement selon une semaine type">
            ⚡ Semaine Type
          </button>

          <button type="button" class="tool-btn duplicate-btn" @click="openDuplicateModal" title="Dupliquer les ouvertures vers d'autres dates">
            📋 Dupliquer
          </button>

          <button type="button" class="tool-btn assign-btn" @click="openBulkAssignModal" title="Affectation rapide des bénéficiaires">
            👥 Affectation
          </button>

          <button type="button" class="tool-btn print-btn" @click="printPage" title="Imprimer les fiches d'ouverture et d'émargement">
            🖨️ Imprimer
          </button>

          <button 
            type="button" 
            class="tool-btn danger-tool-btn" 
            @click="confirmClearCurrentPeriod" 
            :disabled="currentPeriodSessionsCount === 0"
            title="Fermer toutes les salles de la période affichée"
          >
            🧹 Fermer tout
          </button>
        </div>
      </div>

      <!-- SUMMARY METRICS BAR -->
      <div class="metrics-bar" v-if="!roomSessionStore.loading">
        <div class="metric-card">
          <span class="metric-icon">🚪</span>
          <div class="metric-info">
            <span class="metric-label">Salles ouvertes</span>
            <strong class="metric-value">{{ metrics.openRoomsCount }} <small>/ {{ locations.length }}</small></strong>
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-icon">👨‍💼</span>
          <div class="metric-info">
            <span class="metric-label">Gestionnaires</span>
            <strong class="metric-value" :class="{ 'warning-text': metrics.unassignedManagersCount > 0 }">
              {{ metrics.assignedManagersCount }}
              <span v-if="metrics.unassignedManagersCount > 0" class="metric-warn-badge">⚠️ {{ metrics.unassignedManagersCount }} sans réf.</span>
            </strong>
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-icon">👥</span>
          <div class="metric-info">
            <span class="metric-label">Bénéficiaires affectés</span>
            <strong class="metric-value">{{ metrics.totalParticipants }}</strong>
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-icon">📊</span>
          <div class="metric-info">
            <span class="metric-label">Taux d'occupation global</span>
            <div class="metric-progress-wrapper">
              <strong class="metric-value">{{ metrics.occupancyRate }}%</strong>
              <div class="mini-progress-bar">
                <div 
                  class="mini-progress-fill" 
                  :style="{ width: Math.min(metrics.occupancyRate, 100) + '%' }"
                  :class="getRateClass(metrics.occupancyRate)"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ PRINT ONLY HEADER ════════════════ -->
    <div class="print-only-header">
      <div class="print-brand-badge">EHPAD LES ÉCRIVAINS — ACCUEIL DE JOUR • GUÉRANDE</div>
      <h2>📋 FICHE D'OUVERTURE DE SALLES & ÉMARGEMENT</h2>
      <p>Période : <strong>{{ periodTitle }}</strong> | Imprimé le {{ new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
    </div>

    <!-- ════════════════ MAIN CONTENT STATES ════════════════ -->
    <!-- Loading State -->
    <div v-if="roomSessionStore.loading" class="state-container">
      <div class="spinner"></div>
      <p>Chargement des sessions de salle...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="roomSessionStore.error" class="state-container error">
      <span class="error-icon">⚠️</span>
      <p>{{ roomSessionStore.error }}</p>
      <button class="action-btn secondary-btn mt-2" @click="loadDataForCurrentView">Réessayer</button>
    </div>

    <!-- ════════════════ VIEW CONTAINER ════════════════ -->
    <div v-else class="view-content-wrapper">

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- 1. VUE JOUR (DAY VIEW)                              -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div v-if="viewMode === 'day'" class="day-view-container">
        <!-- Room Filter & Search bar for Day view -->
        <div class="day-filter-bar no-print">
          <div class="search-input-box">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              v-model="dayFilterSearch" 
              placeholder="Filtrer par salle, gestionnaire ou bénéficiaire..." 
              class="search-input"
            />
            <button v-if="dayFilterSearch" @click="dayFilterSearch = ''" class="clear-search-btn">✕</button>
          </div>

          <div class="filter-pills-row">
            <button 
              type="button"
              class="filter-pill-btn" 
              :class="{ active: dayFilterStatus === 'all' }" 
              @click="dayFilterStatus = 'all'"
            >
              Toutes ({{ currentDaySessions.length }})
            </button>
            <button 
              type="button"
              class="filter-pill-btn pill-conflict" 
              :class="{ active: dayFilterStatus === 'conflict' }" 
              @click="dayFilterStatus = 'conflict'"
              title="Salles avec référent ou bénéficiaires indisponibles ou surcapacité"
            >
              ⚠️ Conflits / Indispos ({{ currentDayConflictSessionsCount }})
            </button>
            <button 
              type="button"
              class="filter-pill-btn pill-incomplete" 
              :class="{ active: dayFilterStatus === 'incomplete' }" 
              @click="dayFilterStatus = 'incomplete'"
              title="Salles avec des places libres restantes"
            >
              🟡 Incomplètes ({{ currentDayIncompleteSessionsCount }})
            </button>
            <button 
              type="button"
              class="filter-pill-btn pill-full" 
              :class="{ active: dayFilterStatus === 'full' }" 
              @click="dayFilterStatus = 'full'"
              title="Salles ayant atteint leur capacité maximale"
            >
              🔴 Complètes ({{ currentDayFullSessionsCount }})
            </button>
            <button 
              type="button"
              class="filter-pill-btn" 
              :class="{ active: dayFilterStatus === 'no-manager' }" 
              @click="dayFilterStatus = 'no-manager'"
            >
              👨‍💼 Sans Référent ({{ currentDayNoManagerSessionsCount }})
            </button>
          </div>
        </div>

        <!-- Empty Day State -->
        <div v-if="filteredDaySessions.length === 0" class="empty-state">
          <div class="empty-illustration">🏢</div>
          <h3>Aucune salle ouverte pour le {{ formatFullDate(currentDate) }}</h3>
          <p>Désignez des gestionnaires référents et affectez les bénéficiaires pour cette journée.</p>
          <div class="empty-actions-row">
            <button class="action-btn primary-btn" @click="openCreateModal()">
              ➕ Ouvrir une Salle
            </button>
            <button class="action-btn secondary-btn" @click="openTemplateModal">
              ⚡ Appliquer la Semaine Type
            </button>
            <button class="action-btn secondary-btn" @click="quickCopyPreviousDay">
              📋 Copier la veille
            </button>
          </div>
        </div>

        <!-- Room Cards Grid -->
        <div v-else class="day-sessions-grid">
          <div 
            v-for="session in filteredDaySessions" 
            :key="session.documentId || session.id" 
            class="session-card"
            :class="{ 
              'card-overbooked': isOverCapacity(session),
              'card-has-conflict': getSessionConflictInfo(session).hasConflict 
            }"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="room-title-block">
                <span class="room-icon-badge">📍</span>
                <div>
                  <h3 class="room-name">{{ getRoomName(session) }}</h3>
                  <span class="room-type-sub" v-if="getLocation(session)?.description">
                    {{ getLocation(session)?.description }}
                  </span>
                </div>
              </div>

              <div class="capacity-badge-wrapper">
                <span v-if="getSessionConflictInfo(session).hasConflict" class="card-status-badge badge-conflict" title="Conflit de disponibilité ou surcapacité">
                  ⚠️ Conflit ({{ getSessionConflictInfo(session).conflictSummary }})
                </span>
                <span v-else-if="getParticipantCount(session) < getRoomCapacity(session)" class="card-status-badge badge-incomplete" title="Salle incomplète">
                  🟡 Incomplète ({{ getRoomCapacity(session) - getParticipantCount(session) }} libre{{ getRoomCapacity(session) - getParticipantCount(session) > 1 ? 's' : '' }})
                </span>
                <span v-else class="card-status-badge badge-full" title="Salle complète">
                  ✅ Complète
                </span>
                <span class="capacity-badge" :class="getCapacityClass(session)">
                  👥 {{ getParticipantCount(session) }} / {{ getRoomCapacity(session) }}
                </span>
              </div>
            </div>

            <!-- Card Body -->
            <div class="card-body">
              <!-- Conflict Alert Banner on card -->
              <div v-if="getSessionConflictInfo(session).hasConflict" class="card-conflict-alert-box no-print">
                <div v-if="getSessionConflictInfo(session).unavailableManager" class="card-conflict-row">
                  <span class="conflict-alert-icon">⚠️</span>
                  <span>
                    Référent indisponible : <strong>{{ getSessionConflictInfo(session).unavailableManager.name }}</strong>
                    <em class="conflict-reason">({{ getSessionConflictInfo(session).unavailableManager.reason }})</em>
                  </span>
                </div>
                <div v-if="getSessionConflictInfo(session).unavailableParticipants.length > 0" class="card-conflict-row">
                  <span class="conflict-alert-icon">⚠️</span>
                  <span>
                    <strong>{{ getSessionConflictInfo(session).unavailableParticipants.length }}</strong> bénéficiaire(s) indisponible(s) :
                    <span v-for="(up, i) in getSessionConflictInfo(session).unavailableParticipants" :key="up.id" class="unavail-person-inline">
                      <strong>{{ up.name }}</strong> <em>({{ up.reason }})</em>{{ i < getSessionConflictInfo(session).unavailableParticipants.length - 1 ? ', ' : '' }}
                    </span>
                  </span>
                </div>
                <div v-if="getSessionConflictInfo(session).isOverBooked" class="card-conflict-row">
                  <span class="conflict-alert-icon">🔴</span>
                  <span>Capacité maximale dépassée ({{ getParticipantCount(session) }} / {{ getRoomCapacity(session) }} places)</span>
                </div>
              </div>

              <!-- Manager Info Banner -->
              <div 
                class="manager-banner" 
                :class="{ 
                  'manager-unassigned': !session.manager,
                  'manager-banner-unavail': getSessionConflictInfo(session).unavailableManager 
                }"
              >
                <div class="manager-avatar-badge">{{ getSessionConflictInfo(session).unavailableManager ? '🔴' : '👨‍💼' }}</div>
                <div class="manager-info-text">
                  <span class="manager-role-label">Professionnel Référent :</span>
                  <strong class="manager-name-text" :class="{ 'name-unavail': getSessionConflictInfo(session).unavailableManager }">
                    {{ getManagerName(session) }}
                  </strong>
                  <span v-if="getSessionConflictInfo(session).unavailableManager" class="manager-unavail-tag">
                    ⚠️ Indisponible ({{ getSessionConflictInfo(session).unavailableManager.reason }})
                  </span>
                  <span class="manager-skills-tag" v-else-if="session.manager?.skills">
                    {{ session.manager.skills }}
                  </span>
                </div>
                <button 
                  type="button" 
                  class="quick-swap-mgr-btn no-print" 
                  @click="editSession(session)" 
                  title="Changer de gestionnaire"
                >
                  🔄
                </button>
              </div>

              <!-- Capacity Progress Bar -->
              <div class="progress-section">
                <div class="progress-info-row">
                  <span class="progress-label">Remplissage</span>
                  <span class="progress-percent" :class="getCapacityClass(session)">
                    {{ getCapacityPercentage(session) }}%
                  </span>
                </div>
                <div class="progress-container">
                  <div 
                    class="progress-bar" 
                    :style="{ width: Math.min(getCapacityPercentage(session), 100) + '%' }" 
                    :class="getCapacityClass(session)"
                  ></div>
                </div>
                <div v-if="isOverCapacity(session)" class="overcapacity-alert-inline">
                  ⚠️ Capacité maximale de {{ getRoomCapacity(session) }} personnes dépassée (+{{ getParticipantCount(session) - getRoomCapacity(session) }}).
                </div>
              </div>

              <!-- Beneficiaries / Participants Section -->
              <!-- Beneficiaries / Participants Section -->
              <div class="participants-section">
                <div class="section-title-row">
                  <h4>Bénéficiaires Affectés ({{ getParticipantCount(session) }})</h4>
                  <div class="inline-actions no-print">
                    <button 
                      type="button" 
                      class="mini-link-btn highlight-link" 
                      @click="openInlineAddParticipant(session)"
                      v-if="activeInlineAddSessionId !== (session.documentId || session.id)"
                      title="Ajouter plusieurs bénéficiaires en simultané"
                    >
                      ➕ Ajouter des bénéficiaires
                    </button>
                  </div>
                </div>

                <!-- MULTI-CHECKBOX QUICK ADD PANEL -->
                <div v-if="activeInlineAddSessionId === (session.documentId || session.id)" class="inline-multi-add-panel no-print">
                  <div class="inline-panel-header">
                    <div class="panel-header-title">
                      <span class="panel-icon">👥</span>
                      <strong>Ajouter des bénéficiaires</strong>
                      <span class="panel-subtitle">(Cochez plusieurs personnes en simultané)</span>
                    </div>
                    <button type="button" class="close-panel-btn" @click="activeInlineAddSessionId = null" title="Fermer">✕</button>
                  </div>

                  <!-- Filter tabs & Quick Tools -->
                  <div class="inline-panel-toolbar">
                    <div class="filter-tabs mini-tabs">
                      <button 
                        type="button" 
                        class="filter-tab-btn" 
                        :class="{ active: inlineParticipantFilterTab === 'all' }" 
                        @click="inlineParticipantFilterTab = 'all'"
                      >
                        Tous <span class="tab-badge">{{ getInlineAvailabilityCounts(session).total }}</span>
                      </button>
                      <button 
                        type="button" 
                        class="filter-tab-btn tab-avail" 
                        :class="{ active: inlineParticipantFilterTab === 'available' }" 
                        @click="inlineParticipantFilterTab = 'available'"
                      >
                        ✅ Dispos <span class="tab-badge">{{ getInlineAvailabilityCounts(session).available }}</span>
                      </button>
                      <button 
                        type="button" 
                        class="filter-tab-btn tab-unavail" 
                        :class="{ active: inlineParticipantFilterTab === 'unavailable' }" 
                        @click="inlineParticipantFilterTab = 'unavailable'"
                      >
                        ❌ Indispos <span class="tab-badge">{{ getInlineAvailabilityCounts(session).unavailable }}</span>
                      </button>
                    </div>

                    <div class="inline-quick-tools">
                      <button type="button" class="mini-tool-btn highlight-btn" @click="selectAvailableInlineParticipants(session)">
                        ✅ Cocher dispos
                      </button>
                      <button type="button" class="mini-tool-btn" @click="selectAllInlineParticipants(session)">
                        Tout cocher
                      </button>
                      <button type="button" class="mini-tool-btn" @click="clearAllInlineParticipants">
                        Désélectionner
                      </button>
                    </div>
                  </div>

                  <!-- Search input -->
                  <div class="inline-search-box">
                    <input 
                      type="text" 
                      v-model="inlineParticipantSearch" 
                      placeholder="Rechercher par nom ou prénom..." 
                      class="form-input mini-search"
                    />
                  </div>

                  <!-- Checkbox list of unassigned participants -->
                  <div class="inline-checkbox-scroll-list">
                    <div v-if="getInlineFilteredParticipants(session).length === 0" class="no-participants-filtered mini">
                      Aucun bénéficiaire correspondant aux filtres.
                    </div>
                    <label 
                      v-for="p in getInlineFilteredParticipants(session)" 
                      :key="p.documentId || p.id" 
                      class="checkbox-item"
                      :class="{ 
                        'is-checked': inlineSelectedParticipants.includes(p.documentId || p.id),
                        'is-unavailable': !p.isAvailable
                      }"
                    >
                      <input 
                        type="checkbox" 
                        :value="p.documentId || p.id" 
                        v-model="inlineSelectedParticipants" 
                      />
                      <span class="checkbox-user-avatar" :class="{ 'avatar-unavail': !p.isAvailable }">
                        {{ !p.isAvailable ? '🔴' : '👤' }}
                      </span>
                      <div class="checkbox-user-info">
                        <span class="checkbox-user-name" :class="{ 'name-unavail': !p.isAvailable }">
                          {{ p.firstName }} {{ p.lastName }}
                        </span>
                        <span v-if="!p.isAvailable" class="unavail-reason-badge">
                          ❌ Indisponible ({{ p.unavailabilityReason }})
                        </span>
                      </div>
                      <span v-if="p.isAvailable" class="avail-indicator-badge">
                        ✓ Dispo
                      </span>
                    </label>
                  </div>

                  <!-- Footer actions of multi-select panel -->
                  <div class="inline-panel-footer">
                    <span class="selected-count-pill" v-if="inlineSelectedParticipants.length > 0">
                      {{ inlineSelectedParticipants.length }} sélectionné(s)
                    </span>
                    <span v-else class="help-text">Cochez les résidents à ajouter</span>
                    <div class="panel-action-buttons">
                      <button type="button" class="secondary-btn mini-btn" @click="activeInlineAddSessionId = null">
                        Annuler
                      </button>
                      <button 
                        type="button" 
                        class="action-btn primary-btn mini-btn"
                        :disabled="inlineSelectedParticipants.length === 0"
                        @click="addSelectedParticipantsToSession(session)"
                      >
                        ➕ Valider l'ajout ({{ inlineSelectedParticipants.length }})
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Participants Pills -->
                <div v-if="getParticipants(session).length === 0" class="no-participants-box">
                  <span>Aucun bénéficiaire affecté à cette salle.</span>
                </div>
                <div v-else class="participants-pills-list">
                  <span 
                    v-for="p in getParticipants(session)" 
                    :key="p.documentId || p.id" 
                    class="participant-pill"
                    :class="{ 'pill-unavailable': isParticipantUnavailableInSession(p, session) }"
                    :title="getParticipantUnavailabilityTitle(p, session)"
                  >
                    <span class="pill-avatar">{{ isParticipantUnavailableInSession(p, session) ? '🔴' : '👤' }}</span>
                    <span class="pill-name" :class="{ 'name-unavail': isParticipantUnavailableInSession(p, session) }">
                      {{ p.firstName }} {{ p.lastName }}
                    </span>
                    <span v-if="isParticipantUnavailableInSession(p, session)" class="pill-unavail-tag">
                      ⚠️ Indispo
                    </span>
                    <button 
                      type="button" 
                      class="remove-pill-btn no-print" 
                      @click="removeParticipantFromSession(session, p.documentId || p.id)"
                      title="Retirer ce bénéficiaire"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              </div>

              <!-- Scheduled Activities in this room for the day -->
              <div class="scheduled-activities-section" v-if="getScheduledSlotsForRoom(session).length > 0">
                <div class="section-title-row">
                  <h4>🎯 Activités programmées aujourd'hui ({{ getScheduledSlotsForRoom(session).length }})</h4>
                </div>
                <div class="activities-mini-list">
                  <div 
                    v-for="slot in getScheduledSlotsForRoom(session)" 
                    :key="slot.documentId || slot.id"
                    class="activity-mini-item"
                  >
                    <span class="activity-time-badge">{{ formatTimeRange(slot.startDate, slot.endDate) }}</span>
                    <span class="activity-name-badge">{{ slot.activityTemplate?.name || 'Activité' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Footer -->
            <div class="card-footer no-print">
              <button type="button" class="icon-btn edit-btn" @click="editSession(session)" title="Modifier les détails">
                ✏️ Modifier
              </button>
              <button type="button" class="icon-btn duplicate-btn" @click="openSingleDuplicate(session)" title="Dupliquer cette ouverture">
                📋 Dupliquer
              </button>
              <button type="button" class="icon-btn print-single-btn" @click="printSingleRoomSheet(session)" title="Imprimer la fiche de cette salle">
                🖨️ Fiche
              </button>
              <button type="button" class="icon-btn delete-btn" @click="confirmDelete(session)" title="Fermer cette salle pour la journée">
                🗑️ Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- 2. VUE SEMAINE (WEEK VIEW MATRIX)                   -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div v-else-if="viewMode === 'week'" class="week-view-container">
        <!-- Week Controls & Quick Batch helper -->
        <div class="week-toolbar-actions no-print">
          <div class="week-summary-pill">
            <span>📅 {{ weekDaysList.length }} jours</span>
            <span>🚪 {{ currentPeriodSessionsCount }} ouvertures de salle</span>
            <span>👥 {{ metrics.totalParticipants }} affectations</span>
          </div>

          <div class="week-quick-actions">
            <button type="button" class="secondary-btn mini-btn" @click="openWeeklyBatchOpen">
              ⚡ Ouvrir toutes les salles Lun-Ven
            </button>
            <button type="button" class="secondary-btn mini-btn" @click="duplicateWeekDayToOthers">
              📋 Dupliquer le Lundi sur la semaine
            </button>
          </div>
        </div>

        <!-- Week Matrix Table (Rooms x Days) -->
        <div class="week-matrix-wrapper">
          <table class="week-matrix-table">
            <thead>
              <tr>
                <th class="matrix-room-col-header">
                  <span>🏢 Salle / Lieu</span>
                </th>
                <th 
                  v-for="day in weekDaysList" 
                  :key="day.dateKey" 
                  class="matrix-day-header"
                  :class="{ 'is-today': day.isToday }"
                  @click="goToDayView(day.date)"
                >
                  <div class="matrix-header-content">
                    <span class="matrix-day-name">{{ day.dayName }}</span>
                    <span class="matrix-day-number">{{ day.dayNumber }} {{ day.monthShort }}</span>
                    <span class="matrix-day-count-badge">
                      {{ getSessionsForDate(day.dateKey).length }} salle(s)
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="loc in locations" :key="loc.documentId || loc.id" class="matrix-room-row">
                <!-- Room Column Info -->
                <td class="matrix-room-cell">
                  <div class="matrix-room-info">
                    <span class="matrix-room-icon">📍</span>
                    <div>
                      <strong class="matrix-room-title">{{ loc.name }}</strong>
                      <span class="matrix-room-cap">Capacité : {{ loc.capacity }}</span>
                    </div>
                  </div>
                </td>

                <!-- Day Cells -->
                <td 
                  v-for="day in weekDaysList" 
                  :key="day.dateKey" 
                  class="matrix-slot-cell"
                  :class="{ 'cell-has-session': !!getSessionForRoomAndDate(loc, day.dateKey) }"
                >
                  <!-- If Open Session Exists -->
                  <div 
                    v-if="getSessionForRoomAndDate(loc, day.dateKey)" 
                    class="matrix-session-pill"
                    :class="[
                      getCapacityClass(getSessionForRoomAndDate(loc, day.dateKey)),
                      { 'matrix-pill-conflict': getSessionConflictInfo(getSessionForRoomAndDate(loc, day.dateKey)).hasConflict }
                    ]"
                    @click="editSession(getSessionForRoomAndDate(loc, day.dateKey))"
                    :title="'Cliquez pour modifier la session de ' + loc.name + (getSessionConflictInfo(getSessionForRoomAndDate(loc, day.dateKey)).hasConflict ? ' (⚠️ Conflit)' : '')"
                  >
                    <div class="matrix-pill-header">
                      <span class="matrix-pill-manager" :class="{ 'name-unavail': getSessionConflictInfo(getSessionForRoomAndDate(loc, day.dateKey)).unavailableManager }">
                        {{ getSessionConflictInfo(getSessionForRoomAndDate(loc, day.dateKey)).unavailableManager ? '🔴' : '👨‍💼' }} {{ getManagerName(getSessionForRoomAndDate(loc, day.dateKey)) }}
                      </span>
                      <span class="matrix-pill-capacity">
                        👥 {{ getParticipantCount(getSessionForRoomAndDate(loc, day.dateKey)) }}/{{ loc.capacity }}
                      </span>
                    </div>

                    <div v-if="getSessionConflictInfo(getSessionForRoomAndDate(loc, day.dateKey)).hasConflict" class="matrix-conflict-sub-tag">
                      ⚠️ Conflit détecté
                    </div>

                    <div class="matrix-pill-progress">
                      <div 
                        class="matrix-pill-progress-fill" 
                        :style="{ width: Math.min(getCapacityPercentage(getSessionForRoomAndDate(loc, day.dateKey)), 100) + '%' }"
                      ></div>
                    </div>

                    <div class="matrix-pill-hover-actions no-print" @click.stop>
                      <button 
                        type="button" 
                        class="matrix-action-btn edit" 
                        @click="editSession(getSessionForRoomAndDate(loc, day.dateKey))"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button 
                        type="button" 
                        class="matrix-action-btn delete" 
                        @click="confirmDelete(getSessionForRoomAndDate(loc, day.dateKey))"
                        title="Fermer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <!-- If Room is Closed on this day -->
                  <div 
                    v-else 
                    class="matrix-closed-cell"
                    @click="openRoomForDay(loc, day.dateKey)"
                    title="Cliquez pour ouvrir cette salle ce jour-là"
                  >
                    <span class="closed-label">Fermée</span>
                    <button type="button" class="quick-open-btn no-print">
                      ➕ Ouvrir
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- 3. VUE MOIS (MONTH CALENDAR VIEW)                   -->
      <!-- ═══════════════════════════════════════════════════ -->
      <div v-else-if="viewMode === 'month'" class="month-view-container">
        <!-- Month Days Grid Header -->
        <div class="month-grid-header">
          <div v-for="dayName in ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']" :key="dayName" class="month-header-cell">
            {{ dayName }}
          </div>
        </div>

        <!-- Month Days Grid Body -->
        <div class="month-grid-body">
          <div 
            v-for="cell in monthDaysGrid" 
            :key="cell.dateKey" 
            class="month-cell"
            :class="{ 
              'other-month': !cell.isCurrentMonth, 
              'is-today': cell.isToday,
              'has-sessions': cell.sessions.length > 0 
            }"
            @click="goToDayView(cell.date)"
          >
            <!-- Cell Day Number Row -->
            <div class="month-cell-header">
              <span class="cell-day-num" :class="{ 'today-pulse': cell.isToday }">{{ cell.dayNumber }}</span>
              <span v-if="cell.sessions.length > 0" class="month-sessions-count-badge">
                🚪 {{ cell.sessions.length }}
              </span>
            </div>

            <!-- Cell Body (Room Sessions Summary) -->
            <div class="month-cell-sessions-list">
              <div 
                v-for="s in cell.sessions.slice(0, 3)" 
                :key="s.documentId || s.id" 
                class="month-mini-session-badge"
                :class="getCapacityClass(s)"
                @click.stop="editSession(s)"
                :title="getRoomName(s) + ' • Réf: ' + getManagerName(s) + ' • ' + getParticipantCount(s) + ' bénéficiaires'"
              >
                <span class="mini-session-room">📍 {{ getRoomName(s) }}</span>
                <span class="mini-session-info">{{ getParticipantCount(s) }}👥</span>
              </div>

              <div v-if="cell.sessions.length > 3" class="month-more-sessions-badge">
                + {{ cell.sessions.length - 3 }} autre(s) salle(s)
              </div>

              <!-- Empty state indicator on month cell -->
              <div v-if="cell.isCurrentMonth && cell.sessions.length === 0" class="month-cell-empty">
                <span class="empty-dot"></span>
                <span class="empty-text">Fermé</span>
              </div>
            </div>

            <!-- Quick Add on Cell Hover -->
            <div class="month-cell-footer no-print">
              <button 
                type="button" 
                class="month-cell-quick-add" 
                @click.stop="openCreateModal(cell.dateKey)"
                title="Ouvrir une salle à cette date"
              >
                ➕ Ouvrir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- MODAL 1: CRÉER / MODIFIER UNE SESSION DE SALLE      -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="showModal" class="modal-backdrop no-print" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-box">
            <span class="modal-icon">{{ isEditing ? '✏️' : '🚪' }}</span>
            <div>
              <h3>{{ isEditing ? 'Modifier l\'Ouverture de Salle' : 'Ouvrir une Salle' }}</h3>
              <p class="modal-sub">Affectez le professionnel référent et les résidents présents.</p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="closeModal">✕</button>
        </div>

        <form @submit.prevent="saveSession" class="modal-form">
          <div class="form-row-2">
            <div class="form-group">
              <label>📅 Date d'ouverture *</label>
              <input type="date" v-model="form.date" required class="form-input" />
            </div>

            <div class="form-group">
              <label>📍 Salle / Lieu *</label>
              <SearchableSelect 
                v-model="form.location" 
                :options="locations" 
                type="location" 
                placeholder="Rechercher une salle..." 
                empty-message="Aucune salle trouvée"
              />
            </div>
          </div>

          <div class="form-group">
            <div class="form-header-row">
              <label>👨‍💼 Gestionnaire Référent (Professionnel) *</label>
              <span v-if="selectedManagerStatus" class="manager-quick-status" :class="{ 'status-ok': selectedManagerStatus.available, 'status-ko': !selectedManagerStatus.available }">
                {{ selectedManagerStatus.available ? '✅ Disponible' : '⚠️ Indisponible' }}
              </span>
            </div>
            <SearchableSelect 
              v-model="form.manager" 
              :options="evaluatedModalFacilitators" 
              type="facilitator" 
              placeholder="Rechercher un professionnel..." 
              empty-message="Aucun professionnel trouvé"
            />
            <!-- Warning banner when selected manager is unavailable -->
            <div v-if="selectedManagerStatus && !selectedManagerStatus.available" class="manager-warning-banner">
              <span class="warning-icon">⚠️</span>
              <div class="warning-text">
                <strong>Attention :</strong> Ce professionnel référent est <strong>indisponible</strong> à cette date : <em>{{ selectedManagerStatus.reason }}</em>.
              </div>
            </div>
          </div>

          <!-- Participants Multi-selection -->
          <div class="form-group">
            <div class="participants-header-bar">
              <div class="participants-title-box">
                <label>👥 Bénéficiaires Affectés</label>
                <span class="participants-count-tag" :class="{ 'warning-exceeded': selectedLocationCapacity > 0 && form.participants.length > selectedLocationCapacity }">
                  {{ form.participants.length }} <template v-if="selectedLocationCapacity > 0">/ {{ selectedLocationCapacity }} max</template>
                </span>
              </div>
              <div class="participants-select-tools">
                <button type="button" class="mini-tool-btn highlight-btn" @click="selectAvailableParticipants" title="Cocher uniquement les résidents disponibles">
                  ✅ Cocher disponibles
                </button>
                <button type="button" class="mini-tool-btn" @click="selectAllParticipants">Tout cocher</button>
                <button type="button" class="mini-tool-btn" @click="clearAllParticipants">Désélectionner</button>
              </div>
            </div>

            <!-- Filter tabs & Search Bar -->
            <div class="participant-filter-bar">
              <div class="filter-tabs">
                <button 
                  type="button" 
                  class="filter-tab-btn" 
                  :class="{ active: modalParticipantFilterTab === 'all' }" 
                  @click="modalParticipantFilterTab = 'all'"
                >
                  Tous <span class="tab-badge">{{ modalAvailabilityCounts.total }}</span>
                </button>
                <button 
                  type="button" 
                  class="filter-tab-btn tab-avail" 
                  :class="{ active: modalParticipantFilterTab === 'available' }" 
                  @click="modalParticipantFilterTab = 'available'"
                >
                  ✅ Disponibles <span class="tab-badge">{{ modalAvailabilityCounts.available }}</span>
                </button>
                <button 
                  type="button" 
                  class="filter-tab-btn tab-unavail" 
                  :class="{ active: modalParticipantFilterTab === 'unavailable' }" 
                  @click="modalParticipantFilterTab = 'unavailable'"
                >
                  ❌ Indisponibles <span class="tab-badge">{{ modalAvailabilityCounts.unavailable }}</span>
                </button>
              </div>

              <div class="participant-search-input-wrapper">
                <input 
                  type="text" 
                  v-model="modalParticipantSearch" 
                  placeholder="Rechercher un résident par son nom..." 
                  class="form-input mini-search"
                />
              </div>
            </div>

            <div class="participants-checkbox-list">
              <div v-if="filteredModalParticipants.length === 0" class="no-participants-filtered">
                Aucun bénéficiaire correspondant aux critères de recherche.
              </div>
              <label 
                v-for="p in filteredModalParticipants" 
                :key="p.documentId || p.id" 
                class="checkbox-item"
                :class="{ 
                  'is-checked': form.participants.includes(p.documentId || p.id),
                  'is-unavailable': !p.isAvailable
                }"
              >
                <input 
                  type="checkbox" 
                  :value="p.documentId || p.id" 
                  v-model="form.participants" 
                />
                <span class="checkbox-user-avatar" :class="{ 'avatar-unavail': !p.isAvailable }">
                  {{ !p.isAvailable ? '🔴' : '👤' }}
                </span>
                <div class="checkbox-user-info">
                  <span class="checkbox-user-name" :class="{ 'name-unavail': !p.isAvailable }">
                    {{ p.firstName }} {{ p.lastName }}
                  </span>
                  <span v-if="!p.isAvailable" class="unavail-reason-badge">
                    ❌ Indisponible ({{ p.unavailabilityReason }})
                  </span>
                </div>
                <span v-if="p.isAvailable" class="avail-indicator-badge">
                  ✓ Dispo
                </span>
              </label>
            </div>

            <!-- Summary warning if any unavailable beneficiaries are checked -->
            <div v-if="checkedUnavailableCount > 0" class="unavailable-selected-alert">
              ⚠️ <strong>{{ checkedUnavailableCount }}</strong> bénéficiaire(s) <strong>indisponible(s)</strong> sélectionné(s) pour cette date.
            </div>

            <p v-if="selectedLocationCapacity > 0 && form.participants.length > selectedLocationCapacity" class="exceeded-msg">
              ⚠️ Attention : Le nombre de bénéficiaires sélectionnés dépasse la capacité maximale de la salle ({{ selectedLocationCapacity }}).
            </p>
          </div>

          <div v-if="formError" class="form-error-banner">
            <span>⚠️</span>
            <p>{{ formError }}</p>
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" @click="closeModal">Annuler</button>
            <button type="submit" class="action-btn primary-btn" :disabled="saving">
              {{ saving ? 'Enregistrement...' : (isEditing ? 'Mettre à jour' : 'Ouvrir la salle') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- MODAL 2: SEMAINE TYPE (REMPLISSAGE AUTOMATIQUE)     -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="showTemplateModal" class="modal-backdrop no-print" @click.self="showTemplateModal = false">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <div class="modal-title-box">
            <span class="modal-icon">⚡</span>
            <div>
              <h3>Remplissage Automatique par Semaine Type</h3>
              <p class="modal-sub">Générez automatiquement les ouvertures de salles selon le modèle récurrent enregistré en base de données.</p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="showTemplateModal = false">✕</button>
        </div>

        <div class="modal-form">
          <!-- 1. Période cible d'application -->
          <div class="template-section">
            <div class="section-header-flex">
              <h4>1. Période cible d'application</h4>
              <button 
                type="button" 
                class="mini-link-btn" 
                @click="goToWeekTemplate"
                title="Ouvrir la page de configuration de la Semaine Type"
              >
                ⚙️ Configurer la Semaine Type en base ➔
              </button>
            </div>

            <div class="template-period-options">
              <label class="radio-card" :class="{ active: templateTargetPeriod === 'current-week' }">
                <input type="radio" value="current-week" v-model="templateTargetPeriod" @change="onTemplatePeriodPresetChange" />
                <span class="radio-title">📅 Cette semaine</span>
                <span class="radio-desc">{{ formatTemplatePresetDates('current-week') }}</span>
              </label>

              <label class="radio-card" :class="{ active: templateTargetPeriod === 'next-week' }">
                <input type="radio" value="next-week" v-model="templateTargetPeriod" @change="onTemplatePeriodPresetChange" />
                <span class="radio-title">📆 Semaine prochaine</span>
                <span class="radio-desc">{{ formatTemplatePresetDates('next-week') }}</span>
              </label>

              <label class="radio-card" :class="{ active: templateTargetPeriod === 'current-month' }">
                <input type="radio" value="current-month" v-model="templateTargetPeriod" @change="onTemplatePeriodPresetChange" />
                <span class="radio-title">🗓️ Tout ce mois-ci</span>
                <span class="radio-desc">{{ formatTemplatePresetDates('current-month') }}</span>
              </label>

              <label class="radio-card" :class="{ active: templateTargetPeriod === 'next-month' }">
                <input type="radio" value="next-month" v-model="templateTargetPeriod" @change="onTemplatePeriodPresetChange" />
                <span class="radio-title">🗓️ Le mois prochain</span>
                <span class="radio-desc">{{ formatTemplatePresetDates('next-month') }}</span>
              </label>

              <label class="radio-card" :class="{ active: templateTargetPeriod === 'next-2-weeks' }">
                <input type="radio" value="next-2-weeks" v-model="templateTargetPeriod" @change="onTemplatePeriodPresetChange" />
                <span class="radio-title">⏩ 2 prochaines semaines</span>
                <span class="radio-desc">14 jours consécutifs</span>
              </label>

              <label class="radio-card" :class="{ active: templateTargetPeriod === 'custom' }">
                <input type="radio" value="custom" v-model="templateTargetPeriod" />
                <span class="radio-title">🎯 Période personnalisée</span>
                <span class="radio-desc">Choisir les dates précises</span>
              </label>
            </div>

            <!-- Custom date range pickers -->
            <div v-if="templateTargetPeriod === 'custom'" class="custom-date-range-box">
              <div class="date-field">
                <label>Date de début :</label>
                <input type="date" v-model="templateCustomStartDate" class="form-input" />
              </div>
              <span class="date-arrow">➔</span>
              <div class="date-field">
                <label>Date de fin :</label>
                <input type="date" v-model="templateCustomEndDate" class="form-input" />
              </div>
            </div>
          </div>

          <!-- 2. Jours de la semaine à valider -->
          <div class="template-section">
            <h4>2. Jours de la semaine à valider pour ouverture</h4>
            <p class="section-desc">Cochez les jours pour lesquels générer les ouvertures :</p>

            <div class="days-validation-row">
              <label 
                v-for="d in templateDaysList" 
                :key="d.id"
                class="day-validate-card"
                :class="{ 
                  active: templateAllowedDays.includes(d.id),
                  'has-template': getTemplateDayOpeningsCount(d.id) > 0
                }"
              >
                <input 
                  type="checkbox" 
                  :value="d.id" 
                  v-model="templateAllowedDays"
                />
                <div class="day-val-info">
                  <strong class="day-val-name">{{ d.name }}</strong>
                  <span class="day-val-count">{{ getTemplateDayOpeningsCount(d.id) }} salle(s)</span>
                </div>
              </label>
            </div>

            <div class="quick-target-buttons mt-2">
              <button type="button" class="tag-btn" @click="templateAllowedDays = [1, 2, 3, 4, 5]">Jours ouvrés (Lun - Ven)</button>
              <button type="button" class="tag-btn" @click="templateAllowedDays = [1, 2, 3, 4, 5, 6, 7]">Tous les 7 jours</button>
              <button type="button" class="tag-btn" @click="templateAllowedDays = []">Tout décocher</button>
            </div>
          </div>

          <!-- 3. Aperçu & Options -->
          <div class="template-section">
            <h4>3. Options & Aperçu prévisionnel</h4>

            <div class="generation-preview-box">
              <div class="preview-metric">
                <span class="p-label">Dates cibles analysées :</span>
                <strong class="p-val">{{ calculatedTemplateTargetDates.length }} date(s)</strong>
              </div>
              <div class="preview-metric">
                <span class="p-label">Total ouvertures prévues :</span>
                <strong class="p-val highlight-val">{{ calculatedTemplateTotalOpenings }} ouverture(s)</strong>
              </div>
            </div>

            <label class="checkbox-item mt-2">
              <input type="checkbox" v-model="templateOverwriteExisting" />
              <span>Écraser / remplacer les ouvertures existantes sur la période sélectionnée</span>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" @click="showTemplateModal = false">Annuler</button>
            <button 
              type="button" 
              class="action-btn primary-btn" 
              @click="applyTemplateGeneration" 
              :disabled="calculatedTemplateTotalOpenings === 0 || saving"
            >
              {{ saving ? 'Génération en cours...' : `⚡ Générer les ${calculatedTemplateTotalOpenings} ouvertures` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- MODAL 3: DUPLICATION RAPIDE                         -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="showDuplicateModal" class="modal-backdrop no-print" @click.self="showDuplicateModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-box">
            <span class="modal-icon">📋</span>
            <div>
              <h3>Dupliquer les Ouvertures</h3>
              <p class="modal-sub">Copiez les ouvertures d'une journée vers d'autres dates.</p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="showDuplicateModal = false">✕</button>
        </div>

        <div class="modal-form">
          <div class="form-group">
            <label>📅 Date source (à copier) :</label>
            <input type="date" v-model="duplicateSourceDate" class="form-input" />
            <small class="help-text">Contient {{ getSessionsForDate(duplicateSourceDate).length }} salle(s) ouverte(s).</small>
          </div>

          <div class="form-group">
            <label>🎯 Cibles de duplication :</label>
            <div class="duplicate-presets">
              <button 
                type="button" 
                class="preset-btn" 
                :class="{ active: duplicateTargetPreset === 'tomorrow' }"
                @click="setDuplicatePreset('tomorrow')"
              >
                Demain (J+1)
              </button>
              <button 
                type="button" 
                class="preset-btn" 
                :class="{ active: duplicateTargetPreset === 'week-days' }"
                @click="setDuplicatePreset('week-days')"
              >
                Toute la semaine ouvrée (Lun-Ven)
              </button>
              <button 
                type="button" 
                class="preset-btn" 
                :class="{ active: duplicateTargetPreset === 'next-week' }"
                @click="setDuplicatePreset('next-week')"
              >
                La semaine prochaine
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Options de duplication :</label>
            <div class="checkboxes-stack">
              <label class="checkbox-item">
                <input type="checkbox" v-model="duplicateCopyManager" />
                <span>Copier les gestionnaires référents</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" v-model="duplicateCopyParticipants" />
                <span>Copier les bénéficiaires affectés</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" v-model="duplicateOverwrite" />
                <span>Remplacer si la salle est déjà ouverte à la date cible</span>
              </label>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" @click="showDuplicateModal = false">Annuler</button>
            <button 
              type="button" 
              class="action-btn primary-btn" 
              @click="executeDuplicate" 
              :disabled="saving"
            >
              {{ saving ? 'Duplication...' : '📋 Lancer la duplication' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════ -->
    <!-- MODAL 4: AFFECTATION RAPIDE DES BÉNÉFICIAIRES       -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="showBulkAssignModal" class="modal-backdrop no-print" @click.self="showBulkAssignModal = false">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <div class="modal-title-box">
            <span class="modal-icon">👥</span>
            <div>
              <h3>Affectation Rapide des Bénéficiaires</h3>
              <p class="modal-sub">Répartissez facilement les bénéficiaires sur les salles ouvertes du {{ formatFullDate(currentDate) }}.</p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="showBulkAssignModal = false">✕</button>
        </div>

        <div class="modal-form">
          <div v-if="currentDaySessions.length === 0" class="empty-state-mini">
            <p>⚠️ Aucune salle n'est actuellement ouverte à cette date. Veuillez d'abord ouvrir une salle.</p>
          </div>

          <div v-else class="bulk-assign-container">
            <!-- Quick balance button -->
            <div class="bulk-tools-bar">
              <button type="button" class="action-btn secondary-btn" @click="autoBalanceParticipants">
                ⚖️ Répartir équitablement les participants
              </button>
              <button type="button" class="secondary-btn" @click="clearAllDayAssignments">
                🗑️ Vider toutes les affectations du jour
              </button>
            </div>

            <!-- List of Open Rooms with live participant selection -->
            <div class="bulk-rooms-list">
              <div 
                v-for="s in currentDaySessions" 
                :key="s.documentId || s.id" 
                class="bulk-room-card"
              >
                <div class="bulk-room-header">
                  <strong>📍 {{ getRoomName(s) }}</strong>
                  <span class="capacity-badge" :class="getCapacityClass(s)">
                    👥 {{ getParticipantCount(s) }} / {{ getRoomCapacity(s) }}
                  </span>
                </div>
                <div class="bulk-room-manager">
                  👨‍💼 Réf : {{ getManagerName(s) }}
                </div>
                <div class="bulk-room-pills">
                  <span v-for="p in getParticipants(s)" :key="p.documentId || p.id" class="participant-pill mini">
                    {{ p.firstName }} {{ p.lastName }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="action-btn primary-btn" @click="showBulkAssignModal = false">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoomSessionStore } from '../stores/roomSessionStore';
import { useRoomSessionTemplateStore } from '../stores/roomSessionTemplateStore';
import { checkPersonDateAvailability, getEvaluatedPersonsList } from '../utils/availabilityHelper';
import SearchableSelect from './SearchableSelect.vue';

const props = defineProps({
  locations: { type: Array, default: () => [] },
  facilitators: { type: Array, default: () => [] },
  participants: { type: Array, default: () => [] },
  timeslots: { type: Array, default: () => [] }
});

const emit = defineEmits(['navigate-template']);

const roomSessionStore = useRoomSessionStore();
const roomSessionTemplateStore = useRoomSessionTemplateStore();

// VIEW STATE
const viewMode = ref('day'); // 'day' | 'week' | 'month'
const currentDate = ref(new Date());
const showModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const formError = ref('');
const currentEditingId = ref(null);

// DAY VIEW FILTERS & INLINE MULTI-ADD
const dayFilterSearch = ref('');
const dayFilterStatus = ref('all');
const activeInlineAddSessionId = ref(null);
const inlineSelectedParticipants = ref([]);
const inlineParticipantSearch = ref('');
const inlineParticipantFilterTab = ref('all'); // 'all' | 'available' | 'unavailable'

// MODAL PARTICIPANT FILTER & TABS
const modalParticipantSearch = ref('');
const modalParticipantFilterTab = ref('all'); // 'all' | 'available' | 'unavailable'

// MODAL TOOL STATES (SEMAINE TYPE)
const showTemplateModal = ref(false);
const templateTargetPeriod = ref('current-week');
const templateCustomStartDate = ref(new Date().toISOString().slice(0, 10));
const templateCustomEndDate = ref(new Date().toISOString().slice(0, 10));
const templateAllowedDays = ref([1, 2, 3, 4, 5]);
const templateOverwriteExisting = ref(false);

const templateDaysList = [
  { id: 1, name: 'Lundi' },
  { id: 2, name: 'Mardi' },
  { id: 3, name: 'Mercredi' },
  { id: 4, name: 'Jeudi' },
  { id: 5, name: 'Vendredi' },
  { id: 6, name: 'Samedi' },
  { id: 7, name: 'Dimanche' }
];

const showDuplicateModal = ref(false);
const duplicateSourceDate = ref(new Date().toISOString().slice(0, 10));
const duplicateTargetPreset = ref('tomorrow');
const duplicateCopyManager = ref(true);
const duplicateCopyParticipants = ref(true);
const duplicateOverwrite = ref(false);

const showBulkAssignModal = ref(false);

// FORM STATE
const form = ref({
  date: new Date().toISOString().slice(0, 10),
  location: '',
  manager: '',
  participants: []
});

// COMPUTED VALUES
const currentDateStr = computed(() => {
  return currentDate.value.toISOString().slice(0, 10);
});

const sessions = computed(() => roomSessionStore.sessions || []);

const currentDaySessions = computed(() => {
  const dateStr = currentDateStr.value;
  return sessions.value.filter(s => s.date === dateStr);
});

const currentPeriodSessionsCount = computed(() => sessions.value.length);

const selectedLocationCapacity = computed(() => {
  if (!form.value.location) return 0;
  const loc = props.locations.find(l => (l.documentId || l.id) === form.value.location);
  return loc ? loc.capacity : 0;
});

// ══════════════════════════════════════════════════════════
// CONFLICT & AVAILABILITY EVALUATION FOR ROOM SESSIONS
// ══════════════════════════════════════════════════════════
function getSessionConflictInfo(session) {
  if (!session) return { hasConflict: false, unavailableManager: null, unavailableParticipants: [], isOverBooked: false, conflictSummary: '' };

  const currentSessionId = session.documentId || session.id;
  const sessDate = session.date;

  // 1. Check Manager availability
  let unavailableManager = null;
  if (session.manager) {
    const mgrId = session.manager.documentId || session.manager.id;
    const fullFac = props.facilitators.find(f => (f.documentId || f.id) === mgrId) || session.manager;
    const status = checkPersonDateAvailability(fullFac, sessDate, 'facilitator', sessions.value, currentSessionId);
    if (!status.available) {
      unavailableManager = {
        name: `${fullFac.firstName || ''} ${fullFac.lastName || ''}`.trim() || 'Référent',
        reason: status.reason
      };
    }
  }

  // 2. Check Participants availability
  const unavailableParticipants = [];
  const parts = session.participants || [];
  for (const p of parts) {
    const pid = p.documentId || p.id;
    const fullPart = props.participants.find(part => (part.documentId || part.id) === pid) || p;
    const status = checkPersonDateAvailability(fullPart, sessDate, 'participant', sessions.value, currentSessionId);
    if (!status.available) {
      unavailableParticipants.push({
        id: pid,
        name: `${fullPart.firstName || ''} ${fullPart.lastName || ''}`.trim() || 'Bénéficiaire',
        reason: status.reason
      });
    }
  }

  const isOverBooked = isOverCapacity(session);
  const hasConflict = !!unavailableManager || unavailableParticipants.length > 0 || isOverBooked;

  let conflictSummary = '';
  if (unavailableManager && unavailableParticipants.length > 0) {
    conflictSummary = `Référent & ${unavailableParticipants.length} résident(s) indispo`;
  } else if (unavailableManager) {
    conflictSummary = 'Référent indisponible';
  } else if (unavailableParticipants.length > 0) {
    conflictSummary = `${unavailableParticipants.length} résident(s) indispo`;
  } else if (isOverBooked) {
    conflictSummary = 'Capacité dépassée';
  }

  return {
    hasConflict,
    unavailableManager,
    unavailableParticipants,
    isOverBooked,
    conflictSummary
  };
}

function isParticipantUnavailableInSession(participant, session) {
  const pid = participant.documentId || participant.id;
  const fullPart = props.participants.find(p => (p.documentId || p.id) === pid) || participant;
  const currentSessionId = session.documentId || session.id;
  const status = checkPersonDateAvailability(fullPart, session.date, 'participant', sessions.value, currentSessionId);
  return !status.available;
}

function getParticipantUnavailabilityTitle(participant, session) {
  const pid = participant.documentId || participant.id;
  const fullPart = props.participants.find(p => (p.documentId || p.id) === pid) || participant;
  const currentSessionId = session.documentId || session.id;
  const status = checkPersonDateAvailability(fullPart, session.date, 'participant', sessions.value, currentSessionId);
  if (!status.available) {
    return `Indisponible le ${session.date} : ${status.reason}`;
  }
  return '';
}

// Counts for Day View filter pills
const currentDayConflictSessionsCount = computed(() => {
  return currentDaySessions.value.filter(s => getSessionConflictInfo(s).hasConflict).length;
});

const currentDayIncompleteSessionsCount = computed(() => {
  return currentDaySessions.value.filter(s => getParticipantCount(s) < getRoomCapacity(s)).length;
});

const currentDayFullSessionsCount = computed(() => {
  return currentDaySessions.value.filter(s => getParticipantCount(s) >= getRoomCapacity(s)).length;
});

const currentDayNoManagerSessionsCount = computed(() => {
  return currentDaySessions.value.filter(s => !s.manager).length;
});

// Filtered sessions in Day view
const filteredDaySessions = computed(() => {
  let list = currentDaySessions.value;

  if (dayFilterStatus.value === 'conflict') {
    list = list.filter(s => getSessionConflictInfo(s).hasConflict);
  } else if (dayFilterStatus.value === 'incomplete') {
    list = list.filter(s => getParticipantCount(s) < getRoomCapacity(s));
  } else if (dayFilterStatus.value === 'full') {
    list = list.filter(s => getParticipantCount(s) >= getRoomCapacity(s));
  } else if (dayFilterStatus.value === 'no-manager') {
    list = list.filter(s => !s.manager);
  } else if (dayFilterStatus.value === 'with-manager') {
    list = list.filter(s => !!s.manager);
  }

  if (dayFilterSearch.value.trim()) {
    const q = dayFilterSearch.value.toLowerCase().trim();
    list = list.filter(s => {
      const rName = getRoomName(s).toLowerCase();
      const mName = getManagerName(s).toLowerCase();
      const pMatch = getParticipants(s).some(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
      return rName.includes(q) || mName.includes(q) || pMatch;
    });
  }

  return list;
});

// ══════════════════════════════════════════════════════════
// MODAL AVAILABILITY COMPUTED (EVALUATED FOR form.value.date)
// ══════════════════════════════════════════════════════════

// Facilitators evaluated for the room date
const evaluatedModalFacilitators = computed(() => {
  const dateStr = form.value.date || currentDateStr.value;
  return getEvaluatedPersonsList(props.facilitators, dateStr, 'facilitator', sessions.value, currentEditingId.value);
});

const availableModalFacilitators = computed(() => {
  return evaluatedModalFacilitators.value.filter(f => f.isAvailable);
});

const unavailableModalFacilitators = computed(() => {
  return evaluatedModalFacilitators.value.filter(f => !f.isAvailable);
});

// Live status for currently selected manager in modal
const selectedManagerStatus = computed(() => {
  if (!form.value.manager) return null;
  const dateStr = form.value.date || currentDateStr.value;
  const fac = props.facilitators.find(f => (f.documentId || f.id) === form.value.manager);
  if (!fac) return null;
  return checkPersonDateAvailability(fac, dateStr, 'facilitator', sessions.value, currentEditingId.value);
});

// Participants evaluated for the room date
const evaluatedModalParticipants = computed(() => {
  const dateStr = form.value.date || currentDateStr.value;
  return getEvaluatedPersonsList(props.participants, dateStr, 'participant', sessions.value, currentEditingId.value);
});

const modalAvailabilityCounts = computed(() => {
  const list = evaluatedModalParticipants.value;
  const available = list.filter(p => p.isAvailable).length;
  const unavailable = list.length - available;
  return {
    total: list.length,
    available,
    unavailable
  };
});

// Filtered participants inside modal by Tab and Search
const filteredModalParticipants = computed(() => {
  let list = evaluatedModalParticipants.value;

  if (modalParticipantFilterTab.value === 'available') {
    list = list.filter(p => p.isAvailable);
  } else if (modalParticipantFilterTab.value === 'unavailable') {
    list = list.filter(p => !p.isAvailable);
  }

  if (modalParticipantSearch.value.trim()) {
    const q = modalParticipantSearch.value.toLowerCase().trim();
    list = list.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }

  return list;
});

// Number of checked participants who are unavailable
const checkedUnavailableCount = computed(() => {
  const checkedIds = new Set(form.value.participants);
  return evaluatedModalParticipants.value.filter(p => checkedIds.has(p.documentId || p.id) && !p.isAvailable).length;
});

// METRICS
const metrics = computed(() => {
  const activeSessions = viewMode.value === 'day' ? currentDaySessions.value : sessions.value;
  const openRoomsCount = activeSessions.length;
  const assignedManagersCount = activeSessions.filter(s => !!s.manager).length;
  const unassignedManagersCount = activeSessions.filter(s => !s.manager).length;
  
  let totalParticipants = 0;
  let totalMaxCapacity = 0;

  activeSessions.forEach(s => {
    totalParticipants += getParticipantCount(s);
    totalMaxCapacity += getRoomCapacity(s);
  });

  const occupancyRate = totalMaxCapacity > 0 ? Math.round((totalParticipants / totalMaxCapacity) * 100) : 0;

  return {
    openRoomsCount,
    assignedManagersCount,
    unassignedManagersCount,
    totalParticipants,
    occupancyRate
  };
});

// PERIOD TITLE
const periodTitle = computed(() => {
  const d = currentDate.value;
  if (viewMode.value === 'day') {
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } else if (viewMode.value === 'week') {
    const startOfWeek = getStartOfWeek(d);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    return `Semaine ${getWeekNumber(d)} — ${startOfWeek.getDate()} au ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  } else {
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
});

const currentMonthTitle = computed(() => {
  return currentDate.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
});

const weekDaysRangeLabel = computed(() => {
  const startOfWeek = getStartOfWeek(currentDate.value);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  return `${startOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${endOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
});

// WEEK DAYS LIST
const weekDaysList = computed(() => {
  const startOfWeek = getStartOfWeek(currentDate.value);
  const days = [];
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(dayDate.getDate() + i);
    const dateKey = dayDate.toISOString().slice(0, 10);
    days.push({
      date: dayDate,
      dateKey,
      dayName: dayDate.toLocaleDateString('fr-FR', { weekday: 'short' }),
      dayNumber: dayDate.getDate(),
      monthShort: dayDate.toLocaleDateString('fr-FR', { month: 'short' }),
      isToday: dateKey === todayStr
    });
  }
  return days;
});

// MONTH DAYS GRID
const monthDaysGrid = computed(() => {
  const d = currentDate.value;
  const year = d.getFullYear();
  const month = d.getMonth();
  const todayStr = new Date().toISOString().slice(0, 10);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Monday-based day of week (0: Lun, 6: Dim)
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const cells = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const cellDate = new Date(year, month - 1, dayNum);
    const dateKey = cellDate.toISOString().slice(0, 10);
    cells.push({
      date: cellDate,
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateKey === todayStr,
      sessions: getSessionsForDate(dateKey)
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= lastDayOfMonth.getDate(); dayNum++) {
    const cellDate = new Date(year, month, dayNum);
    const dateKey = cellDate.toISOString().slice(0, 10);
    cells.push({
      date: cellDate,
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateKey === todayStr,
      sessions: getSessionsForDate(dateKey)
    });
  }

  // Next month leading days (fill up to full 35 or 42 cells)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const cellDate = new Date(year, month + 1, dayNum);
    const dateKey = cellDate.toISOString().slice(0, 10);
    cells.push({
      date: cellDate,
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateKey === todayStr,
      sessions: getSessionsForDate(dateKey)
    });
  }

  return cells;
});

// INITIALIZATION & LIFECYCLE
onMounted(() => {
  initTemplateLocations();
  loadDataForCurrentView();
});

watch(viewMode, (newMode) => {
  roomSessionStore.currentViewMode = newMode;
  loadDataForCurrentView();
});

function initTemplateLocations() {
  templateLocationsList.value = props.locations.map((loc, idx) => ({
    locationId: loc.documentId || loc.id,
    name: loc.name,
    selected: true,
    managerId: props.facilitators[idx % props.facilitators.length]?.documentId || props.facilitators[idx % props.facilitators.length]?.id || ''
  }));
}

watch(() => props.locations, () => {
  if (templateLocationsList.value.length === 0) {
    initTemplateLocations();
  }
}, { deep: true });

async function loadDataForCurrentView() {
  const d = currentDate.value;
  if (viewMode.value === 'day') {
    await roomSessionStore.fetchSessions(currentDateStr.value);
  } else if (viewMode.value === 'week') {
    const startOfWeek = getStartOfWeek(d);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    await roomSessionStore.fetchSessionsForRange(
      startOfWeek.toISOString().slice(0, 10),
      endOfWeek.toISOString().slice(0, 10)
    );
  } else if (viewMode.value === 'month') {
    const year = d.getFullYear();
    const month = d.getMonth();
    const startOfMonth = new Date(year, month - 1, 20).toISOString().slice(0, 10);
    const endOfMonth = new Date(year, month + 1, 15).toISOString().slice(0, 10);
    await roomSessionStore.fetchSessionsForRange(startOfMonth, endOfMonth);
  }
}

// NAVIGATION FUNCTIONS
function setViewMode(mode) {
  viewMode.value = mode;
}

function navigateDate(delta) {
  const d = new Date(currentDate.value);
  if (viewMode.value === 'day') {
    d.setDate(d.getDate() + delta);
  } else if (viewMode.value === 'week') {
    d.setDate(d.getDate() + (delta * 7));
  } else if (viewMode.value === 'month') {
    d.setMonth(d.getMonth() + delta);
  }
  currentDate.value = d;
  loadDataForCurrentView();
}

function goToToday() {
  currentDate.value = new Date();
  loadDataForCurrentView();
}

function onDirectDateChange(e) {
  if (e.target.value) {
    currentDate.value = new Date(e.target.value);
    loadDataForCurrentView();
  }
}

function goToDayView(date) {
  currentDate.value = new Date(date);
  viewMode.value = 'day';
  loadDataForCurrentView();
}

// HELPERS
function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  date.setDate(diff);
  return date;
}

function getWeekNumber(d) {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

function formatFullDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTimeRange(start, end) {
  if (!start) return '';
  const s = new Date(start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const e = end ? new Date(end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  return e ? `${s} - ${e}` : s;
}

function getSessionsForDate(dateStr) {
  return sessions.value.filter(s => s.date === dateStr);
}

function getSessionForRoomAndDate(location, dateStr) {
  const locId = location?.documentId || location?.id;
  return sessions.value.find(s => s.date === dateStr && (s.location?.documentId || s.location?.id) === locId);
}

function getRoomName(session) {
  return session.location?.name || 'Salle non spécifiée';
}

function getLocation(session) {
  return session.location || null;
}

function getRoomCapacity(session) {
  return session.location?.capacity || 10;
}

function getManagerName(session) {
  if (!session.manager) return 'Non désigné';
  return `${session.manager.firstName || ''} ${session.manager.lastName || ''}`.trim();
}

function getParticipants(session) {
  return session.participants || [];
}

function getParticipantCount(session) {
  return getParticipants(session).length;
}

function getCapacityPercentage(session) {
  const cap = getRoomCapacity(session);
  const count = getParticipantCount(session);
  return Math.min(Math.round((count / cap) * 100), 100);
}

function isOverCapacity(session) {
  return getParticipantCount(session) > getRoomCapacity(session);
}

function getCapacityClass(session) {
  if (!session) return 'normal';
  const cap = getRoomCapacity(session);
  const count = getParticipantCount(session);
  if (count > cap) return 'exceeded';
  if (count === cap) return 'full';
  if (count >= cap * 0.8) return 'warning';
  return 'normal';
}

function getRateClass(rate) {
  if (rate > 100) return 'exceeded';
  if (rate >= 90) return 'full';
  if (rate >= 70) return 'normal';
  return 'low';
}

function getScheduledSlotsForRoom(session) {
  const locId = session.location?.documentId || session.location?.id;
  const sessDate = session.date;
  if (!locId || !props.timeslots) return [];

  return props.timeslots.filter(t => {
    const slotLocId = t.location?.documentId || t.location?.id;
    const slotDate = t.startDate?.slice(0, 10);
    return slotLocId === locId && slotDate === sessDate;
  });
}

function getAvailableParticipantsForSession(session) {
  const assignedIds = new Set((session.participants || []).map(p => p.documentId || p.id));
  const unassigned = props.participants.filter(p => !assignedIds.has(p.documentId || p.id));
  const currentSessionId = session.documentId || session.id;
  return getEvaluatedPersonsList(unassigned, session.date, 'participant', sessions.value, currentSessionId);
}

// MODAL OPEN / EDIT
function openCreateModal(defaultDate = null) {
  isEditing.value = false;
  currentEditingId.value = null;
  formError.value = '';
  modalParticipantSearch.value = '';
  modalParticipantFilterTab.value = 'all';

  const dateToUse = defaultDate || currentDateStr.value;
  // Automatically select the first available facilitator if any
  const evaluatedFacs = getEvaluatedPersonsList(props.facilitators, dateToUse, 'facilitator', sessions.value, null);
  const firstAvailableFac = evaluatedFacs.find(f => f.isAvailable);
  const defaultFacId = firstAvailableFac ? (firstAvailableFac.documentId || firstAvailableFac.id) : (props.facilitators[0]?.documentId || props.facilitators[0]?.id || '');

  form.value = {
    date: dateToUse,
    location: props.locations.length > 0 ? (props.locations[0].documentId || props.locations[0].id) : '',
    manager: defaultFacId,
    participants: []
  };
  showModal.value = true;
}

function editSession(session) {
  isEditing.value = true;
  currentEditingId.value = session.documentId || session.id;
  formError.value = '';
  modalParticipantSearch.value = '';
  modalParticipantFilterTab.value = 'all';
  form.value = {
    date: session.date || currentDateStr.value,
    location: session.location?.documentId || session.location?.id || '',
    manager: session.manager?.documentId || session.manager?.id || '',
    participants: (session.participants || []).map(p => p.documentId || p.id)
  };
  showModal.value = true;
}

function openRoomForDay(location, dateStr) {
  isEditing.value = false;
  currentEditingId.value = null;
  formError.value = '';
  modalParticipantSearch.value = '';
  modalParticipantFilterTab.value = 'all';

  const evaluatedFacs = getEvaluatedPersonsList(props.facilitators, dateStr, 'facilitator', sessions.value, null);
  const firstAvailableFac = evaluatedFacs.find(f => f.isAvailable);
  const defaultFacId = firstAvailableFac ? (firstAvailableFac.documentId || firstAvailableFac.id) : (props.facilitators[0]?.documentId || props.facilitators[0]?.id || '');

  form.value = {
    date: dateStr,
    location: location.documentId || location.id,
    manager: defaultFacId,
    participants: []
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function selectAllParticipants() {
  const allFilteredIds = filteredModalParticipants.value.map(p => p.documentId || p.id);
  const newSet = new Set([...form.value.participants, ...allFilteredIds]);
  form.value.participants = Array.from(newSet);
}

function selectAvailableParticipants() {
  const availableFilteredIds = filteredModalParticipants.value
    .filter(p => p.isAvailable)
    .map(p => p.documentId || p.id);
  const newSet = new Set([...form.value.participants, ...availableFilteredIds]);
  form.value.participants = Array.from(newSet);
}

function clearAllParticipants() {
  form.value.participants = [];
}

async function saveSession() {
  formError.value = '';
  if (!form.value.location || !form.value.manager || !form.value.date) {
    formError.value = 'Veuillez remplir tous les champs obligatoires.';
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value && currentEditingId.value) {
      await roomSessionStore.updateSession(currentEditingId.value, form.value);
    } else {
      await roomSessionStore.createSession(form.value);
    }
    closeModal();
    await loadDataForCurrentView();
  } catch (err) {
    formError.value = err.message || "Erreur lors de l'enregistrement.";
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(session) {
  if (confirm(`Êtes-vous sûr de vouloir fermer la salle "${getRoomName(session)}" pour le ${formatFullDate(session.date)} ?`)) {
    try {
      await roomSessionStore.deleteSession(session.documentId || session.id);
      await loadDataForCurrentView();
    } catch (err) {
      alert("Erreur lors de la fermeture : " + err.message);
    }
  }
}

// INLINE QUICK MULTI-PARTICIPANT ADD / REMOVE
function openInlineAddParticipant(session) {
  activeInlineAddSessionId.value = session.documentId || session.id;
  inlineSelectedParticipants.value = [];
  inlineParticipantSearch.value = '';
  inlineParticipantFilterTab.value = 'all';
}

function getInlineEvaluatedParticipants(session) {
  const assignedIds = new Set((session.participants || []).map(p => p.documentId || p.id));
  const unassigned = props.participants.filter(p => !assignedIds.has(p.documentId || p.id));
  const currentSessionId = session.documentId || session.id;
  return getEvaluatedPersonsList(unassigned, session.date, 'participant', sessions.value, currentSessionId);
}

function getInlineAvailabilityCounts(session) {
  const list = getInlineEvaluatedParticipants(session);
  const available = list.filter(p => p.isAvailable).length;
  const unavailable = list.length - available;
  return { total: list.length, available, unavailable };
}

function getInlineFilteredParticipants(session) {
  let list = getInlineEvaluatedParticipants(session);

  if (inlineParticipantFilterTab.value === 'available') {
    list = list.filter(p => p.isAvailable);
  } else if (inlineParticipantFilterTab.value === 'unavailable') {
    list = list.filter(p => !p.isAvailable);
  }

  if (inlineParticipantSearch.value.trim()) {
    const q = inlineParticipantSearch.value.toLowerCase().trim();
    list = list.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }

  return list;
}

function selectAvailableInlineParticipants(session) {
  const availableIds = getInlineFilteredParticipants(session)
    .filter(p => p.isAvailable)
    .map(p => p.documentId || p.id);
  inlineSelectedParticipants.value = Array.from(new Set([...inlineSelectedParticipants.value, ...availableIds]));
}

function selectAllInlineParticipants(session) {
  const allFilteredIds = getInlineFilteredParticipants(session).map(p => p.documentId || p.id);
  inlineSelectedParticipants.value = Array.from(new Set([...inlineSelectedParticipants.value, ...allFilteredIds]));
}

function clearAllInlineParticipants() {
  inlineSelectedParticipants.value = [];
}

async function addSelectedParticipantsToSession(session) {
  if (inlineSelectedParticipants.value.length === 0) return;
  const currentPartIds = (session.participants || []).map(p => p.documentId || p.id);
  const newPartIds = Array.from(new Set([...currentPartIds, ...inlineSelectedParticipants.value]));

  try {
    await roomSessionStore.updateSession(session.documentId || session.id, {
      participants: newPartIds
    }, false);
    activeInlineAddSessionId.value = null;
    inlineSelectedParticipants.value = [];
    await loadDataForCurrentView();
  } catch (err) {
    alert("Erreur lors de l'ajout des bénéficiaires : " + err.message);
  }
}

async function removeParticipantFromSession(session, participantId) {
  const updated = (session.participants || []).filter(p => (p.documentId || p.id) !== participantId).map(p => p.documentId || p.id);
  try {
    await roomSessionStore.updateSession(session.documentId || session.id, {
      participants: updated
    }, true);
    await loadDataForCurrentView();
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

// TEMPLATE MODAL ACTIONS & COMPUTATIONS
function getTemplateDayOpeningsCount(dayId) {
  return roomSessionTemplateStore.templates.filter(t => Number(t.dayOfWeek) === Number(dayId) && t.isActive).length;
}

const calculatedTemplateTargetDates = computed(() => {
  if (!templateCustomStartDate.value || !templateCustomEndDate.value) return [];
  const dates = [];
  const curr = new Date(templateCustomStartDate.value + 'T00:00:00');
  const end = new Date(templateCustomEndDate.value + 'T00:00:00');

  while (curr <= end) {
    const jsDay = curr.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    if (templateAllowedDays.value.includes(dayOfWeek)) {
      dates.push(curr.toISOString().slice(0, 10));
    }
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
});

const calculatedTemplateTotalOpenings = computed(() => {
  let total = 0;
  calculatedTemplateTargetDates.value.forEach(dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    const jsDay = d.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const openingsForDay = getTemplateDayOpeningsCount(dayOfWeek);
    total += openingsForDay;
  });
  return total;
});

async function openTemplateModal() {
  if (!roomSessionTemplateStore.templates.length) {
    await roomSessionTemplateStore.fetchTemplates();
  }
  onTemplatePeriodPresetChange();
  showTemplateModal.value = true;
}

function onTemplatePeriodPresetChange() {
  const d = currentDate.value || new Date();
  if (templateTargetPeriod.value === 'current-week') {
    const start = getStartOfWeek(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    templateCustomStartDate.value = start.toISOString().slice(0, 10);
    templateCustomEndDate.value = end.toISOString().slice(0, 10);
  } else if (templateTargetPeriod.value === 'next-week') {
    const start = getStartOfWeek(d);
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    templateCustomStartDate.value = start.toISOString().slice(0, 10);
    templateCustomEndDate.value = end.toISOString().slice(0, 10);
  } else if (templateTargetPeriod.value === 'current-month') {
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    templateCustomStartDate.value = start.toISOString().slice(0, 10);
    templateCustomEndDate.value = end.toISOString().slice(0, 10);
  } else if (templateTargetPeriod.value === 'next-month') {
    const year = d.getFullYear();
    const month = d.getMonth();
    const start = new Date(year, month + 1, 1);
    const end = new Date(year, month + 2, 0);
    templateCustomStartDate.value = start.toISOString().slice(0, 10);
    templateCustomEndDate.value = end.toISOString().slice(0, 10);
  } else if (templateTargetPeriod.value === 'next-2-weeks') {
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 13);
    templateCustomStartDate.value = start.toISOString().slice(0, 10);
    templateCustomEndDate.value = end.toISOString().slice(0, 10);
  }
}

function formatTemplatePresetDates(preset) {
  const d = currentDate.value || new Date();
  if (preset === 'current-week') {
    const start = getStartOfWeek(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  } else if (preset === 'next-week') {
    const start = getStartOfWeek(d);
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  } else if (preset === 'current-month') {
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  } else if (preset === 'next-month') {
    const nextM = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return nextM.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  return '';
}

function goToWeekTemplate() {
  showTemplateModal.value = false;
  emit('navigate-template');
}

async function applyTemplateGeneration() {
  if (calculatedTemplateTargetDates.value.length === 0) return;
  saving.value = true;
  try {
    if (!roomSessionTemplateStore.templates.length) {
      await roomSessionTemplateStore.fetchTemplates();
    }

    await roomSessionStore.applyTemplate(calculatedTemplateTargetDates.value, roomSessionTemplateStore.templates, {
      overwrite: templateOverwriteExisting.value,
      allowedDays: templateAllowedDays.value
    });

    showTemplateModal.value = false;
    await loadDataForCurrentView();
  } catch (err) {
    alert("Erreur lors de l'application de la semaine type : " + err.message);
  } finally {
    saving.value = false;
  }
}

// DUPLICATION MODAL ACTIONS
function openDuplicateModal() {
  duplicateSourceDate.value = currentDateStr.value;
  duplicateTargetPreset.value = 'tomorrow';
  showDuplicateModal.value = true;
}

function openSingleDuplicate(session) {
  duplicateSourceDate.value = session.date || currentDateStr.value;
  duplicateTargetPreset.value = 'tomorrow';
  showDuplicateModal.value = true;
}

function setDuplicatePreset(preset) {
  duplicateTargetPreset.value = preset;
}

async function quickCopyPreviousDay() {
  const prevDate = new Date(currentDate.value);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().slice(0, 10);
  
  try {
    await roomSessionStore.duplicateDay(prevDateStr, [currentDateStr.value], {
      copyManager: true,
      copyParticipants: true,
      overwrite: true
    });
    await loadDataForCurrentView();
  } catch (err) {
    alert(err.message);
  }
}

async function executeDuplicate() {
  saving.value = true;
  try {
    let targetDates = [];
    const srcDate = new Date(duplicateSourceDate.value);

    if (duplicateTargetPreset.value === 'tomorrow') {
      const tomorrow = new Date(srcDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDates.push(tomorrow.toISOString().slice(0, 10));
    } else if (duplicateTargetPreset.value === 'week-days') {
      const startOfWeek = getStartOfWeek(srcDate);
      for (let i = 0; i < 5; i++) {
        const tDate = new Date(startOfWeek);
        tDate.setDate(tDate.getDate() + i);
        const tDateStr = tDate.toISOString().slice(0, 10);
        if (tDateStr !== duplicateSourceDate.value) {
          targetDates.push(tDateStr);
        }
      }
    } else if (duplicateTargetPreset.value === 'next-week') {
      const startOfNextWeek = getStartOfWeek(srcDate);
      startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
      for (let i = 0; i < 5; i++) {
        const tDate = new Date(startOfNextWeek);
        tDate.setDate(tDate.getDate() + i);
        targetDates.push(tDate.toISOString().slice(0, 10));
      }
    }

    await roomSessionStore.duplicateDay(duplicateSourceDate.value, targetDates, {
      copyManager: duplicateCopyManager.value,
      copyParticipants: duplicateCopyParticipants.value,
      overwrite: duplicateOverwrite.value
    });

    showDuplicateModal.value = false;
    await loadDataForCurrentView();
  } catch (err) {
    alert("Erreur de duplication : " + err.message);
  } finally {
    saving.value = false;
  }
}

// WEEK BATCH HELPERS
async function openWeeklyBatchOpen() {
  const startOfWeek = getStartOfWeek(currentDate.value);
  const targetDates = [];
  for (let i = 0; i < 5; i++) {
    const tDate = new Date(startOfWeek);
    tDate.setDate(tDate.getDate() + i);
    targetDates.push(tDate.toISOString().slice(0, 10));
  }

  if (confirm(`Voulez-vous ouvrir toutes les salles pour les 5 jours de la semaine (${weekDaysRangeLabel.value}) ?`)) {
    try {
      await roomSessionStore.applyTemplate(templateLocationsList.value, targetDates, { overwrite: false });
      await loadDataForCurrentView();
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  }
}

async function duplicateWeekDayToOthers() {
  const startOfWeek = getStartOfWeek(currentDate.value);
  const mondayDateStr = startOfWeek.toISOString().slice(0, 10);
  const targetDates = [];

  for (let i = 1; i < 5; i++) {
    const tDate = new Date(startOfWeek);
    tDate.setDate(tDate.getDate() + i);
    targetDates.push(tDate.toISOString().slice(0, 10));
  }

  if (confirm(`Dupliquer les ouvertures du Lundi (${mondayDateStr}) vers Mardi, Mercredi, Jeudi et Vendredi ?`)) {
    try {
      await roomSessionStore.duplicateDay(mondayDateStr, targetDates, {
        copyManager: true,
        copyParticipants: true,
        overwrite: true
      });
      await loadDataForCurrentView();
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  }
}

// BULK ASSIGN MODAL
function openBulkAssignModal() {
  showBulkAssignModal.value = true;
}

async function autoBalanceParticipants() {
  const sessions = currentDaySessions.value;
  if (sessions.length === 0) return;

  const allParts = [...props.participants];
  const partsPerRoom = Math.ceil(allParts.length / sessions.length);

  try {
    for (let i = 0; i < sessions.length; i++) {
      const sess = sessions[i];
      const assignedParts = allParts.slice(i * partsPerRoom, (i + 1) * partsPerRoom).map(p => p.documentId || p.id);
      await roomSessionStore.updateSession(sess.documentId || sess.id, {
        participants: assignedParts
      }, true);
    }
    await loadDataForCurrentView();
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

async function clearAllDayAssignments() {
  if (confirm('Vider les listes de bénéficiaires pour toutes les salles ouvertes aujourd\'hui ?')) {
    try {
      for (const sess of currentDaySessions.value) {
        await roomSessionStore.updateSession(sess.documentId || sess.id, {
          participants: []
        }, true);
      }
      await loadDataForCurrentView();
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  }
}

// BATCH CLEAR PERIOD SESSIONS
async function confirmClearCurrentPeriod() {
  const count = sessions.value.length;
  if (confirm(`Êtes-vous sûr de vouloir fermer et supprimer les ${count} session(s) d'ouverture affichée(s) pour cette période ?`)) {
    try {
      const ids = sessions.value.map(s => s.documentId || s.id);
      await roomSessionStore.batchDeleteSessions(ids);
      await loadDataForCurrentView();
    } catch (err) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  }
}

// PRINTING
function printPage() {
  window.print();
}

function printSingleRoomSheet(session) {
  window.print();
}
</script>

<style scoped>
.room-sessions-root {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

/* ════════════════ HEADER & TOOLBAR ════════════════ */
.view-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 1.5rem;
  border-radius: var(--radius-lg, 1.15rem);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.35));
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.header-title-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon-box {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.25), rgba(2, 132, 199, 0.25));
  border: 1px solid rgba(13, 148, 136, 0.4);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
}

.title-with-pill {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-with-pill h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary, #ffffff);
  letter-spacing: -0.02em;
}

.mode-tag-pill {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
  padding: 0.2rem 0.6rem;
  border-radius: 2rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.subtitle {
  margin: 0.3rem 0 0 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #94a3b8);
}

/* VIEW SWITCHER PILL */
.view-switcher-pill {
  display: flex;
  background: rgba(15, 23, 42, 0.85);
  padding: 0.3rem;
  border-radius: 2rem;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  gap: 0.25rem;
}

.view-pill-btn {
  background: none;
  border: none;
  color: var(--text-secondary, #94a3b8);
  padding: 0.5rem 1.25rem;
  border-radius: 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.view-pill-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.view-pill-btn.active {
  background: linear-gradient(135deg, #0d9488, #0284c7);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);
}

/* TOOLBAR ROW */
.header-toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.06));
}

.date-nav-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.nav-arrow-btn, .today-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  color: var(--text-primary, #ffffff);
  padding: 0.45rem 0.85rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-arrow-btn:hover, .today-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
}

.period-title-block {
  display: flex;
  flex-direction: column;
  padding: 0 0.5rem;
}

.current-period-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #ffffff;
  text-transform: capitalize;
}

.period-subtitle {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
}

.direct-date-input {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  color: #ffffff;
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}

/* ACTION TOOLS GROUP */
.action-tools-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 1.1rem;
  border-radius: 0.6rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.primary-btn {
  background: linear-gradient(135deg, #0d9488, #0284c7);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}

.primary-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  color: var(--text-primary, #ffffff);
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.tool-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #ffffff);
  padding: 0.5rem 0.85rem;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.template-btn {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.3);
}

.template-btn:hover {
  background: rgba(245, 158, 11, 0.22);
}

.danger-tool-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.25);
}

.danger-tool-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
}

.danger-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* METRICS SUMMARY BAR */
.metrics-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.06));
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.85rem 1.1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.05));
}

.metric-icon {
  font-size: 1.5rem;
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.metric-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.metric-value small {
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--text-secondary, #94a3b8);
}

.metric-warn-badge {
  font-size: 0.75rem;
  color: #fbbf24;
  font-weight: 600;
}

.metric-progress-wrapper {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.mini-progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.mini-progress-fill.normal { background: #10b981; }
.mini-progress-fill.warning { background: #f59e0b; }
.mini-progress-fill.full { background: #0284c7; }
.mini-progress-fill.exceeded { background: #ef4444; }
.mini-progress-fill.low { background: #64748b; }

/* ════════════════ 1. VUE JOUR STYLES ════════════════ */
.day-view-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.day-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.02);
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.05));
}

.search-input-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 260px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.9rem;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 0.45rem 2rem 0.45rem 2.2rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.6);
  color: #ffffff;
  font-size: 0.85rem;
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.filter-pills-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.filter-pill-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary, #94a3b8);
  padding: 0.35rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-pill-btn.active {
  background: rgba(13, 148, 136, 0.25);
  color: #5eead4;
  border-color: rgba(13, 148, 136, 0.45);
}

.filter-pill-btn.pill-conflict.active {
  background: rgba(239, 68, 68, 0.22);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.45);
}

.filter-pill-btn.pill-incomplete.active {
  background: rgba(245, 158, 11, 0.22);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.45);
}

.filter-pill-btn.pill-full.active {
  background: rgba(2, 132, 199, 0.25);
  color: #7dd3fc;
  border-color: rgba(2, 132, 199, 0.45);
}

.day-sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
}

.session-card {
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-lg, 1.15rem);
  padding: 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.2));
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.session-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.35));
  border-color: rgba(255, 255, 255, 0.2);
}

.card-overbooked {
  border-color: rgba(239, 68, 68, 0.4);
}

.session-card.card-has-conflict {
  border-color: rgba(239, 68, 68, 0.45);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(15, 23, 42, 0.85) 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.room-title-block {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.room-icon-badge {
  font-size: 1.25rem;
}

.room-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #f8fafc;
}

.room-type-sub {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
  display: block;
}

.capacity-badge-wrapper {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.card-status-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: 2rem;
}

.card-status-badge.badge-conflict {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.card-status-badge.badge-incomplete {
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.card-status-badge.badge-full {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.capacity-badge {
  padding: 0.35rem 0.8rem;
  border-radius: 2rem;
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
}

.capacity-badge.normal { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.capacity-badge.warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.capacity-badge.full { background: rgba(2, 132, 199, 0.25); color: #7dd3fc; }
.capacity-badge.exceeded { background: rgba(239, 68, 68, 0.25); color: #f87171; }

/* CARD CONFLICT ALERT BOX */
.card-conflict-alert-box {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 0.65rem;
  padding: 0.6rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: #fca5a5;
}

.card-conflict-row {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  line-height: 1.35;
}

.conflict-alert-icon {
  font-size: 0.95rem;
  flex-shrink: 0;
}

.conflict-reason {
  font-style: normal;
  color: #ffffff;
  font-weight: 600;
}

.unavail-person-inline {
  display: inline-block;
  margin-right: 0.25rem;
}

.unavail-person-inline em {
  font-style: normal;
  color: #ffffff;
  font-weight: 500;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.manager-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(99, 102, 241, 0.25);
  position: relative;
}

.manager-banner.manager-banner-unavail {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.45);
}

.manager-unassigned {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
}

.manager-avatar-badge {
  font-size: 1.35rem;
}

.manager-info-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.manager-role-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.manager-name-text {
  color: #a5b4fc;
  font-size: 0.95rem;
}

.manager-name-text.name-unavail {
  color: #fca5a5 !important;
  font-weight: 700;
}

.manager-unavail-tag {
  font-size: 0.75rem;
  color: #f87171;
  font-weight: 600;
}

.manager-skills-tag {
  font-size: 0.75rem;
  color: #818cf8;
}

.quick-swap-mgr-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #ffffff;
  padding: 0.3rem 0.5rem;
  border-radius: 0.4rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.quick-swap-mgr-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* PROGRESS SECTION */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.progress-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.progress-label {
  color: var(--text-secondary, #94a3b8);
}

.progress-percent {
  font-weight: 700;
}

.progress-percent.normal { color: #34d399; }
.progress-percent.warning { color: #fbbf24; }
.progress-percent.full { color: #7dd3fc; }
.progress-percent.exceeded { color: #f87171; }

.progress-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-bar.normal { background: #10b981; }
.progress-bar.warning { background: #f59e0b; }
.progress-bar.full { background: #0284c7; }
.progress-bar.exceeded { background: #ef4444; }

.overcapacity-alert-inline {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 0.35rem 0.6rem;
  border-radius: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
}

/* PARTICIPANTS LIST */
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.section-title-row h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #94a3b8);
  font-weight: 600;
}

.mini-link-btn {
  background: none;
  border: none;
  color: var(--primary-text, #5eead4);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  font-weight: 600;
}

.mini-link-btn:hover {
  text-decoration: underline;
}

.mini-link-btn.highlight-link {
  color: #5eead4;
  background: rgba(13, 148, 136, 0.15);
  border: 1px solid rgba(13, 148, 136, 0.3);
  border-radius: 0.35rem;
  padding: 0.2rem 0.5rem;
  transition: all 0.15s ease;
}

.mini-link-btn.highlight-link:hover {
  background: rgba(13, 148, 136, 0.3);
  text-decoration: none;
}

/* INLINE MULTI-PARTICIPANT ADD PANEL */
.inline-multi-add-panel {
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(13, 148, 136, 0.35);
  border-radius: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  animation: fadeIn 0.18s ease;
}

.inline-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.panel-header-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.panel-header-title strong {
  color: #5eead4;
  font-size: 0.85rem;
}

.panel-subtitle {
  font-size: 0.72rem;
  color: #94a3b8;
}

.close-panel-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 0.3rem;
}

.close-panel-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.inline-panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.mini-tabs .filter-tab-btn {
  padding: 0.2rem 0.45rem;
  font-size: 0.7rem;
}

.inline-quick-tools {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.inline-search-box {
  width: 100%;
}

.inline-checkbox-scroll-list {
  max-height: 180px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.no-participants-filtered.mini {
  padding: 0.75rem 0.5rem;
  font-size: 0.78rem;
}

.inline-panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.selected-count-pill {
  font-size: 0.75rem;
  font-weight: 700;
  color: #5eead4;
  background: rgba(13, 148, 136, 0.2);
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(13, 148, 136, 0.35);
}

.panel-action-buttons {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
}

.mini-btn {
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
}

.no-participants-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  padding: 0.75rem;
  border-radius: 0.5rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
}

.participants-pills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  max-height: 140px;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.participant-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.3rem 0.55rem;
  border-radius: 0.5rem;
  font-size: 0.82rem;
  color: #e2e8f0;
}

.participant-pill.pill-unavailable {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.4);
}

.pill-unavail-tag {
  font-size: 0.7rem;
  color: #f87171;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.2);
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
}

.pill-avatar {
  font-size: 0.8rem;
}

.remove-pill-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0;
  margin-left: 0.2rem;
}

.remove-pill-btn:hover {
  color: #f87171;
}

/* SCHEDULED ACTIVITIES */
.scheduled-activities-section {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.75rem;
}

.activities-mini-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.activity-mini-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(2, 132, 199, 0.08);
  padding: 0.35rem 0.6rem;
  border-radius: 0.4rem;
  border-left: 3px solid #0284c7;
  font-size: 0.8rem;
}

.activity-time-badge {
  color: #7dd3fc;
  font-weight: 600;
}

.activity-name-badge {
  color: #f1f5f9;
}

/* CARD FOOTER */
.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
  margin-top: auto;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.icon-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.edit-btn { background: rgba(255, 255, 255, 0.08); color: #ffffff; }
.edit-btn:hover { background: rgba(255, 255, 255, 0.18); }

.duplicate-btn { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
.duplicate-btn:hover { background: rgba(245, 158, 11, 0.25); }

.print-single-btn { background: rgba(2, 132, 199, 0.15); color: #7dd3fc; }
.print-single-btn:hover { background: rgba(2, 132, 199, 0.3); }

.delete-btn { background: rgba(239, 68, 68, 0.12); color: #f87171; }
.delete-btn:hover { background: rgba(239, 68, 68, 0.25); }

/* EMPTY STATE */
.empty-state {
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  border: 1px dashed var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: var(--radius-lg, 1.15rem);
  padding: 3rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-illustration {
  font-size: 3.5rem;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #ffffff;
}

.empty-state p {
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  max-width: 500px;
}

.empty-actions-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

/* ════════════════ 2. VUE SEMAINE (MATRIX) ════════════════ */
.week-view-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.week-toolbar-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.02);
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.05));
}

.week-summary-pill {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;
}

.week-quick-actions {
  display: flex;
  gap: 0.5rem;
}

.week-matrix-wrapper {
  overflow-x: auto;
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-lg, 1.15rem);
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.35));
}

.week-matrix-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.matrix-room-col-header {
  width: 180px;
  background: rgba(15, 23, 42, 0.95);
  padding: 1rem;
  text-align: left;
  font-size: 0.9rem;
  color: #94a3b8;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.matrix-day-header {
  padding: 0.75rem 0.5rem;
  text-align: center;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: background 0.2s;
}

.matrix-day-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.matrix-day-header.is-today {
  background: rgba(13, 148, 136, 0.15);
  border-bottom-color: #0d9488;
}

.matrix-header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.matrix-day-name {
  font-size: 0.8rem;
  color: #94a3b8;
  text-transform: capitalize;
}

.matrix-day-number {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
}

.matrix-day-count-badge {
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.1rem 0.45rem;
  border-radius: 1rem;
  color: #cbd5e1;
  margin-top: 0.2rem;
}

.matrix-room-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.matrix-room-row:last-child {
  border-bottom: none;
}

.matrix-room-cell {
  background: rgba(15, 23, 42, 0.5);
  padding: 1rem;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  vertical-align: middle;
}

.matrix-room-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.matrix-room-title {
  display: block;
  font-size: 0.95rem;
  color: #f8fafc;
}

.matrix-room-cap {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.matrix-slot-cell {
  padding: 0.6rem;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  vertical-align: middle;
  height: 90px;
}

.matrix-slot-cell:last-child {
  border-right: none;
}

.matrix-session-pill {
  position: relative;
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.6rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.matrix-session-pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.3);
}

.matrix-pill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.25rem;
}

.matrix-pill-manager {
  font-size: 0.75rem;
  font-weight: 600;
  color: #a5b4fc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.matrix-pill-capacity {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 0.3rem;
  background: rgba(255, 255, 255, 0.08);
}

.matrix-pill-progress {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.matrix-pill-progress-fill {
  height: 100%;
  background: #10b981;
}

.matrix-session-pill.warning .matrix-pill-progress-fill { background: #f59e0b; }
.matrix-session-pill.full .matrix-pill-progress-fill { background: #0284c7; }
.matrix-session-pill.exceeded .matrix-pill-progress-fill { background: #ef4444; }

.matrix-session-pill.matrix-pill-conflict {
  border-color: rgba(239, 68, 68, 0.6);
  background: rgba(239, 68, 68, 0.15);
}

.matrix-conflict-sub-tag {
  font-size: 0.68rem;
  font-weight: 700;
  color: #f87171;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  background: rgba(239, 68, 68, 0.2);
  display: inline-block;
  margin-top: 0.1rem;
}

.matrix-pill-hover-actions {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  display: none;
  gap: 0.2rem;
  background: rgba(15, 23, 42, 0.9);
  padding: 0.15rem 0.3rem;
  border-radius: 0.4rem;
}

.matrix-session-pill:hover .matrix-pill-hover-actions {
  display: flex;
}

.matrix-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.1rem;
}

.matrix-closed-cell {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  background: rgba(255, 255, 255, 0.01);
  border: 1px dashed rgba(255, 255, 255, 0.05);
  border-radius: 0.6rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 60px;
}

.matrix-closed-cell:hover {
  background: rgba(13, 148, 136, 0.08);
  border-color: rgba(13, 148, 136, 0.3);
}

.closed-label {
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
}

.quick-open-btn {
  display: none;
  background: rgba(13, 148, 136, 0.25);
  border: 1px solid rgba(13, 148, 136, 0.4);
  color: #5eead4;
  padding: 0.2rem 0.5rem;
  border-radius: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.matrix-closed-cell:hover .quick-open-btn {
  display: inline-block;
}

.matrix-closed-cell:hover .closed-label {
  display: none;
}

/* ════════════════ 3. VUE MOIS (MONTH CALENDAR) ════════════════ */
.month-view-container {
  display: flex;
  flex-direction: column;
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-lg, 1.15rem);
  overflow: hidden;
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.35));
}

.month-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.month-header-cell {
  padding: 0.75rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary, #94a3b8);
}

.month-grid-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(110px, 1fr);
}

.month-cell {
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
  transition: background 0.2s ease;
  position: relative;
}

.month-cell:nth-child(7n) {
  border-right: none;
}

.month-cell:hover {
  background: rgba(255, 255, 255, 0.03);
}

.month-cell.other-month {
  opacity: 0.35;
  background: rgba(0, 0, 0, 0.15);
}

.month-cell.is-today {
  background: rgba(13, 148, 136, 0.1);
}

.month-cell-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cell-day-num {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f1f5f9;
}

.today-pulse {
  background: #0d9488;
  color: #ffffff;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(13, 148, 136, 0.6);
}

.month-sessions-count-badge {
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(13, 148, 136, 0.25);
  color: #5eead4;
  padding: 0.1rem 0.4rem;
  border-radius: 1rem;
}

.month-cell-sessions-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.month-mini-session-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.2rem 0.4rem;
  border-radius: 0.35rem;
  font-size: 0.75rem;
  transition: all 0.15s ease;
}

.month-mini-session-badge:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateX(2px);
}

.mini-session-room {
  font-weight: 600;
  color: #f8fafc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-session-info {
  font-weight: 700;
  color: #a5b4fc;
}

.month-more-sessions-badge {
  font-size: 0.7rem;
  color: #94a3b8;
  font-weight: 600;
  padding: 0.1rem 0.2rem;
}

.month-cell-empty {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: auto;
  font-size: 0.7rem;
  color: var(--text-muted, #64748b);
}

.empty-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.month-cell-footer {
  display: none;
  position: absolute;
  bottom: 0.3rem;
  right: 0.3rem;
}

.month-cell:hover .month-cell-footer {
  display: block;
}

.month-cell-quick-add {
  background: rgba(13, 148, 136, 0.85);
  color: #ffffff;
  border: none;
  padding: 0.15rem 0.4rem;
  border-radius: 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
}

/* ════════════════ MODAL STYLES ════════════════ */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1200;
  padding: 1rem;
}

.modal-card {
  background: #0f172a;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: var(--radius-xl, 1.5rem);
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.75rem;
  box-shadow: var(--shadow-lg, 0 16px 40px rgba(0, 0, 0, 0.5));
}

.modal-lg {
  max-width: 760px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-title-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-icon {
  font-size: 1.75rem;
}

.modal-title-box h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffffff;
}

.modal-sub {
  margin: 0.2rem 0 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
}

.close-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 23, 42, 0.8);
  color: #ffffff;
  font-size: 0.9rem;
}

.form-input:focus {
  outline: none;
  border-color: #0d9488;
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.25);
}

.help-text {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* MANAGER & PARTICIPANT AVAILABILITY STYLES */
.form-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.manager-quick-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 0.35rem;
}

.manager-quick-status.status-ok {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.manager-quick-status.status-ko {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.input-unavail-warning {
  border-color: #ef4444 !important;
  background: rgba(239, 68, 68, 0.05) !important;
}

.manager-warning-banner {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: #fca5a5;
  font-size: 0.82rem;
  margin-top: 0.25rem;
}

.manager-warning-banner .warning-icon {
  font-size: 1rem;
}

.manager-warning-banner strong {
  color: #f87171;
}

.manager-warning-banner em {
  font-style: normal;
  color: #ffffff;
  font-weight: 600;
}

.participants-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.participants-title-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.participants-count-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 0.3rem;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.participants-select-tools {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.mini-tool-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #cbd5e1;
  padding: 0.25rem 0.5rem;
  border-radius: 0.3rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}

.mini-tool-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.mini-tool-btn.highlight-btn {
  background: rgba(13, 148, 136, 0.25);
  border: 1px solid rgba(13, 148, 136, 0.4);
  color: #5eead4;
  font-weight: 600;
}

.mini-tool-btn.highlight-btn:hover {
  background: rgba(13, 148, 136, 0.45);
  color: #ffffff;
}

.participant-filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.2rem;
}

.filter-tabs {
  display: flex;
  gap: 0.3rem;
  background: rgba(15, 23, 42, 0.9);
  padding: 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.filter-tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: #94a3b8;
  padding: 0.3rem 0.4rem;
  border-radius: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  transition: all 0.15s ease;
}

.filter-tab-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.04);
}

.filter-tab-btn.active {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.filter-tab-btn.tab-avail.active {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
}

.filter-tab-btn.tab-unavail.active {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.tab-badge {
  font-size: 0.7rem;
  padding: 0.05rem 0.3rem;
  border-radius: 0.25rem;
  background: rgba(0, 0, 0, 0.25);
}

.participant-search-input-wrapper {
  margin-top: 0.1rem;
}

.mini-search {
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
}

.participants-checkbox-list {
  max-height: 200px;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.6rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.65rem;
  border-radius: 0.4rem;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.checkbox-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.checkbox-item.is-checked {
  background: rgba(13, 148, 136, 0.15);
  border-color: rgba(13, 148, 136, 0.35);
}

/* RED HIGHLIGHT FOR UNAVAILABLE BENEFICIARIES */
.checkbox-item.is-unavailable {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.checkbox-item.is-unavailable:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
}

.checkbox-item.is-unavailable.is-checked {
  background: rgba(239, 68, 68, 0.22);
  border-color: rgba(239, 68, 68, 0.6);
}

.checkbox-user-avatar {
  font-size: 0.9rem;
}

.checkbox-user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.1rem;
}

.checkbox-user-name {
  font-size: 0.85rem;
  color: #f1f5f9;
}

.name-unavail {
  color: #fca5a5 !important;
  font-weight: 600;
}

.unavail-reason-badge {
  font-size: 0.72rem;
  color: #f87171;
  font-weight: 600;
}

.avail-indicator-badge {
  font-size: 0.72rem;
  color: #34d399;
  font-weight: 600;
  margin-left: auto;
}

.no-participants-filtered {
  text-align: center;
  padding: 1.25rem 0.5rem;
  font-size: 0.85rem;
  color: #94a3b8;
  font-style: italic;
}

.unavailable-selected-alert {
  background: rgba(239, 68, 68, 0.12);
  border: 1px dashed rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  padding: 0.4rem 0.65rem;
  border-radius: 0.4rem;
  font-size: 0.78rem;
  margin-top: 0.35rem;
}

.warning-exceeded {
  color: #ef4444;
  font-weight: bold;
}

.exceeded-msg {
  color: #f87171;
  font-size: 0.8rem;
  margin: 0.25rem 0 0 0;
}

.form-error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  padding: 0.6rem 0.85rem;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* TEMPLATE MODAL SPECIFIC */
.template-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.section-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mini-link-btn {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.mini-link-btn:hover {
  background: rgba(245, 158, 11, 0.25);
  color: #fef08a;
}

.template-section h4 {
  margin: 0;
  font-size: 1rem;
  color: #ffffff;
}

.section-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary, #94a3b8);
}

.template-period-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.radio-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.75rem;
  border-radius: 0.6rem;
  cursor: pointer;
}

.radio-card input {
  display: none;
}

.radio-card.active {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.4);
}

.radio-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: #f8fafc;
}

.radio-desc {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.custom-date-range-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  padding: 0.75rem;
}

.custom-date-range-box .date-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}

.custom-date-range-box .date-field label {
  font-size: 0.75rem;
  color: var(--text-secondary, #cbd5e1);
}

.custom-date-range-box .date-arrow {
  color: var(--text-secondary, #64748b);
  margin-top: 1rem;
}

.days-validation-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
}

.day-validate-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.4rem;
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.day-validate-card.active {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.15);
}

.day-val-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.day-val-name {
  font-size: 0.8rem;
}

.day-val-count {
  font-size: 0.7rem;
  color: #34d399;
}

.quick-target-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag-btn {
  background: var(--bg-surface-2, #0f172a);
  border: 1px solid var(--border-color, #334155);
  color: var(--text-secondary, #cbd5e1);
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
}

.tag-btn:hover {
  background: #1e293b;
  color: white;
}

.generation-preview-box {
  display: flex;
  gap: 1.5rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-color, #334155);
  border-radius: 8px;
  padding: 0.8rem 1rem;
}

.preview-metric {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.p-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.p-val {
  font-size: 1.1rem;
  color: #f8fafc;
}

.highlight-val {
  color: #38bdf8;
  font-weight: 700;
}

@media (max-width: 900px) {
  .days-validation-row {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* DUPLICATE MODAL PRESETS */
.duplicate-presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

.preset-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  padding: 0.6rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.preset-btn.active {
  background: rgba(13, 148, 136, 0.25);
  border-color: rgba(13, 148, 136, 0.5);
  color: #5eead4;
}

.checkboxes-stack {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* BULK ASSIGN MODAL */
.bulk-assign-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bulk-tools-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.bulk-rooms-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  max-height: 380px;
  overflow-y: auto;
}

.bulk-room-card {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.85rem;
  border-radius: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bulk-room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bulk-room-manager {
  font-size: 0.8rem;
  color: #a5b4fc;
}

.bulk-room-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  max-height: 100px;
  overflow-y: auto;
}

.participant-pill.mini {
  font-size: 0.75rem;
  padding: 0.2rem 0.4rem;
}

/* ════════════════ LOADING & ERROR STATES ════════════════ */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 2rem;
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  border-radius: var(--radius-lg, 1.15rem);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(13, 148, 136, 0.2);
  border-top-color: #0d9488;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.print-only-header {
  display: none;
}

/* ════════════════ PRINT MEDIA STYLES ════════════════ */
@media print {
  .no-print {
    display: none !important;
  }

  body {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .print-only-header {
    display: block !important;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #000000;
  }

  .print-brand-badge {
    font-size: 0.8rem;
    font-weight: 700;
    color: #475569;
    letter-spacing: 0.05em;
  }

  .print-only-header h2 {
    font-size: 1.5rem;
    margin: 0.4rem 0;
    color: #0f172a;
  }

  .session-card {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    color: #000000 !important;
    break-inside: avoid;
    box-shadow: none !important;
    margin-bottom: 1.5rem;
  }

  .room-name {
    color: #0f172a !important;
  }

  .manager-banner {
    background: #f1f5f9 !important;
    border: 1px solid #cbd5e1 !important;
    color: #000000 !important;
  }

  .manager-name-text {
    color: #1e293b !important;
  }

  .participant-pill {
    background: #f8fafc !important;
    border: 1px solid #cbd5e1 !important;
    color: #0f172a !important;
  }
}

/* ════════════════ RESPONSIVE ════════════════ */
@media (max-width: 768px) {
  .header-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .view-switcher-pill {
    width: 100%;
    justify-content: center;
  }

  .form-row-2 {
    grid-template-columns: 1fr;
  }

  .day-sessions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
