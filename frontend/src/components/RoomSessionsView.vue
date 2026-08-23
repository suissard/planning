<template>
  <div class="room-sessions-root printable-room-sessions" :class="{ 'is-dragging-active': !!activeDragType, ['drag-' + activeDragType]: !!activeDragType }">
    
    <!-- ════════════════ TOP HEADER CONTROLS (NO PRINT) ════════════════ -->
    <div class="view-header no-print">
      <div class="header-main">
        <div class="header-title-wrapper">
          <div class="header-icon-box">🚪</div>
          <div>
            <div class="title-with-pill">
              <h2>Gestion des Ouvertures de Salles</h2>
              <span class="mode-tag-pill">Admin</span>
              <span class="dnd-badge-pill">✨ Glisser-Déposer Actif</span>
            </div>
            <p class="subtitle">
              Remplissez facilement votre semaine ou vos journées : glissez des salles, assignez des gestionnaires et affectez des bénéficiaires.
            </p>
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
          <button 
            type="button" 
            class="nav-arrow-btn" 
            :class="{ 'is-loading': roomSessionStore.loading && lastNavAction === 'prev' }"
            :disabled="roomSessionStore.loading"
            @click="navigateDate(-1)" 
            title="Période précédente"
          >
            <span v-if="roomSessionStore.loading && lastNavAction === 'prev'" class="mini-spinner"></span>
            <span v-else>◄</span>
          </button>
          <button 
            type="button" 
            class="today-btn" 
            :class="{ 'is-loading': roomSessionStore.loading && lastNavAction === 'today' }"
            :disabled="roomSessionStore.loading"
            @click="goToToday" 
            title="Revenir à aujourd'hui"
          >
            <span v-if="roomSessionStore.loading && lastNavAction === 'today'" class="mini-spinner inline"></span>
            Aujourd'hui
          </button>
          <button 
            type="button" 
            class="nav-arrow-btn" 
            :class="{ 'is-loading': roomSessionStore.loading && lastNavAction === 'next' }"
            :disabled="roomSessionStore.loading"
            @click="navigateDate(1)" 
            title="Période suivante"
          >
            <span v-if="roomSessionStore.loading && lastNavAction === 'next'" class="mini-spinner"></span>
            <span v-else>►</span>
          </button>
          
          <div class="period-title-block">
            <span class="current-period-title">{{ periodTitle }}</span>
            <span v-if="roomSessionStore.loading" class="nav-loading-badge">
              <span class="pulse-dot"></span> Chargement...
            </span>
            <span v-else-if="viewMode === 'week'" class="period-subtitle">{{ weekDaysRangeLabel }}</span>
          </div>

          <!-- Date Picker input to jump anywhere -->
          <div class="direct-date-input-wrapper" :class="{ 'is-loading': roomSessionStore.loading && lastNavAction === 'date-input' }">
            <input 
              type="date" 
              :value="currentDateStr" 
              :disabled="roomSessionStore.loading"
              @change="onDirectDateChange" 
              class="direct-date-input" 
              title="Sélectionner une date précise"
            />
          </div>
        </div>

        <!-- ACTION TOOLS (Édition & Remplissage) -->
        <div class="action-tools-group">
          <!-- Toggle Side Palette Button -->
          <button 
            type="button" 
            class="tool-btn palette-toggle-btn"
            :class="{ active: isPaletteOpen }"
            @click="isPaletteOpen = !isPaletteOpen"
            title="Afficher/masquer le panneau latéral de glisser-déposer"
          >
            <span class="btn-icon">✨</span>
            <span>Palette D&D ({{ isPaletteOpen ? 'Masquer' : 'Afficher' }})</span>
          </button>

          <button type="button" class="action-btn primary-btn" @click="openCreateModal()" title="Ouvrir une salle">
            ➕ Ouvrir une Salle
          </button>

          <button type="button" class="tool-btn template-btn" @click="openTemplateModal" title="Remplir automatiquement selon une semaine type">
            ⚡ Semaine Type
          </button>

          <button type="button" class="tool-btn duplicate-btn" @click="openDuplicateModal" title="Dupliquer les ouvertures vers d'autres dates">
            📋 Dupliquer
          </button>

          <button type="button" class="tool-btn shortcut-btn" @click="$emit('navigate', 'timeslots')" title="Accéder directement au planning des animations">
            🎯 Planning Animations
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
    <!-- Error State -->
    <div v-if="roomSessionStore.error" class="state-container error">
      <span class="error-icon">⚠️</span>
      <p>{{ roomSessionStore.error }}</p>
      <button class="action-btn secondary-btn mt-2" @click="loadDataForCurrentView">Réessayer</button>
    </div>

    <!-- ════════════════ DND WORKSPACE CONTAINER ════════════════ -->
    <div v-else class="dnd-main-layout" :class="{ 'palette-visible': isPaletteOpen }">
      <!-- Translucent Canvas Loading Overlay during fetch -->
      <div v-if="roomSessionStore.loading" class="canvas-loading-overlay">
        <div class="loading-card-badge">
          <div class="spinner"></div>
          <span>Actualisation des ouvertures de salles ({{ periodTitle }})...</span>
        </div>
      </div>
      
      <!-- ────────────────── LEFT / CENTER: PLANNING CANVAS ────────────────── -->
      <div class="planning-canvas">

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- 1. VUE SEMAINE (WEEK VIEW: COLUMNS KANBAN / MATRIX)  -->
        <!-- ═══════════════════════════════════════════════════ -->
        <div v-if="viewMode === 'week'" class="week-view-wrapper">
          <!-- Week Sub-Toolbar -->
          <div class="week-sub-toolbar no-print">
            <div class="week-info-chips">
              <span class="info-chip">📅 {{ weekDaysList.length }} jours</span>
              <span class="info-chip">🚪 {{ currentPeriodSessionsCount }} ouvertures</span>
              <span class="info-chip">👥 {{ metrics.totalParticipants }} affectations</span>
            </div>

            <div class="week-view-toggles">
              <div class="sub-view-pill">
                <button 
                  type="button" 
                  class="sub-pill-btn" 
                  :class="{ active: weekSubView === 'kanban' }"
                  @click="weekSubView = 'kanban'"
                  title="Vue par colonnes interactives avec Glisser-Déposer"
                >
                  📋 Colonnes Drag & Drop
                </button>
                <button 
                  type="button" 
                  class="sub-pill-btn" 
                  :class="{ active: weekSubView === 'matrix' }"
                  @click="weekSubView = 'matrix'"
                  title="Vue matricielle en tableau Lieux x Jours"
                >
                  📊 Matrice Tableau
                </button>
              </div>

              <button type="button" class="mini-tool-btn highlight-btn" @click="openWeeklyBatchOpen" title="Ouvrir toutes les salles Lun-Ven">
                ⚡ Ouvrir toutes les salles Lun-Ven
              </button>
              <button type="button" class="mini-tool-btn" @click="duplicateWeekDayToOthers" title="Dupliquer le Lundi sur la semaine">
                📋 Dupliquer Lundi
              </button>
            </div>
          </div>

          <!-- A. KANBAN DAY COLUMNS (PRIMARY D&D VIEW) -->
          <div v-if="weekSubView === 'kanban'" class="week-kanban-board">
            <div 
              v-for="day in weekDaysList" 
              :key="day.dateKey" 
              class="kanban-day-column"
              :class="{ 
                'is-today': day.isToday,
                'drop-hover': hoveredDropZone === 'day-' + day.dateKey,
                'drag-over-valid': activeDragType === 'room'
              }"
              @dragover.prevent="onDragOver($event, 'room')"
              @dragenter.prevent="onDragEnter($event, 'day-' + day.dateKey)"
              @dragleave="onDragLeave($event, 'day-' + day.dateKey)"
              @drop="onDropOnDay($event, day.dateKey)"
            >
              <!-- Column Header -->
              <div class="column-header" @click="goToDayView(day.date)">
                <div class="col-title-group">
                  <span class="col-day-name">{{ day.dayName }}</span>
                  <span class="col-day-date">{{ day.dayNumber }} {{ day.monthShort }}</span>
                  <span v-if="day.isToday" class="today-tag">Aujourd'hui</span>
                </div>
                <div class="col-header-actions" @click.stop>
                  <span class="col-badge" :class="{ 'zero-badge': getSessionsForDate(day.dateKey).length === 0 }">
                    {{ getSessionsForDate(day.dateKey).length }} salle(s)
                  </span>
                  <button 
                    type="button" 
                    class="col-add-btn" 
                    @click="openCreateModal(day.dateKey)" 
                    title="Ouvrir une salle pour ce jour"
                  >
                    ➕
                  </button>
                </div>
              </div>

              <!-- Quick Room Drop Target Zone when dragging a room -->
              <div 
                v-if="activeDragType === 'room'" 
                class="column-quick-drop-zone"
                :class="{ 'target-active': hoveredDropZone === 'day-' + day.dateKey }"
              >
                <span>➕ Déposer la salle ici pour ouvrir</span>
              </div>

              <!-- Column Sessions List -->
              <div class="column-sessions-list">
                <!-- Empty Column Placeholder -->
                <div 
                  v-if="getSessionsForDate(day.dateKey).length === 0" 
                  class="column-empty-state"
                  @click="openCreateModal(day.dateKey)"
                >
                  <span class="empty-icon">🏢</span>
                  <p>Aucune salle ouverte</p>
                  <span class="empty-hint">Glissez une salle ici ou cliquez pour ouvrir</span>
                </div>

                <!-- Session Cards in this day -->
                <div 
                  v-for="session in getSessionsForDate(day.dateKey)" 
                  :key="session.documentId || session.id" 
                  class="kanban-session-card"
                  :class="[
                    getCapacityClass(session),
                    { 
                      'card-conflict': getSessionConflictInfo(session).hasConflict,
                      'card-drop-active': hoveredDropZone === 'sess-' + (session.documentId || session.id)
                    }
                  ]"
                  @dragover.prevent="onDragOver($event, 'any')"
                  @dragenter.prevent="onDragEnter($event, 'sess-' + (session.documentId || session.id))"
                  @dragleave="onDragLeave($event, 'sess-' + (session.documentId || session.id))"
                  @drop="onDropOnSession($event, session)"
                >
                  <!-- Card Top: Room Name & Capacity -->
                  <div class="kcard-header">
                    <div class="kcard-room-info">
                      <span class="room-dot">📍</span>
                      <strong class="kcard-room-name">{{ getRoomName(session) }}</strong>
                    </div>

                    <div class="kcard-actions no-print">
                      <button type="button" class="mini-icon-btn edit" @click.stop="editSession(session)" title="Modifier">✏️</button>
                      <button type="button" class="mini-icon-btn delete" @click.stop="confirmDelete(session)" title="Fermer la salle">🗑️</button>
                    </div>
                  </div>

                  <!-- Capacity Pill & Progress Mini-Bar -->
                  <div class="kcard-capacity-row">
                    <span class="kcard-cap-badge" :class="getCapacityClass(session)">
                      👥 {{ getParticipantCount(session) }} / {{ getRoomCapacity(session) }}
                    </span>
                    <span v-if="getSessionConflictInfo(session).hasConflict" class="kcard-conflict-pill" title="Conflit détecté">
                      ⚠️ Conflit
                    </span>
                    <span v-else-if="getParticipantCount(session) >= getRoomCapacity(session)" class="kcard-full-pill">
                      ✅ Plein
                    </span>
                    <span v-else class="kcard-avail-pill">
                      {{ getRoomCapacity(session) - getParticipantCount(session) }} libre(s)
                    </span>
                  </div>

                  <div class="kcard-progress-bar">
                    <div 
                      class="kcard-progress-fill"
                      :style="{ width: Math.min(getCapacityPercentage(session), 100) + '%' }"
                      :class="getCapacityClass(session)"
                    ></div>
                  </div>

                  <!-- Conflict Summary if present -->
                  <div v-if="getSessionConflictInfo(session).hasConflict" class="kcard-conflict-box no-print">
                    <span>⚠️ {{ getSessionConflictInfo(session).conflictSummary }}</span>
                  </div>

                  <!-- 👨‍💼 Manager Slot (D&D Target & Draggable) -->
                  <div 
                    class="kcard-manager-slot"
                    :class="{ 
                      'has-manager': !!session.manager,
                      'no-manager': !session.manager,
                      'manager-unavail': getSessionConflictInfo(session).unavailableManager,
                      'drop-hover-slot': hoveredDropZone === 'mgr-' + (session.documentId || session.id)
                    }"
                    @dragover.prevent.stop="onDragOver($event, 'manager')"
                    @dragenter.prevent.stop="onDragEnter($event, 'mgr-' + (session.documentId || session.id))"
                    @dragleave.stop="onDragLeave($event, 'mgr-' + (session.documentId || session.id))"
                    @drop.stop="onDropOnSession($event, session, 'manager')"
                  >
                    <template v-if="session.manager">
                      <div 
                        class="manager-chip-draggable"
                        draggable="true"
                        @dragstart="onDragStart($event, { type: 'manager', facilitator: session.manager, fromSessionId: session.documentId || session.id })"
                        @dragend="onDragEnd"
                        title="Glisser pour déplacer le référent ou vers la corbeille pour désaffecter"
                      >
                        <span class="mgr-avatar">{{ getSessionConflictInfo(session).unavailableManager ? '🔴' : '👨‍💼' }}</span>
                        <div class="mgr-details">
                          <span class="mgr-role">Référent :</span>
                          <strong class="mgr-name">{{ getManagerName(session) }}</strong>
                        </div>
                        <button 
                          type="button" 
                          class="unassign-btn no-print" 
                          @click.stop="unassignManagerQuick(session)" 
                          title="Retirer ce gestionnaire référent"
                        >
                          ✕
                        </button>
                      </div>
                    </template>
                    <template v-else>
                      <div class="empty-manager-drop" @click="editSession(session)">
                        <span class="drop-icon">👉</span>
                        <span class="drop-text">Glisser un référent ici</span>
                      </div>
                    </template>
                  </div>

                  <!-- 👥 Participants Section (D&D List & Drop Zone) -->
                  <div 
                    class="kcard-participants-section"
                    :class="{ 'drop-hover-parts': hoveredDropZone === 'parts-' + (session.documentId || session.id) }"
                    @dragover.prevent="onDragOver($event, 'participant')"
                    @dragenter.prevent="onDragEnter($event, 'parts-' + (session.documentId || session.id))"
                    @dragleave="onDragLeave($event, 'parts-' + (session.documentId || session.id))"
                    @drop="onDropOnSession($event, session, 'participant')"
                  >
                    <div class="parts-header-row">
                      <span class="parts-title">Bénéficiaires ({{ getParticipantCount(session) }})</span>
                      <button 
                        type="button" 
                        class="mini-link-btn no-print" 
                        @click.stop="openInlineAddParticipant(session)"
                        title="Ajouter des participants"
                      >
                        ➕
                      </button>
                    </div>

                    <!-- Participant Draggable Chips -->
                    <div class="parts-chips-container">
                      <div 
                        v-for="p in getParticipants(session)" 
                        :key="p.documentId || p.id"
                        class="participant-chip-draggable"
                        :class="{ 'chip-unavail': isParticipantUnavailableInSession(p, session) }"
                        draggable="true"
                        @dragstart="onDragStart($event, { type: 'participant', participant: p, fromSessionId: session.documentId || session.id })"
                        @dragend="onDragEnd"
                        :title="isParticipantUnavailableInSession(p, session) ? getParticipantUnavailabilityTitle(p, session) + ' — Glisser pour déplacer' : 'Glisser pour déplacer vers une autre salle/jour ou vers la corbeille'"
                      >
                        <span class="chip-icon">{{ isParticipantUnavailableInSession(p, session) ? '⚠️' : '👤' }}</span>
                        <span class="chip-name">{{ p.lastName }} {{ p.firstName }}</span>
                        <button 
                          type="button" 
                          class="chip-remove-btn no-print" 
                          @click.stop="removeParticipantQuick(session, p)" 
                          title="Retirer ce bénéficiaire"
                        >
                          ✕
                        </button>
                      </div>

                      <!-- Empty participant drop zone when room has space -->
                      <div 
                        class="participant-drop-target-box"
                        :class="{ 'target-highlight': activeDragType === 'participant' }"
                      >
                        <span class="drop-hint-icon">📥</span>
                        <span class="drop-hint-text">
                          {{ getParticipantCount(session) === 0 ? 'Glisser des bénéficiaires ici' : '+ Déposer un bénéficiaire' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- B. WEEK MATRIX TABLE (ALTERNATIVE VIEW) -->
          <div v-else-if="weekSubView === 'matrix'" class="week-matrix-wrapper">
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
                  <td class="matrix-room-cell">
                    <div class="matrix-room-info">
                      <span class="matrix-room-icon">📍</span>
                      <div>
                        <strong class="matrix-room-title">{{ loc.name }}</strong>
                        <span class="matrix-room-cap">Capacité : {{ loc.capacity }}</span>
                      </div>
                    </div>
                  </td>

                  <td 
                    v-for="day in weekDaysList" 
                    :key="day.dateKey" 
                    class="matrix-slot-cell"
                    :class="{ 
                      'cell-has-session': !!getSessionForRoomAndDate(loc, day.dateKey),
                      'cell-drop-hover': hoveredDropZone === 'mat-' + loc.id + '-' + day.dateKey
                    }"
                    @dragover.prevent="onDragOver($event, 'any')"
                    @dragenter.prevent="onDragEnter($event, 'mat-' + loc.id + '-' + day.dateKey)"
                    @dragleave="onDragLeave($event, 'mat-' + loc.id + '-' + day.dateKey)"
                    @drop="onMatrixCellDrop($event, loc, day.dateKey)"
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
                        <button type="button" class="matrix-action-btn edit" @click="editSession(getSessionForRoomAndDate(loc, day.dateKey))" title="Modifier">✏️</button>
                        <button type="button" class="matrix-action-btn delete" @click="confirmDelete(getSessionForRoomAndDate(loc, day.dateKey))" title="Fermer">🗑️</button>
                      </div>
                    </div>

                    <!-- If Room is Closed on this day -->
                    <div 
                      v-else 
                      class="matrix-closed-cell"
                      @click="openRoomForDay(loc, day.dateKey)"
                      title="Cliquez ou glissez pour ouvrir cette salle ce jour-là"
                    >
                      <span class="closed-label">Fermée</span>
                      <button type="button" class="quick-open-btn no-print">➕ Ouvrir</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- 2. VUE JOUR (DETAILED DAY VIEW WITH D&D)            -->
        <!-- ═══════════════════════════════════════════════════ -->
        <div v-else-if="viewMode === 'day'" class="day-view-container">
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
                title="Salles avec conflits"
              >
                ⚠️ Conflits ({{ currentDayConflictSessionsCount }})
              </button>
              <button 
                type="button"
                class="filter-pill-btn pill-incomplete" 
                :class="{ active: dayFilterStatus === 'incomplete' }" 
                @click="dayFilterStatus = 'incomplete'"
                title="Salles avec places libres"
              >
                🟡 Incomplètes ({{ currentDayIncompleteSessionsCount }})
              </button>
              <button 
                type="button"
                class="filter-pill-btn pill-full" 
                :class="{ active: dayFilterStatus === 'full' }" 
                @click="dayFilterStatus = 'full'"
                title="Salles complètes"
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

          <!-- Day Drop Zone for Opening a Room -->
          <div 
            class="day-drop-open-room-banner no-print"
            :class="{ 
              'banner-active': activeDragType === 'room',
              'banner-hover': hoveredDropZone === 'day-banner-' + currentDateStr
            }"
            @dragover.prevent="onDragOver($event, 'room')"
            @dragenter.prevent="onDragEnter($event, 'day-banner-' + currentDateStr)"
            @dragleave="onDragLeave($event, 'day-banner-' + currentDateStr)"
            @drop="onDropOnDay($event, currentDateStr)"
          >
            <span class="banner-icon">🚪</span>
            <span class="banner-text">Glissez une salle depuis la palette ici pour l'ouvrir aujourd'hui</span>
            <button type="button" class="mini-tool-btn" @click="openCreateModal(currentDateStr)">➕ Ouvrir manuellement</button>
          </div>

          <!-- Empty Day State -->
          <div v-if="filteredDaySessions.length === 0" class="empty-state">
            <div class="empty-illustration">🏢</div>
            <h3>Aucune salle ouverte pour le {{ formatFullDate(currentDate) }}</h3>
            <p>Glissez une salle depuis la palette latérale ou appliquez la semaine type pour démarrer.</p>
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

          <!-- Day Room Cards Grid -->
          <div v-else class="day-sessions-grid">
            <div 
              v-for="session in filteredDaySessions" 
              :key="session.documentId || session.id" 
              class="session-card"
              :class="{ 
                'card-overbooked': isOverCapacity(session),
                'card-has-conflict': getSessionConflictInfo(session).hasConflict,
                'card-drop-active': hoveredDropZone === 'day-sess-' + (session.documentId || session.id)
              }"
              @dragover.prevent="onDragOver($event, 'any')"
              @dragenter.prevent="onDragEnter($event, 'day-sess-' + (session.documentId || session.id))"
              @dragleave="onDragLeave($event, 'day-sess-' + (session.documentId || session.id))"
              @drop="onDropOnSession($event, session)"
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

                <!-- Manager Info Banner & D&D Slot -->
                <div 
                  class="manager-banner" 
                  :class="{ 
                    'manager-unassigned': !session.manager,
                    'manager-banner-unavail': getSessionConflictInfo(session).unavailableManager,
                    'drop-hover-slot': hoveredDropZone === 'day-mgr-' + (session.documentId || session.id)
                  }"
                  @dragover.prevent.stop="onDragOver($event, 'manager')"
                  @dragenter.prevent.stop="onDragEnter($event, 'day-mgr-' + (session.documentId || session.id))"
                  @dragleave.stop="onDragLeave($event, 'day-mgr-' + (session.documentId || session.id))"
                  @drop.stop="onDropOnSession($event, session, 'manager')"
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
                    <span v-else-if="!session.manager" class="manager-empty-hint">
                      Glissez un référent ici pour l'assigner
                    </span>
                  </div>
                  
                  <div class="manager-actions-box no-print">
                    <button 
                      v-if="session.manager"
                      type="button" 
                      class="mini-icon-btn delete" 
                      @click="unassignManagerQuick(session)" 
                      title="Retirer ce référent"
                    >
                      ✕
                    </button>
                    <button 
                      type="button" 
                      class="quick-swap-mgr-btn" 
                      @click="editSession(session)" 
                      title="Changer de gestionnaire"
                    >
                      🔄
                    </button>
                  </div>
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

                <!-- Beneficiaries / Participants Section with Draggable Chips -->
                <div 
                  class="participants-section"
                  :class="{ 'drop-hover-parts': hoveredDropZone === 'day-parts-' + (session.documentId || session.id) }"
                  @dragover.prevent="onDragOver($event, 'participant')"
                  @dragenter.prevent="onDragEnter($event, 'day-parts-' + (session.documentId || session.id))"
                  @dragleave="onDragLeave($event, 'day-parts-' + (session.documentId || session.id))"
                  @drop="onDropOnSession($event, session, 'participant')"
                >
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
                        class="search-mini-input"
                      />
                    </div>

                    <!-- List of checkable participants -->
                    <div class="inline-participants-checklist">
                      <div 
                        v-for="p in getFilteredInlineParticipants(session)" 
                        :key="p.documentId || p.id"
                        class="inline-check-card"
                        :class="{ 
                          'checked': inlineSelectedParticipants.includes(p.documentId || p.id),
                          'unavail': !p.isAvailable
                        }"
                        @click="toggleInlineParticipant(p.documentId || p.id)"
                      >
                        <input 
                          type="checkbox" 
                          :checked="inlineSelectedParticipants.includes(p.documentId || p.id)"
                          @click.stop="toggleInlineParticipant(p.documentId || p.id)"
                        />
                        <div class="person-check-info">
                          <span class="person-check-name">{{ p.lastName }} {{ p.firstName }}</span>
                          <span v-if="!p.isAvailable" class="person-unavail-badge" :title="p.unavailabilityReason">
                            ⚠️ {{ p.unavailabilityReason }}
                          </span>
                          <span v-else class="person-avail-badge">
                            ✅ Disponible
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="inline-panel-actions">
                      <span class="selection-count-text">
                        <strong>{{ inlineSelectedParticipants.length }}</strong> personne(s) sélectionnée(s)
                      </span>
                      <div class="actions-right">
                        <button type="button" class="secondary-btn mini-btn" @click="activeInlineAddSessionId = null">
                          Annuler
                        </button>
                        <button 
                          type="button" 
                          class="action-btn primary-btn mini-btn" 
                          @click="submitInlineAddParticipants(session)"
                          :disabled="inlineSelectedParticipants.length === 0"
                        >
                          ➕ Valider l'ajout ({{ inlineSelectedParticipants.length }})
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Participants Draggable Chips Grid in Day View -->
                  <div class="participants-chips-grid">
                    <div 
                      v-for="p in getParticipants(session)" 
                      :key="p.documentId || p.id" 
                      class="participant-chip-draggable day-chip"
                      :class="{ 'chip-unavail': isParticipantUnavailableInSession(p, session) }"
                      draggable="true"
                      @dragstart="onDragStart($event, { type: 'participant', participant: p, fromSessionId: session.documentId || session.id })"
                      @dragend="onDragEnd"
                      :title="isParticipantUnavailableInSession(p, session) ? getParticipantUnavailabilityTitle(p, session) + ' — Glisser pour déplacer' : 'Glisser pour déplacer vers une autre salle ou vers la corbeille'"
                    >
                      <span class="chip-icon">{{ isParticipantUnavailableInSession(p, session) ? '⚠️' : '👤' }}</span>
                      <span class="chip-name">{{ p.lastName }} {{ p.firstName }}</span>
                      <button 
                        type="button" 
                        class="chip-remove-btn no-print" 
                        @click.stop="removeParticipantQuick(session, p)" 
                        title="Retirer ce bénéficiaire"
                      >
                        ✕
                      </button>
                    </div>

                    <!-- Drop Target Box inside participants list -->
                    <div 
                      class="participant-drop-target-box day-drop-box"
                      :class="{ 'target-highlight': activeDragType === 'participant' }"
                    >
                      <span class="drop-hint-icon">📥</span>
                      <span class="drop-hint-text">
                        {{ getParticipantCount(session) === 0 ? 'Glisser des bénéficiaires ici' : '+ Glisser d\'autres bénéficiaires' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card Footer -->
              <div class="card-footer no-print">
                <button type="button" class="action-btn secondary-btn" @click="editSession(session)">
                  ✏️ Modifier la salle
                </button>
                <button type="button" class="action-btn secondary-btn" @click="openDuplicateModal(session)">
                  📋 Dupliquer
                </button>
                <button type="button" class="action-btn danger-btn" @click="confirmDelete(session)">
                  🗑️ Fermer
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- 3. VUE MOIS (MONTH CALENDAR VIEW)                   -->
        <!-- ═══════════════════════════════════════════════════ -->
        <div v-else-if="viewMode === 'month'" class="month-view-container">
          <div class="month-grid-header">
            <div v-for="dayName in ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']" :key="dayName" class="month-header-cell">
              {{ dayName }}
            </div>
          </div>

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
              <div class="month-cell-header">
                <span class="cell-day-num" :class="{ 'today-pulse': cell.isToday }">{{ cell.dayNumber }}</span>
                <span v-if="cell.sessions.length > 0" class="month-sessions-count-badge">
                  🚪 {{ cell.sessions.length }}
                </span>
              </div>

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

                <div v-if="cell.isCurrentMonth && cell.sessions.length === 0" class="month-cell-empty">
                  <span class="empty-dot"></span>
                  <span class="empty-text">Fermé</span>
                </div>
              </div>

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

      <!-- ────────────────── RIGHT: DRAG & DROP SIDEBAR PALETTE ────────────────── -->
      <aside class="dnd-sidebar-palette no-print" v-if="isPaletteOpen">
        <!-- Palette Header -->
        <div class="palette-header">
          <div class="palette-title-box">
            <span class="palette-icon">✨</span>
            <div>
              <h3>Palette Drag & Drop</h3>
              <p class="palette-subtitle">Glissez les éléments sur le planning</p>
            </div>
          </div>
          <button type="button" class="palette-close-btn" @click="isPaletteOpen = false" title="Masquer la palette">✕</button>
        </div>

        <!-- Palette Tabs -->
        <div class="palette-tabs-nav">
          <button 
            type="button" 
            class="palette-tab-btn" 
            :class="{ active: activePaletteTab === 'participants' }"
            @click="activePaletteTab = 'participants'"
          >
            <span class="tab-icon">👥</span>
            <span>Bénéficiaires</span>
            <span class="palette-count-pill">{{ paletteCounts.participants }}</span>
          </button>
          
          <button 
            type="button" 
            class="palette-tab-btn" 
            :class="{ active: activePaletteTab === 'facilitators' }"
            @click="activePaletteTab = 'facilitators'"
          >
            <span class="tab-icon">👨‍💼</span>
            <span>Référents</span>
            <span class="palette-count-pill">{{ paletteCounts.facilitators }}</span>
          </button>

          <button 
            type="button" 
            class="palette-tab-btn" 
            :class="{ active: activePaletteTab === 'locations' }"
            @click="activePaletteTab = 'locations'"
          >
            <span class="tab-icon">🚪</span>
            <span>Salles</span>
            <span class="palette-count-pill">{{ paletteCounts.locations }}</span>
          </button>
        </div>

        <!-- Palette Body -->
        <div class="palette-body">
          
          <!-- ── TAB 1: BÉNÉFICIAIRES ── -->
          <div v-if="activePaletteTab === 'participants'" class="palette-section">
            <!-- Filter pills -->
            <div class="palette-filter-chips">
              <button 
                type="button" 
                class="filter-chip-btn" 
                :class="{ active: paletteParticipantFilter === 'all' }"
                @click="paletteParticipantFilter = 'all'"
              >
                Tous ({{ participants.length }})
              </button>
              <button 
                type="button" 
                class="filter-chip-btn unassigned-chip" 
                :class="{ active: paletteParticipantFilter === 'unassigned' }"
                @click="paletteParticipantFilter = 'unassigned'"
                title="Bénéficiaires non inscrits dans la période affichée"
              >
                ⚡ Non affectés ({{ paletteCounts.unassignedParticipants }})
              </button>
              <button 
                type="button" 
                class="filter-chip-btn" 
                :class="{ active: paletteParticipantFilter === 'available' }"
                @click="paletteParticipantFilter = 'available'"
              >
                ✅ Dispos
              </button>
              <button 
                type="button" 
                class="filter-chip-btn" 
                :class="{ active: paletteParticipantFilter === 'assigned' }"
                @click="paletteParticipantFilter = 'assigned'"
              >
                🔵 Déjà affectés
              </button>
              <button 
                type="button" 
                class="filter-chip-btn" 
                :class="{ active: paletteParticipantFilter === 'unavailable' }"
                @click="paletteParticipantFilter = 'unavailable'"
              >
                ❌ Indispos
              </button>
            </div>

            <!-- Search input -->
            <div class="palette-search-box">
              <span class="search-mini-icon">🔍</span>
              <input 
                type="text" 
                v-model="paletteParticipantSearch" 
                placeholder="Chercher un bénéficiaire..."
                class="palette-search-input"
              />
              <button v-if="paletteParticipantSearch" @click="paletteParticipantSearch = ''" class="clear-mini-btn">✕</button>
            </div>

            <!-- Draggable Participants List -->
            <div class="palette-draggable-list">
              <div 
                v-if="filteredPaletteParticipants.length === 0" 
                class="palette-empty-msg"
              >
                Aucun bénéficiaire correspondant
              </div>

              <div 
                v-for="p in filteredPaletteParticipants" 
                :key="p.documentId || p.id"
                class="palette-drag-item participant-item"
                :class="{ 
                  'item-unavail': !p.isAvailable,
                  'item-unassigned-highlight': p.weeklyAssignmentsCount === 0 
                }"
                draggable="true"
                @dragstart="onDragStart($event, { type: 'participant', participant: p })"
                @dragend="onDragEnd"
                :title="!p.isAvailable ? p.unavailabilityReason : 'Glisser sur une salle pour affecter'"
              >
                <div class="drag-handle-icon" title="Glisser">⋮⋮</div>
                <div class="item-avatar-badge">👤</div>
                <div class="item-info">
                  <strong class="item-title">{{ p.lastName }} {{ p.firstName }}</strong>
                  <div class="item-sub-tags">
                    <span 
                      class="presence-count-tag" 
                      :class="{ 'zero-count': p.weeklyAssignmentsCount === 0 }"
                    >
                      📅 {{ p.weeklyAssignmentsCount }} fois / sem.
                    </span>
                    <span v-if="!p.isAvailable" class="item-status-tag unavail">
                      ⚠️ Indispo
                    </span>
                    <span v-else class="item-status-tag avail">
                      ✅ Dispo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── TAB 2: GESTIONNAIRES / RÉFÉRENTS ── -->
          <div v-else-if="activePaletteTab === 'facilitators'" class="palette-section">
            <!-- Search input -->
            <div class="palette-search-box">
              <span class="search-mini-icon">🔍</span>
              <input 
                type="text" 
                v-model="paletteFacilitatorSearch" 
                placeholder="Chercher un référent..."
                class="palette-search-input"
              />
              <button v-if="paletteFacilitatorSearch" @click="paletteFacilitatorSearch = ''" class="clear-mini-btn">✕</button>
            </div>

            <!-- Draggable Facilitators List -->
            <div class="palette-draggable-list">
              <div 
                v-if="evaluatedPaletteFacilitators.length === 0" 
                class="palette-empty-msg"
              >
                Aucun référent correspondant
              </div>

              <div 
                v-for="f in evaluatedPaletteFacilitators" 
                :key="f.documentId || f.id"
                class="palette-drag-item facilitator-item"
                :class="{ 'item-unavail': !f.isAvailable }"
                draggable="true"
                @dragstart="onDragStart($event, { type: 'manager', facilitator: f })"
                @dragend="onDragEnd"
                :title="!f.isAvailable ? f.unavailabilityReason : 'Glisser sur une salle pour assigner comme référent'"
              >
                <div class="drag-handle-icon" title="Glisser">⋮⋮</div>
                <div class="item-avatar-badge">{{ f.isAvailable ? '👨‍💼' : '🔴' }}</div>
                <div class="item-info">
                  <strong class="item-title">{{ f.firstName }} {{ f.lastName }}</strong>
                  <div class="item-sub-tags">
                    <span v-if="f.skills" class="skills-tag">{{ f.skills }}</span>
                    <span v-if="!f.isAvailable" class="item-status-tag unavail">
                      ⚠️ {{ f.unavailabilityReason || 'Indisponible' }}
                    </span>
                    <span v-else class="item-status-tag avail">
                      ✅ Disponible
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── TAB 3: SALLES / LIEUX ── -->
          <div v-else-if="activePaletteTab === 'locations'" class="palette-section">
            <!-- Search input -->
            <div class="palette-search-box">
              <span class="search-mini-icon">🔍</span>
              <input 
                type="text" 
                v-model="paletteLocationSearch" 
                placeholder="Chercher une salle..."
                class="palette-search-input"
              />
              <button v-if="paletteLocationSearch" @click="paletteLocationSearch = ''" class="clear-mini-btn">✕</button>
            </div>

            <!-- Draggable Rooms List -->
            <div class="palette-draggable-list">
              <div 
                v-if="filteredPaletteLocations.length === 0" 
                class="palette-empty-msg"
              >
                Aucune salle correspondante
              </div>

              <div 
                v-for="loc in filteredPaletteLocations" 
                :key="loc.documentId || loc.id"
                class="palette-drag-item location-item"
                draggable="true"
                @dragstart="onDragStart($event, { type: 'room', location: loc })"
                @dragend="onDragEnd"
                title="Glisser sur une colonne de jour pour ouvrir la salle"
              >
                <div class="drag-handle-icon" title="Glisser">⋮⋮</div>
                <div class="item-avatar-badge">📍</div>
                <div class="item-info">
                  <strong class="item-title">{{ loc.name }}</strong>
                  <div class="item-sub-tags">
                    <span class="cap-tag">👥 Capacité : {{ loc.capacity }} places</span>
                    <span v-if="loc.description" class="desc-tag">{{ loc.description }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Trash Drop Target (Unassign Zone) -->
        <div 
          class="palette-trash-drop-zone"
          :class="{ 
            'trash-active': hoveredDropZone === 'trash',
            'trash-highlight': !!draggedItem?.fromSessionId 
          }"
          @dragover.prevent="onDragOver($event, 'any')"
          @dragenter.prevent="onDragEnter($event, 'trash')"
          @dragleave="onDragLeave($event, 'trash')"
          @drop="onDropOnTrash($event)"
        >
          <span class="trash-icon">🗑️</span>
          <div class="trash-text">
            <strong>Zone de désaffectation</strong>
            <small>Glissez un référent ou un résident ici pour le retirer</small>
          </div>
        </div>
      </aside>
    </div>

    <!-- ════════════════ MODAL 1: CRÉER / MODIFIER UNE SESSION DE SALLE      -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="showModal" class="modal-backdrop no-print" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-box">
            <span class="modal-icon">{{ isEditing ? '✏️' : '🚪' }}</span>
            <div>
              <h3>{{ isEditing ? 'Modifier la Session de Salle' : 'Ouvrir une Salle' }}</h3>
              <p class="modal-sub">Désignez le lieu, le professionnel référent et les bénéficiaires.</p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="closeModal">✕</button>
        </div>

        <div class="modal-form">
          <div v-if="formError" class="modal-alert error">
            <span>⚠️ {{ formError }}</span>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>📅 Date d'ouverture :</label>
              <input type="date" v-model="form.date" class="form-input" required />
            </div>

            <div class="form-group">
              <label>📍 Lieu / Salle :</label>
              <select v-model="form.location" class="form-input" required>
                <option value="" disabled>-- Sélectionner une salle --</option>
                <option v-for="loc in locations" :key="loc.documentId || loc.id" :value="loc.documentId || loc.id">
                  {{ loc.name }} (Capacité : {{ loc.capacity }} places)
                </option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label-with-badge">
              <span>👨‍💼 Professionnel Référent :</span>
              <span v-if="selectedManagerStatus && !selectedManagerStatus.available" class="status-warning-badge">
                ⚠️ {{ selectedManagerStatus.reason }}
              </span>
              <span v-else-if="selectedManagerStatus && selectedManagerStatus.available" class="status-success-badge">
                ✅ Disponible
              </span>
            </label>

            <select v-model="form.manager" class="form-input" required>
              <option value="" disabled>-- Choisir un référent --</option>
              <optgroup label="✅ Référents Disponibles">
                <option v-for="f in availableModalFacilitators" :key="f.documentId || f.id" :value="f.documentId || f.id">
                  {{ f.firstName }} {{ f.lastName }} {{ f.skills ? '(' + f.skills + ')' : '' }}
                </option>
              </optgroup>
              <optgroup label="⚠️ Référents Indisponibles ou déjà assignés" v-if="unavailableModalFacilitators.length > 0">
                <option v-for="f in unavailableModalFacilitators" :key="f.documentId || f.id" :value="f.documentId || f.id">
                  ⚠️ {{ f.firstName }} {{ f.lastName }} — {{ f.unavailabilityReason }}
                </option>
              </optgroup>
            </select>
          </div>

          <div class="form-group">
            <div class="participants-header-row">
              <label>👥 Bénéficiaires Affectés :</label>
              <span class="participants-count-indicator" :class="{ 'over-capacity': selectedLocationCapacity > 0 && form.participants.length > selectedLocationCapacity }">
                {{ form.participants.length }} / {{ selectedLocationCapacity || '?' }} places
              </span>
            </div>

            <div class="participants-selector-wrapper">
              <div class="filter-tabs mini-tabs">
                <button 
                  type="button" 
                  class="filter-tab-btn" 
                  :class="{ active: modalParticipantFilterTab === 'all' }" 
                  @click="modalParticipantFilterTab = 'all'"
                >
                  Tous ({{ modalAvailabilityCounts.total }})
                </button>
                <button 
                  type="button" 
                  class="filter-tab-btn tab-avail" 
                  :class="{ active: modalParticipantFilterTab === 'available' }" 
                  @click="modalParticipantFilterTab = 'available'"
                >
                  ✅ Disponibles ({{ modalAvailabilityCounts.available }})
                </button>
                <button 
                  type="button" 
                  class="filter-tab-btn tab-unavail" 
                  :class="{ active: modalParticipantFilterTab === 'unavailable' }" 
                  @click="modalParticipantFilterTab = 'unavailable'"
                >
                  ❌ Indisponibles ({{ modalAvailabilityCounts.unavailable }})
                </button>
              </div>

              <div class="selector-tools-row">
                <input 
                  type="text" 
                  v-model="modalParticipantSearch" 
                  placeholder="Filtrer par nom..."
                  class="search-mini-input"
                />
                <div class="quick-select-buttons">
                  <button type="button" class="mini-tool-btn highlight-btn" @click="selectAvailableParticipants">
                    ✅ Cocher dispos
                  </button>
                  <button type="button" class="mini-tool-btn" @click="selectAllParticipants">
                    Tout cocher
                  </button>
                  <button type="button" class="mini-tool-btn" @click="clearAllParticipants">
                    Désélectionner
                  </button>
                </div>
              </div>

              <div class="modal-participants-checklist">
                <label 
                  v-for="p in filteredModalParticipants" 
                  :key="p.documentId || p.id" 
                  class="person-checkbox-card"
                  :class="{ 
                    'checked': form.participants.includes(p.documentId || p.id),
                    'unavail': !p.isAvailable 
                  }"
                >
                  <input 
                    type="checkbox" 
                    :value="p.documentId || p.id" 
                    v-model="form.participants" 
                  />
                  <div class="person-info-content">
                    <strong class="person-name">{{ p.lastName }} {{ p.firstName }}</strong>
                    <span v-if="!p.isAvailable" class="unavail-reason-badge">
                      ⚠️ {{ p.unavailabilityReason }}
                    </span>
                    <span v-else class="avail-reason-badge">
                      ✅ Disponible
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" @click="closeModal">Annuler</button>
            <button type="button" class="action-btn primary-btn" @click="saveSession" :disabled="saving">
              {{ saving ? 'Enregistrement...' : (isEditing ? '💾 Mettre à jour' : '➕ Valider l\'ouverture') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ MODAL 2: SEMAINE TYPE (APPLICATION DU MODÈLE)       -->
    <!-- ═══════════════════════════════════════════════════ -->
    <div v-if="showTemplateModal" class="modal-backdrop no-print" @click.self="showTemplateModal = false">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <div class="modal-title-box">
            <span class="modal-icon">⚡</span>
            <div>
              <h3>Remplir selon la Semaine Type</h3>
              <p class="modal-sub">Générez automatiquement les ouvertures de salles et référents à partir du modèle récurrent.</p>
            </div>
          </div>
          <button type="button" class="close-btn" @click="showTemplateModal = false">✕</button>
        </div>

        <div class="modal-form">
          <div class="template-section">
            <h4>1. Période cible d'application</h4>
            <div class="radio-cards-grid">
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

              <label class="radio-card" :class="{ active: templateTargetPeriod === 'custom' }">
                <input type="radio" value="custom" v-model="templateTargetPeriod" />
                <span class="radio-title">🎯 Période personnalisée</span>
                <span class="radio-desc">Choisir les dates précises</span>
              </label>
            </div>

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

          <div class="template-section">
            <h4>2. Jours de la semaine à générer</h4>
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
          </div>

          <div class="template-section">
            <h4>3. Options & Aperçu prévisionnel</h4>
            <div class="generation-preview-box">
              <div class="preview-metric">
                <span class="p-label">Dates cibles :</span>
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

    <!-- ════════════════ MODAL 3: DUPLICATION RAPIDE                         -->
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
                Demain
              </button>
              <button 
                type="button" 
                class="preset-btn" 
                :class="{ active: duplicateTargetPreset === 'this-week' }"
                @click="setDuplicatePreset('this-week')"
              >
                Reste de la semaine
              </button>
              <button 
                type="button" 
                class="preset-btn" 
                :class="{ active: duplicateTargetPreset === 'next-week' }"
                @click="setDuplicatePreset('next-week')"
              >
                Semaine suivante
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>⚙️ Options de copie :</label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="duplicateCopyManager" />
              <span>Conserver les gestionnaires référents</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="duplicateCopyParticipants" />
              <span>Conserver les bénéficiaires affectés</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="duplicateOverwrite" />
              <span>Écraser les sessions existantes sur les dates cibles</span>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="secondary-btn" @click="showDuplicateModal = false">Annuler</button>
            <button type="button" class="action-btn primary-btn" @click="submitDuplicate" :disabled="saving">
              {{ saving ? 'Duplication en cours...' : '📋 Lancer la duplication' }}
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
const viewMode = ref('week'); // Default to week view as requested
const currentDate = ref(new Date());
const weekSubView = ref('kanban'); // 'kanban' | 'matrix'
const lastNavAction = ref(null); // 'prev' | 'next' | 'today' | 'date-input' | 'view-mode' | null
const showModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const formError = ref('');
const currentEditingId = ref(null);

// DRAG & DROP STATE & PALETTE
const isPaletteOpen = ref(true);
const activePaletteTab = ref('participants'); // 'participants' | 'facilitators' | 'locations'
const paletteParticipantFilter = ref('all'); // 'all' | 'unassigned' | 'available' | 'assigned' | 'unavailable'
const paletteParticipantSearch = ref('');
const paletteFacilitatorSearch = ref('');
const paletteLocationSearch = ref('');

const draggedItem = ref(null); // { type, item, fromSessionId, fromDate }
const activeDragType = ref(null); // 'room' | 'manager' | 'participant' | null
const hoveredDropZone = ref(null);

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
// PALETTE & DRAG-AND-DROP COMPUTED
// ══════════════════════════════════════════════════════════

// Count of times each participant is assigned across the currently loaded sessions
const participantWeeklyAssignmentsMap = computed(() => {
  const map = {};
  sessions.value.forEach(sess => {
    (sess.participants || []).forEach(p => {
      const pid = p.documentId || p.id;
      if (pid) {
        map[pid] = (map[pid] || 0) + 1;
      }
    });
  });
  return map;
});

// Filtered locations in palette
const filteredPaletteLocations = computed(() => {
  let list = props.locations;
  if (paletteLocationSearch.value.trim()) {
    const q = paletteLocationSearch.value.toLowerCase().trim();
    list = list.filter(l => l.name?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q));
  }
  return list;
});

// Evaluated facilitators in palette
const evaluatedPaletteFacilitators = computed(() => {
  const dateStr = currentDateStr.value;
  let list = getEvaluatedPersonsList(props.facilitators, dateStr, 'facilitator', sessions.value, null);
  if (paletteFacilitatorSearch.value.trim()) {
    const q = paletteFacilitatorSearch.value.toLowerCase().trim();
    list = list.filter(f => `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) || f.skills?.toLowerCase().includes(q));
  }
  return list;
});

// Evaluated participants in palette with weekly counters & tab filters
const evaluatedPaletteParticipants = computed(() => {
  const dateStr = currentDateStr.value;
  const assignmentsMap = participantWeeklyAssignmentsMap.value;

  return props.participants.map(p => {
    const pid = p.documentId || p.id;
    const status = checkPersonDateAvailability(p, dateStr, 'participant', sessions.value, null);
    const weeklyCount = assignmentsMap[pid] || 0;
    return {
      ...p,
      isAvailable: status.available,
      unavailabilityReason: status.reason,
      weeklyAssignmentsCount: weeklyCount
    };
  });
});

const filteredPaletteParticipants = computed(() => {
  let list = evaluatedPaletteParticipants.value;

  // Filter tabs
  if (paletteParticipantFilter.value === 'unassigned') {
    list = list.filter(p => p.weeklyAssignmentsCount === 0);
  } else if (paletteParticipantFilter.value === 'available') {
    list = list.filter(p => p.isAvailable);
  } else if (paletteParticipantFilter.value === 'assigned') {
    list = list.filter(p => p.weeklyAssignmentsCount > 0);
  } else if (paletteParticipantFilter.value === 'unavailable') {
    list = list.filter(p => !p.isAvailable);
  }

  // Text search
  if (paletteParticipantSearch.value.trim()) {
    const q = paletteParticipantSearch.value.toLowerCase().trim();
    list = list.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }

  // Sort: Unassigned first, then by alphabetical
  return list.sort((a, b) => {
    if (a.weeklyAssignmentsCount === 0 && b.weeklyAssignmentsCount > 0) return -1;
    if (a.weeklyAssignmentsCount > 0 && b.weeklyAssignmentsCount === 0) return 1;
    const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
    const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
    return nameA.localeCompare(nameB, 'fr');
  });
});

const paletteCounts = computed(() => {
  const totalParts = props.participants.length;
  const unassigned = evaluatedPaletteParticipants.value.filter(p => p.weeklyAssignmentsCount === 0).length;
  return {
    participants: totalParts,
    unassignedParticipants: unassigned,
    facilitators: props.facilitators.length,
    locations: props.locations.length
  };
});

// ══════════════════════════════════════════════════════════
// DRAG AND DROP HANDLERS
// ══════════════════════════════════════════════════════════

function onDragStart(e, payload) {
  draggedItem.value = payload;
  activeDragType.value = payload.type;
  e.dataTransfer.effectAllowed = 'copyMove';
  try {
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
  } catch (err) {
    // ignore serialize issue
  }
}

function onDragEnd() {
  draggedItem.value = null;
  activeDragType.value = null;
  hoveredDropZone.value = null;
}

function onDragOver(e, acceptedType) {
  if (!activeDragType.value) return;
  if (acceptedType === 'any' || activeDragType.value === acceptedType) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
}

function onDragEnter(e, zoneId) {
  hoveredDropZone.value = zoneId;
}

function onDragLeave(e, zoneId) {
  if (hoveredDropZone.value === zoneId) {
    hoveredDropZone.value = null;
  }
}

async function onDropOnDay(e, dayDateKey) {
  e.preventDefault();
  hoveredDropZone.value = null;
  if (!draggedItem.value) return;

  if (draggedItem.value.type === 'room') {
    const locId = draggedItem.value.location?.documentId || draggedItem.value.location?.id;
    if (locId) {
      await roomSessionStore.openRoomForDate(locId, dayDateKey);
      await loadDataForCurrentView();
    }
  }
  onDragEnd();
}

async function onDropOnSession(e, session, targetArea = 'any') {
  e.preventDefault();
  hoveredDropZone.value = null;
  if (!draggedItem.value) return;

  const sessionId = session.documentId || session.id;

  if (draggedItem.value.type === 'manager') {
    const mgrId = draggedItem.value.facilitator?.documentId || draggedItem.value.facilitator?.id;
    if (mgrId) {
      await roomSessionStore.assignManager(sessionId, mgrId);
      await loadDataForCurrentView();
    }
  } else if (draggedItem.value.type === 'participant') {
    const partId = draggedItem.value.participant?.documentId || draggedItem.value.participant?.id;
    if (partId) {
      if (draggedItem.value.fromSessionId) {
        await roomSessionStore.moveParticipantBetweenSessions(draggedItem.value.fromSessionId, sessionId, partId);
      } else {
        await roomSessionStore.addParticipantToSession(sessionId, partId);
      }
      await loadDataForCurrentView();
    }
  }
  onDragEnd();
}

async function onMatrixCellDrop(e, location, dayDateKey) {
  e.preventDefault();
  hoveredDropZone.value = null;
  if (!draggedItem.value) return;

  const existingSession = getSessionForRoomAndDate(location, dayDateKey);
  const locId = location.documentId || location.id;

  if (draggedItem.value.type === 'room') {
    await roomSessionStore.openRoomForDate(locId, dayDateKey);
  } else if (draggedItem.value.type === 'manager') {
    const mgrId = draggedItem.value.facilitator?.documentId || draggedItem.value.facilitator?.id;
    if (existingSession) {
      await roomSessionStore.assignManager(existingSession.documentId || existingSession.id, mgrId);
    } else {
      await roomSessionStore.openRoomForDate(locId, dayDateKey, mgrId);
    }
  } else if (draggedItem.value.type === 'participant') {
    const partId = draggedItem.value.participant?.documentId || draggedItem.value.participant?.id;
    if (existingSession) {
      if (draggedItem.value.fromSessionId) {
        await roomSessionStore.moveParticipantBetweenSessions(draggedItem.value.fromSessionId, existingSession.documentId || existingSession.id, partId);
      } else {
        await roomSessionStore.addParticipantToSession(existingSession.documentId || existingSession.id, partId);
      }
    } else {
      await roomSessionStore.openRoomForDate(locId, dayDateKey, null, [partId]);
    }
  }
  await loadDataForCurrentView();
  onDragEnd();
}

async function onDropOnTrash(e) {
  e.preventDefault();
  hoveredDropZone.value = null;
  if (!draggedItem.value) return;

  if (draggedItem.value.type === 'participant' && draggedItem.value.fromSessionId) {
    const partId = draggedItem.value.participant?.documentId || draggedItem.value.participant?.id;
    await roomSessionStore.removeParticipantFromSession(draggedItem.value.fromSessionId, partId);
    await loadDataForCurrentView();
  } else if (draggedItem.value.type === 'manager' && draggedItem.value.fromSessionId) {
    await roomSessionStore.unassignManager(draggedItem.value.fromSessionId);
    await loadDataForCurrentView();
  }
  onDragEnd();
}

async function unassignManagerQuick(session) {
  const sessionId = session.documentId || session.id;
  await roomSessionStore.unassignManager(sessionId);
  await loadDataForCurrentView();
}

async function removeParticipantQuick(session, participant) {
  const sessionId = session.documentId || session.id;
  const partId = participant.documentId || participant.id;
  await roomSessionStore.removeParticipantFromSession(sessionId, partId);
  await loadDataForCurrentView();
}

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

const selectedManagerStatus = computed(() => {
  if (!form.value.manager) return null;
  const dateStr = form.value.date || currentDateStr.value;
  const fac = props.facilitators.find(f => (f.documentId || f.id) === form.value.manager);
  if (!fac) return null;
  return checkPersonDateAvailability(fac, dateStr, 'facilitator', sessions.value, currentEditingId.value);
});

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

  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const cells = [];

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
  loadDataForCurrentView();
});

watch(viewMode, (newMode) => {
  roomSessionStore.currentViewMode = newMode;
  loadDataForCurrentView();
});

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
  lastNavAction.value = 'view-mode';
  viewMode.value = mode;
}

function navigateDate(delta) {
  lastNavAction.value = delta < 0 ? 'prev' : 'next';
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
  lastNavAction.value = 'today';
  currentDate.value = new Date();
  loadDataForCurrentView();
}

function onDirectDateChange(e) {
  if (e.target.value) {
    lastNavAction.value = 'date-input';
    currentDate.value = new Date(e.target.value);
    loadDataForCurrentView();
  }
}

function goToDayView(date) {
  lastNavAction.value = 'date-input';
  currentDate.value = new Date(date);
  viewMode.value = 'day';
  loadDataForCurrentView();
}

watch(() => roomSessionStore.loading, (isLoading) => {
  if (!isLoading) {
    lastNavAction.value = null;
  }
});

// HELPERS
function getStartOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
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

// MODAL OPEN / EDIT
function openCreateModal(defaultDate = null) {
  isEditing.value = false;
  currentEditingId.value = null;
  formError.value = '';
  modalParticipantSearch.value = '';
  modalParticipantFilterTab.value = 'all';

  const dateToUse = defaultDate || currentDateStr.value;
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
  const sessionId = session.documentId || session.id;
  const name = getRoomName(session);
  if (confirm(`Êtes-vous sûr de vouloir fermer la salle "${name}" pour cette journée ?`)) {
    await roomSessionStore.deleteSession(sessionId);
    await loadDataForCurrentView();
  }
}

// INLINE ADD PARTICIPANTS
function openInlineAddParticipant(session) {
  activeInlineAddSessionId.value = session.documentId || session.id;
  inlineSelectedParticipants.value = [];
  inlineParticipantSearch.value = '';
  inlineParticipantFilterTab.value = 'available';
}

function getFilteredInlineParticipants(session) {
  const assignedIds = new Set((session.participants || []).map(p => p.documentId || p.id));
  const unassigned = props.participants.filter(p => !assignedIds.has(p.documentId || p.id));
  const currentSessionId = session.documentId || session.id;
  let evaluated = getEvaluatedPersonsList(unassigned, session.date, 'participant', sessions.value, currentSessionId);

  if (inlineParticipantFilterTab.value === 'available') {
    evaluated = evaluated.filter(p => p.isAvailable);
  } else if (inlineParticipantFilterTab.value === 'unavailable') {
    evaluated = evaluated.filter(p => !p.isAvailable);
  }

  if (inlineParticipantSearch.value.trim()) {
    const q = inlineParticipantSearch.value.toLowerCase().trim();
    evaluated = evaluated.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q));
  }

  return evaluated;
}

function getInlineAvailabilityCounts(session) {
  const assignedIds = new Set((session.participants || []).map(p => p.documentId || p.id));
  const unassigned = props.participants.filter(p => !assignedIds.has(p.documentId || p.id));
  const currentSessionId = session.documentId || session.id;
  const evaluated = getEvaluatedPersonsList(unassigned, session.date, 'participant', sessions.value, currentSessionId);
  const available = evaluated.filter(p => p.isAvailable).length;
  return {
    total: evaluated.length,
    available,
    unavailable: evaluated.length - available
  };
}

function toggleInlineParticipant(id) {
  const idx = inlineSelectedParticipants.value.indexOf(id);
  if (idx !== -1) {
    inlineSelectedParticipants.value.splice(idx, 1);
  } else {
    inlineSelectedParticipants.value.push(id);
  }
}

function selectAllInlineParticipants(session) {
  const list = getFilteredInlineParticipants(session);
  inlineSelectedParticipants.value = list.map(p => p.documentId || p.id);
}

function selectAvailableInlineParticipants(session) {
  const list = getFilteredInlineParticipants(session).filter(p => p.isAvailable);
  inlineSelectedParticipants.value = list.map(p => p.documentId || p.id);
}

function clearAllInlineParticipants() {
  inlineSelectedParticipants.value = [];
}

async function submitInlineAddParticipants(session) {
  if (inlineSelectedParticipants.value.length === 0) return;
  const sessionId = session.documentId || session.id;
  const currentIds = (session.participants || []).map(p => p.documentId || p.id);
  const combined = Array.from(new Set([...currentIds, ...inlineSelectedParticipants.value]));

  await roomSessionStore.updateSession(sessionId, { participants: combined });
  activeInlineAddSessionId.value = null;
  inlineSelectedParticipants.value = [];
  await loadDataForCurrentView();
}

// DUPLICATE & TEMPLATE ACTIONS
function openDuplicateModal(session = null) {
  if (session && session.date) {
    duplicateSourceDate.value = session.date;
  } else {
    duplicateSourceDate.value = currentDateStr.value;
  }
  showDuplicateModal.value = true;
}

function setDuplicatePreset(preset) {
  duplicateTargetPreset.value = preset;
}

function getCalculatedDuplicateTargetDates() {
  const src = new Date(duplicateSourceDate.value);
  const targets = [];

  if (duplicateTargetPreset.value === 'tomorrow') {
    const d = new Date(src);
    d.setDate(d.getDate() + 1);
    targets.push(d.toISOString().slice(0, 10));
  } else if (duplicateTargetPreset.value === 'this-week') {
    const startOfWeek = getStartOfWeek(src);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const str = d.toISOString().slice(0, 10);
      if (str !== duplicateSourceDate.value) targets.push(str);
    }
  } else if (duplicateTargetPreset.value === 'next-week') {
    const startOfNextWeek = getStartOfWeek(src);
    startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfNextWeek);
      d.setDate(d.getDate() + i);
      targets.push(d.toISOString().slice(0, 10));
    }
  }
  return targets;
}

async function submitDuplicate() {
  const targetDates = getCalculatedDuplicateTargetDates();
  if (targetDates.length === 0) return;

  saving.value = true;
  try {
    await roomSessionStore.duplicateDay(duplicateSourceDate.value, targetDates, {
      copyManager: duplicateCopyManager.value,
      copyParticipants: duplicateCopyParticipants.value,
      overwrite: duplicateOverwrite.value
    });
    showDuplicateModal.value = false;
    await loadDataForCurrentView();
  } finally {
    saving.value = false;
  }
}

function openTemplateModal() {
  showTemplateModal.value = true;
}

function onTemplatePeriodPresetChange() {
  // Preset change logic
}

function formatTemplatePresetDates(preset) {
  const now = currentDate.value;
  if (preset === 'current-week') {
    const s = getStartOfWeek(now);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    return `${s.getDate()} - ${e.getDate()} ${e.toLocaleDateString('fr-FR', { month: 'short' })}`;
  } else if (preset === 'next-week') {
    const s = getStartOfWeek(now);
    s.setDate(s.getDate() + 7);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    return `${s.getDate()} - ${e.getDate()} ${e.toLocaleDateString('fr-FR', { month: 'short' })}`;
  } else if (preset === 'current-month') {
    return now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  return '';
}

function getTemplateDayOpeningsCount(dayId) {
  return (roomSessionTemplateStore.templates || []).filter(t => Number(t.dayOfWeek) === Number(dayId) && t.isActive !== false).length;
}

const calculatedTemplateTargetDates = computed(() => {
  const dates = [];
  const now = currentDate.value;

  if (templateTargetPeriod.value === 'current-week') {
    const s = getStartOfWeek(now);
    for (let i = 0; i < 7; i++) {
      const d = new Date(s);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
  } else if (templateTargetPeriod.value === 'next-week') {
    const s = getStartOfWeek(now);
    s.setDate(s.getDate() + 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(s);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
  } else if (templateTargetPeriod.value === 'current-month') {
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      dates.push(new Date(y, m, d).toISOString().slice(0, 10));
    }
  } else if (templateTargetPeriod.value === 'custom') {
    const start = new Date(templateCustomStartDate.value);
    const end = new Date(templateCustomEndDate.value);
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return dates;
});

const calculatedTemplateTotalOpenings = computed(() => {
  let count = 0;
  for (const dateStr of calculatedTemplateTargetDates.value) {
    const d = new Date(dateStr + 'T00:00:00');
    const jsDay = d.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    if (templateAllowedDays.value.includes(dayOfWeek)) {
      count += getTemplateDayOpeningsCount(dayOfWeek);
    }
  }
  return count;
});

async function applyTemplateGeneration() {
  saving.value = true;
  try {
    await roomSessionStore.applyTemplate(calculatedTemplateTargetDates.value, null, {
      allowedDays: templateAllowedDays.value,
      overwrite: templateOverwriteExisting.value
    });
    showTemplateModal.value = false;
    await loadDataForCurrentView();
  } finally {
    saving.value = false;
  }
}

async function quickCopyPreviousDay() {
  const cur = new Date(currentDate.value);
  cur.setDate(cur.getDate() - 1);
  const prevDateStr = cur.toISOString().slice(0, 10);

  await roomSessionStore.duplicateDay(prevDateStr, [currentDateStr.value], {
    copyManager: true,
    copyParticipants: true,
    overwrite: true
  });
  await loadDataForCurrentView();
}

async function openWeeklyBatchOpen() {
  const startOfWeek = getStartOfWeek(currentDate.value);
  const targetDates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    targetDates.push(d.toISOString().slice(0, 10));
  }
  
  if (confirm(`Ouvrir toutes les salles pour les 5 jours ouvrés de cette semaine (${targetDates[0]} au ${targetDates[4]}) ?`)) {
    for (const dStr of targetDates) {
      for (const loc of props.locations) {
        await roomSessionStore.openRoomForDate(loc.documentId || loc.id, dStr, null, [], true);
      }
    }
    await loadDataForCurrentView();
  }
}

async function duplicateWeekDayToOthers() {
  const startOfWeek = getStartOfWeek(currentDate.value);
  const mondayStr = startOfWeek.toISOString().slice(0, 10);
  const targets = [];
  for (let i = 1; i < 5; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    targets.push(d.toISOString().slice(0, 10));
  }
  await roomSessionStore.duplicateDay(mondayStr, targets, { copyManager: true, copyParticipants: true, overwrite: false });
  await loadDataForCurrentView();
}

async function confirmClearCurrentPeriod() {
  if (confirm(`Êtes-vous sûr de vouloir fermer toutes les salles (${currentPeriodSessionsCount.value} sessions) de la période affichée ?`)) {
    const ids = sessions.value.map(s => s.documentId || s.id);
    await roomSessionStore.batchDeleteSessions(ids);
    await loadDataForCurrentView();
  }
}

function openBulkAssignModal() {
  showTemplateModal.value = true;
}

function printPage() {
  window.print();
}
</script>

<style scoped>
.room-sessions-root {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  position: relative;
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
  width: 3.25rem;
  height: 3.25rem;
  border-radius: var(--radius-md, 0.85rem);
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.25), rgba(2, 132, 199, 0.2));
  border: 1px solid rgba(13, 148, 136, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
}

.title-with-pill {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.title-with-pill h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  margin: 0;
}

.mode-tag-pill {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.75rem;
  font-weight: 600;
}

.dnd-badge-pill {
  background: rgba(13, 148, 136, 0.15);
  color: #5eead4;
  border: 1px solid rgba(13, 148, 136, 0.35);
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.75rem;
  font-weight: 600;
  animation: pulseGlow 3s infinite ease-in-out;
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 rgba(13, 148, 136, 0); }
  50% { box-shadow: 0 0 10px rgba(13, 148, 136, 0.4); }
}

.subtitle {
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.view-switcher-pill {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.3rem;
  border-radius: var(--radius-pill, 9999px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.view-pill-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  padding: 0.5rem 1.15rem;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-pill-btn:hover {
  color: var(--text-primary, #f8fafc);
}

.view-pill-btn.active {
  background: var(--primary, #0d9488);
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(13, 148, 136, 0.4);
}

.header-toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.date-nav-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-arrow-btn, .today-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.nav-arrow-btn {
  min-width: 36px;
  height: 36px;
  padding: 0;
  font-size: 0.95rem;
}

.today-btn {
  height: 36px;
  padding: 0 0.9rem;
  background: rgba(13, 148, 136, 0.2);
  border-color: rgba(13, 148, 136, 0.45);
  color: #5eead4;
}

.nav-arrow-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.35);
  color: #ffffff;
  transform: translateY(-1px);
}

.today-btn:hover {
  background: rgba(13, 148, 136, 0.35);
  border-color: #5eead4;
  color: #ffffff;
  transform: translateY(-1px);
}

.period-title-block {
  display: flex;
  flex-direction: column;
  margin: 0 0.5rem;
}

.current-period-title {
  font-size: 1.08rem;
  font-weight: 700;
  color: #ffffff;
}

.period-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  font-weight: 500;
}

.direct-date-input {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 0 0.65rem;
  height: 36px;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.direct-date-input:focus {
  border-color: #38bdf8;
  outline: none;
}

.action-tools-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tool-btn, .action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.primary-btn {
  background: linear-gradient(135deg, #0d9488, #0284c7);
  color: #ffffff;
}

.primary-btn:hover {
  background: linear-gradient(135deg, #14b8a6, #0369a1);
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
}

.secondary-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.palette-toggle-btn {
  background: rgba(13, 148, 136, 0.15);
  border-color: rgba(13, 148, 136, 0.4);
  color: #5eead4;
}

.palette-toggle-btn.active {
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.3), rgba(2, 132, 199, 0.3));
  border-color: #5eead4;
  box-shadow: 0 0 12px rgba(13, 148, 136, 0.3);
}

.template-btn, .duplicate-btn, .assign-btn, .print-btn {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
}

.danger-tool-btn, .danger-btn {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.danger-tool-btn:hover, .danger-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #ffffff;
}

.danger-tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ════════════════ METRICS BAR ════════════════ */
.metrics-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md, 0.85rem);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}

.metric-icon {
  font-size: 1.5rem;
}

.metric-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 1.15rem;
  color: var(--text-primary, #f8fafc);
}

.metric-warn-badge {
  font-size: 0.75rem;
  color: #fbbf24;
  margin-left: 0.4rem;
}

.mini-progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 0.35rem;
}

.mini-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.mini-progress-fill.normal { background: #10b981; }
.mini-progress-fill.warning { background: #f59e0b; }
.mini-progress-fill.full { background: #3b82f6; }
.mini-progress-fill.exceeded { background: #ef4444; }

/* ════════════════ DND WORKSPACE LAYOUT ════════════════ */
.dnd-main-layout {
  position: relative;
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  width: 100%;
}

.planning-canvas {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ════════════════ SIDEBAR PALETTE ════════════════ */
.dnd-sidebar-palette {
  width: 340px;
  flex-shrink: 0;
  background: var(--panel-bg, rgba(15, 23, 42, 0.9));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-lg, 1.15rem);
  box-shadow: var(--shadow-lg, 0 16px 40px rgba(0, 0, 0, 0.5));
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 1.5rem;
  max-height: calc(100vh - 3rem);
  overflow: hidden;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.palette-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  background: rgba(0, 0, 0, 0.2);
}

.palette-title-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.palette-icon {
  font-size: 1.25rem;
}

.palette-title-box h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  margin: 0;
}

.palette-subtitle {
  font-size: 0.72rem;
  color: var(--text-muted, #64748b);
  margin: 0;
}

.palette-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm, 0.5rem);
}

.palette-close-btn:hover {
  color: var(--text-primary, #f8fafc);
  background: rgba(255, 255, 255, 0.1);
}

.palette-tabs-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  padding: 0.25rem;
  gap: 0.25rem;
}

.palette-tab-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  padding: 0.5rem 0.25rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.palette-tab-btn:hover {
  color: var(--text-primary, #f8fafc);
  background: rgba(255, 255, 255, 0.05);
}

.palette-tab-btn.active {
  background: var(--primary, #0d9488);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.35);
}

.palette-count-pill {
  font-size: 0.65rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
}

.palette-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.palette-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.filter-chip-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary, #94a3b8);
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.filter-chip-btn.active {
  background: var(--accent, #0284c7);
  border-color: #38bdf8;
  color: #ffffff;
}

.filter-chip-btn.unassigned-chip.active {
  background: var(--warm-amber, #f59e0b);
  border-color: #fbbf24;
  color: #1e1e24;
}

.palette-search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-mini-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.8rem;
  opacity: 0.6;
}

.palette-search-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
  padding: 0.45rem 2rem 0.45rem 2rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.8rem;
}

.clear-mini-btn {
  position: absolute;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
}

.palette-draggable-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 480px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.palette-drag-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-sm, 0.5rem);
  padding: 0.55rem 0.75rem;
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
}

.palette-drag-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.2));
}

.palette-drag-item:active {
  cursor: grabbing;
}

.palette-drag-item.item-unassigned-highlight {
  border-left: 3px solid #fbbf24;
  background: rgba(245, 158, 11, 0.06);
}

.palette-drag-item.item-unavail {
  opacity: 0.65;
}

.drag-handle-icon {
  color: var(--text-muted, #64748b);
  font-size: 0.9rem;
}

.item-avatar-badge {
  font-size: 1.1rem;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 0.82rem;
  color: var(--text-primary, #f8fafc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-sub-tags {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.presence-count-tag {
  font-size: 0.68rem;
  color: var(--text-secondary, #94a3b8);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.presence-count-tag.zero-count {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
  font-weight: 600;
}

.item-status-tag {
  font-size: 0.68rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.item-status-tag.avail {
  color: #5eead4;
  background: rgba(13, 148, 136, 0.15);
}

.item-status-tag.unavail {
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
}

.cap-tag, .skills-tag, .desc-tag {
  font-size: 0.68rem;
  color: var(--text-muted, #64748b);
}

.palette-trash-drop-zone {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px dashed rgba(239, 68, 68, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 0 0 var(--radius-lg, 1.15rem) var(--radius-lg, 1.15rem);
  color: #f87171;
  transition: all 0.2s ease;
}

.palette-trash-drop-zone.trash-active {
  background: rgba(239, 68, 68, 0.25);
  border-color: #ef4444;
  transform: scale(1.02);
}

.trash-text {
  display: flex;
  flex-direction: column;
}

.trash-text strong {
  font-size: 0.8rem;
}

.trash-text small {
  font-size: 0.68rem;
  color: var(--text-muted, #64748b);
}

/* ════════════════ 1. VUE SEMAINE (KANBAN COLUMNS) ════════════════ */
.week-view-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.week-sub-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.65rem 1rem;
  border-radius: var(--radius-md, 0.85rem);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}

.week-info-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.info-chip {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary, #94a3b8);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-pill, 9999px);
}

.week-view-toggles {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sub-view-pill {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.2rem;
  border-radius: var(--radius-pill, 9999px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.sub-pill-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #94a3b8);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.sub-pill-btn.active {
  background: var(--primary, #0d9488);
  color: #ffffff;
}

.mini-tool-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.mini-tool-btn.highlight-btn {
  background: rgba(13, 148, 136, 0.2);
  border-color: rgba(13, 148, 136, 0.4);
  color: #5eead4;
}

/* KANBAN BOARD */
.week-kanban-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  width: 100%;
}

.kanban-day-column {
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-lg, 1.15rem);
  display: flex;
  flex-direction: column;
  min-height: 480px;
  transition: all 0.2s ease;
  overflow: hidden;
}

.kanban-day-column.is-today {
  border-color: rgba(13, 148, 136, 0.4);
  box-shadow: 0 0 15px rgba(13, 148, 136, 0.15);
}

.kanban-day-column.drop-hover {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.06);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
}

.column-header {
  padding: 0.85rem 1rem;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.column-header:hover .col-day-name {
  color: var(--primary-text, #5eead4);
}

.col-title-group {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.col-day-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  text-transform: capitalize;
}

.col-day-date {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
}

.today-tag {
  font-size: 0.65rem;
  background: #0d9488;
  color: #ffffff;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-weight: 700;
}

.col-header-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.col-badge {
  font-size: 0.72rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary, #94a3b8);
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.col-badge.zero-badge {
  opacity: 0.5;
}

.col-add-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
  border-radius: 50%;
  width: 1.6rem;
  height: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.col-add-btn:hover {
  background: var(--primary, #0d9488);
  color: #ffffff;
}

.column-quick-drop-zone {
  margin: 0.5rem;
  padding: 0.75rem;
  background: rgba(13, 148, 136, 0.1);
  border: 2px dashed rgba(13, 148, 136, 0.4);
  border-radius: var(--radius-md, 0.85rem);
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #5eead4;
  animation: pulseTarget 1.5s infinite;
}

@keyframes pulseTarget {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.column-sessions-list {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.column-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted, #64748b);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md, 0.85rem);
  cursor: pointer;
  transition: all 0.2s ease;
}

.column-empty-state:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.02);
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.4;
}

.column-empty-state p {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-secondary, #94a3b8);
}

.empty-hint {
  font-size: 0.72rem;
  margin-top: 0.25rem;
}

/* KANBAN SESSION CARD */
.kanban-session-card {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-md, 0.85rem);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  transition: all 0.2s ease;
}

.kanban-session-card:hover {
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: var(--shadow-sm, 0 4px 12px rgba(0,0,0,0.3));
}

.kanban-session-card.card-conflict {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.05);
}

.kanban-session-card.card-drop-active {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  transform: scale(1.02);
}

.kcard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kcard-room-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.kcard-room-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
}

.kcard-actions {
  display: flex;
  gap: 0.25rem;
}

.mini-icon-btn {
  background: transparent;
  border: none;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  opacity: 0.7;
  transition: all 0.15s ease;
}

.mini-icon-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.kcard-capacity-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.kcard-cap-badge {
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
}

.kcard-conflict-pill {
  color: #f87171;
  font-weight: 600;
}

.kcard-full-pill {
  color: #38bdf8;
  font-weight: 600;
}

.kcard-avail-pill {
  color: #5eead4;
  font-weight: 600;
}

.kcard-progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.kcard-progress-fill {
  height: 100%;
  border-radius: 999px;
}

.kcard-conflict-box {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  font-size: 0.72rem;
  color: #f87171;
}

/* MANAGER SLOT */
.kcard-manager-slot {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-sm, 0.5rem);
  padding: 0.45rem 0.65rem;
  transition: all 0.2s ease;
}

.kcard-manager-slot.drop-hover-slot {
  border-color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
}

.kcard-manager-slot.no-manager {
  border-style: dashed;
}

.manager-chip-draggable {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: grab;
}

.manager-chip-draggable:active {
  cursor: grabbing;
}

.mgr-avatar {
  font-size: 1.1rem;
}

.mgr-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.mgr-role {
  font-size: 0.65rem;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
}

.mgr-name {
  font-size: 0.82rem;
  color: var(--text-primary, #f8fafc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unassign-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
}

.unassign-btn:hover {
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
}

.empty-manager-drop {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-muted, #64748b);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.2rem 0;
}

.empty-manager-drop:hover {
  color: var(--text-primary, #f8fafc);
}

/* PARTICIPANTS SECTION IN KANBAN */
.kcard-participants-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.kcard-participants-section.drop-hover-parts {
  background: rgba(13, 148, 136, 0.1);
  border-radius: var(--radius-sm, 0.5rem);
  padding: 0.25rem;
}

.parts-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.parts-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary, #94a3b8);
  text-transform: uppercase;
}

.mini-link-btn {
  background: transparent;
  border: none;
  color: #5eead4;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0 0.25rem;
}

.parts-chips-container {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.participant-chip-draggable {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-sm, 0.5rem);
  padding: 0.35rem 0.55rem;
  font-size: 0.78rem;
  color: var(--text-primary, #f8fafc);
  cursor: grab;
  user-select: none;
  transition: all 0.15s ease;
}

.participant-chip-draggable:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.participant-chip-draggable:active {
  cursor: grabbing;
}

.participant-chip-draggable.chip-unavail {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
}

.chip-icon {
  font-size: 0.85rem;
}

.chip-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-remove-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.1rem 0.25rem;
  border-radius: 4px;
}

.chip-remove-btn:hover {
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
}

.participant-drop-target-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.45rem;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm, 0.5rem);
  color: var(--text-muted, #64748b);
  font-size: 0.72rem;
  transition: all 0.2s ease;
}

.participant-drop-target-box.target-highlight {
  border-color: #5eead4;
  color: #5eead4;
  background: rgba(13, 148, 136, 0.1);
}

/* ════════════════ 2. VUE JOUR STYLES ════════════════ */
.day-view-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
}

.day-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md, 0.85rem);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.search-input-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 380px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  opacity: 0.5;
}

.search-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
  padding: 0.5rem 2rem 0.5rem 2.25rem;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.85rem;
}

.clear-search-btn {
  position: absolute;
  right: 0.65rem;
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
}

.filter-pills-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.filter-pill-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  color: var(--text-secondary, #94a3b8);
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.filter-pill-btn.active {
  background: var(--primary, #0d9488);
  color: #ffffff;
  border-color: var(--primary, #0d9488);
}

.day-drop-open-room-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  background: rgba(13, 148, 136, 0.08);
  border: 2px dashed rgba(13, 148, 136, 0.3);
  border-radius: var(--radius-md, 0.85rem);
  color: #5eead4;
  font-size: 0.88rem;
  font-weight: 600;
}

.day-drop-open-room-banner.banner-hover {
  background: rgba(13, 148, 136, 0.2);
  border-color: #5eead4;
  transform: scale(1.01);
}

.day-sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1.25rem;
}

.session-card {
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-lg, 1.15rem);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.35));
}

.session-card.card-has-conflict {
  border-color: rgba(239, 68, 68, 0.4);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.room-title-block {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.room-icon-badge {
  font-size: 1.5rem;
}

.room-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  margin: 0;
}

.room-type-sub {
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
}

.capacity-badge-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.card-status-badge {
  font-size: 0.72rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-pill, 9999px);
  font-weight: 600;
}

.badge-conflict { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.badge-incomplete { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.badge-full { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }

.capacity-badge {
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-pill, 9999px);
  background: rgba(255, 255, 255, 0.08);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.card-conflict-alert-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.8rem;
  color: #fca5a5;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.card-conflict-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.conflict-reason {
  color: #f87171;
  font-style: normal;
}

.manager-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 0.85rem);
  padding: 0.75rem 1rem;
}

.manager-banner.drop-hover-slot {
  border-color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
}

.manager-banner.manager-unassigned {
  border-style: dashed;
}

.manager-info-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.manager-role-label {
  font-size: 0.72rem;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
}

.manager-name-text {
  font-size: 0.95rem;
  color: var(--text-primary, #f8fafc);
}

.manager-unavail-tag {
  font-size: 0.72rem;
  color: #f87171;
}

.manager-skills-tag {
  font-size: 0.72rem;
  color: var(--text-secondary, #94a3b8);
}

.manager-empty-hint {
  font-size: 0.78rem;
  color: var(--text-muted, #64748b);
}

.manager-actions-box {
  display: flex;
  gap: 0.35rem;
}

.quick-swap-mgr-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
  padding: 0.3rem 0.5rem;
  border-radius: var(--radius-sm, 0.5rem);
  cursor: pointer;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.progress-info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-secondary, #94a3b8);
}

.progress-container {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-bar.normal { background: #10b981; }
.progress-bar.warning { background: #f59e0b; }
.progress-bar.full { background: #3b82f6; }
.progress-bar.exceeded { background: #ef4444; }

.overcapacity-alert-inline {
  font-size: 0.75rem;
  color: #f87171;
}

.participants-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title-row h4 {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  margin: 0;
}

.participants-chips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.5rem;
}

.participant-chip-draggable.day-chip {
  padding: 0.45rem 0.75rem;
  font-size: 0.82rem;
}

.participant-drop-target-box.day-drop-box {
  min-height: 38px;
}

.card-footer {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}

/* ════════════════ 3. VUE MOIS & MATRICE ════════════════ */
.week-matrix-wrapper {
  overflow-x: auto;
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-lg, 1.15rem);
}

.week-matrix-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.week-matrix-table th, .week-matrix-table td {
  padding: 0.75rem;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}

.matrix-room-col-header {
  width: 180px;
  background: rgba(0, 0, 0, 0.3);
  text-align: left;
  font-size: 0.85rem;
  font-weight: 700;
}

.matrix-day-header {
  background: rgba(0, 0, 0, 0.2);
  text-align: center;
  cursor: pointer;
}

.matrix-day-header.is-today {
  background: rgba(13, 148, 136, 0.2);
}

.matrix-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.matrix-day-name {
  font-size: 0.85rem;
  font-weight: 700;
}

.matrix-day-number {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.matrix-day-count-badge {
  font-size: 0.68rem;
  color: #5eead4;
}

.matrix-room-cell {
  background: rgba(0, 0, 0, 0.15);
}

.matrix-room-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.matrix-room-title {
  font-size: 0.85rem;
  color: var(--text-primary, #f8fafc);
  display: block;
}

.matrix-room-cap {
  font-size: 0.72rem;
  color: var(--text-muted, #64748b);
}

.matrix-slot-cell {
  vertical-align: top;
  height: 80px;
  transition: all 0.2s ease;
}

.matrix-slot-cell.cell-drop-hover {
  background: rgba(16, 185, 129, 0.15);
  border-color: #10b981;
}

.matrix-session-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-sm, 0.5rem);
  padding: 0.4rem 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.matrix-pill-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.matrix-pill-manager {
  font-weight: 600;
}

.matrix-pill-progress {
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
}

.matrix-pill-progress-fill {
  height: 100%;
  background: #10b981;
}

.matrix-closed-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted, #64748b);
  font-size: 0.75rem;
  cursor: pointer;
}

.matrix-closed-cell:hover {
  background: rgba(255, 255, 255, 0.03);
}

.quick-open-btn {
  background: transparent;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  margin-top: 0.25rem;
}

/* MONTH VIEW */
.month-view-container {
  display: flex;
  flex-direction: column;
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-lg, 1.15rem);
  overflow: hidden;
}

.month-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: rgba(0, 0, 0, 0.3);
  text-align: center;
  padding: 0.75rem 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary, #94a3b8);
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.month-grid-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.month-cell {
  min-height: 110px;
  padding: 0.5rem;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.04));
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.month-cell:hover {
  background: rgba(255, 255, 255, 0.03);
}

.month-cell.other-month {
  opacity: 0.4;
}

.month-cell.is-today {
  background: rgba(13, 148, 136, 0.1);
}

.month-cell-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 700;
}

.today-pulse {
  color: #5eead4;
}

.month-sessions-count-badge {
  font-size: 0.7rem;
  color: var(--primary-text, #5eead4);
}

.month-cell-sessions-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.month-mini-session-badge {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  padding: 0.15rem 0.35rem;
  font-size: 0.7rem;
  display: flex;
  justify-content: space-between;
}

.month-more-sessions-badge {
  font-size: 0.65rem;
  color: var(--text-muted, #64748b);
}

.month-cell-empty {
  font-size: 0.7rem;
  color: var(--text-muted, #64748b);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.empty-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-muted, #64748b);
}

.month-cell-quick-add {
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  color: var(--text-secondary, #94a3b8);
  font-size: 0.68rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  width: 100%;
  cursor: pointer;
}

/* ════════════════ MODAL STYLES ════════════════ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-card {
  background: #0f172a;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: var(--radius-lg, 1.15rem);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg, 0 20px 50px rgba(0, 0, 0, 0.6));
  display: flex;
  flex-direction: column;
}

.modal-card.modal-lg {
  max-width: 750px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.modal-title-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-icon {
  font-size: 1.5rem;
}

.modal-title-box h3 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  margin: 0;
}

.modal-sub {
  font-size: 0.8rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  font-size: 1.25rem;
  cursor: pointer;
}

.close-btn:hover {
  color: var(--text-primary, #f8fafc);
}

.modal-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-alert.error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.85rem;
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
  color: var(--text-secondary, #94a3b8);
}

.form-label-with-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-warning-badge {
  font-size: 0.72rem;
  color: #f87171;
}

.status-success-badge {
  font-size: 0.72rem;
  color: #5eead4;
}

.form-input {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.18));
  color: var(--text-primary, #f8fafc);
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.9rem;
  color-scheme: dark;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: #0d9488;
  outline: none;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.25);
  background: rgba(0, 0, 0, 0.5);
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

select.form-input option,
select.form-input optgroup {
  background-color: #0f172a !important;
  color: #f8fafc !important;
  padding: 10px 14px;
}

.participants-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.participants-count-indicator {
  font-size: 0.8rem;
  font-weight: 700;
  color: #5eead4;
}

.participants-count-indicator.over-capacity {
  color: #f87171;
}

.participants-selector-wrapper {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 0.85rem);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.filter-tabs {
  display: flex;
  gap: 0.35rem;
}

.filter-tab-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  color: var(--text-secondary, #94a3b8);
  padding: 0.3rem 0.65rem;
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.filter-tab-btn.active {
  background: var(--primary, #0d9488);
  color: #ffffff;
}

.selector-tools-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.search-mini-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.78rem;
  flex: 1;
}

.quick-select-buttons {
  display: flex;
  gap: 0.35rem;
}

.modal-participants-checklist {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.5rem;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.person-checkbox-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
  border-radius: var(--radius-sm, 0.5rem);
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  font-size: 0.8rem;
}

.person-checkbox-card.checked {
  background: rgba(13, 148, 136, 0.15);
  border-color: rgba(13, 148, 136, 0.4);
}

.person-checkbox-card.unavail {
  opacity: 0.75;
}

.person-info-content {
  display: flex;
  flex-direction: column;
}

.unavail-reason-badge {
  font-size: 0.65rem;
  color: #f87171;
}

.avail-reason-badge {
  font-size: 0.65rem;
  color: #5eead4;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

/* TEMPLATE MODAL */
.template-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.template-section h4 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  margin: 0;
}

.radio-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.65rem;
}

.radio-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-md, 0.85rem);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.radio-card.active {
  background: rgba(13, 148, 136, 0.15);
  border-color: #0d9488;
}

.radio-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
}

.radio-desc {
  font-size: 0.72rem;
  color: var(--text-muted, #64748b);
}

.custom-date-range-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.days-validation-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 0.5rem;
}

.day-validate-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: var(--radius-sm, 0.5rem);
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.day-validate-card.active {
  background: rgba(13, 148, 136, 0.15);
  border-color: #0d9488;
}

.day-val-info {
  display: flex;
  flex-direction: column;
}

.day-val-name {
  font-size: 0.78rem;
}

.day-val-count {
  font-size: 0.65rem;
  color: var(--text-muted, #64748b);
}

.generation-preview-box {
  display: flex;
  gap: 1.5rem;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md, 0.85rem);
}

.preview-metric {
  display: flex;
  flex-direction: column;
}

.p-label {
  font-size: 0.72rem;
  color: var(--text-muted, #64748b);
}

.p-val {
  font-size: 1.1rem;
  color: var(--text-primary, #f8fafc);
}

.highlight-val {
  color: #5eead4;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--text-secondary, #94a3b8);
  cursor: pointer;
}

/* DUPLICATE PRESETS */
.duplicate-presets {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.82rem;
  cursor: pointer;
}

.preset-btn.active {
  background: var(--primary, #0d9488);
  border-color: var(--primary, #0d9488);
  color: #ffffff;
}

/* INLINE MULTI ADD PANEL */
.inline-multi-add-panel {
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
  border-radius: var(--radius-md, 0.85rem);
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.5rem;
  box-shadow: var(--shadow-md, 0 8px 24px rgba(0,0,0,0.4));
}

.inline-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.panel-subtitle {
  font-size: 0.72rem;
  color: var(--text-muted, #64748b);
}

.close-panel-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
}

.inline-panel-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.inline-quick-tools {
  display: flex;
  gap: 0.35rem;
}

.inline-search-box input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f8fafc);
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm, 0.5rem);
  font-size: 0.78rem;
}

.inline-participants-checklist {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.4rem;
  max-height: 180px;
  overflow-y: auto;
}

.inline-check-card {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
  border-radius: var(--radius-sm, 0.5rem);
  padding: 0.35rem 0.55rem;
  font-size: 0.78rem;
  cursor: pointer;
}

.inline-check-card.checked {
  background: rgba(13, 148, 136, 0.2);
  border-color: #0d9488;
}

.person-check-info {
  display: flex;
  flex-direction: column;
}

.person-unavail-badge {
  font-size: 0.65rem;
  color: #f87171;
}

.person-avail-badge {
  font-size: 0.65rem;
  color: #5eead4;
}

.inline-panel-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.selection-count-text {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.actions-right {
  display: flex;
  gap: 0.5rem;
}

/* ════════════════ LOADING & ERROR STATES ════════════════ */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: var(--panel-bg, rgba(15, 23, 42, 0.75));
  border-radius: var(--radius-lg, 1.15rem);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  text-align: center;
}

.state-container.error {
  border-color: rgba(239, 68, 68, 0.3);
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--primary, #0d9488);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ════════════════ PRINT MEDIA STYLES ════════════════ */
.print-only-header {
  display: none;
}

@media print {
  .no-print {
    display: none !important;
  }

  .print-only-header {
    display: block !important;
    margin-bottom: 2rem;
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 1rem;
  }

  .print-brand-badge {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 0.5rem;
  }

  .print-only-header h2 {
    font-size: 1.6rem;
    font-weight: 800;
    margin: 0.25rem 0;
  }

  .room-sessions-root {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .session-card, .kanban-session-card, .kanban-day-column {
    background: #ffffff !important;
    color: #000000 !important;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
    break-inside: avoid;
  }

  .room-name, .mgr-name, .item-title, .col-day-name {
    color: #000000 !important;
  }

  .participant-chip-draggable {
    background: #f1f5f9 !important;
    color: #000000 !important;
    border: 1px solid #ddd !important;
  }
}

/* ════════════════ RESPONSIVE ════════════════ */
@media (max-width: 1200px) {
  .dnd-main-layout {
    flex-direction: column;
  }
  .dnd-sidebar-palette {
    width: 100%;
    position: static;
    max-height: none;
  }
}

@media (max-width: 768px) {
  .header-main {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-toolbar-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .form-row-2 {
    grid-template-columns: 1fr;
  }
  .week-kanban-board {
    grid-template-columns: 1fr;
  }
}
</style>
