<template>
  <div class="extractions-container">
    <!-- ════════════════ TOP HEADER & CONTROLS ════════════════ -->
    <div class="view-header no-print">
      <div class="header-main-row">
        <div class="header-title">
          <h2>📋 Extractions, Fiches & Remplissage</h2>
          <p class="subtitle">Générez et éditez les fiches journalières, hebdomadaires ou mensuelles pour les bénéficiaires, gestionnaires et salles.</p>
        </div>

        <div class="header-action-buttons">
          <button class="action-btn smart-fill-btn" @click="openSmartFillModal" title="Ouvrir l'assistant de remplissage automatique et d'affectation">
            ⚡ Assistant Remplissage
          </button>
          <div class="export-dropdown-wrapper">
            <button class="action-btn export-btn" @click="toggleExportMenu" title="Exporter les données au format CSV / Excel">
              📥 Exporter CSV ▾
            </button>
            <div v-if="showExportMenu" class="export-menu-dropdown" @click="showExportMenu = false">
              <button @click="exportCurrentViewCSV">📄 Données de la vue courante ({{ timeViewLabel }})</button>
              <button @click="exportAttendanceRegisterCSV">✍️ Feuille d'émargement globale</button>
              <button @click="exportRoomsOccupancyCSV">🏢 Taux de remplissage des salles</button>
            </div>
          </div>
          <button class="action-btn print-btn" @click="printExtraction" title="Imprimer la fiche active ou la feuille de route">
            🖨️ Imprimer la Fiche
          </button>
        </div>
      </div>

      <!-- TEMPORAL NAVIGATION BAR: DAY / WEEK / MONTH -->
      <div class="temporal-navigation-bar">
        <!-- View mode toggles -->
        <div class="time-view-switchers">
          <button 
            class="time-btn" 
            :class="{ active: timeView === 'day' }" 
            @click="setTimeView('day')"
          >
            ☀️ Vue Jour
          </button>
          <button 
            class="time-btn" 
            :class="{ active: timeView === 'week' }" 
            @click="setTimeView('week')"
          >
            📅 Vue Semaine
          </button>
          <button 
            class="time-btn" 
            :class="{ active: timeView === 'month' }" 
            @click="setTimeView('month')"
          >
            🗓️ Vue Mois
          </button>
        </div>

        <!-- Date navigator controls -->
        <div class="date-navigator-controls">
          <button 
            type="button" 
            class="nav-arrow-btn" 
            :class="{ 'is-loading': loading && lastNavAction === 'prev' }"
            :disabled="loading" 
            @click="navigatePeriod(-1)" 
            title="Période précédente"
          >
            <span v-if="loading && lastNavAction === 'prev'" class="mini-spinner"></span>
            <span v-else>◄</span>
          </button>
          <button 
            type="button" 
            class="today-btn" 
            :class="{ 'is-loading': loading && lastNavAction === 'today' }"
            :disabled="loading" 
            @click="goToToday" 
            title="Revenir au jour présent"
          >
            <span v-if="loading && lastNavAction === 'today'" class="mini-spinner inline"></span>
            Aujourd'hui
          </button>
          <button 
            type="button" 
            class="nav-arrow-btn" 
            :class="{ 'is-loading': loading && lastNavAction === 'next' }"
            :disabled="loading" 
            @click="navigatePeriod(1)" 
            title="Période suivante"
          >
            <span v-if="loading && lastNavAction === 'next'" class="mini-spinner"></span>
            <span v-else>►</span>
          </button>

          <div class="period-title-badge">
            <span class="period-text">{{ periodTitle }}</span>
            <span v-if="loading" class="nav-loading-badge">
              <span class="pulse-dot"></span> Chargement...
            </span>
            <span v-else-if="timeView === 'week'" class="period-sub">{{ periodDateRangeLabel }}</span>
          </div>

          <div class="date-picker-inline" :class="{ 'is-loading': loading && lastNavAction === 'date-input' }">
            <input 
              type="date" 
              v-model="selectedDate" 
              :disabled="loading"
              @change="lastNavAction = 'date-input'"
              class="form-input date-input-field" 
              title="Choisir une date de référence"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ EXTRACTION MODE TABS ════════════════ -->
    <div class="mode-tabs no-print">
      <button 
        class="tab-btn" 
        :class="{ active: mode === 'participant' }" 
        @click="mode = 'participant'"
      >
        👤 Fiche Bénéficiaire
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: mode === 'manager' }" 
        @click="mode = 'manager'"
      >
        👨‍💼 Feuille de Route Gestionnaire / Animateur
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: mode === 'room' }" 
        @click="mode = 'room'"
      >
        🏢 Fiche Salle & Taux de Remplissage
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: mode === 'summary' }" 
        @click="mode = 'summary'"
      >
        📊 Synthèse Globale & Émargement
      </button>
    </div>

    <!-- ════════════════ PRINT OFFICIAL HEADER (ONLY VISIBLE ON PRINT) ════════════════ -->
    <div class="print-official-header">
      <div class="print-brand">EHPAD LES ÉCRIVAINS — ACCUEIL DE JOUR • GUÉRANDE</div>
      <div class="print-title-row">
        <h2>{{ getPrintDocTitle() }}</h2>
        <span class="print-date">Période : {{ periodTitle }} (Vue {{ timeViewLabel }})</span>
      </div>
      <div class="print-sub-info">Document édité le {{ currentFormattedDate }} • Système de Gestion AetherScheduler</div>
    </div>

    <div class="extraction-body printable-area" style="position: relative;">
      <!-- Translucent Loading Overlay during extraction fetch -->
      <div v-if="loading" class="extraction-loading-overlay">
        <div class="loading-card-badge">
          <div class="spinner"></div>
          <span>Actualisation des données d'extraction ({{ periodTitle }})...</span>
        </div>
      </div>
      <!-- ══════════════════════════════════════════════════════════════
           MODE 1: FICHE BÉNÉFICIAIRE (PARTICIPANT)
      ══════════════════════════════════════════════════════════════ -->
      <div v-if="mode === 'participant'" class="extraction-mode-wrapper">
        <!-- Participant Selector & Tools -->
        <div class="selector-card no-print">
          <div class="selector-row">
            <div class="selector-col flex-1">
              <label>🔍 Sélectionner un Bénéficiaire :</label>
              <SearchableSelect
                v-model="selectedParticipantId"
                :options="participants"
                type="participant"
                placeholder="Rechercher par lettre, prénom, nom ou email..."
                empty-message="Aucun bénéficiaire correspondant trouvé"
              />
            </div>
            <div class="selector-actions-col" v-if="selectedParticipant">
              <button class="action-btn secondary-btn" @click="openQuickSlotAssignModal">
                ➕ Inscrire à un créneau
              </button>
              <button class="action-btn secondary-btn" @click="openQuickRoomAssignModal">
                🚪 Changer de salle d'accueil
              </button>
            </div>
          </div>
        </div>

        <div v-if="!selectedParticipant" class="empty-state no-print">
          <span class="empty-icon">👤</span>
          <p>Veuillez sélectionner un bénéficiaire ci-dessus pour afficher et éditer sa fiche (Vue {{ timeViewLabel }}).</p>
        </div>

        <div v-else class="report-card">
          <!-- Person Header Banner -->
          <div class="report-header">
            <div class="person-badge">
              <span class="badge-avatar">👤</span>
              <div>
                <h3>{{ selectedParticipant.firstName }} {{ selectedParticipant.lastName }}</h3>
                <span class="date-label">{{ selectedParticipant.email || 'Bénéficiaire Accueil de Jour' }}</span>
              </div>
            </div>

            <!-- Stats Badge for the period -->
            <div class="period-stats-box">
              <div class="stat-pill">
                <span class="stat-num">{{ participantPeriodStats.activeDaysCount }}</span>
                <span class="stat-lbl">Jour(s) présent(s)</span>
              </div>
              <div class="stat-pill">
                <span class="stat-num">{{ participantPeriodStats.activitiesCount }}</span>
                <span class="stat-lbl">Activité(s)</span>
              </div>
              <div class="stat-pill">
                <span class="stat-num">{{ participantPeriodStats.totalHours }}h</span>
                <span class="stat-lbl">Volume horaire</span>
              </div>
            </div>
          </div>

          <!-- ─── SUB-VIEW 1.1: PARTICIPANT VUE JOUR ─── -->
          <div v-if="timeView === 'day'" class="view-content-section">
            <div class="room-assignment-box" v-if="participantDayRoomSession">
              <div class="room-assignment-content">
                <span class="label">📍 Accueil & Salle attribuée :</span>
                <strong>{{ participantDayRoomSession.location?.name || 'Salle d\'accueil' }}</strong>
                <div class="sub-label">
                  Gestionnaire référent : 
                  <span>👨‍💼 {{ getFacilitatorName(participantDayRoomSession.manager) }}</span>
                </div>
              </div>
              <button class="action-link-btn no-print" @click="openQuickRoomAssignModal">
                ✏️ Modifier
              </button>
            </div>
            <div class="room-assignment-box warning" v-else>
              <div class="warning-msg">
                ⚠️ Ce bénéficiaire n'est pas encore inscrit dans une salle pour le {{ formatDate(selectedDate) }}.
              </div>
              <button class="action-btn primary-btn btn-sm no-print" @click="openQuickRoomAssignModal">
                ➕ Affecter à une salle
              </button>
            </div>

            <!-- Schedule Timeline -->
            <div class="report-section mt-4">
              <div class="section-title-row">
                <h4>🎯 Programme des Activités de la Journée ({{ participantDayActivities.length }})</h4>
                <button class="action-btn secondary-btn btn-sm no-print" @click="openQuickSlotAssignModal">
                  ➕ Inscrire à une activité
                </button>
              </div>

              <div v-if="participantDayActivities.length === 0" class="no-activities">
                Aucune activité programmée pour ce bénéficiaire le {{ formatDate(selectedDate) }}.
              </div>

              <div v-else class="activities-timeline">
                <div v-for="act in participantDayActivities" :key="act.documentId || act.id" class="activity-timeline-item">
                  <div class="time-col">
                    <span class="time-start">{{ formatTime(act.startDate) }}</span>
                    <span class="time-end">{{ formatTime(act.endDate) }}</span>
                  </div>

                  <div class="activity-card">
                    <div class="act-title-row">
                      <h5>{{ act.activityTemplate?.name || act.name || 'Activité' }}</h5>
                      <span class="location-tag">📍 {{ act.location?.name || participantDayRoomSession?.location?.name || 'Salle' }}</span>
                    </div>

                    <p class="act-desc" v-if="act.activityTemplate?.description">
                      {{ act.activityTemplate.description }}
                    </p>

                    <div class="act-animator">
                      <span class="anim-label">Animateur :</span>
                      <strong class="anim-name">
                        👨‍🏫 {{ getEffectiveAnimatorName(act, participantDayRoomSession) }}
                      </strong>
                      <span v-if="isDefaultManagerAnimator(act, participantDayRoomSession)" class="default-badge">
                        (Gestionnaire de salle)
                      </span>
                    </div>
                  </div>

                  <div class="act-actions no-print">
                    <button class="icon-btn edit-btn" @click="openEditSlotModal(act)" title="Modifier ce créneau">✏️</button>
                    <button class="icon-btn delete-btn" @click="removeParticipantFromSlot(act, selectedParticipantId)" title="Désinscrire de ce créneau">❌</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Attendance / Signature Box for Print -->
            <div class="signature-box">
              <div class="sig-block">
                <span>Émargement Bénéficiaire / Accompagnateur :</span>
                <div class="sig-line"></div>
              </div>
              <div class="sig-block">
                <span>Visa du Professionnel Référent :</span>
                <div class="sig-line"></div>
              </div>
            </div>
          </div>

          <!-- ─── SUB-VIEW 1.2: PARTICIPANT VUE SEMAINE ─── -->
          <div v-else-if="timeView === 'week'" class="view-content-section">
            <div class="section-title-row">
              <h4>📅 Récapitulatif Hebdomadaire ({{ periodDateRangeLabel }})</h4>
            </div>

            <div class="week-days-schedule-grid">
              <div 
                v-for="dayObj in weekDaysList" 
                :key="dayObj.dateKey" 
                class="week-day-schedule-card"
                :class="{ 'is-today': dayObj.isToday, 'has-activities': getParticipantActivitiesForDate(dayObj.dateKey).length > 0 || getParticipantRoomForDate(dayObj.dateKey) }"
              >
                <div class="day-card-header">
                  <div class="day-title">
                    <span class="day-name">{{ dayObj.dayName }}</span>
                    <span class="day-num">{{ dayObj.dayNumber }} {{ dayObj.monthShort }}</span>
                  </div>
                  <span class="day-status-tag" v-if="getParticipantRoomForDate(dayObj.dateKey)">
                    📍 {{ getParticipantRoomForDate(dayObj.dateKey).location?.name }}
                  </span>
                  <span class="day-status-tag tag-off" v-else>
                    Absent / Non inscrit
                  </span>
                </div>

                <div class="day-card-body">
                  <div class="day-room-info" v-if="getParticipantRoomForDate(dayObj.dateKey)">
                    <small>👨‍💼 Référent: {{ getFacilitatorName(getParticipantRoomForDate(dayObj.dateKey).manager) }}</small>
                  </div>

                  <div class="day-activities-list">
                    <div 
                      v-for="act in getParticipantActivitiesForDate(dayObj.dateKey)" 
                      :key="act.documentId || act.id"
                      class="mini-act-badge"
                    >
                      <span class="mini-act-time">{{ formatTime(act.startDate) }}</span>
                      <strong class="mini-act-name">{{ act.activityTemplate?.name || act.name }}</strong>
                      <span class="mini-act-anim">👨‍🏫 {{ getEffectiveAnimatorName(act, getParticipantRoomForDate(dayObj.dateKey)) }}</span>
                    </div>

                    <div v-if="getParticipantActivitiesForDate(dayObj.dateKey).length === 0" class="no-mini-act">
                      Aucune activité programmée
                    </div>
                  </div>
                </div>

                <div class="day-card-footer no-print">
                  <button class="action-btn secondary-btn btn-xs" @click="quickAssignSlotOnDate(dayObj.dateKey)">
                    ➕ Inscrire
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── SUB-VIEW 1.3: PARTICIPANT VUE MOIS ─── -->
          <div v-else class="view-content-section">
            <div class="section-title-row">
              <h4>🗓️ Calendrier Mensuel des Présences & Activités ({{ periodTitle }})</h4>
            </div>

            <div class="month-calendar-grid">
              <div v-for="dName in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="dName" class="month-grid-col-header">
                {{ dName }}
              </div>
              <div 
                v-for="cell in monthDaysGrid" 
                :key="cell.dateKey" 
                class="month-cal-cell"
                :class="{ 
                  'other-month': !cell.isCurrentMonth, 
                  'is-today': cell.isToday,
                  'has-schedule': cell.isCurrentMonth && (getParticipantActivitiesForDate(cell.dateKey).length > 0 || getParticipantRoomForDate(cell.dateKey))
                }"
                @click="cell.isCurrentMonth && selectDayFromMonth(cell.dateKey)"
              >
                <div class="cell-top">
                  <span class="cell-num">{{ cell.dayNumber }}</span>
                  <span v-if="cell.isCurrentMonth && getParticipantRoomForDate(cell.dateKey)" class="room-dot" title="Salle ouverte">📍</span>
                </div>
                <div class="cell-acts" v-if="cell.isCurrentMonth">
                  <div 
                    v-for="act in getParticipantActivitiesForDate(cell.dateKey).slice(0, 2)" 
                    :key="act.documentId || act.id"
                    class="month-mini-pill"
                    :title="act.activityTemplate?.name"
                  >
                    {{ act.activityTemplate?.name }}
                  </div>
                  <span v-if="getParticipantActivitiesForDate(cell.dateKey).length > 2" class="more-count">
                    +{{ getParticipantActivitiesForDate(cell.dateKey).length - 2 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           MODE 2: FEUILLE DE ROUTE GESTIONNAIRE / ANIMATEUR
      ══════════════════════════════════════════════════════════════ -->
      <div v-else-if="mode === 'manager'" class="extraction-mode-wrapper">
        <div class="selector-card no-print">
          <div class="selector-row">
            <div class="selector-col flex-1">
              <label>🔍 Sélectionner un Animateur / Gestionnaire :</label>
              <SearchableSelect
                v-model="selectedFacilitatorId"
                :options="facilitators"
                type="facilitator"
                placeholder="Rechercher par lettre, prénom, nom ou email..."
                empty-message="Aucun professionnel correspondant trouvé"
              />
            </div>
            <div class="selector-actions-col" v-if="selectedFacilitator">
              <button class="action-btn secondary-btn" @click="openCreateSessionForManagerModal">
                🚪 Assigner une salle
              </button>
            </div>
          </div>
        </div>

        <div v-if="!selectedFacilitator" class="empty-state no-print">
          <span class="empty-icon">👨‍💼</span>
          <p>Veuillez sélectionner un gestionnaire de salle ci-dessus pour générer sa feuille de route (Vue {{ timeViewLabel }}).</p>
        </div>

        <div v-else class="report-card">
          <!-- Manager Header -->
          <div class="report-header manager-theme">
            <div class="person-badge">
              <span class="badge-avatar">👨‍💼</span>
              <div>
                <h3>{{ selectedFacilitator.firstName }} {{ selectedFacilitator.lastName }}</h3>
                <span class="role-subtitle">Feuille de Route Professionnelle — {{ periodTitle }}</span>
              </div>
            </div>

            <!-- Stats pill for manager -->
            <div class="period-stats-box">
              <div class="stat-pill">
                <span class="stat-num">{{ managerPeriodStats.managedRoomsCount }}</span>
                <span class="stat-lbl">Salle(s) gérée(s)</span>
              </div>
              <div class="stat-pill">
                <span class="stat-num">{{ managerPeriodStats.activitiesCount }}</span>
                <span class="stat-lbl">Animation(s)</span>
              </div>
              <div class="stat-pill">
                <span class="stat-num">{{ managerPeriodStats.totalParticipantsCount }}</span>
                <span class="stat-lbl">Bénéficiaire(s)</span>
              </div>
              <div class="stat-pill">
                <span class="stat-num">{{ managerPeriodStats.totalHours }}h</span>
                <span class="stat-lbl">Volume horaire</span>
              </div>
            </div>
          </div>

          <!-- ─── SUB-VIEW 2.1: MANAGER VUE JOUR ─── -->
          <div v-if="timeView === 'day'" class="view-content-section">
            <!-- Room Management Summary -->
            <div class="managed-rooms-box" v-if="managerDayRoomSessions.length > 0">
              <span class="label">📍 Salle(s) sous votre responsabilité aujourd'hui :</span>
              <div class="room-tags-wrapper">
                <div v-for="s in managerDayRoomSessions" :key="s.documentId || s.id" class="room-summary-chip">
                  <strong>📍 {{ s.location?.name }}</strong>
                  <span>(Capacité: {{ (s.participants || []).length }}/{{ s.location?.capacity || 10 }})</span>
                  <button class="action-btn secondary-btn btn-xs no-print ml-2" @click="openEditSessionModal(s)">
                    ✏️ Modifier
                  </button>
                </div>
              </div>
            </div>
            <div class="managed-rooms-box warning" v-else>
              ℹ️ Aucune ouverture de salle attribuée à ce professionnel le {{ formatDate(selectedDate) }}.
            </div>

            <!-- Section 1: Beneficiaries list -->
            <div class="report-section mt-4">
              <div class="section-title-row">
                <h4>👥 Bénéficiaires sous votre responsabilité ({{ managerDayParticipants.length }})</h4>
                <button class="action-btn secondary-btn btn-sm no-print" @click="openBatchAssignToManagerRoomModal" v-if="managerDayRoomSessions.length > 0">
                  ➕ Ajouter des bénéficiaires
                </button>
              </div>

              <div v-if="managerDayParticipants.length === 0" class="no-participants">
                Aucun bénéficiaire affecté pour cette journée.
              </div>

              <div v-else class="participants-grid">
                <div v-for="p in managerDayParticipants" :key="p.documentId || p.id" class="participant-card">
                  <span class="p-avatar">👤</span>
                  <div class="p-info">
                    <strong>{{ p.firstName }} {{ p.lastName }}</strong>
                    <span class="p-email">{{ p.email || 'Bénéficiaire' }}</span>
                  </div>
                  <button class="icon-btn delete-btn no-print" @click="removeParticipantFromManagerRoom(p)" title="Retirer de la salle">❌</button>
                </div>
              </div>
            </div>

            <!-- Section 2: Room Activities Schedule -->
            <div class="report-section mt-4">
              <div class="section-title-row">
                <h4>🎯 Programme des Animations & Créneaux de la Journée</h4>
              </div>

              <div v-if="managerDayActivities.length === 0" class="no-activities">
                Aucune animation programmée pour cette journée.
              </div>

              <div v-else class="activities-table-wrapper">
                <table class="activities-table">
                  <thead>
                    <tr>
                      <th>Horaire</th>
                      <th>Activité</th>
                      <th>Lieu</th>
                      <th>Rôle & Statut</th>
                      <th>Participants Inscrits</th>
                      <th class="no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="act in managerDayActivities" :key="act.documentId || act.id">
                      <td class="time-cell">
                        {{ formatTime(act.startDate) }} - {{ formatTime(act.endDate) }}
                      </td>
                      <td class="act-name-cell">
                        <strong>{{ act.activityTemplate?.name || act.name }}</strong>
                      </td>
                      <td>{{ act.location?.name || 'Salle' }}</td>
                      <td>
                        <span class="animator-status" :class="getAnimatorStatusClass(act)">
                          {{ getAnimatorStatusText(act) }}
                        </span>
                      </td>
                      <td>
                        <div class="parts-chips-mini">
                          <span v-for="p in (act.participants || []).slice(0, 4)" :key="p.documentId || p.id" class="p-mini-chip">
                            {{ p.firstName }} {{ p.lastName?.[0] }}.
                          </span>
                          <span v-if="(act.participants || []).length > 4" class="p-mini-more">
                            +{{ (act.participants || []).length - 4 }}
                          </span>
                        </div>
                      </td>
                      <td class="no-print">
                        <button class="icon-btn edit-btn" @click="openEditSlotModal(act)" title="Modifier">✏️</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Manager Signature on Print -->
            <div class="signature-box">
              <div class="sig-block">
                <span>Visa du Gestionnaire / Animateur :</span>
                <div class="sig-line"></div>
              </div>
              <div class="sig-block">
                <span>Observations de fin de journée :</span>
                <div class="sig-line"></div>
              </div>
            </div>
          </div>

          <!-- ─── SUB-VIEW 2.2: MANAGER VUE SEMAINE ─── -->
          <div v-else-if="timeView === 'week'" class="view-content-section">
            <div class="section-title-row">
              <h4>📅 Feuille de Route Hebdomadaire ({{ periodDateRangeLabel }})</h4>
            </div>

            <div class="week-days-schedule-grid">
              <div 
                v-for="dayObj in weekDaysList" 
                :key="dayObj.dateKey" 
                class="week-day-schedule-card"
                :class="{ 'is-today': dayObj.isToday, 'has-activities': getManagerActivitiesForDate(dayObj.dateKey).length > 0 || getManagerRoomsForDate(dayObj.dateKey).length > 0 }"
              >
                <div class="day-card-header">
                  <div class="day-title">
                    <span class="day-name">{{ dayObj.dayName }}</span>
                    <span class="day-num">{{ dayObj.dayNumber }} {{ dayObj.monthShort }}</span>
                  </div>
                  <span class="day-status-tag" v-if="getManagerRoomsForDate(dayObj.dateKey).length > 0">
                    🏢 {{ getManagerRoomsForDate(dayObj.dateKey).map(s => s.location?.name).join(', ') }}
                  </span>
                  <span class="day-status-tag tag-off" v-else>
                    Non planifié
                  </span>
                </div>

                <div class="day-card-body">
                  <div class="day-manager-summary">
                    <span class="mgr-stat-item">
                      👥 {{ getManagerParticipantsForDate(dayObj.dateKey).length }} bénéficiaires
                    </span>
                  </div>

                  <div class="day-activities-list">
                    <div 
                      v-for="act in getManagerActivitiesForDate(dayObj.dateKey)" 
                      :key="act.documentId || act.id"
                      class="mini-act-badge"
                    >
                      <span class="mini-act-time">{{ formatTime(act.startDate) }}</span>
                      <strong class="mini-act-name">{{ act.activityTemplate?.name || act.name }}</strong>
                      <span class="mini-act-location">📍 {{ act.location?.name }}</span>
                    </div>

                    <div v-if="getManagerActivitiesForDate(dayObj.dateKey).length === 0" class="no-mini-act">
                      Aucune activité à encadrer
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── SUB-VIEW 2.3: MANAGER VUE MOIS ─── -->
          <div v-else class="view-content-section">
            <div class="section-title-row">
              <h4>🗓️ Calendrier Mensuel des Interventions ({{ periodTitle }})</h4>
            </div>

            <div class="month-calendar-grid">
              <div v-for="dName in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="dName" class="month-grid-col-header">
                {{ dName }}
              </div>
              <div 
                v-for="cell in monthDaysGrid" 
                :key="cell.dateKey" 
                class="month-cal-cell"
                :class="{ 
                  'other-month': !cell.isCurrentMonth, 
                  'is-today': cell.isToday,
                  'has-schedule': cell.isCurrentMonth && (getManagerActivitiesForDate(cell.dateKey).length > 0 || getManagerRoomsForDate(cell.dateKey).length > 0)
                }"
                @click="cell.isCurrentMonth && selectDayFromMonth(cell.dateKey)"
              >
                <div class="cell-top">
                  <span class="cell-num">{{ cell.dayNumber }}</span>
                  <span v-if="cell.isCurrentMonth && getManagerRoomsForDate(cell.dateKey).length > 0" class="room-dot" title="Gestionnaire de salle">🏢</span>
                </div>
                <div class="cell-acts" v-if="cell.isCurrentMonth">
                  <div 
                    v-for="act in getManagerActivitiesForDate(cell.dateKey).slice(0, 2)" 
                    :key="act.documentId || act.id"
                    class="month-mini-pill manager-pill"
                  >
                    {{ act.activityTemplate?.name }}
                  </div>
                  <span v-if="getManagerActivitiesForDate(cell.dateKey).length > 2" class="more-count">
                    +{{ getManagerActivitiesForDate(cell.dateKey).length - 2 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           MODE 3: FICHE SALLE & TAUX DE REMPLISSAGE
      ══════════════════════════════════════════════════════════════ -->
      <div v-else-if="mode === 'room'" class="extraction-mode-wrapper">
        <div class="selector-card no-print">
          <div class="selector-row">
            <div class="selector-col flex-1">
              <SearchableSelect
                v-model="selectedLocationId"
                :options="[{ documentId: '', id: '', name: '🏢 Toutes les Salles' }, ...locations]"
                type="location"
                label="🏢 Sélectionner une Salle / Lieu :"
                placeholder="Rechercher une salle par son nom..."
                empty-message="Aucune salle trouvée"
              />
            </div>
            <div class="selector-actions-col">
              <button class="action-btn primary-btn" @click="openOpenRoomModal">
                ➕ Ouvrir une Salle
              </button>
            </div>
          </div>
        </div>

        <!-- ─── SUB-VIEW 3.1: ROOM VUE JOUR ─── -->
        <div v-if="timeView === 'day'" class="view-content-section">
          <div v-if="filteredDayRoomSessions.length === 0" class="empty-state">
            <span class="empty-icon">🏢</span>
            <p>Aucune session d'ouverture de salle configurée pour le {{ formatDate(selectedDate) }}.</p>
            <button class="action-btn primary-btn mt-2 no-print" @click="openOpenRoomModal">
              ➕ Ouvrir une salle maintenant
            </button>
          </div>

          <div v-else class="rooms-grid">
            <div v-for="session in filteredDayRoomSessions" :key="session.documentId || session.id" class="report-card room-card-detail">
              <div class="report-header room-theme">
                <div class="room-header-left">
                  <span class="badge-avatar">📍</span>
                  <div>
                    <h3>{{ session.location?.name || 'Salle' }}</h3>
                    <span class="date-label">
                      Gestionnaire : 
                      <strong :class="{ 'name-unavail': getSessionConflictInfo(session).unavailableManager }">
                        {{ getSessionConflictInfo(session).unavailableManager ? '🔴' : '👨‍💼' }} {{ getFacilitatorName(session.manager) }}
                      </strong>
                      <em v-if="getSessionConflictInfo(session).unavailableManager" style="color: #f87171; font-style: normal; font-weight: 600; margin-left: 0.35rem;">
                        (⚠️ Indisponible : {{ getSessionConflictInfo(session).unavailableManager.reason }})
                      </em>
                    </span>
                  </div>
                </div>

                <div class="room-gauge-wrapper">
                  <div class="gauge-bar-container">
                    <div 
                      class="gauge-bar" 
                      :style="{ width: Math.min(100, getRoomOccupancyPercent(session)) + '%' }"
                      :class="getRoomOccupancyColorClass(session)"
                    ></div>
                  </div>
                  <div class="gauge-labels">
                    <span class="gauge-count"><strong>{{ (session.participants || []).length }}</strong> / {{ session.location?.capacity || 10 }} inscrits</span>
                    <span class="gauge-pct">({{ getRoomOccupancyPercent(session) }}%)</span>
                  </div>
                </div>
              </div>

              <!-- Beneficiaries inside room -->
              <div class="report-section mt-3">
                <div class="section-title-row">
                  <h4>👥 Bénéficiaires Affectés à cette Salle ({{ (session.participants || []).length }})</h4>
                  <div class="section-tools no-print">
                    <button class="action-btn secondary-btn btn-xs" @click="openAddParticipantsToRoomModal(session)">
                      ➕ Affecter
                    </button>
                    <button class="action-btn smart-fill-btn btn-xs" @click="autoFillRoomToCapacity(session)" title="Remplir automatiquement cette salle jusqu'à sa capacité">
                      ⚡ Remplir au max
                    </button>
                  </div>
                </div>

                <div v-if="(session.participants || []).length === 0" class="no-participants">
                  Aucun bénéficiaire affecté dans cette salle pour l'instant.
                </div>

                <div v-else class="room-participants-chips">
                  <div 
                    v-for="p in session.participants" 
                    :key="p.documentId || p.id" 
                    class="p-chip-tag"
                    :class="{ 'p-chip-unavail': isParticipantUnavailableInSession(p, session) }"
                    :title="getParticipantUnavailabilityTitle(p, session)"
                  >
                    <span>{{ isParticipantUnavailableInSession(p, session) ? '🔴' : '👤' }} {{ p.firstName }} {{ p.lastName }}</span>
                    <span v-if="isParticipantUnavailableInSession(p, session)" class="unavail-chip-badge">⚠️ Indispo</span>
                    <button class="remove-chip-btn no-print" @click="removeParticipantFromSession(session, p)" title="Retirer">✕</button>
                  </div>
                </div>
              </div>

              <!-- Activities in room -->
              <div class="report-section mt-4">
                <div class="section-title-row">
                  <h4>🎯 Activités Déroulées dans cette Salle</h4>
                </div>

                <div v-if="getActivitiesForSession(session).length === 0" class="no-activities">
                  Aucune activité programmée dans cette salle aujourd'hui.
                </div>

                <div v-else class="activities-table-wrapper">
                  <table class="activities-table">
                    <thead>
                      <tr>
                        <th>Horaire</th>
                        <th>Activité</th>
                        <th>Animateur</th>
                        <th>Inscrits</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="act in getActivitiesForSession(session)" :key="act.documentId || act.id">
                        <td class="time-cell">{{ formatTime(act.startDate) }} - {{ formatTime(act.endDate) }}</td>
                        <td><strong>{{ act.activityTemplate?.name || act.name }}</strong></td>
                        <td>👨‍🏫 {{ getEffectiveAnimatorName(act, session) }}</td>
                        <td>{{ (act.participants || []).length }} participant(s)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Room Footer Actions -->
              <div class="room-card-footer no-print">
                <button class="action-btn secondary-btn btn-sm" @click="openEditSessionModal(session)">
                  ✏️ Modifier la session
                </button>
                <button class="action-btn danger-btn btn-sm" @click="confirmDeleteSession(session)">
                  🗑️ Fermer la salle
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── SUB-VIEW 3.2: ROOM VUE SEMAINE ─── -->
        <div v-else-if="timeView === 'week'" class="view-content-section">
          <div class="report-card">
            <div class="section-title-row">
              <h4>📊 Matrice de Remplissage Hebdomadaire des Salles ({{ periodDateRangeLabel }})</h4>
            </div>

            <div class="occupancy-matrix-wrapper">
              <table class="occupancy-matrix-table">
                <thead>
                  <tr>
                    <th>Salle</th>
                    <th>Capacité</th>
                    <th v-for="dayObj in weekDaysList" :key="dayObj.dateKey" :class="{ 'is-today-col': dayObj.isToday }">
                      {{ dayObj.dayName }}<br><small>{{ dayObj.dayNumber }} {{ dayObj.monthShort }}</small>
                    </th>
                    <th>Moyenne</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="loc in displayedLocationsList" :key="loc.documentId || loc.id">
                    <td class="loc-name-cell">
                      <strong>📍 {{ loc.name }}</strong>
                    </td>
                    <td>👥 {{ loc.capacity }}</td>
                    <td 
                      v-for="dayObj in weekDaysList" 
                      :key="dayObj.dateKey"
                      class="matrix-occupancy-cell"
                      :class="getMatrixCellClass(loc, dayObj.dateKey)"
                    >
                      <div class="matrix-cell-content">
                        <strong>{{ getOccupancyCount(loc, dayObj.dateKey) }}</strong>
                        <span class="matrix-cell-pct">({{ getOccupancyPercentage(loc, dayObj.dateKey) }}%)</span>
                      </div>
                    </td>
                    <td class="matrix-avg-cell">
                      <strong>{{ getAverageOccupancyForLocation(loc) }}%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ─── SUB-VIEW 3.3: ROOM VUE MOIS ─── -->
        <div v-else class="view-content-section">
          <div class="report-card">
            <div class="section-title-row">
              <h4>🗓️ Taux de Remplissage Mensuel par Jour ({{ periodTitle }})</h4>
            </div>

            <div class="month-calendar-grid">
              <div v-for="dName in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="dName" class="month-grid-col-header">
                {{ dName }}
              </div>
              <div 
                v-for="cell in monthDaysGrid" 
                :key="cell.dateKey" 
                class="month-cal-cell"
                :class="{ 'other-month': !cell.isCurrentMonth, 'is-today': cell.isToday }"
                @click="cell.isCurrentMonth && selectDayFromMonth(cell.dateKey)"
              >
                <div class="cell-top">
                  <span class="cell-num">{{ cell.dayNumber }}</span>
                </div>
                <div class="cell-room-stats" v-if="cell.isCurrentMonth">
                  <div class="stat-pill-mini" :class="getDayOverallOccupancyClass(cell.dateKey)">
                    👥 {{ getDayTotalParticipants(cell.dateKey) }} inscrits
                  </div>
                  <span class="rate-sub">{{ getDayOverallOccupancyRate(cell.dateKey) }}% jauge</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════
           MODE 4: SYNTHÈSE GLOBALE & FEUILLE D'ÉMARGEMENT
      ══════════════════════════════════════════════════════════════ -->
      <div v-else-if="mode === 'summary'" class="extraction-mode-wrapper">
        <!-- Global KPI Summary Cards -->
        <div class="global-kpi-grid">
          <div class="kpi-card">
            <span class="kpi-icon">👥</span>
            <div class="kpi-info">
              <span class="kpi-val">{{ globalPeriodKPIs.totalParticipantsCount }}</span>
              <span class="kpi-lbl">Bénéficiaires uniques présents</span>
            </div>
          </div>

          <div class="kpi-card">
            <span class="kpi-icon">🏢</span>
            <div class="kpi-info">
              <span class="kpi-val">{{ globalPeriodKPIs.openRoomsCount }}</span>
              <span class="kpi-lbl">Ouvertures de salles</span>
            </div>
          </div>

          <div class="kpi-card">
            <span class="kpi-icon">📈</span>
            <div class="kpi-info">
              <span class="kpi-val">{{ globalPeriodKPIs.averageOccupancyRate }}%</span>
              <span class="kpi-lbl">Taux d'occupation moyen</span>
            </div>
          </div>

          <div class="kpi-card">
            <span class="kpi-icon">🎯</span>
            <div class="kpi-info">
              <span class="kpi-val">{{ globalPeriodKPIs.totalActivitiesCount }}</span>
              <span class="kpi-lbl">Séances d'activités ({{ globalPeriodKPIs.totalActivityHours }}h)</span>
            </div>
          </div>
        </div>

        <!-- Attendance Register / Feuille d'émargement -->
        <div class="report-card mt-4">
          <div class="section-title-row">
            <div class="title-with-badge">
              <h4>✍️ Registre d'Émargement & Présences — {{ periodTitle }}</h4>
              <span class="badge-count">{{ summaryAttendanceList.length }} personnes</span>
            </div>

            <div class="summary-filters no-print">
              <input 
                type="text" 
                v-model="summarySearch" 
                placeholder="Filtrer par nom, prénom, salle..." 
                class="form-input search-input-sm"
              />
            </div>
          </div>

          <div v-if="filteredSummaryAttendanceList.length === 0" class="no-participants">
            Aucun bénéficiaire présent ou correspondant à votre recherche sur cette période.
          </div>

          <div v-else class="activities-table-wrapper">
            <table class="activities-table attendance-register-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Bénéficiaire</th>
                  <th>Date</th>
                  <th>Salle d'Accueil</th>
                  <th>Référent</th>
                  <th>Activités Prévues</th>
                  <th class="print-center">Émargement Matin</th>
                  <th class="print-center">Émargement Aprem</th>
                  <th class="no-print">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in filteredSummaryAttendanceList" :key="row.key">
                  <td class="row-index">{{ idx + 1 }}</td>
                  <td class="p-name-cell">
                    <strong>{{ row.participant.firstName }} {{ row.participant.lastName }}</strong>
                  </td>
                  <td class="date-cell">{{ formatDateShort(row.date) }}</td>
                  <td>📍 {{ row.roomName }}</td>
                  <td>👨‍💼 {{ row.managerName }}</td>
                  <td>
                    <div class="acts-cell-list">
                      <span v-for="actName in row.activities" :key="actName" class="act-name-pill">
                        {{ actName }}
                      </span>
                      <span v-if="row.activities.length === 0" class="text-muted">Aucune</span>
                    </div>
                  </td>
                  <td class="sig-cell">
                    <div class="sig-checkbox-box">
                      <input type="checkbox" v-model="row.morningSigned" class="sig-checkbox" />
                      <span class="sig-placeholder-line print-only"></span>
                    </div>
                  </td>
                  <td class="sig-cell">
                    <div class="sig-checkbox-box">
                      <input type="checkbox" v-model="row.afternoonSigned" class="sig-checkbox" />
                      <span class="sig-placeholder-line print-only"></span>
                    </div>
                  </td>
                  <td class="no-print">
                    <span class="status-badge" :class="row.statusClass">{{ row.statusLabel }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Official Global Signature Block for Print -->
          <div class="signature-box mt-4">
            <div class="sig-block">
              <span>Visa et Validation de la Direction / Cadre de Santé :</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-block">
              <span>Cachet de l'Établissement :</span>
              <div class="sig-stamp-box"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         MODALS: SMART FILLING & EDITING TOOLS
    ══════════════════════════════════════════════════════════════ -->

    <!-- 1. SMART FILL ASSISTANT MODAL -->
    <div v-if="showSmartFillModal" class="modal-backdrop" @click.self="showSmartFillModal = false">
      <div class="modal-card modal-large">
        <div class="modal-header">
          <h3>⚡ Assistant de Remplissage Automatique & Affectation</h3>
          <button class="close-btn" @click="showSmartFillModal = false">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-intro">
            Optimisez et remplissez rapidement les salles et les créneaux pour la période active (<strong>{{ periodTitle }}</strong>).
          </p>

          <div class="smart-tools-grid">
            <!-- Tool 1: Auto-assign unassigned participants to open rooms -->
            <div class="tool-action-card">
              <div class="tool-icon">🏢</div>
              <div class="tool-desc">
                <h4>1. Auto-remplir les salles ouvertes</h4>
                <p>Répartit automatiquement les bénéficiaires non encore affectés dans les salles ouvertes ayant des places libres (dans la limite de leur capacité).</p>
                <button class="action-btn primary-btn btn-sm mt-2" @click="executeAutoFillRooms">
                  ⚡ Exécuter le remplissage des salles
                </button>
              </div>
            </div>

            <!-- Tool 2: Cascade assign room beneficiaries to room activities -->
            <div class="tool-action-card">
              <div class="tool-icon">🎯</div>
              <div class="tool-desc">
                <h4>2. Inscrire aux activités de la salle</h4>
                <p>Inscrit automatiquement tous les bénéficiaires d'une salle à l'ensemble des activités prévues dans cette salle pour la journée.</p>
                <button class="action-btn secondary-btn btn-sm mt-2" @click="executeCascadeActivitiesFill">
                  🎯 Inscrire aux activités de salle
                </button>
              </div>
            </div>

            <!-- Tool 3: Duplicate day sessions to another day or week -->
            <div class="tool-action-card">
              <div class="tool-icon">📋</div>
              <div class="tool-desc">
                <h4>3. Dupliquer les ouvertures de salles</h4>
                <p>Copiez les ouvertures de salles et affectations du jour sélectionné vers une autre date ou toute la semaine.</p>
                <div class="duplicate-controls mt-2">
                  <label>Date cible :</label>
                  <input type="date" v-model="duplicateTargetDate" class="form-input date-input-field inline-input" />
                  <button class="action-btn secondary-btn btn-sm ml-2" @click="executeDuplicateDaySessions">
                    📋 Dupliquer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="action-btn secondary-btn" @click="showSmartFillModal = false">Fermer</button>
        </div>
      </div>
    </div>

    <!-- 2. QUICK ROOM ASSIGN / OPEN MODAL -->
    <div v-if="showRoomAssignModal" class="modal-backdrop" @click.self="showRoomAssignModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ editingSession ? '✏️ Modifier la Session de Salle' : '🚪 Ouvrir / Affecter une Salle' }}</h3>
          <button class="close-btn" @click="showRoomAssignModal = false">✕</button>
        </div>

        <form @submit.prevent="submitRoomSessionForm" class="modal-form">
          <div class="form-group">
            <label>📅 Date *</label>
            <input type="date" v-model="sessionForm.date" required class="form-input" />
          </div>

          <div class="form-group">
            <label>📍 Salle / Lieu *</label>
            <SearchableSelect 
              v-model="sessionForm.location" 
              :options="locations" 
              type="location" 
              placeholder="Rechercher une salle..." 
              empty-message="Aucune salle trouvée"
            />
          </div>

          <div class="form-group">
            <div class="form-header-row">
              <label>👨‍💼 Gestionnaire Référent *</label>
              <span v-if="selectedExtractionManagerStatus" class="manager-quick-status" :class="{ 'status-ok': selectedExtractionManagerStatus.available, 'status-ko': !selectedExtractionManagerStatus.available }">
                {{ selectedExtractionManagerStatus.available ? '✅ Disponible' : '⚠️ Indisponible' }}
              </span>
            </div>
            <SearchableSelect 
              v-model="sessionForm.manager" 
              :options="evaluatedExtractionFacilitators" 
              type="facilitator" 
              placeholder="Rechercher un gestionnaire..." 
              empty-message="Aucun gestionnaire trouvé"
            />
            <div v-if="selectedExtractionManagerStatus && !selectedExtractionManagerStatus.available" class="manager-warning-banner">
              <span class="warning-icon">⚠️</span>
              <div class="warning-text">
                <strong>Attention :</strong> Ce professionnel référent est <strong>indisponible</strong> à cette date : <em>{{ selectedExtractionManagerStatus.reason }}</em>.
              </div>
            </div>
          </div>

          <div class="form-group">
            <div class="form-header-row">
              <div class="participants-title-box">
                <label>👥 Bénéficiaires Inscrits</label>
                <span class="participants-count-tag">
                  {{ sessionForm.participants.length }} sélectionné(s)
                </span>
              </div>
              <div class="participants-select-tools">
                <button type="button" class="mini-tool-btn highlight-btn" @click="selectAvailableExtractionParticipants" title="Cocher uniquement les résidents disponibles">
                  ✅ Cocher disponibles
                </button>
                <button type="button" class="mini-tool-btn" @click="toggleSelectAllParticipantsInSession">
                  {{ sessionForm.participants.length === participants.length ? 'Tout décocher' : 'Tout cocher' }}
                </button>
              </div>
            </div>

            <!-- Filter tabs & Search Bar -->
            <div class="participant-filter-bar">
              <div class="filter-tabs">
                <button 
                  type="button" 
                  class="filter-tab-btn" 
                  :class="{ active: extractionRoomModalTab === 'all' }" 
                  @click="extractionRoomModalTab = 'all'"
                >
                  Tous <span class="tab-badge">{{ extractionModalAvailabilityCounts.total }}</span>
                </button>
                <button 
                  type="button" 
                  class="filter-tab-btn tab-avail" 
                  :class="{ active: extractionRoomModalTab === 'available' }" 
                  @click="extractionRoomModalTab = 'available'"
                >
                  ✅ Disponibles <span class="tab-badge">{{ extractionModalAvailabilityCounts.available }}</span>
                </button>
                <button 
                  type="button" 
                  class="filter-tab-btn tab-unavail" 
                  :class="{ active: extractionRoomModalTab === 'unavailable' }" 
                  @click="extractionRoomModalTab = 'unavailable'"
                >
                  ❌ Indisponibles <span class="tab-badge">{{ extractionModalAvailabilityCounts.unavailable }}</span>
                </button>
              </div>

              <div class="participant-search-input-wrapper">
                <input 
                  type="text" 
                  v-model="extractionRoomModalSearch" 
                  placeholder="Rechercher un résident par son nom..." 
                  class="form-input mini-search"
                />
              </div>
            </div>

            <div class="checkbox-scroll-list">
              <div v-if="filteredExtractionModalParticipants.length === 0" class="no-participants-filtered">
                Aucun bénéficiaire correspondant aux filtres.
              </div>
              <label 
                v-for="p in filteredExtractionModalParticipants" 
                :key="p.documentId || p.id" 
                class="checkbox-row"
                :class="{ 
                  'is-checked': sessionForm.participants.includes(p.documentId || p.id),
                  'is-unavailable': !p.isAvailable
                }"
              >
                <input type="checkbox" :value="p.documentId || p.id" v-model="sessionForm.participants" />
                <span class="checkbox-user-avatar">{{ !p.isAvailable ? '🔴' : '👤' }}</span>
                <div class="checkbox-user-info">
                  <span :class="{ 'name-unavail': !p.isAvailable }">{{ p.firstName }} {{ p.lastName }}</span>
                  <span v-if="!p.isAvailable" class="unavail-reason-badge">
                    ❌ Indisponible ({{ p.unavailabilityReason }})
                  </span>
                </div>
                <span v-if="p.isAvailable" class="avail-indicator-badge">✓ Dispo</span>
              </label>
            </div>

            <div v-if="checkedExtractionUnavailableCount > 0" class="unavailable-selected-alert">
              ⚠️ <strong>{{ checkedExtractionUnavailableCount }}</strong> bénéficiaire(s) <strong>indisponible(s)</strong> sélectionné(s) pour cette date.
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="action-btn secondary-btn" @click="showRoomAssignModal = false">Annuler</button>
            <button type="submit" class="action-btn primary-btn">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. QUICK SLOT ASSIGN MODAL (Add participant to slot) -->
    <div v-if="showSlotAssignModal" class="modal-backdrop" @click.self="showSlotAssignModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>➕ Inscrire {{ selectedParticipant?.firstName }} à un Créneau</h3>
          <button class="close-btn" @click="showSlotAssignModal = false">✕</button>
        </div>

        <div class="modal-body">
          <p>Choisissez parmi les créneaux disponibles sur la période ({{ periodTitle }}) :</p>
          <div v-if="availableSlotsForAssign.length === 0" class="no-activities">
            Aucun créneau d'activité trouvé sur cette période.
          </div>
          <div v-else class="slots-selection-list">
            <div 
              v-for="slot in availableSlotsForAssign" 
              :key="slot.documentId || slot.id" 
              class="slot-select-item"
              :class="{ 'is-enrolled': isParticipantEnrolledInSlot(slot, selectedParticipantId) }"
            >
              <div class="slot-select-info">
                <strong>{{ slot.activityTemplate?.name || 'Activité' }}</strong>
                <span class="slot-time-sub">📅 {{ formatDate(slot.startDate) }} • {{ formatTime(slot.startDate) }} - {{ formatTime(slot.endDate) }}</span>
                <span class="slot-loc-sub">📍 {{ slot.location?.name || 'Salle' }}</span>
              </div>
              <button 
                v-if="!isParticipantEnrolledInSlot(slot, selectedParticipantId)"
                class="action-btn primary-btn btn-sm"
                @click="addParticipantToSlot(slot, selectedParticipantId)"
              >
                Inscrire
              </button>
              <button 
                v-else 
                class="action-btn danger-btn btn-sm"
                @click="removeParticipantFromSlot(slot, selectedParticipantId)"
              >
                Désinscrire
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="action-btn secondary-btn" @click="showSlotAssignModal = false">Fermer</button>
        </div>
      </div>
    </div>

    <!-- 4. EDIT SLOT MODAL (In-place slot editing) -->
    <div v-if="showEditSlotModal" class="modal-backdrop" @click.self="showEditSlotModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>✏️ Modifier le Créneau d'Activité</h3>
          <button class="close-btn" @click="showEditSlotModal = false">✕</button>
        </div>

        <form @submit.prevent="submitEditSlotForm" class="modal-form">
          <div class="form-group">
            <label>🎯 Modèle d'Activité</label>
            <select v-model="editSlotForm.activityTemplate" required class="form-input">
              <option v-for="act in activities" :key="act.documentId || act.id" :value="act.documentId || act.id">
                {{ act.name }} (Durée: {{ act.standardDuration }} min)
              </option>
            </select>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label>🕒 Début</label>
              <input type="datetime-local" v-model="editSlotForm.startDate" required class="form-input" />
            </div>
            <div class="form-group">
              <label>🕒 Fin</label>
              <input type="datetime-local" v-model="editSlotForm.endDate" required class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label>📍 Salle / Lieu</label>
            <select v-model="editSlotForm.location" required class="form-input">
              <option v-for="loc in locations" :key="loc.documentId || loc.id" :value="loc.documentId || loc.id">
                {{ loc.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>👨‍🏫 Animateur(s)</label>
            <div class="checkbox-scroll-list mini-list">
              <label v-for="fac in facilitators" :key="fac.documentId || fac.id" class="checkbox-row">
                <input type="checkbox" :value="fac.documentId || fac.id" v-model="editSlotForm.facilitators" />
                <span>{{ fac.firstName }} {{ fac.lastName }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>👥 Bénéficiaires Inscrits ({{ editSlotForm.participants.length }})</label>
            <div class="checkbox-scroll-list">
              <label v-for="p in participants" :key="p.documentId || p.id" class="checkbox-row">
                <input type="checkbox" :value="p.documentId || p.id" v-model="editSlotForm.participants" />
                <span>{{ p.firstName }} {{ p.lastName }}</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="action-btn secondary-btn" @click="showEditSlotModal = false">Annuler</button>
            <button type="submit" class="action-btn primary-btn">Enregistrer les modifications</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoomSessionStore } from '../stores/roomSessionStore';
import { useActiveSchedulerStore } from '../stores/activeScheduler';
import { useGlobalStore } from '../stores/global';
import { useAppSettingsStore } from '../stores/appSettings';
import { checkPersonDateAvailability, getEvaluatedPersonsList } from '../utils/availabilityHelper';
import SearchableSelect from './SearchableSelect.vue';
import api from '../services/api';

const props = defineProps({
  participants: { type: Array, default: () => [] },
  facilitators: { type: Array, default: () => [] },
  locations: { type: Array, default: () => [] },
  activities: { type: Array, default: () => [] },
  timeslots: { type: Array, default: () => [] }
});

const emit = defineEmits(['refresh-data']);

const roomSessionStore = useRoomSessionStore();
const activeSchedulerStore = useActiveSchedulerStore();
const globalStore = useGlobalStore();
const appSettings = useAppSettingsStore();

// ─── STATE ───
const timeView = ref('day'); // 'day' | 'week' | 'month'
const mode = ref('participant'); // 'participant' | 'manager' | 'room' | 'summary'
const selectedDate = ref(new Date().toISOString().slice(0, 10));

const selectedParticipantId = ref('');
const selectedFacilitatorId = ref('');
const selectedLocationId = ref('');

const loading = ref(false);
const lastNavAction = ref(null); // 'prev' | 'next' | 'today' | 'date-input' | 'time-view' | null
const allTimeSlots = ref([]);
const showExportMenu = ref(false);
const summarySearch = ref('');

// Modals State
const showSmartFillModal = ref(false);
const showRoomAssignModal = ref(false);
const showSlotAssignModal = ref(false);
const showEditSlotModal = ref(false);

const duplicateTargetDate = ref(new Date().toISOString().slice(0, 10));
const editingSession = ref(null);
const editingSlot = ref(null);

const extractionRoomModalTab = ref('all');
const extractionRoomModalSearch = ref('');

const sessionForm = ref({
  date: '',
  location: '',
  manager: '',
  participants: []
});

// ─── AVAILABILITY COMPUTATIONS FOR ROOM ASSIGN MODAL ───
const evaluatedExtractionFacilitators = computed(() => {
  const dateStr = sessionForm.value.date || selectedDate.value;
  const currId = editingSession.value ? (editingSession.value.documentId || editingSession.value.id) : null;
  return getEvaluatedPersonsList(props.facilitators, dateStr, 'facilitator', roomSessionStore.sessions, currId);
});

const availableExtractionFacilitators = computed(() => {
  return evaluatedExtractionFacilitators.value.filter(f => f.isAvailable);
});

const unavailableExtractionFacilitators = computed(() => {
  return evaluatedExtractionFacilitators.value.filter(f => !f.isAvailable);
});

const selectedExtractionManagerStatus = computed(() => {
  if (!sessionForm.value.manager) return null;
  const dateStr = sessionForm.value.date || selectedDate.value;
  const fac = props.facilitators.find(f => (f.documentId || f.id) === sessionForm.value.manager);
  if (!fac) return null;
  const currId = editingSession.value ? (editingSession.value.documentId || editingSession.value.id) : null;
  return checkPersonDateAvailability(fac, dateStr, 'facilitator', roomSessionStore.sessions, currId);
});

const evaluatedExtractionParticipants = computed(() => {
  const dateStr = sessionForm.value.date || selectedDate.value;
  const currId = editingSession.value ? (editingSession.value.documentId || editingSession.value.id) : null;
  return getEvaluatedPersonsList(props.participants, dateStr, 'participant', roomSessionStore.sessions, currId);
});

const extractionModalAvailabilityCounts = computed(() => {
  const list = evaluatedExtractionParticipants.value;
  const available = list.filter(p => p.isAvailable).length;
  const unavailable = list.length - available;
  return { total: list.length, available, unavailable };
});

const filteredExtractionModalParticipants = computed(() => {
  let list = evaluatedExtractionParticipants.value;
  if (extractionRoomModalTab.value === 'available') {
    list = list.filter(p => p.isAvailable);
  } else if (extractionRoomModalTab.value === 'unavailable') {
    list = list.filter(p => !p.isAvailable);
  }
  if (extractionRoomModalSearch.value.trim()) {
    const q = extractionRoomModalSearch.value.toLowerCase().trim();
    list = list.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }
  return list;
});

const checkedExtractionUnavailableCount = computed(() => {
  const checkedIds = new Set(sessionForm.value.participants);
  return evaluatedExtractionParticipants.value.filter(p => checkedIds.has(p.documentId || p.id) && !p.isAvailable).length;
});

function selectAvailableExtractionParticipants() {
  const availableIds = filteredExtractionModalParticipants.value.filter(p => p.isAvailable).map(p => p.documentId || p.id);
  sessionForm.value.participants = Array.from(new Set([...sessionForm.value.participants, ...availableIds]));
}

const editSlotForm = ref({
  activityTemplate: '',
  startDate: '',
  endDate: '',
  location: '',
  facilitators: [],
  participants: []
});

// ─── LIFECYCLE ───
onMounted(async () => {
  if (props.participants.length > 0) {
    selectedParticipantId.value = props.participants[0].documentId || props.participants[0].id;
  }
  if (props.facilitators.length > 0) {
    selectedFacilitatorId.value = props.facilitators[0].documentId || props.facilitators[0].id;
  }
  await fetchPeriodData();
});

watch([selectedDate, timeView], async () => {
  await fetchPeriodData();
});

// ─── DATE RANGE COMPUTATIONS ───
const dateRange = computed(() => {
  const d = new Date(selectedDate.value + 'T12:00:00');
  if (isNaN(d.getTime())) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return { startStr: todayStr, endStr: todayStr };
  }

  if (timeView.value === 'day') {
    return { startStr: selectedDate.value, endStr: selectedDate.value };
  } else if (timeView.value === 'week') {
    const dayOfWeek = d.getDay(); // 0 is Sun, 1 is Mon
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startStr: monday.toISOString().slice(0, 10),
      endStr: sunday.toISOString().slice(0, 10)
    };
  } else {
    // Month
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    return {
      startStr: firstDay.toISOString().slice(0, 10),
      endStr: lastDay.toISOString().slice(0, 10)
    };
  }
});

const periodTitle = computed(() => {
  const d = new Date(selectedDate.value + 'T12:00:00');
  if (isNaN(d.getTime())) return '';

  if (timeView.value === 'day') {
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } else if (timeView.value === 'week') {
    const weekNum = getWeekNumber(d);
    return `Semaine ${weekNum} • ${d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  } else {
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
});

const periodDateRangeLabel = computed(() => {
  const { startStr, endStr } = dateRange.value;
  const d1 = new Date(startStr + 'T12:00:00');
  const d2 = new Date(endStr + 'T12:00:00');
  return `Du ${d1.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${d2.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
});

const timeViewLabel = computed(() => {
  if (timeView.value === 'day') return 'Journée';
  if (timeView.value === 'week') return 'Semaine';
  return 'Mois';
});

const currentFormattedDate = computed(() => {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
});

const weekDaysList = computed(() => {
  const { startStr } = dateRange.value;
  const list = [];
  const startD = new Date(startStr + 'T12:00:00');
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < 7; i++) {
    const curr = new Date(startD);
    curr.setDate(startD.getDate() + i);
    const dateKey = curr.toISOString().slice(0, 10);
    list.push({
      dateKey,
      dayName: curr.toLocaleDateString('fr-FR', { weekday: 'long' }),
      dayNumber: curr.getDate(),
      monthShort: curr.toLocaleDateString('fr-FR', { month: 'short' }),
      isToday: dateKey === todayStr
    });
  }
  return list;
});

const monthDaysGrid = computed(() => {
  const d = new Date(selectedDate.value + 'T12:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const todayStr = new Date().toISOString().slice(0, 10);

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayWeek = (firstDayOfMonth.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const totalDays = lastDayOfMonth.getDate();

  const grid = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, dayNum);
    grid.push({
      dateKey: prevDate.toISOString().slice(0, 10),
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: false
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const currDate = new Date(year, month, dayNum);
    const dateKey = currDate.toISOString().slice(0, 10);
    grid.push({
      dateKey,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateKey === todayStr
    });
  }

  // Next month padding to complete row
  const remaining = (7 - (grid.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i);
    grid.push({
      dateKey: nextDate.toISOString().slice(0, 10),
      dayNumber: i,
      isCurrentMonth: false,
      isToday: false
    });
  }

  return grid;
});

// ─── DATA FETCHING ───
async function fetchPeriodData() {
  loading.value = true;
  try {
    const { startStr, endStr } = dateRange.value;
    await roomSessionStore.fetchSessionsForRange(startStr, endStr);

    if (appSettings.useMockData) {
      await activeSchedulerStore.fetchData();
      const all = activeSchedulerStore.timeslots;
      allTimeSlots.value = all.filter(slot => {
        const slotDate = slot.startDate.slice(0, 10);
        return slotDate >= startStr && slotDate <= endStr;
      });
    } else {
      const startOfDay = `${startStr}T00:00:00.000Z`;
      const endOfDay = `${endStr}T23:59:59.000Z`;

      const res = await api.get('/time-slots', {
        params: {
          'filters[startDate][$gte]': startOfDay,
          'filters[startDate][$lte]': endOfDay,
          'populate[0]': 'activityTemplate',
          'populate[1]': 'location',
          'populate[2]': 'facilitators',
          'populate[3]': 'participants',
          'populate[4]': 'roomSession',
          'populate[5]': 'roomSession.manager',
          'pagination[pageSize]': 5000
        }
      });
      allTimeSlots.value = res.data.data || [];
    }
  } catch (err) {
    console.error('Erreur chargement extractions:', err);
  } finally {
    loading.value = false;
  }
}

// ─── NAVIGATION HELPERS ───
function setTimeView(v) {
  lastNavAction.value = 'time-view';
  timeView.value = v;
}

function navigatePeriod(step) {
  lastNavAction.value = step < 0 ? 'prev' : 'next';
  const d = new Date(selectedDate.value + 'T12:00:00');
  if (timeView.value === 'day') {
    d.setDate(d.getDate() + step);
  } else if (timeView.value === 'week') {
    d.setDate(d.getDate() + (step * 7));
  } else {
    d.setMonth(d.getMonth() + step);
  }
  selectedDate.value = d.toISOString().slice(0, 10);
}

function goToToday() {
  lastNavAction.value = 'today';
  selectedDate.value = new Date().toISOString().slice(0, 10);
}

function selectDayFromMonth(dateKey) {
  lastNavAction.value = 'date-input';
  selectedDate.value = dateKey;
  timeView.value = 'day';
}

watch(loading, (isLoading) => {
  if (!isLoading) {
    lastNavAction.value = null;
  }
});

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value;
}

// ─── MODE 1: PARTICIPANT COMPUTED & HELPERS ───
const selectedParticipant = computed(() => {
  if (!selectedParticipantId.value) return null;
  return props.participants.find(p => (p.documentId || p.id) === selectedParticipantId.value);
});

const participantDayRoomSession = computed(() => {
  if (!selectedParticipantId.value) return null;
  return roomSessionStore.sessions.find(s => {
    if (s.date !== selectedDate.value) return false;
    const parts = s.participants || [];
    return parts.some(p => (p.documentId || p.id) === selectedParticipantId.value);
  });
});

const participantDayActivities = computed(() => {
  if (!selectedParticipantId.value) return [];
  return allTimeSlots.value.filter(slot => {
    if (slot.startDate.slice(0, 10) !== selectedDate.value) return false;
    const parts = slot.participants || [];
    return parts.some(p => (p.documentId || p.id) === selectedParticipantId.value);
  });
});

const participantPeriodStats = computed(() => {
  if (!selectedParticipantId.value) return { activeDaysCount: 0, activitiesCount: 0, totalHours: 0 };
  const pid = selectedParticipantId.value;

  const relevantSlots = allTimeSlots.value.filter(slot => (slot.participants || []).some(p => (p.documentId || p.id) === pid));
  const activeDays = new Set(relevantSlots.map(s => s.startDate.slice(0, 10)));
  
  roomSessionStore.sessions.forEach(sess => {
    if ((sess.participants || []).some(p => (p.documentId || p.id) === pid)) {
      activeDays.add(sess.date);
    }
  });

  let totalMinutes = 0;
  relevantSlots.forEach(s => {
    const diff = (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60);
    totalMinutes += isNaN(diff) ? 60 : diff;
  });

  return {
    activeDaysCount: activeDays.size,
    activitiesCount: relevantSlots.length,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10
  };
});

function getParticipantRoomForDate(dateKey) {
  if (!selectedParticipantId.value) return null;
  return roomSessionStore.sessions.find(s => {
    if (s.date !== dateKey) return false;
    return (s.participants || []).some(p => (p.documentId || p.id) === selectedParticipantId.value);
  });
}

function getParticipantActivitiesForDate(dateKey) {
  if (!selectedParticipantId.value) return [];
  return allTimeSlots.value.filter(s => {
    if (s.startDate.slice(0, 10) !== dateKey) return false;
    return (s.participants || []).some(p => (p.documentId || p.id) === selectedParticipantId.value);
  });
}

// ─── MODE 2: MANAGER COMPUTED & HELPERS ───
const selectedFacilitator = computed(() => {
  if (!selectedFacilitatorId.value) return null;
  return props.facilitators.find(f => (f.documentId || f.id) === selectedFacilitatorId.value);
});

const managerDayRoomSessions = computed(() => {
  if (!selectedFacilitatorId.value) return [];
  return roomSessionStore.sessions.filter(s => {
    if (s.date !== selectedDate.value) return false;
    const mgrId = s.manager?.documentId || s.manager?.id;
    return mgrId === selectedFacilitatorId.value;
  });
});

const managerDayParticipants = computed(() => {
  const result = [];
  const added = new Set();
  managerDayRoomSessions.value.forEach(s => {
    (s.participants || []).forEach(p => {
      const pid = p.documentId || p.id;
      if (!added.has(pid)) {
        added.add(pid);
        result.push(p);
      }
    });
  });
  return result;
});

const managerDayActivities = computed(() => {
  if (!selectedFacilitatorId.value) return [];
  const fid = selectedFacilitatorId.value;
  const roomSessionIds = new Set(managerDayRoomSessions.value.map(s => s.documentId || s.id));

  return allTimeSlots.value.filter(s => {
    if (s.startDate.slice(0, 10) !== selectedDate.value) return false;
    const isAnim = (s.facilitators || []).some(f => (f.documentId || f.id) === fid);
    const isRoomMgr = s.roomSession && roomSessionIds.has(s.roomSession.documentId || s.roomSession.id);
    return isAnim || isRoomMgr;
  });
});

const managerPeriodStats = computed(() => {
  if (!selectedFacilitatorId.value) return { managedRoomsCount: 0, activitiesCount: 0, totalParticipantsCount: 0, totalHours: 0 };
  const fid = selectedFacilitatorId.value;

  const managedSessions = roomSessionStore.sessions.filter(s => (s.manager?.documentId || s.manager?.id) === fid);
  const relevantSlots = allTimeSlots.value.filter(s => (s.facilitators || []).some(f => (f.documentId || f.id) === fid));

  const uniqueParts = new Set();
  managedSessions.forEach(s => (s.participants || []).forEach(p => uniqueParts.add(p.documentId || p.id)));
  relevantSlots.forEach(s => (s.participants || []).forEach(p => uniqueParts.add(p.documentId || p.id)));

  let totalMins = 0;
  relevantSlots.forEach(s => {
    const diff = (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60);
    totalMins += isNaN(diff) ? 60 : diff;
  });

  return {
    managedRoomsCount: managedSessions.length,
    activitiesCount: relevantSlots.length,
    totalParticipantsCount: uniqueParts.size,
    totalHours: Math.round((totalMins / 60) * 10) / 10
  };
});

function getManagerRoomsForDate(dateKey) {
  if (!selectedFacilitatorId.value) return [];
  return roomSessionStore.sessions.filter(s => s.date === dateKey && (s.manager?.documentId || s.manager?.id) === selectedFacilitatorId.value);
}

function getManagerParticipantsForDate(dateKey) {
  const rooms = getManagerRoomsForDate(dateKey);
  const parts = [];
  const seen = new Set();
  rooms.forEach(r => (r.participants || []).forEach(p => {
    const pid = p.documentId || p.id;
    if (!seen.has(pid)) { seen.add(pid); parts.push(p); }
  }));
  return parts;
}

function getManagerActivitiesForDate(dateKey) {
  if (!selectedFacilitatorId.value) return [];
  const fid = selectedFacilitatorId.value;
  return allTimeSlots.value.filter(s => s.startDate.slice(0, 10) === dateKey && (s.facilitators || []).some(f => (f.documentId || f.id) === fid));
}

// ─── MODE 3: ROOM COMPUTED & HELPERS ───
const filteredDayRoomSessions = computed(() => {
  let list = roomSessionStore.sessions.filter(s => s.date === selectedDate.value);
  if (selectedLocationId.value) {
    list = list.filter(s => (s.location?.documentId || s.location?.id) === selectedLocationId.value);
  }
  return list;
});

const displayedLocationsList = computed(() => {
  if (selectedLocationId.value) {
    return props.locations.filter(l => (l.documentId || l.id) === selectedLocationId.value);
  }
  return props.locations;
});

function getSessionConflictInfo(session) {
  if (!session) return { hasConflict: false, unavailableManager: null, unavailableParticipants: [], isOverBooked: false, conflictSummary: '' };

  const currentSessionId = session.documentId || session.id;
  const sessDate = session.date;

  let unavailableManager = null;
  if (session.manager) {
    const mgrId = session.manager.documentId || session.manager.id;
    const fullFac = props.facilitators.find(f => (f.documentId || f.id) === mgrId) || session.manager;
    const status = checkPersonDateAvailability(fullFac, sessDate, 'facilitator', roomSessionStore.sessions, currentSessionId);
    if (!status.available) {
      unavailableManager = {
        name: `${fullFac.firstName || ''} ${fullFac.lastName || ''}`.trim() || 'Référent',
        reason: status.reason
      };
    }
  }

  const unavailableParticipants = [];
  const parts = session.participants || [];
  for (const p of parts) {
    const pid = p.documentId || p.id;
    const fullPart = props.participants.find(part => (part.documentId || part.id) === pid) || p;
    const status = checkPersonDateAvailability(fullPart, sessDate, 'participant', roomSessionStore.sessions, currentSessionId);
    if (!status.available) {
      unavailableParticipants.push({
        id: pid,
        name: `${fullPart.firstName || ''} ${fullPart.lastName || ''}`.trim() || 'Bénéficiaire',
        reason: status.reason
      });
    }
  }

  const cap = session.location?.capacity || 10;
  const isOverBooked = parts.length > cap;
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
  const status = checkPersonDateAvailability(fullPart, session.date, 'participant', roomSessionStore.sessions, currentSessionId);
  return !status.available;
}

function getParticipantUnavailabilityTitle(participant, session) {
  const pid = participant.documentId || participant.id;
  const fullPart = props.participants.find(p => (p.documentId || p.id) === pid) || participant;
  const currentSessionId = session.documentId || session.id;
  const status = checkPersonDateAvailability(fullPart, session.date, 'participant', roomSessionStore.sessions, currentSessionId);
  if (!status.available) {
    return `Indisponible le ${session.date} : ${status.reason}`;
  }
  return '';
}

function getRoomOccupancyPercent(session) {
  const count = (session.participants || []).length;
  const cap = session.location?.capacity || 10;
  return Math.round((count / cap) * 100);
}

function getRoomOccupancyColorClass(session) {
  const pct = getRoomOccupancyPercent(session);
  if (pct >= 100) return 'bar-full';
  if (pct >= 70) return 'bar-optimal';
  return 'bar-low';
}

function getActivitiesForSession(session) {
  const sessId = session.documentId || session.id;
  const locId = session.location?.documentId || session.location?.id;

  return allTimeSlots.value.filter(slot => {
    if (slot.startDate.slice(0, 10) !== session.date) return false;
    const sId = slot.roomSession?.documentId || slot.roomSession?.id;
    const lId = slot.location?.documentId || slot.location?.id;
    return (sId && sId === sessId) || (lId && locId && lId === locId);
  });
}

function getOccupancyCount(loc, dateKey) {
  const locId = loc.documentId || loc.id;
  const sess = roomSessionStore.sessions.find(s => s.date === dateKey && (s.location?.documentId || s.location?.id) === locId);
  return sess ? (sess.participants || []).length : 0;
}

function getOccupancyPercentage(loc, dateKey) {
  const count = getOccupancyCount(loc, dateKey);
  const cap = loc.capacity || 10;
  return Math.round((count / cap) * 100);
}

function getMatrixCellClass(loc, dateKey) {
  const pct = getOccupancyPercentage(loc, dateKey);
  if (pct === 0) return 'cell-empty';
  if (pct >= 100) return 'cell-full';
  if (pct >= 60) return 'cell-optimal';
  return 'cell-low';
}

function getAverageOccupancyForLocation(loc) {
  const days = weekDaysList.value;
  if (days.length === 0) return 0;
  let sum = 0;
  days.forEach(d => { sum += getOccupancyPercentage(loc, d.dateKey); });
  return Math.round(sum / days.length);
}

function getDayTotalParticipants(dateKey) {
  const daySessions = roomSessionStore.sessions.filter(s => s.date === dateKey);
  const parts = new Set();
  daySessions.forEach(s => (s.participants || []).forEach(p => parts.add(p.documentId || p.id)));
  return parts.size;
}

function getDayOverallOccupancyRate(dateKey) {
  const daySessions = roomSessionStore.sessions.filter(s => s.date === dateKey);
  if (daySessions.length === 0) return 0;
  let totalParts = 0;
  let totalCap = 0;
  daySessions.forEach(s => {
    totalParts += (s.participants || []).length;
    totalCap += s.location?.capacity || 10;
  });
  return totalCap > 0 ? Math.round((totalParts / totalCap) * 100) : 0;
}

function getDayOverallOccupancyClass(dateKey) {
  const rate = getDayOverallOccupancyRate(dateKey);
  if (rate >= 80) return 'pill-green';
  if (rate >= 50) return 'pill-amber';
  return 'pill-gray';
}

// ─── MODE 4: GLOBAL SUMMARY & REGISTER COMPUTED ───
const globalPeriodKPIs = computed(() => {
  const uniqueParticipants = new Set();
  const sessions = roomSessionStore.sessions;
  const slots = allTimeSlots.value;

  sessions.forEach(s => (s.participants || []).forEach(p => uniqueParticipants.add(p.documentId || p.id)));
  slots.forEach(s => (s.participants || []).forEach(p => uniqueParticipants.add(p.documentId || p.id)));

  let totalCap = 0;
  let totalEnrolled = 0;
  sessions.forEach(s => {
    totalEnrolled += (s.participants || []).length;
    totalCap += s.location?.capacity || 10;
  });

  let totalMinutes = 0;
  slots.forEach(s => {
    const diff = (new Date(s.endDate) - new Date(s.startDate)) / (1000 * 60);
    totalMinutes += isNaN(diff) ? 60 : diff;
  });

  return {
    totalParticipantsCount: uniqueParticipants.size,
    openRoomsCount: sessions.length,
    averageOccupancyRate: totalCap > 0 ? Math.round((totalEnrolled / totalCap) * 100) : 0,
    totalActivitiesCount: slots.length,
    totalActivityHours: Math.round((totalMinutes / 60) * 10) / 10
  };
});

const summaryAttendanceList = computed(() => {
  const rows = [];
  const sessions = roomSessionStore.sessions;

  sessions.forEach(sess => {
    (sess.participants || []).forEach(part => {
      const pid = part.documentId || part.id;
      const partSlots = allTimeSlots.value.filter(s => s.startDate.slice(0, 10) === sess.date && (s.participants || []).some(p => (p.documentId || p.id) === pid));

      rows.push({
        key: `${sess.date}_${pid}`,
        date: sess.date,
        participant: part,
        roomName: sess.location?.name || 'Salle',
        managerName: getFacilitatorName(sess.manager),
        activities: partSlots.map(s => s.activityTemplate?.name || s.name),
        morningSigned: false,
        afternoonSigned: false,
        statusLabel: 'Inscrit',
        statusClass: 'status-active'
      });
    });
  });

  return rows.sort((a, b) => a.date.localeCompare(b.date) || (a.participant.lastName || '').localeCompare(b.participant.lastName || ''));
});

const filteredSummaryAttendanceList = computed(() => {
  if (!summarySearch.value.trim()) return summaryAttendanceList.value;
  const q = summarySearch.value.toLowerCase().trim();

  return summaryAttendanceList.value.filter(r => {
    const name = `${r.participant.firstName || ''} ${r.participant.lastName || ''}`.toLowerCase();
    const room = r.roomName.toLowerCase();
    const mgr = r.managerName.toLowerCase();
    return name.includes(q) || room.includes(q) || mgr.includes(q);
  });
});

// ─── SMART FILLING & EDITING ACTIONS ───

// 1. Open Modals
function openSmartFillModal() {
  duplicateTargetDate.value = selectedDate.value;
  showSmartFillModal.value = true;
}

function openOpenRoomModal() {
  editingSession.value = null;
  extractionRoomModalTab.value = 'all';
  extractionRoomModalSearch.value = '';

  const evaluatedFacs = getEvaluatedPersonsList(props.facilitators, selectedDate.value, 'facilitator', roomSessionStore.sessions, null);
  const firstAvailableFac = evaluatedFacs.find(f => f.isAvailable);
  const defaultFacId = firstAvailableFac ? (firstAvailableFac.documentId || firstAvailableFac.id) : (props.facilitators[0]?.documentId || props.facilitators[0]?.id || '');

  sessionForm.value = {
    date: selectedDate.value,
    location: selectedLocationId.value || (props.locations[0]?.documentId || props.locations[0]?.id || ''),
    manager: defaultFacId,
    participants: []
  };
  showRoomAssignModal.value = true;
}

function openEditSessionModal(session) {
  editingSession.value = session;
  extractionRoomModalTab.value = 'all';
  extractionRoomModalSearch.value = '';
  sessionForm.value = {
    date: session.date,
    location: session.location?.documentId || session.location?.id,
    manager: session.manager?.documentId || session.manager?.id,
    participants: (session.participants || []).map(p => p.documentId || p.id)
  };
  showRoomAssignModal.value = true;
}

function openQuickRoomAssignModal() {
  openOpenRoomModal();
  if (selectedParticipantId.value) {
    sessionForm.value.participants = [selectedParticipantId.value];
  }
}

function openQuickSlotAssignModal() {
  showSlotAssignModal.value = true;
}

function openCreateSessionForManagerModal() {
  openOpenRoomModal();
  if (selectedFacilitatorId.value) {
    sessionForm.value.manager = selectedFacilitatorId.value;
  }
}

function openBatchAssignToManagerRoomModal() {
  if (managerDayRoomSessions.value.length > 0) {
    openEditSessionModal(managerDayRoomSessions.value[0]);
  }
}

function openAddParticipantsToRoomModal(session) {
  openEditSessionModal(session);
}

function openEditSlotModal(slot) {
  editingSlot.value = slot;
  editSlotForm.value = {
    activityTemplate: slot.activityTemplate?.documentId || slot.activityTemplate?.id || '',
    startDate: slot.startDate ? slot.startDate.slice(0, 16) : '',
    endDate: slot.endDate ? slot.endDate.slice(0, 16) : '',
    location: slot.location?.documentId || slot.location?.id || '',
    facilitators: (slot.facilitators || []).map(f => f.documentId || f.id),
    participants: (slot.participants || []).map(p => p.documentId || p.id)
  };
  showEditSlotModal.value = true;
}

function quickAssignSlotOnDate(dateKey) {
  selectedDate.value = dateKey;
  openQuickSlotAssignModal();
}

// 2. Form Submissions
async function submitRoomSessionForm() {
  try {
    if (editingSession.value) {
      const docId = editingSession.value.documentId || editingSession.value.id;
      await roomSessionStore.updateSession(docId, sessionForm.value);
    } else {
      await roomSessionStore.createSession(sessionForm.value);
    }
    showRoomAssignModal.value = false;
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors de l\'enregistrement de la session de salle.');
  }
}

async function submitEditSlotForm() {
  try {
    if (!editingSlot.value) return;
    const docId = editingSlot.value.documentId || editingSlot.value.id;
    await activeSchedulerStore.updateSlot(docId, editSlotForm.value);
    globalStore.addSuccess('Créneau d\'activité mis à jour avec succès !', 'Créneau modifié');
    showEditSlotModal.value = false;
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors de la modification du créneau.');
  }
}

// 3. In-place Quick Participant Operations
async function addParticipantToSlot(slot, participantId) {
  try {
    const docId = slot.documentId || slot.id;
    const currentPartIds = (slot.participants || []).map(p => p.documentId || p.id);
    if (!currentPartIds.includes(participantId)) {
      currentPartIds.push(participantId);
    }
    await activeSchedulerStore.updateSlot(docId, { participants: currentPartIds });
    globalStore.addSuccess('Bénéficiaire inscrit au créneau avec succès !');
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors de l\'inscription au créneau.');
  }
}

async function removeParticipantFromSlot(slot, participantId) {
  if (!confirm('Confirmez-vous la désinscription de ce bénéficiaire pour cette activité ?')) return;
  try {
    const docId = slot.documentId || slot.id;
    const currentPartIds = (slot.participants || []).map(p => p.documentId || p.id).filter(id => id !== participantId);
    await activeSchedulerStore.updateSlot(docId, { participants: currentPartIds });
    globalStore.addSuccess('Bénéficiaire retiré du créneau avec succès !');
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors de la désinscription.');
  }
}

async function removeParticipantFromSession(session, participant) {
  const pid = participant.documentId || participant.id;
  if (!confirm(`Retirer ${participant.firstName} ${participant.lastName} de la salle ?`)) return;
  try {
    const docId = session.documentId || session.id;
    const currentPartIds = (session.participants || []).map(p => p.documentId || p.id).filter(id => id !== pid);
    await roomSessionStore.updateSession(docId, {
      date: session.date,
      location: session.location?.documentId || session.location?.id,
      manager: session.manager?.documentId || session.manager?.id,
      participants: currentPartIds
    });
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors du retrait de la salle.');
  }
}

async function removeParticipantFromManagerRoom(participant) {
  if (managerDayRoomSessions.value.length > 0) {
    await removeParticipantFromSession(managerDayRoomSessions.value[0], participant);
  }
}

async function confirmDeleteSession(session) {
  if (!confirm(`Êtes-vous sûr de vouloir fermer la salle ${session.location?.name} pour le ${formatDate(session.date)} ?`)) return;
  try {
    const docId = session.documentId || session.id;
    await roomSessionStore.deleteSession(docId);
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors de la fermeture de la salle.');
  }
}

function toggleSelectAllParticipantsInSession() {
  const allFilteredIds = filteredExtractionModalParticipants.value.map(p => p.documentId || p.id);
  const isAllFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => sessionForm.value.participants.includes(id));
  if (isAllFilteredSelected) {
    sessionForm.value.participants = sessionForm.value.participants.filter(id => !allFilteredIds.includes(id));
  } else {
    sessionForm.value.participants = Array.from(new Set([...sessionForm.value.participants, ...allFilteredIds]));
  }
}

// 4. Smart Fill Execution
async function executeAutoFillRooms() {
  try {
    const daySessions = roomSessionStore.sessions.filter(s => s.date === selectedDate.value);
    if (daySessions.length === 0) {
      globalStore.addError('Aucune salle ouverte pour cette journée. Ouvrez d\'abord au moins une salle.');
      return;
    }

    const assignedIds = new Set();
    daySessions.forEach(s => (s.participants || []).forEach(p => assignedIds.add(p.documentId || p.id)));

    const unassigned = props.participants.filter(p => !assignedIds.has(p.documentId || p.id));
    if (unassigned.length === 0) {
      globalStore.addSuccess('Tous les bénéficiaires sont déjà affectés à une salle !');
      return;
    }

    let unassignedIdx = 0;
    let filledCount = 0;

    for (const session of daySessions) {
      const cap = session.location?.capacity || 10;
      const currentParts = [...(session.participants || [])];
      const needed = cap - currentParts.length;

      if (needed > 0 && unassignedIdx < unassigned.length) {
        const toAdd = unassigned.slice(unassignedIdx, unassignedIdx + needed);
        unassignedIdx += toAdd.length;
        filledCount += toAdd.length;

        const newPartIds = [...currentParts.map(p => p.documentId || p.id), ...toAdd.map(p => p.documentId || p.id)];
        const docId = session.documentId || session.id;

        await roomSessionStore.updateSession(docId, {
          date: session.date,
          location: session.location?.documentId || session.location?.id,
          manager: session.manager?.documentId || session.manager?.id,
          participants: newPartIds
        });
      }
    }

    globalStore.addSuccess(`${filledCount} bénéficiaire(s) réparti(s) automatiquement dans les salles ouvertes !`, 'Remplissage intelligent');
    showSmartFillModal.value = false;
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors du remplissage automatique.');
  }
}

async function autoFillRoomToCapacity(session) {
  try {
    const daySessions = roomSessionStore.sessions.filter(s => s.date === session.date);
    const assignedIds = new Set();
    daySessions.forEach(s => (s.participants || []).forEach(p => assignedIds.add(p.documentId || p.id)));

    const unassigned = props.participants.filter(p => !assignedIds.has(p.documentId || p.id));
    const cap = session.location?.capacity || 10;
    const currentParts = (session.participants || []).map(p => p.documentId || p.id);
    const placesLeft = cap - currentParts.length;

    if (placesLeft <= 0) {
      globalStore.addSuccess('Cette salle est déjà à pleine capacité !');
      return;
    }

    if (unassigned.length === 0) {
      globalStore.addSuccess('Aucun autre bénéficiaire disponible pour cette date.');
      return;
    }

    const toAdd = unassigned.slice(0, placesLeft);
    const newPartIds = [...currentParts, ...toAdd.map(p => p.documentId || p.id)];
    const docId = session.documentId || session.id;

    await roomSessionStore.updateSession(docId, {
      date: session.date,
      location: session.location?.documentId || session.location?.id,
      manager: session.manager?.documentId || session.manager?.id,
      participants: newPartIds
    });

    globalStore.addSuccess(`${toAdd.length} bénéficiaire(s) ajouté(s) à la salle ${session.location?.name} !`, 'Salle complétée');
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors du remplissage de la salle.');
  }
}

async function executeCascadeActivitiesFill() {
  try {
    const daySessions = roomSessionStore.sessions.filter(s => s.date === selectedDate.value);
    if (daySessions.length === 0) {
      globalStore.addError('Aucune session de salle ouverte pour cette date.');
      return;
    }

    let updatedSlotsCount = 0;

    for (const session of daySessions) {
      const roomPartIds = (session.participants || []).map(p => p.documentId || p.id);
      if (roomPartIds.length === 0) continue;

      const roomActivities = getActivitiesForSession(session);
      for (const act of roomActivities) {
        const docId = act.documentId || act.id;
        const currentPartIds = new Set((act.participants || []).map(p => p.documentId || p.id));
        roomPartIds.forEach(id => currentPartIds.add(id));

        await activeSchedulerStore.updateSlot(docId, {
          participants: Array.from(currentPartIds)
        });
        updatedSlotsCount++;
      }
    }

    globalStore.addSuccess(`Bénéficiaires inscrits en cascade sur ${updatedSlotsCount} créneau(x) d'activité !`, 'Inscription en cascade');
    showSmartFillModal.value = false;
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors de l\'affectation en cascade.');
  }
}

async function executeDuplicateDaySessions() {
  try {
    const targetDate = duplicateTargetDate.value;
    if (!targetDate || targetDate === selectedDate.value) {
      globalStore.addError('Veuillez sélectionner une date cible différente de la date source.');
      return;
    }

    const sourceSessions = roomSessionStore.sessions.filter(s => s.date === selectedDate.value);
    if (sourceSessions.length === 0) {
      globalStore.addError('Aucune session de salle à dupliquer sur la date source.');
      return;
    }

    let duplicatedCount = 0;
    for (const s of sourceSessions) {
      await roomSessionStore.createSession({
        date: targetDate,
        location: s.location?.documentId || s.location?.id,
        manager: s.manager?.documentId || s.manager?.id,
        participants: (s.participants || []).map(p => p.documentId || p.id)
      });
      duplicatedCount++;
    }

    globalStore.addSuccess(`${duplicatedCount} session(s) de salle dupliquée(s) vers le ${formatDate(targetDate)} !`, 'Duplication réussie');
    showSmartFillModal.value = false;
    selectedDate.value = targetDate;
    await fetchPeriodData();
    emit('refresh-data');
  } catch (err) {
    globalStore.addError(err.message || 'Erreur lors de la duplication.');
  }
}

// ─── CSV EXPORTS ───
function exportCurrentViewCSV() {
  if (mode.value === 'participant') {
    exportParticipantScheduleCSV();
  } else if (mode.value === 'manager') {
    exportManagerRoadmapCSV();
  } else if (mode.value === 'room') {
    exportRoomsOccupancyCSV();
  } else {
    exportAttendanceRegisterCSV();
  }
}

function exportParticipantScheduleCSV() {
  if (!selectedParticipant.value) return;
  const p = selectedParticipant.value;
  const rows = [
    ['Fiche Individuelle de Planning Bénéficiaire'],
    ['Bénéficiaire', `${p.firstName} ${p.lastName}`, 'Email', p.email || ''],
    ['Période', periodTitle.value, 'Vue', timeViewLabel.value],
    [],
    ['Date', 'Horaire Début', 'Horaire Fin', 'Activité', 'Lieu / Salle', 'Animateur Référent']
  ];

  allTimeSlots.value
    .filter(s => (s.participants || []).some(part => (part.documentId || part.id) === (p.documentId || p.id)))
    .forEach(s => {
      rows.push([
        formatDate(s.startDate),
        formatTime(s.startDate),
        formatTime(s.endDate),
        s.activityTemplate?.name || s.name || '',
        s.location?.name || '',
        getFacilitatorName(s.facilitators?.[0])
      ]);
    });

  downloadCSV(rows, `fiche_beneficiaire_${p.lastName}_${dateRange.value.startStr}.csv`);
}

function exportManagerRoadmapCSV() {
  if (!selectedFacilitator.value) return;
  const f = selectedFacilitator.value;
  const rows = [
    ['Feuille de Route Professionnelle'],
    ['Animateur / Gestionnaire', `${f.firstName} ${f.lastName}`, 'Email', f.email || ''],
    ['Période', periodTitle.value, 'Vue', timeViewLabel.value],
    [],
    ['Date', 'Horaire Début', 'Horaire Fin', 'Activité / Mission', 'Lieu', 'Nombre Inscrits']
  ];

  allTimeSlots.value
    .filter(s => (s.facilitators || []).some(fac => (fac.documentId || fac.id) === (f.documentId || f.id)))
    .forEach(s => {
      rows.push([
        formatDate(s.startDate),
        formatTime(s.startDate),
        formatTime(s.endDate),
        s.activityTemplate?.name || s.name || '',
        s.location?.name || '',
        (s.participants || []).length
      ]);
    });

  downloadCSV(rows, `feuille_route_${f.lastName}_${dateRange.value.startStr}.csv`);
}

function exportAttendanceRegisterCSV() {
  const rows = [
    ['EHPAD LES ÉCRIVAINS — ACCUEIL DE JOUR • REGISTRE D\'ÉMARGEMENT'],
    ['Période', periodTitle.value, 'Édité le', currentFormattedDate.value],
    [],
    ['N°', 'Date', 'Nom Bénéficiaire', 'Prénom Bénéficiaire', 'Salle d\'Accueil', 'Gestionnaire Référent', 'Activités Programmées', 'Émargement Matin', 'Émargement Après-Midi']
  ];

  summaryAttendanceList.value.forEach((r, idx) => {
    rows.push([
      idx + 1,
      r.date,
      r.participant.lastName || '',
      r.participant.firstName || '',
      r.roomName,
      r.managerName,
      r.activities.join(' / '),
      r.morningSigned ? 'OUI' : '',
      r.afternoonSigned ? 'OUI' : ''
    ]);
  });

  downloadCSV(rows, `registre_emargement_${dateRange.value.startStr}_${dateRange.value.endStr}.csv`);
}

function exportRoomsOccupancyCSV() {
  const rows = [
    ['EHPAD LES ÉCRIVAINS — TAUX D\'OCCUPATION DES SALLES'],
    ['Période', periodTitle.value],
    [],
    ['Salle / Lieu', 'Capacité Max', 'Date', 'Nombre de Bénéficiaires', 'Taux de Remplissage (%)', 'Gestionnaire Référent']
  ];

  roomSessionStore.sessions.forEach(sess => {
    const count = (sess.participants || []).length;
    const cap = sess.location?.capacity || 10;
    const pct = Math.round((count / cap) * 100);

    rows.push([
      sess.location?.name || '',
      cap,
      sess.date,
      count,
      `${pct}%`,
      getFacilitatorName(sess.manager)
    ]);
  });

  downloadCSV(rows, `taux_remplissage_salles_${dateRange.value.startStr}.csv`);
}

function downloadCSV(rows, filename) {
  const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── HELPERS ───
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getFacilitatorName(f) {
  if (!f) return 'Non désigné';
  return `${f.firstName || ''} ${f.lastName || ''}`.trim();
}

function getEffectiveAnimatorName(act, session) {
  if (act.facilitators && act.facilitators.length > 0) {
    return getFacilitatorName(act.facilitators[0]);
  }
  if (session && session.manager) {
    return getFacilitatorName(session.manager);
  }
  return 'Non attribué';
}

function isDefaultManagerAnimator(act, session) {
  return (!act.facilitators || act.facilitators.length === 0) && session && session.manager;
}

function getAnimatorStatusClass(act) {
  const facilitators = act.facilitators || [];
  if (facilitators.length === 0) return 'status-default';
  const isMe = facilitators.some(f => (f.documentId || f.id) === selectedFacilitatorId.value);
  return isMe ? 'status-me' : 'status-external';
}

function getAnimatorStatusText(act) {
  const facilitators = act.facilitators || [];
  if (facilitators.length === 0) return '✨ Vous (Gestionnaire par défaut)';
  const isMe = facilitators.some(f => (f.documentId || f.id) === selectedFacilitatorId.value);
  if (isMe) return '✨ Vous (Animateur désigné)';
  const extName = getFacilitatorName(facilitators[0]);
  return `👥 ${extName} (Intervenant)`;
}

function isParticipantEnrolledInSlot(slot, pid) {
  return (slot.participants || []).some(p => (p.documentId || p.id) === pid);
}

const availableSlotsForAssign = computed(() => {
  return allTimeSlots.value;
});

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getPrintDocTitle() {
  if (mode.value === 'participant') {
    return selectedParticipant.value 
      ? `FICHE INDIVIDUELLE — ${selectedParticipant.value.firstName} ${selectedParticipant.value.lastName}` 
      : 'FICHE INDIVIDUELLE BÉNÉFICIAIRE';
  } else if (mode.value === 'manager') {
    return selectedFacilitator.value 
      ? `FEUILLE DE ROUTE — ${selectedFacilitator.value.firstName} ${selectedFacilitator.value.lastName}` 
      : 'FEUILLE DE ROUTE GESTIONNAIRE';
  } else if (mode.value === 'room') {
    return 'ÉTAT D\'OCCUPATION & GESTION DES SALLES';
  } else {
    return 'REGISTRE GÉNÉRAL D\'ÉMARGEMENT & DE PRÉSENCE';
  }
}

function printExtraction() {
  window.print();
}
</script>

<style scoped>
.extractions-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ─── HEADER & CONTROLS ─── */
.view-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(30, 41, 59, 0.7);
  padding: 1.25rem 1.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
}

.header-main-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-title h2 { margin: 0; font-size: 1.5rem; color: #fff; }
.subtitle { margin: 0.25rem 0 0 0; font-size: 0.9rem; color: #94a3b8; }

.header-action-buttons {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.primary-btn {
  background: #0d9488;
  color: #fff;
}
.primary-btn:hover { background: #0f766e; }

.secondary-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.secondary-btn:hover { background: rgba(255, 255, 255, 0.15); }

.smart-fill-btn {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
.smart-fill-btn:hover {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  transform: translateY(-1px);
}

.print-btn {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}
.print-btn:hover { background: rgba(16, 185, 129, 0.25); }

.danger-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}
.danger-btn:hover { background: rgba(239, 68, 68, 0.35); }

.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.82rem; }
.btn-xs { padding: 0.25rem 0.55rem; font-size: 0.75rem; }

/* Export Dropdown */
.export-dropdown-wrapper {
  position: relative;
}

.export-btn {
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.export-menu-dropdown {
  position: absolute;
  top: 110%;
  right: 0;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: flex;
  flex-direction: column;
  min-width: 260px;
  overflow: hidden;
}

.export-menu-dropdown button {
  padding: 0.75rem 1rem;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}

.export-menu-dropdown button:hover {
  background: rgba(99, 102, 241, 0.2);
  color: #fff;
}

/* ─── TEMPORAL NAVIGATION BAR ─── */
.temporal-navigation-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.time-view-switchers {
  display: flex;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.25rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.time-btn {
  background: none;
  border: none;
  color: #94a3b8;
  padding: 0.45rem 0.9rem;
  border-radius: 0.45rem;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.time-btn.active {
  background: #0d9488;
  color: #fff;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.4);
}

.date-navigator-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.nav-arrow-btn, .today-btn {
  background: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f1f5f9;
  padding: 0.45rem 0.85rem;
  border-radius: 0.45rem;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.today-btn {
  background: rgba(99, 102, 241, 0.25);
  border-color: rgba(99, 102, 241, 0.5);
  color: #c7d2fe;
}

.nav-arrow-btn:hover {
  background: rgba(51, 65, 85, 0.95);
  border-color: rgba(255, 255, 255, 0.35);
  color: #ffffff;
  transform: translateY(-1px);
}

.today-btn:hover {
  background: rgba(99, 102, 241, 0.4);
  border-color: rgba(165, 180, 252, 0.7);
  color: #ffffff;
  transform: translateY(-1px);
}

.period-title-badge {
  display: flex;
  flex-direction: column;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 0.4rem 0.9rem;
  border-radius: 0.5rem;
  min-width: 180px;
  text-align: center;
}

.period-text { font-size: 0.92rem; font-weight: 600; color: #c7d2fe; }
.period-sub { font-size: 0.75rem; color: #94a3b8; }

.date-input-field {
  padding: 0.45rem 0.6rem;
  border-radius: 0.45rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  font-size: 0.85rem;
}

/* ─── MODE TABS ─── */
.mode-tabs {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.tab-btn {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 0.65rem 1.1rem;
  border-radius: 0.6rem;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

/* ─── SELECTOR CARDS ─── */
.selector-card {
  background: rgba(30, 41, 59, 0.6);
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.selector-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.selector-col label {
  display: block;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 0.4rem;
  font-weight: 500;
}

.selector-actions-col {
  display: flex;
  gap: 0.5rem;
}

.select-large {
  width: 100%;
  padding: 0.65rem 1rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.5rem;
  color: #fff;
  font-size: 0.95rem;
}

/* ─── REPORT CARD & HEADERS ─── */
.report-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  backdrop-filter: blur(10px);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 1.25rem 1.5rem;
  border-radius: 0.75rem;
  border-left: 4px solid #0d9488;
}

.report-header.manager-theme { border-left-color: #10b981; }
.report-header.room-theme { border-left-color: #6366f1; }

.person-badge {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.badge-avatar { font-size: 2.2rem; }
.person-badge h3 { margin: 0; font-size: 1.35rem; color: #f8fafc; }
.date-label, .role-subtitle { font-size: 0.85rem; color: #94a3b8; }

.period-stats-box {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-num { font-size: 1.1rem; font-weight: 700; color: #38bdf8; }
.stat-lbl { font-size: 0.72rem; color: #94a3b8; }

/* ─── ROOM BOXES & TIMELINES ─── */
.room-assignment-box, .managed-rooms-box {
  background: rgba(99, 102, 241, 0.12);
  padding: 0.85rem 1.25rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(99, 102, 241, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.room-assignment-box.warning, .managed-rooms-box.warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

.room-tags-wrapper {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.room-summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(15, 23, 42, 0.7);
  padding: 0.35rem 0.7rem;
  border-radius: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.action-link-btn {
  background: none;
  border: none;
  color: #818cf8;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-title-row h4 { margin: 0; font-size: 1.05rem; color: #f1f5f9; }

/* Activities Timeline */
.activities-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-timeline-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(15, 23, 42, 0.5);
  padding: 0.85rem 1.1rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.time-col {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-width: 75px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 0.45rem;
  padding: 0.4rem;
  font-weight: bold;
  color: #818cf8;
  font-size: 0.85rem;
}

.activity-card { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
.act-title-row { display: flex; justify-content: space-between; align-items: center; }
.act-title-row h5 { margin: 0; font-size: 1rem; color: #f1f5f9; }

.location-tag {
  background: rgba(255, 255, 255, 0.08);
  padding: 0.2rem 0.5rem;
  border-radius: 0.35rem;
  font-size: 0.8rem;
  color: #cbd5e1;
}

.act-desc { margin: 0; font-size: 0.85rem; color: #94a3b8; }
.act-animator { font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; }
.default-badge { font-size: 0.75rem; color: #a5b4fc; font-style: italic; }

.act-actions { display: flex; gap: 0.4rem; }
.icon-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 0.35rem 0.55rem;
  border-radius: 0.4rem;
  cursor: pointer;
}
.icon-btn:hover { background: rgba(255, 255, 255, 0.15); }

/* ─── WEEK GRID CARDS ─── */
.week-days-schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.week-day-schedule-card {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.week-day-schedule-card.is-today {
  border-color: #0d9488;
  box-shadow: 0 0 15px rgba(13, 148, 136, 0.2);
}

.day-card-header {
  background: rgba(30, 41, 59, 0.8);
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.day-title { display: flex; flex-direction: column; }
.day-name { font-weight: 700; font-size: 0.95rem; color: #f8fafc; text-transform: capitalize; }
.day-num { font-size: 0.8rem; color: #94a3b8; }

.day-status-tag {
  font-size: 0.75rem;
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  padding: 0.2rem 0.5rem;
  border-radius: 0.35rem;
}
.tag-off { background: rgba(255, 255, 255, 0.05); color: #64748b; }

.day-card-body {
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.day-activities-list { display: flex; flex-direction: column; gap: 0.4rem; }

.mini-act-badge {
  background: rgba(255, 255, 255, 0.04);
  border-left: 3px solid #6366f1;
  padding: 0.35rem 0.55rem;
  border-radius: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.mini-act-time { font-size: 0.75rem; color: #818cf8; font-weight: 600; }
.mini-act-name { font-size: 0.82rem; color: #f1f5f9; }
.mini-act-anim, .mini-act-location { font-size: 0.72rem; color: #94a3b8; }

.no-mini-act { font-size: 0.8rem; color: #64748b; font-style: italic; padding: 0.5rem 0; }
.day-card-footer { padding: 0.5rem 0.85rem; border-top: 1px solid rgba(255, 255, 255, 0.04); text-align: right; }

/* ─── MONTH CALENDAR GRID ─── */
.month-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
}

.month-grid-col-header {
  text-align: center;
  padding: 0.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 0.4rem;
}

.month-cal-cell {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.5rem;
  min-height: 80px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.15s;
}

.month-cal-cell:hover { background: rgba(255, 255, 255, 0.06); }
.month-cal-cell.other-month { opacity: 0.35; cursor: default; }
.month-cal-cell.is-today { border-color: #0d9488; }
.month-cal-cell.has-schedule { border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.08); }

.cell-top { display: flex; justify-content: space-between; align-items: center; }
.cell-num { font-size: 0.8rem; font-weight: 600; color: #cbd5e1; }
.room-dot { font-size: 0.75rem; }

.cell-acts { display: flex; flex-direction: column; gap: 0.2rem; margin-top: 0.3rem; }
.month-mini-pill {
  background: rgba(99, 102, 241, 0.3);
  color: #c7d2fe;
  font-size: 0.68rem;
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.month-mini-pill.manager-pill { background: rgba(16, 185, 129, 0.25); color: #6ee7b7; }
.more-count { font-size: 0.65rem; color: #94a3b8; text-align: center; }

/* ─── ROOM GAUGE & DETAIL ─── */
.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.25rem;
}

.room-card-detail { gap: 1rem; }

.room-gauge-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 140px;
}

.gauge-bar-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.gauge-bar { height: 100%; transition: width 0.3s ease; }
.bar-low { background: #38bdf8; }
.bar-optimal { background: #10b981; }
.bar-full { background: #f43f5e; }

.gauge-labels { display: flex; justify-content: space-between; font-size: 0.78rem; color: #cbd5e1; }
.room-participants-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }

.p-chip-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(15, 23, 42, 0.7);
  padding: 0.3rem 0.65rem;
  border-radius: 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.85rem;
}

.p-chip-tag.p-chip-unavail {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.45);
  color: #fca5a5;
}

.unavail-chip-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: #f87171;
  background: rgba(239, 68, 68, 0.2);
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}

.remove-chip-btn {
  background: none;
  border: none;
  color: #f87171;
  font-size: 0.75rem;
  cursor: pointer;
}

.room-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* ─── OCCUPANCY MATRIX ─── */
.occupancy-matrix-wrapper { overflow-x: auto; }
.occupancy-matrix-table { width: 100%; border-collapse: collapse; text-align: center; }
.occupancy-matrix-table th, .occupancy-matrix-table td { padding: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.08); }
.occupancy-matrix-table th { background: rgba(15, 23, 42, 0.8); color: #94a3b8; font-size: 0.82rem; }
.loc-name-cell { text-align: left; }

.matrix-occupancy-cell { font-size: 0.85rem; }
.cell-empty { background: rgba(255, 255, 255, 0.02); color: #64748b; }
.cell-low { background: rgba(56, 189, 248, 0.12); color: #38bdf8; }
.cell-optimal { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.cell-full { background: rgba(244, 63, 94, 0.18); color: #fb7185; }

/* ─── GLOBAL KPI & SUMMARY REGISTER ─── */
.global-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.kpi-card {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.25rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.kpi-icon { font-size: 2.2rem; }
.kpi-val { font-size: 1.6rem; font-weight: 700; color: #f8fafc; }
.kpi-lbl { font-size: 0.8rem; color: #94a3b8; }

.attendance-register-table { width: 100%; border-collapse: collapse; }
.attendance-register-table th, .attendance-register-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
}
.attendance-register-table th { background: rgba(15, 23, 42, 0.8); color: #94a3b8; font-size: 0.82rem; }

.sig-checkbox-box {
  display: flex;
  justify-content: center;
  align-items: center;
}
.sig-checkbox { width: 18px; height: 18px; cursor: pointer; }

.status-badge {
  padding: 0.25rem 0.55rem;
  border-radius: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
}
.status-active { background: rgba(16, 185, 129, 0.15); color: #34d399; }

/* Signature box for print */
.signature-box {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.sig-block { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.sig-line { height: 1px; background: rgba(255, 255, 255, 0.2); margin-top: 2rem; }

/* ─── MODALS ─── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 1rem;
}

.modal-card {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1rem;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-large { max-width: 800px; }

.modal-header { display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 1.25rem; color: #fff; }
.close-btn { background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; }

.smart-tools-grid { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
.tool-action-card {
  display: flex;
  gap: 1rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.tool-icon { font-size: 2rem; }
.tool-desc h4 { margin: 0 0 0.25rem 0; color: #f8fafc; font-size: 1.05rem; }
.tool-desc p { margin: 0; font-size: 0.85rem; color: #94a3b8; }

.form-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.85rem; }
.form-group label { font-size: 0.85rem; font-weight: 500; color: #cbd5e1; }

.form-input {
  padding: 0.6rem 0.85rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(15, 23, 42, 0.85);
  color: #fff;
  color-scheme: dark;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: #0d9488;
  outline: none;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.25);
  background: rgba(15, 23, 42, 0.98);
}

select.form-input {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235eead4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.15rem 1.15rem;
  padding-right: 2.4rem;
  cursor: pointer;
}

select.form-input option {
  background-color: #0f172a !important;
  color: #f8fafc !important;
  padding: 10px 14px;
}

.checkbox-scroll-list {
  max-height: 200px;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.45rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: #cbd5e1;
  cursor: pointer;
  padding: 0.35rem 0.55rem;
  border-radius: 0.35rem;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.checkbox-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.checkbox-row.is-checked {
  background: rgba(13, 148, 136, 0.15);
  border-color: rgba(13, 148, 136, 0.3);
}

/* RED HIGHLIGHT FOR UNAVAILABLE BENEFICIARIES IN EXTRACTIONS */
.checkbox-row.is-unavailable {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.checkbox-row.is-unavailable:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
}

.checkbox-row.is-unavailable.is-checked {
  background: rgba(239, 68, 68, 0.22);
  border-color: rgba(239, 68, 68, 0.6);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

/* ─── PRINT STYLES ─── */
.print-official-header { display: none; }

@media print {
  body, html, .extractions-container {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .no-print, .app-header, .app-nav, .view-header, .mode-tabs {
    display: none !important;
  }
  .print-official-header {
    display: block !important;
    border-bottom: 2px solid #000000;
    padding-bottom: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .print-brand { font-size: 0.9rem; font-weight: bold; letter-spacing: 0.05em; color: #333; }
  .print-title-row { display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem; }
  .print-title-row h2 { margin: 0; font-size: 1.4rem; color: #000; }
  .print-sub-info { font-size: 0.75rem; color: #666; margin-top: 0.25rem; }

  .report-card {
    background: #ffffff !important;
    color: #000000 !important;
    border: 1px solid #cbd5e1 !important;
    box-shadow: none !important;
    page-break-inside: avoid;
  }
  .report-header {
    background: #f8fafc !important;
    color: #000000 !important;
    border-left: 4px solid #000000 !important;
  }
  .person-badge h3, .section-title-row h4, .act-title-row h5, .loc-name-cell strong {
    color: #000000 !important;
  }
  .activity-timeline-item, .week-day-schedule-card, .participant-card {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    color: #000000 !important;
  }
  .time-col {
    background: #f1f5f9 !important;
    border: 1px solid #cbd5e1 !important;
    color: #000000 !important;
  }
  .activities-table th, .attendance-register-table th, .occupancy-matrix-table th {
    background: #f1f5f9 !important;
    color: #000000 !important;
    border: 1px solid #cbd5e1 !important;
  }
  .activities-table td, .attendance-register-table td, .occupancy-matrix-table td {
    border: 1px solid #cbd5e1 !important;
    color: #000000 !important;
  }
  .sig-placeholder-line {
    display: inline-block;
    width: 60px;
    height: 1px;
    background: #000000;
  }
  .sig-line { background: #000000 !important; }
}
</style>
