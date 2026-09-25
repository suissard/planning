<template>
  <div class="animations-planning-root printable-animations-planning">
    
    <!-- ════════════════ TOP HEADER CONTROLS (NO PRINT) ════════════════ -->
    <div class="view-header no-print">
      <div class="header-main">
        <div class="header-title-wrapper">
          <div class="header-icon-box">🎯</div>
          <div>
            <div class="title-with-pill">
              <h2>Planning des Animations & Activités</h2>
              <span class="mode-tag-pill">Admin</span>
            </div>
            <p class="subtitle">
              Planifiez facilement votre semaine : créez des animations, assignez des animateurs, des salles et inscrivez les bénéficiaires.
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
            :class="{ 'is-loading': schedulerStore.loading && lastNavAction === 'prev' }"
            :disabled="schedulerStore.loading"
            @click="navigateDate(-1)" 
            title="Période précédente"
          >
            <span v-if="schedulerStore.loading && lastNavAction === 'prev'" class="mini-spinner"></span>
            <span v-else>◄</span>
          </button>
          <button 
            type="button" 
            class="today-btn" 
            :class="{ 'is-loading': schedulerStore.loading && lastNavAction === 'today' }"
            :disabled="schedulerStore.loading"
            @click="goToToday" 
            title="Revenir à aujourd'hui"
          >
            <span v-if="schedulerStore.loading && lastNavAction === 'today'" class="mini-spinner inline"></span>
            Aujourd'hui
          </button>
          <button 
            type="button" 
            class="nav-arrow-btn" 
            :class="{ 'is-loading': schedulerStore.loading && lastNavAction === 'next' }"
            :disabled="schedulerStore.loading"
            @click="navigateDate(1)" 
            title="Période suivante"
          >
            <span v-if="schedulerStore.loading && lastNavAction === 'next'" class="mini-spinner"></span>
            <span v-else>►</span>
          </button>
          
          <div class="period-title-block">
            <span class="current-period-title">{{ periodTitle }}</span>
            <span v-if="schedulerStore.loading" class="nav-loading-badge">
              <span class="pulse-dot"></span> Chargement...
            </span>
            <span v-else-if="viewMode === 'week'" class="period-subtitle">{{ weekDaysRangeLabel }}</span>
          </div>

          <!-- Date Picker input to jump anywhere -->
          <div class="direct-date-input-wrapper" :class="{ 'is-loading': schedulerStore.loading && lastNavAction === 'date-input' }">
            <input 
              type="date" 
              :value="currentDateStr" 
              :disabled="schedulerStore.loading"
              @change="onDirectDateChange" 
              class="direct-date-input" 
              title="Sélectionner une date précise"
            />
          </div>
        </div>

        <!-- ACTION TOOLS (Édition & Remplissage) -->
        <div class="action-tools-group">
          <!-- Toggle Collapse / Expand All Slots Button -->
          <button 
            type="button" 
            class="tool-btn collapse-toggle-btn"
            :class="{ active: areAllSlotsExpanded }"
            @click="toggleAllSlots"
            :title="areAllSlotsExpanded ? 'Réduire toutes les activités' : 'Déplier toutes les activités'"
          >
            <span class="btn-icon">{{ areAllSlotsExpanded ? '🔼' : '🔽' }}</span>
            <span>{{ areAllSlotsExpanded ? 'Tout réduire' : 'Tout déplier' }}</span>
          </button>

          <!-- Toggle Participant Placement Mode Button -->
          <button 
            type="button" 
            class="tool-btn participant-mode-toggle-btn"
            :class="{ active: isPlacingParticipants }"
            @click="toggleParticipantMode"
            title="Afficher les créneaux de salle au premier plan et les animations en transparence"
          >
            <span class="btn-icon">👥</span>
            <span>{{ isPlacingParticipants ? 'Mode Salle & Bénéficiaires' : 'Vue Salle & Bénéficiaires' }}</span>
          </button>

          <button type="button" class="action-btn primary-btn" @click="openCreateModal()" title="Créer un créneau d'animation">
            ➕ Nouvelle Animation
          </button>

          <button type="button" class="tool-btn duplicate-btn" @click="openDuplicateModal" title="Dupliquer les animations vers d'autres dates">
            📋 Dupliquer
          </button>

          <button type="button" class="tool-btn shortcut-btn" @click="$emit('navigate', 'room-sessions')" title="Accéder directement à l'ouverture des salles">
            🚪 Ouverture Salles
          </button>

          <button type="button" class="tool-btn checkin-shortcut-btn" @click="$emit('navigate', 'check-in')" title="Accéder au pointage et à la feuille d'émargement">
            ✅ Pointage & Émargement
          </button>

          <button type="button" class="tool-btn print-btn" @click="printPage" title="Imprimer le planning et les fiches d'animation">
            🖨️ Imprimer
          </button>

          <button 
            type="button" 
            class="tool-btn danger-tool-btn" 
            @click="confirmClearCurrentPeriod" 
            :disabled="currentPeriodSlotsCount === 0"
            title="Supprimer toutes les animations de la période affichée"
          >
            🧹 Tout effacer
          </button>
        </div>
      </div>

      <!-- LOCATION / ROOM FILTER BAR -->
      <div class="location-filter-bar no-print" v-if="!schedulerStore.loading">
        <div class="filter-bar-header">
          <span class="filter-icon">📍</span>
          <span class="filter-label">Filtrer par Salle :</span>
        </div>

        <div class="filter-chips-container">
          <button 
            type="button" 
            class="room-filter-pill"
            :class="{ active: !selectedLocationFilter }"
            @click="selectedLocationFilter = ''"
          >
            🏢 Toutes les salles
            <span class="filter-count-badge">{{ locationSlotCounts.total }}</span>
          </button>

          <button 
            type="button" 
            v-for="loc in locations" 
            :key="loc.documentId || loc.id"
            class="room-filter-pill"
            :class="{ active: selectedLocationFilter === String(loc.documentId || loc.id) }"
            @click="toggleLocationFilter(loc.documentId || loc.id)"
          >
            📍 {{ loc.name }}
            <span 
              class="filter-count-badge"
              :class="{ 'badge-has-slots': (locationSlotCounts[String(loc.documentId || loc.id)] || 0) > 0 }"
            >
              {{ locationSlotCounts[String(loc.documentId || loc.id)] || 0 }}
            </span>
          </button>

          <button 
            type="button" 
            class="room-filter-pill unassigned-pill"
            :class="{ active: selectedLocationFilter === 'unassigned' }"
            @click="toggleLocationFilter('unassigned')"
            v-if="locationSlotCounts.unassigned > 0 || selectedLocationFilter === 'unassigned'"
          >
            ❓ Sans salle assignée
            <span class="filter-count-badge">{{ locationSlotCounts.unassigned || 0 }}</span>
          </button>
        </div>

        <!-- Active Filter Indicator & Clear Button -->
        <button 
          v-if="selectedLocationFilter" 
          type="button" 
          class="clear-filter-btn" 
          @click="selectedLocationFilter = ''"
          title="Réinitialiser le filtre par salle"
        >
          ✕ Effacer le filtre ({{ filteredTimeslots.length }} créneau(x))
        </button>
      </div>

      <!-- SUMMARY METRICS BAR -->
      <div class="metrics-bar" v-if="!schedulerStore.loading">
        <div class="metric-card">
          <span class="metric-icon">🎯</span>
          <div class="metric-info">
            <span class="metric-label">Animations prévues</span>
            <strong class="metric-value">{{ metrics.totalSlots }}</strong>
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-icon">👨‍🏫</span>
          <div class="metric-info">
            <span class="metric-label">Animateurs mobilisés</span>
            <strong class="metric-value" :class="{ 'warning-text': metrics.unassignedFacilitatorsSlotsCount > 0 }">
              {{ metrics.activeFacilitatorsCount }} <small>/ {{ facilitators.length }}</small>
              <span v-if="metrics.unassignedFacilitatorsSlotsCount > 0" class="metric-warn-badge">⚠️ {{ metrics.unassignedFacilitatorsSlotsCount }} sans anim.</span>
            </strong>
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-icon">👥</span>
          <div class="metric-info">
            <span class="metric-label">Inscriptions bénéficiaires</span>
            <strong class="metric-value">{{ metrics.totalParticipantsRegistrations }}</strong>
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-icon">⏱️</span>
          <div class="metric-info">
            <span class="metric-label">Volume horaire</span>
            <strong class="metric-value">{{ metrics.totalDurationHours }}h</strong>
          </div>
        </div>

        <div class="metric-card" v-if="metrics.conflictCount > 0">
          <span class="metric-icon">⚠️</span>
          <div class="metric-info">
            <span class="metric-label">Alertes / Conflits</span>
            <strong class="metric-value warning-text">{{ metrics.conflictCount }} alerte(s)</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ PRINT ONLY HEADER ════════════════ -->
    <div class="print-header only-print">
      <h1>Programme des Animations & Activités</h1>
      <p class="print-subtitle">{{ periodTitle }} — {{ weekDaysRangeLabel }}</p>
      <p class="print-date">Document édité le {{ todayFormatted }}</p>
    </div>

    <!-- ════════════════ MAIN CONTENT AREA ════════════════ -->
    <div class="main-planning-layout">
      
      <!-- ──────────────── CENTRAL PLANNING CANVAS ──────────────── -->
      <div class="planning-canvas-container" style="position: relative;">
        
        <!-- LOADING OVERLAY -->
        <div v-if="schedulerStore.loading" class="canvas-loading-overlay">
          <div class="loading-card-badge">
            <div class="spinner"></div>
            <span>Actualisation des animations ({{ periodTitle }})...</span>
          </div>
        </div>

        <!-- ────────── VIEW 1: WEEK VIEW ────────── -->
        <div v-if="viewMode === 'week'" class="week-kanban-board">
          <div class="week-columns-grid">
            <div 
              v-for="day in weekDaysList" 
              :key="day.dateStr" 
              class="day-kanban-column"
               :class="{
                 'is-today': day.isToday,
                 'is-weekend': day.isWeekend
               }"
             >
              <!-- Column Day Header -->
              <div class="column-header">
                <div class="day-title-row">
                  <span class="day-name">{{ day.dayName }}</span>
                  <span class="day-badge-date">{{ day.dayNumber }} {{ day.monthShort }}</span>
                </div>
                <div class="day-meta-row">
                  <span class="slots-count-chip" :class="{ 'has-slots': day.slots.length > 0 }">
                    🎯 {{ day.slots.length }} anim.
                  </span>
                  <button 
                    v-if="day.slots.length > 0"
                    type="button"
                    class="day-collapse-toggle-btn no-print"
                    @click="toggleDaySlots(day)"
                    :title="isDayAllExpanded(day) ? 'Réduire les activités de ce jour' : 'Déplier les activités de ce jour'"
                  >
                    {{ isDayAllExpanded(day) ? '▲' : '▼' }}
                  </button>
                  <button 
                    type="button" 
                    class="quick-add-day-btn" 
                    @click="openCreateModal({ date: day.dateStr })"
                    title="Ajouter une animation ce jour"
                  >
                    ➕
                  </button>
                </div>
              </div>

              <!-- Column Slots List -->
              <div class="column-slots-list">
                <!-- Empty Day State (Clickable & Quick Action) -->
                <div 
                  v-if="day.slots.length === 0"
                  class="empty-day-state clickable-empty-day"
                  @click="openCreateModal({ date: day.dateStr })"
                  title="Cliquer pour créer un créneau d'animation"
                >
                  <span class="empty-day-icon">🏖️</span>
                  <p class="empty-day-text">Aucune animation</p>
                  <button type="button" class="quick-add-slot-btn no-print" @click.stop="openCreateModal({ date: day.dateStr })">
                    ➕ Créer un créneau
                  </button>
                </div>

                <!-- Animation Slot Cards -->
                <div 
                  v-for="slot in day.slots" 
                  :key="slot.documentId || slot.id" 
                  class="animation-card"
                  :class="{
                    'is-collapsed': !isSlotExpanded(slot),
                    'is-expanded': isSlotExpanded(slot),
                    'has-conflict': slotConflicts(slot).length > 0,
                    'is-under-min': isUnderMinParticipants(slot),
                    'is-over-max': isOverMaxParticipants(slot),
                    'is-full': isFullParticipants(slot),
                    'highlighted-card': highlightedSlotId === (slot.documentId || slot.id),
                     'is-participant-mode': isPlacingParticipants
                   }"
                   :id="'slot-card-' + (slot.documentId || slot.id)"
                 >

                  <!-- Background Watermark / Ghost Activity when in Participant Placement Mode -->
                  <div v-if="isPlacingParticipants" class="room-slot-activity-watermark" :title="'Animation programmée : ' + (slot.activityTemplate?.name || 'Activité')">
                    <span class="watermark-icon">🎯</span>
                    <span class="watermark-text">{{ slot.activityTemplate?.name || 'Activité' }}</span>
                  </div>

                  <!-- ─── STANDARD ANIMATION HEADER ─── -->
                  <template v-if="!isPlacingParticipants">
                    <!-- Card Header: Time, Title, Tag & Actions -->
                    <div class="anim-card-header is-clickable" @click="toggleSlotExpand(slot, $event)">
                      <div class="time-and-tag">
                        <span class="time-chip" title="Horaire de l'animation">
                          🕒 {{ formatSlotTimeRange(slot.startDate, slot.endDate) }}
                        </span>
                        <span v-if="getActivityTag(slot)" class="category-tag-chip">
                          {{ getActivityTag(slot) }}
                        </span>
                      </div>

                      <div class="card-quick-actions no-print" @click.stop>
                        <button 
                          type="button" 
                          class="card-action-btn toggle-card-btn" 
                          @click.stop="toggleSlotExpand(slot, $event)"
                          :title="isSlotExpanded(slot) ? 'Réduire cette animation' : 'Déplier les détails'"
                        >
                          <span class="chevron-icon" :class="{ 'is-rotated': isSlotExpanded(slot) }">▼</span>
                        </button>
                        <button 
                          type="button" 
                          class="action-icon-btn edit-btn" 
                          @click="openEditModal(slot)" 
                          title="Modifier l'animation"
                        >
                          <i class="mdi mdi-pencil"></i>
                        </button>
                        <button 
                          type="button" 
                          class="action-icon-btn delete-btn" 
                          @click="confirmDeleteSlot(slot)" 
                          title="Supprimer l'animation"
                        >
                          <i class="mdi mdi-trash-can-outline"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Activity Name & Duration -->
                    <div class="anim-title-row is-clickable" @click="toggleSlotExpand(slot, $event)" title="Cliquer pour déplier/réduire">
                      <span class="anim-icon">🎯</span>
                      <strong class="anim-name">{{ slot.activityTemplate?.name || 'Activité sans nom' }}</strong>
                    </div>
                  </template>

                  <!-- ─── ROOM TIME SLOT HEADER (Participant Placement Focus) ─── -->
                  <template v-else>
                    <div class="room-placement-card-header is-clickable" @click="toggleSlotExpand(slot, $event)">
                      <div class="room-placement-primary">
                        <div class="room-placement-time">
                          <span class="time-chip room-time-chip">
                            🕒 {{ formatSlotTimeRange(slot.startDate, slot.endDate) }}
                          </span>
                        </div>
                        <div class="room-placement-title">
                          <strong class="room-name-primary">📍 {{ slot.location ? slot.location.name : 'Créneau sans salle' }}</strong>
                        </div>
                      </div>
                      <div class="room-placement-badges">
                        <span class="summary-badge part-badge" :class="getCapacityClass(slot)">
                          👥 {{ (slot.participants || []).length }}/{{ slot.location?.capacity || getMaxParticipants(slot) }}
                        </span>
                      </div>
                    </div>

                    <!-- Ghost activity indicator in background -->
                    <div class="room-placement-ghost-activity">
                      <span class="ghost-tag">🎯 Activité :</span>
                      <span class="ghost-name">{{ slot.activityTemplate?.name || 'Animation' }}</span>
                    </div>

                  </template>

                  <!-- Conflict Warning Alert Banner -->
                  <div v-if="slotConflicts(slot).length > 0" class="slot-conflict-alert" :title="slotConflicts(slot).join('\n')">
                    ⚠️ {{ slotConflicts(slot)[0] }}
                  </div>

                  <!-- ════════ COLLAPSED SUMMARY VIEW ════════ -->
                  <div v-if="!isSlotExpanded(slot)" class="anim-collapsed-summary" @click="toggleSlotExpand(slot, $event)" title="Cliquer pour déplier les détails">
                    <div class="collapsed-badges-row">
                      <!-- Location pill (standard mode only) -->
                      <span 
                        v-if="!isPlacingParticipants"
                        class="summary-badge loc-badge" 
                        :class="{ 'badge-empty': !slot.location }" 
                        :title="slot.location ? ('Salle : ' + slot.location.name) : 'Aucune salle assignée'"
                      >
                        📍 {{ slot.location ? slot.location.name : 'Sans salle' }}
                      </span>

                      <!-- Facilitators pill -->
                      <span 
                        class="summary-badge fac-badge" 
                        :class="{ 'badge-empty': !(slot.facilitators && slot.facilitators.length > 0) }"
                        :title="getFacilitatorsSummaryTooltip(slot)"
                      >
                        👨‍🏫 {{ getFacilitatorsSummaryText(slot) }}
                      </span>

                      <!-- Participants pill (standard mode only) -->
                      <span 
                        v-if="!isPlacingParticipants"
                        class="summary-badge part-badge" 
                        :class="getCapacityClass(slot)" 
                        :title="'Bénéficiaires : ' + (slot.participants || []).length + ' / ' + getMaxParticipants(slot)"
                      >
                        👥 {{ (slot.participants || []).length }}/{{ getMaxParticipants(slot) }}
                      </span>

                      <!-- Preview of participants list in participant placement mode -->
                      <span 
                        v-if="isPlacingParticipants && (slot.participants || []).length > 0" 
                        class="participant-preview-names"
                      >
                        👥 {{ (slot.participants || []).map(p => p.firstName).join(', ') }}
                      </span>
                    </div>
                  </div>

                  <!-- ════════ EXPANDED FULL DETAILS ════════ -->
                  <div v-show="isSlotExpanded(slot)" class="anim-expanded-body">
                    <!-- ──────── LOCATION ──────── -->
                    <div class="anim-section location-section">
                      <div class="section-label-row">
                        <span class="label-text">📍 Salle / Lieu</span>
                        <button
                          v-if="slot.location"
                          type="button"
                          class="clear-chip-btn no-print"
                          @click="removeLocation(slot)"
                          title="Retirer la salle"
                        >✕</button>
                      </div>

                      <div v-if="slot.location" class="location-chip">
                        <span class="loc-name">{{ slot.location.name }}</span>
                        <span v-if="slot.location.capacity" class="loc-cap">Max {{ slot.location.capacity }}p</span>
                      </div>
                      <div v-else class="empty-assignment-slot location-assignment-slot">
                        <span>Aucune salle assignée — modifiez l’animation pour en choisir une.</span>
                      </div>
                    </div>

                    <!-- ──────── FACILITATORS (ANIMATEURS) ──────── -->
                    <div class="anim-section facilitators-section">
                      <div class="section-label-row">
                        <span class="label-text">👨‍🏫 Animateur(s)</span>
                        <span class="count-badge">{{ (slot.facilitators || []).length }}</span>
                      </div>

                      <!-- Facilitators Chips List -->
                      <div class="facilitators-chips-list" v-if="slot.facilitators && slot.facilitators.length > 0">
                        <div
                          v-for="fac in slot.facilitators"
                          :key="fac.documentId || fac.id"
                          class="person-chip facilitator-chip"
                        >
                          <span class="person-name">{{ fac.firstName }} {{ fac.lastName }}</span>
                          <!-- Conflict indicator -->
                          <span
                            v-if="getPersonSlotConflict(fac, slot, 'facilitator')"
                            class="conflict-warn-dot"
                            :title="getPersonSlotConflict(fac, slot, 'facilitator')"
                          >⚠️</span>
                          <button
                            type="button"
                            class="remove-chip-btn no-print"
                            @click.stop="removeFacilitator(slot, fac)"
                            title="Désaffecter"
                          ><i class="mdi mdi-close"></i></button>
                        </div>
                      </div>

                      <div v-else class="empty-assignment-slot facilitator-assignment-slot">
                        <span>Aucun animateur assigné — modifiez l’animation pour en ajouter.</span>
                      </div>
                    </div>

                    <!-- ──────── PARTICIPANTS (BÉNÉFICIAIRES) ──────── -->
                    <div class="anim-section participants-section">
                      <div class="section-label-row">
                        <span class="label-text">👥 Bénéficiaires</span>
                        <span class="capacity-gauge-pill" :class="getCapacityClass(slot)">
                          {{ (slot.participants || []).length }} / {{ getMaxParticipants(slot) }}
                        </span>
                      </div>

                      <!-- Capacity Gauge Bar -->
                      <div class="capacity-progress-track">
                        <div
                          class="capacity-progress-fill"
                          :style="{ width: getCapacityPercentage(slot) + '%' }"
                          :class="getCapacityClass(slot)"
                        ></div>
                      </div>

                      <!-- Participants Chips Grid -->
                      <div class="participants-chips-grid" v-if="slot.participants && slot.participants.length > 0">
                        <div
                          v-for="part in slot.participants"
                          :key="part.documentId || part.id"
                          class="person-chip participant-chip"
                        >
                          <span class="person-avatar">👤</span>
                          <span class="person-name">{{ part.firstName }} {{ part.lastName }}</span>
                          <!-- Conflict Dot -->
                          <span
                            v-if="getPersonSlotConflict(part, slot, 'participant')"
                            class="conflict-warn-dot"
                            :title="getPersonSlotConflict(part, slot, 'participant')"
                          >⚠️</span>
                          <button
                            type="button"
                            class="remove-chip-btn no-print"
                            @click.stop="removeParticipant(slot, part)"
                            title="Désinscrire"
                          >✕</button>
                        </div>
                      </div>

                      <button type="button" class="tool-btn small-btn no-print" @click="openQuickAddParticipants(slot)">
                        ➕ Ajouter des bénéficiaires
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              <!-- Bottom Add Area on Column -->
              <div
                class="column-bottom-add-zone"
                @click="openCreateModal({ date: day.dateStr })"
              >
                <span>➕ Ajouter une activité</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ────────── VIEW 2: DAY VIEW (DETAILED TIMELINE & CARDS) ────────── -->
        <div v-else-if="viewMode === 'day'" class="day-detail-board">
          <div class="day-detail-header">
            <div class="day-badge-large">
              <span class="day-large-name">{{ selectedDayObject.dayName }}</span>
              <span class="day-large-date">{{ selectedDayObject.dayNumber }} {{ selectedDayObject.monthFull }} {{ selectedDayObject.year }}</span>
            </div>
            <div class="day-stats-pills">
              <span class="stat-pill">🎯 {{ selectedDaySlots.length }} animation(s)</span>
              <span class="stat-pill">👨‍🏫 {{ selectedDayFacilitatorsCount }} animateur(s)</span>
              <span class="stat-pill">👥 {{ selectedDayParticipantsCount }} inscription(s)</span>
            </div>
          </div>

          <!-- Empty State in Day View -->
          <div v-if="selectedDaySlots.length === 0" class="empty-state-large">
            <span class="empty-icon-large">🏖️</span>
            <h3>Aucune animation programmée pour cette journée</h3>
            <p>Créez une animation ou utilisez le bouton ci-dessous pour démarrer.</p>
            <button type="button" class="action-btn primary-btn" @click="openCreateModal({ date: currentDateStr })">
              ➕ Créer une animation
            </button>
          </div>

          <!-- Grid of Day Slots -->
          <div v-else class="day-slots-grid">
            <div 
              v-for="slot in selectedDaySlots" 
              :key="slot.documentId || slot.id" 
              class="day-slot-expanded-card"
               :class="{
                 'is-collapsed': !isSlotExpanded(slot),
                 'is-expanded': isSlotExpanded(slot),
                 'has-conflict': slotConflicts(slot).length > 0,
                 'is-under-min': isUnderMinParticipants(slot),
                 'is-over-max': isOverMaxParticipants(slot),
                 'is-full': isFullParticipants(slot),
                 'is-participant-mode': isPlacingParticipants
               }"
             >

              <!-- Background Watermark / Ghost Activity in Day View -->
              <div v-if="isPlacingParticipants" class="room-slot-activity-watermark" :title="'Animation programmée : ' + (slot.activityTemplate?.name || 'Activité')">
                <span class="watermark-icon">🎯</span>
                <span class="watermark-text">{{ slot.activityTemplate?.name || 'Activité' }}</span>
              </div>

              <div class="card-main-info">
                <div class="time-badge-large is-clickable" @click="toggleSlotExpand(slot, $event)" title="Cliquer pour déplier/réduire">
                  <span class="time-clock">🕒</span>
                  <span class="time-range-text">{{ formatSlotTimeRange(slot.startDate, slot.endDate) }}</span>
                  <span class="duration-pill">{{ getSlotDurationMinutes(slot) }} min</span>
                </div>

                <!-- STANDARD HEADER (Day View) -->
                <div v-if="!isPlacingParticipants" class="title-and-tags-large is-clickable" @click="toggleSlotExpand(slot, $event)" title="Cliquer pour déplier/réduire">
                  <h3 class="anim-heading">{{ slot.activityTemplate?.name || 'Activité' }}</h3>
                  <div class="tags-row">
                    <span v-if="getActivityTag(slot)" class="category-tag-chip">{{ getActivityTag(slot) }}</span>
                    <span class="rules-tag-chip">Min: {{ getMinParticipants(slot) }} • Max: {{ getMaxParticipants(slot) }}</span>
                  </div>

                  <!-- Collapsed summary badges for day view -->
                  <div v-if="!isSlotExpanded(slot)" class="day-collapsed-badges-row">
                    <span class="summary-badge loc-badge" :class="{ 'badge-empty': !slot.location }">
                      📍 {{ slot.location ? slot.location.name : 'Sans salle' }}
                    </span>
                    <span class="summary-badge fac-badge" :class="{ 'badge-empty': !(slot.facilitators && slot.facilitators.length > 0) }" :title="getFacilitatorsSummaryTooltip(slot)">
                      👨‍🏫 {{ getFacilitatorsSummaryText(slot) }}
                    </span>
                    <span class="summary-badge part-badge" :class="getCapacityClass(slot)">
                      👥 {{ (slot.participants || []).length }} / {{ getMaxParticipants(slot) }} inscrits
                    </span>
                  </div>
                </div>

                <!-- PARTICIPANT PLACEMENT HEADER (Day View) -->
                <div v-else class="title-and-tags-large is-clickable" @click="toggleSlotExpand(slot, $event)" title="Cliquer pour déplier/réduire">
                  <div class="room-placement-primary">
                    <h3 class="room-name-primary">📍 {{ slot.location ? slot.location.name : 'Créneau sans salle assignée' }}</h3>
                  </div>
                  
                  <div class="room-placement-ghost-activity">
                    <span class="ghost-tag">🎯 Activité prévue :</span>
                    <span class="ghost-name">{{ slot.activityTemplate?.name || 'Animation' }}</span>
                  </div>

                  <!-- Collapsed summary badges for day view (Participant mode) -->
                  <div v-if="!isSlotExpanded(slot)" class="day-collapsed-badges-row">
                    <span class="summary-badge part-badge" :class="getCapacityClass(slot)">
                      👥 {{ (slot.participants || []).length }} / {{ slot.location?.capacity || getMaxParticipants(slot) }} inscrits
                    </span>
                    <span class="summary-badge fac-badge" :class="{ 'badge-empty': !(slot.facilitators && slot.facilitators.length > 0) }">
                      👨‍🏫 {{ getFacilitatorsSummaryText(slot) }}
                    </span>
                    <span v-if="(slot.participants || []).length > 0" class="participant-preview-names">
                      👥 {{ (slot.participants || []).map(p => p.firstName).join(', ') }}
                    </span>
                  </div>
                </div>

                <div class="card-actions-top no-print">
                  <button type="button" class="action-btn edit-btn" @click="openEditModal(slot)">
                    <i class="mdi mdi-pencil"></i>
                    <span>Modifier</span>
                  </button>
                  <button type="button" class="action-btn danger-btn" @click="confirmDeleteSlot(slot)">
                    <i class="mdi mdi-trash-can-outline"></i>
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>

              <!-- Expanded Middle & Participants Row in Day View -->
              <div v-show="isSlotExpanded(slot)" class="day-slot-expanded-body">
                <!-- Location & Facilitators Row -->
                <div class="expanded-middle-row">
                  <div class="location-box">
                    <span class="box-title">📍 Salle / Lieu</span>
                    <div class="location-content" v-if="slot.location">
                      <strong class="loc-name">{{ slot.location.name }}</strong>
                      <span class="loc-desc" v-if="slot.location.description">{{ slot.location.description }}</span>
                      <span class="loc-cap" v-if="slot.location.capacity">Capacité : {{ slot.location.capacity }} pers.</span>
                      <button type="button" class="remove-chip-btn no-print" @click.stop="removeLocation(slot)" title="Retirer la salle">
                        <i class="mdi mdi-close"></i>
                      </button>
                    </div>
                    <div v-else class="empty-assignment-slot">
                      <span>Aucune salle assignée — modifiez l’animation pour en choisir une.</span>
                    </div>
                  </div>

                  <div class="facilitators-box">
                    <div class="box-title-row">
                      <span class="box-title">👨‍🏫 Animateurs</span>
                      <span class="count-badge">{{ (slot.facilitators || []).length }}</span>
                    </div>
                    <div class="facilitators-chips-grid" v-if="slot.facilitators && slot.facilitators.length > 0">
                      <div
                        v-for="fac in slot.facilitators"
                        :key="fac.documentId || fac.id"
                        class="person-chip facilitator-chip large"
                      >
                        <span class="person-name">{{ fac.firstName }} {{ fac.lastName }}</span>
                        <span v-if="getPersonSlotConflict(fac, slot, 'facilitator')" class="conflict-warn-dot" :title="getPersonSlotConflict(fac, slot, 'facilitator')">⚠️</span>
                        <button type="button" class="remove-chip-btn no-print" @click.stop="removeFacilitator(slot, fac)" title="Désaffecter">
                          <i class="mdi mdi-close"></i>
                        </button>
                      </div>
                    </div>
                    <div v-else class="empty-assignment-slot">
                      <span>Aucun animateur assigné — modifiez l’animation pour en ajouter.</span>
                    </div>
                  </div>
                </div>

                <!-- Participants Section -->
                <div class="expanded-participants-section">
                  <div class="section-label-row">
                    <span class="label-text">👥 Bénéficiaires inscrits ({{ (slot.participants || []).length }} / {{ getMaxParticipants(slot) }})</span>
                    <button type="button" class="tool-btn small-btn no-print" @click="openQuickAddParticipants(slot)">➕ Ajouter des inscrits</button>
                  </div>

                  <div class="capacity-progress-track">
                    <div
                      class="capacity-progress-fill"
                      :style="{ width: getCapacityPercentage(slot) + '%' }"
                      :class="getCapacityClass(slot)"
                    ></div>
                  </div>

                  <div class="participants-chips-grid large-grid" v-if="slot.participants && slot.participants.length > 0">
                    <div
                      v-for="part in slot.participants"
                      :key="part.documentId || part.id"
                      class="person-chip participant-chip large"
                    >
                      <span class="person-avatar">👤</span>
                      <span class="person-name">{{ part.firstName }} {{ part.lastName }}</span>
                      <span v-if="getPersonSlotConflict(part, slot, 'participant')" class="conflict-warn-dot" :title="getPersonSlotConflict(part, slot, 'participant')">⚠️</span>
                      <button type="button" class="remove-chip-btn no-print" @click.stop="removeParticipant(slot, part)" title="Désinscrire">
                        <i class="mdi mdi-close"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ────────── VIEW 3: MONTH / CALENDAR VIEW ────────── -->
        <div v-else-if="viewMode === 'month'" class="month-calendar-board">
          <div class="month-grid-header">
            <div v-for="d in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="d" class="month-day-name">
              {{ d }}
            </div>
          </div>

          <div class="month-days-grid">
            <div 
              v-for="mday in monthCalendarDays" 
              :key="mday.dateStr" 
              class="month-day-cell"
              :class="{ 
                'other-month': !mday.isCurrentMonth, 
                'is-today': mday.isToday,
                'has-slots': mday.slots.length > 0
              }"
              @click="selectDayFromMonth(mday.dateStr)"
            >
              <div class="month-cell-header">
                <span class="cell-day-num">{{ mday.dayNumber }}</span>
                <span v-if="mday.slots.length > 0" class="month-slot-count-badge">{{ mday.slots.length }}</span>
              </div>

              <div class="month-slots-preview">
                <div 
                  v-for="mslot in mday.slots.slice(0, 3)" 
                  :key="mslot.documentId || mslot.id" 
                  class="month-slot-pill"
                  :title="`${formatSlotTimeRange(mslot.startDate, mslot.endDate)} - ${mslot.activityTemplate?.name}`"
                >
                  <span class="pill-dot">●</span>
                  <span class="pill-title">{{ mslot.activityTemplate?.name }}</span>
                </div>
                <span v-if="mday.slots.length > 3" class="month-more-pill">+{{ mday.slots.length - 3 }} autre(s)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- ════════════════ MODALS ════════════════ -->

    <!-- 1. CREATE / EDIT SLOT MODAL -->
    <div v-if="showSlotModal" class="modal-backdrop" @click.self="closeSlotModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ editingSlotId ? '✏️ Modifier l\'Animation' : (modalContextTitle || '➕ Programmer une Animation') }}</h3>
          <button type="button" class="close-modal-btn" @click="closeSlotModal">✕</button>
        </div>

        <form @submit.prevent="saveSlotForm" class="modal-form">
          <!-- Activity Picker -->
          <div class="form-group">
            <label>🎯 Activité *</label>
            <div class="entity-search-box">
              <input
                type="text"
                v-model="activitySearchQuery"
                placeholder="🔍 Rechercher une activité..."
                class="entity-search-input"
              />
            </div>
            <select v-model="slotForm.activityTemplate" required class="form-input" @change="onModalActivityChange">
              <option value="" disabled>Sélectionner une activité...</option>
              <option v-for="act in filteredActivities" :key="act.documentId || act.id" :value="act.documentId || act.id">
                {{ act.name }} ({{ act.standardDuration || 60 }} min)
              </option>
            </select>
          </div>

          <!-- Date & Time Range Mode Toggle (en création uniquement) -->
          <div v-if="!editingSlotId" class="date-mode-toggle-group">
            <button 
              type="button" 
              class="date-mode-btn" 
              :class="{ active: slotForm.dateMode === 'single' }" 
              @click="slotForm.dateMode = 'single'"
            >
              📅 Date unique
            </button>
            <button 
              type="button" 
              class="date-mode-btn" 
              :class="{ active: slotForm.dateMode === 'range' }" 
              @click="slotForm.dateMode = 'range'"
            >
              🔄 Période & Répétitivité
            </button>
          </div>

          <!-- CAS 1 : DATE UNIQUE (OU ÉDITION) -->
          <div v-if="editingSlotId || slotForm.dateMode === 'single'" class="form-row-2">
            <div class="form-group">
              <label>📅 Date *</label>
              <input type="date" v-model="slotForm.date" required class="form-input" />
            </div>
            <div class="form-group">
              <label>📍 Salle / Lieu</label>
              <div class="entity-search-box">
                <input
                  type="text"
                  v-model="locationSearchQuery"
                  placeholder="🔍 Rechercher une salle..."
                  class="entity-search-input"
                />
              </div>
              <select v-model="slotForm.location" class="form-input">
                <option value="">Aucune salle assignée</option>
                <option v-for="loc in filteredLocations" :key="loc.documentId || loc.id" :value="loc.documentId || loc.id">
                  {{ loc.name }} (Capacité: {{ loc.capacity || 'N/A' }})
                </option>
              </select>
            </div>
          </div>

          <!-- CAS 2 : PÉRIODE & RÉPÉTITIVITÉ -->
          <div v-else class="range-date-wrapper">
            <div class="range-date-box">
              <div class="form-row-2">
                <div class="form-group">
                  <label>📅 Date de début *</label>
                  <input type="date" v-model="slotForm.startDate" required class="form-input" />
                </div>
                <div class="form-group">
                  <label>🏁 Date de fin *</label>
                  <input type="date" v-model="slotForm.endDate" :min="slotForm.startDate" required class="form-input" />
                </div>
              </div>

              <!-- Jours de répétition -->
              <div class="days-selector-group">
                <div class="days-selector-header">
                  <label>📆 Jours de répétition :</label>
                  <div class="days-quick-presets">
                    <button type="button" class="preset-pill-btn" @click="setSlotDaysPreset('workdays')">Lun - Ven</button>
                    <button type="button" class="preset-pill-btn" @click="setSlotDaysPreset('all')">Tous (7j/7)</button>
                    <button type="button" class="preset-pill-btn" @click="setSlotDaysPreset('same-day')">Même jour</button>
                  </div>
                </div>
                <div class="days-checkbox-pills">
                  <button 
                    v-for="day in weekDaysOptions" 
                    :key="day.id" 
                    type="button" 
                    class="day-pill-toggle" 
                    :class="{ active: slotForm.daysOfWeek.includes(day.id), weekend: day.id >= 6 }"
                    @click="toggleSlotDay(day.id)"
                  >
                    {{ day.label }}
                  </button>
                </div>
              </div>

              <!-- Résumé visuel des créneaux calculés -->
              <div class="range-summary-banner" :class="{ 'has-dates': modalTargetDates.length > 0, 'no-dates': modalTargetDates.length === 0 }">
                <div class="summary-text" v-if="modalTargetDates.length > 0">
                  <span class="summary-icon">✨</span>
                  <div>
                    <strong>{{ modalTargetDates.length }} créneau(x) d'animation programmés</strong>
                    <p class="summary-detail">{{ formatTargetDatesSummary(modalTargetDates) }}</p>
                  </div>
                </div>
                <div class="summary-text text-danger" v-else>
                  <span>⚠️ Aucun jour ne correspond aux critères sélectionnés.</span>
                </div>
              </div>
            </div>

            <div class="form-group mt-2">
              <label>📍 Salle / Lieu</label>
              <div class="entity-search-box">
                <input
                  type="text"
                  v-model="locationSearchQuery"
                  placeholder="🔍 Rechercher une salle..."
                  class="entity-search-input"
                />
              </div>
              <select v-model="slotForm.location" class="form-input">
                <option value="">Aucune salle assignée</option>
                <option v-for="loc in filteredLocations" :key="loc.documentId || loc.id" :value="loc.documentId || loc.id">
                  {{ loc.name }} (Capacité: {{ loc.capacity || 'N/A' }})
                </option>
              </select>
            </div>

            <p class="range-mode-hint">
              ⚡ <em>Les créneaux seront générés automatiquement en arrière-plan sans bloquer votre écran.</em>
            </p>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>🕒 Heure de début *</label>
              <input type="time" v-model="slotForm.startTime" required class="form-input" @change="recomputeEndTime" />
            </div>
            <div class="form-group">
              <label>🕒 Heure de fin *</label>
              <input type="time" v-model="slotForm.endTime" required class="form-input" />
            </div>
          </div>

          <!-- Suggested Quick Time Presets -->
          <div class="time-presets-group">
            <span class="presets-label">⚡ Créneaux rapides :</span>
            <div class="presets-pills">
              <button 
                type="button" 
                class="preset-pill-btn" 
                :class="{ active: slotForm.startTime === '10:00' }"
                @click="applyTimePreset('10:00')"
              >
                🌅 Matin (10h00)
              </button>
              <button 
                type="button" 
                class="preset-pill-btn" 
                :class="{ active: slotForm.startTime === '14:00' }"
                @click="applyTimePreset('14:00')"
              >
                ☀️ Début d'après-midi (14h00)
              </button>
              <button 
                type="button" 
                class="preset-pill-btn" 
                :class="{ active: slotForm.startTime === '15:30' }"
                @click="applyTimePreset('15:30')"
              >
                🌇 Fin d'après-midi (15h30)
              </button>
            </div>
          </div>

          <!-- Facilitators Multi-select -->
          <div class="form-group">
            <label>👨‍🏫 Animateur(s) référent(s)</label>
            <div class="entity-search-box">
              <input
                type="text"
                v-model="facilitatorSearchQuery"
                placeholder="🔍 Rechercher un animateur..."
                class="entity-search-input"
              />
            </div>
            <div class="multi-select-box">
              <label v-for="fac in filteredFacilitators" :key="fac.documentId || fac.id" class="checkbox-item">
                <input 
                  type="checkbox" 
                  :value="fac.documentId || fac.id" 
                  v-model="slotForm.facilitators" 
                />
                <span>
                  {{ fac.firstName }} {{ fac.lastName }}
                  <small class="inline-entity-meta">{{ getFacilitatorWeeklySlotsCount(fac) }} anim./sem. — {{ getFacilitatorAvailabilityLabel(fac) }}</small>
                </span>
              </label>
            </div>
          </div>

          <!-- Participants Multi-select (création uniquement) -->
          <div class="form-group" v-if="!editingSlotId">
            <div class="label-with-actions">
              <label>👥 Bénéficiaires inscrits ({{ slotForm.participants.length }})</label>
              <div class="quick-links">
                <button type="button" class="link-btn" @click="selectAllParticipants">Tous</button>
                <button type="button" class="link-btn" @click="slotForm.participants = []">Aucun</button>
              </div>
            </div>
            <div class="entity-search-box">
              <input
                type="text"
                v-model="participantSearchQuery"
                placeholder="🔍 Rechercher un bénéficiaire..."
                class="entity-search-input"
              />
            </div>
            <div class="multi-select-box scrollable-select">
              <label v-for="part in filteredParticipants" :key="part.documentId || part.id" class="checkbox-item">
                <input
                  type="checkbox"
                  :value="part.documentId || part.id"
                  v-model="slotForm.participants"
                />
                <span>
                  {{ part.firstName }} {{ part.lastName }}
                  <small class="inline-entity-meta">{{ getParticipantWeeklySlotsCount(part) }} anim./sem. — {{ getParticipantTodayAvailabilityLabel(part) }}</small>
                </span>
              </label>
            </div>
          </div>
          <div class="form-group" v-else>
            <label>👥 Bénéficiaires du créneau ({{ slotForm.participants.length }})</label>
            <div class="slot-inherited-info">
              <span>ℹ️ Les bénéficiaires sont automatiquement rattachés au créneau horaire et à l'ouverture de salle.</span>
            </div>
          </div>

          <div class="modal-actions-footer">
            <button type="button" class="tool-btn" @click="closeSlotModal">Annuler</button>
            <button 
              type="submit" 
              class="action-btn primary-btn" 
              :disabled="isSavingModal || (!editingSlotId && slotForm.dateMode === 'range' && modalTargetDates.length === 0)"
            >
              {{ isSavingModal ? 'Enregistrement...' : (editingSlotId ? 'Sauvegarder les modifications' : (slotForm.dateMode === 'range' ? `🚀 Valider la programmation (${modalTargetDates.length} séances)` : 'Créer l\'animation')) }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. DUPLICATE MODAL -->
    <div v-if="showDuplicateModal" class="modal-backdrop" @click.self="showDuplicateModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>📋 Dupliquer les Animations</h3>
          <button type="button" class="close-modal-btn" @click="showDuplicateModal = false">✕</button>
        </div>

        <form @submit.prevent="executeDuplication" class="modal-form">
          <div class="form-group">
            <label>📅 Jour source (dont les animations seront copiées) *</label>
            <input type="date" v-model="duplicateForm.sourceDate" required class="form-input" />
            <small class="form-hint">
              {{ countSlotsOnDate(duplicateForm.sourceDate) }} animation(s) trouvée(s) sur ce jour.
            </small>
          </div>

          <div class="form-group">
            <label>🎯 Jours cibles où dupliquer *</label>
            <div class="target-days-checkboxes">
              <label v-for="wday in weekDaysList" :key="wday.dateStr" class="checkbox-item" v-show="wday.dateStr !== duplicateForm.sourceDate">
                <input 
                  type="checkbox" 
                  :value="wday.dateStr" 
                  v-model="duplicateForm.targetDates" 
                />
                <span>{{ wday.dayName }} {{ wday.dayNumber }} {{ wday.monthShort }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-item">
              <input type="checkbox" v-model="duplicateForm.includeFacilitators" />
              <span>Conserver les animateurs assignés</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="duplicateForm.includeParticipants" />
              <span>Conserver les résidents/bénéficiaires inscrits</span>
            </label>
          </div>

          <div class="modal-actions-footer">
            <button type="button" class="tool-btn" @click="showDuplicateModal = false">Annuler</button>
            <button 
              type="submit" 
              class="action-btn primary-btn" 
              :disabled="duplicateForm.targetDates.length === 0 || countSlotsOnDate(duplicateForm.sourceDate) === 0"
            >
              Dupliquer sur {{ duplicateForm.targetDates.length }} jour(s)
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. QUICK ADD PARTICIPANTS MODAL -->
    <div v-if="showQuickAddModal" class="modal-backdrop" @click.self="showQuickAddModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>👥 Inscription Rapide aux Animations</h3>
          <button type="button" class="close-modal-btn" @click="showQuickAddModal = false">✕</button>
        </div>

        <div class="modal-form">
          <p>Animation : <strong>{{ quickAddSlot?.activityTemplate?.name }}</strong> ({{ formatSlotTimeRange(quickAddSlot?.startDate, quickAddSlot?.endDate) }})</p>

          <div class="quick-add-search-box">
            <input
              type="text"
              v-model="quickAddSearch"
              placeholder="🔍 Filtrer les bénéficiaires..."
              class="quick-add-search-input"
            />
          </div>

          <div class="participant-filter-pills">
            <button
              type="button"
              class="filter-pill-btn"
              :class="{ active: quickAddFilterMode === 'all' }"
              @click="quickAddFilterMode = 'all'"
            >
              Tous ({{ participants.length }})
            </button>
            <button
              type="button"
              class="filter-pill-btn highlight-pill"
              :class="{ active: quickAddFilterMode === 'unassigned_week' }"
              @click="quickAddFilterMode = 'unassigned_week'"
              title="Bénéficiaires sans aucune animation cette semaine"
            >
              ⚡ Non inscrits ({{ unassignedQuickAddParticipantsCount }})
            </button>
            <button
              type="button"
              class="filter-pill-btn"
              :class="{ active: quickAddFilterMode === 'available_today' }"
              @click="quickAddFilterMode = 'available_today'"
            >
              ✅ Dispos ce jour
            </button>
          </div>

          <div class="multi-select-box scrollable-select">
            <label v-for="part in filteredQuickAddParticipants" :key="part.documentId || part.id" class="checkbox-item">
              <input
                type="checkbox"
                :value="part.documentId || part.id"
                v-model="quickAddSelectedIds"
              />
              <span>
                {{ part.firstName }} {{ part.lastName }}
                <small class="inline-entity-meta">{{ getParticipantWeeklySlotsCount(part) }} anim./sem. — {{ getParticipantTodayAvailabilityLabel(part) }}</small>
              </span>
            </label>
          </div>

          <div class="modal-actions-footer">
            <button type="button" class="tool-btn" @click="showQuickAddModal = false">Annuler</button>
            <button type="button" class="action-btn primary-btn" @click="saveQuickAddParticipants">
              Valider les inscriptions ({{ quickAddSelectedIds.length }})
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ BANDEAU D'OPÉRATION EN ARRIÈRE-PLAN ════════════════ -->
    <transition name="job-fade">
      <div v-if="backgroundJob.active" class="background-job-card no-print">
        <div class="job-card-header">
          <div class="job-spinner"></div>
          <div class="job-title-content">
            <div class="job-title-row">
              <strong>Génération en arrière-plan</strong>
              <span class="job-percentage">{{ Math.round((backgroundJob.current / backgroundJob.total) * 100) }}%</span>
            </div>
            <span class="job-desc">
              {{ backgroundJob.activityName }} : {{ backgroundJob.current }} / {{ backgroundJob.total }} séance(s) programmée(s)
            </span>
          </div>
        </div>
        <div class="job-progress-bar-bg">
          <div 
            class="job-progress-bar-fill" 
            :style="{ width: `${Math.round((backgroundJob.current / backgroundJob.total) * 100)}%` }"
          ></div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script>
import { computed, ref, onMounted, watch } from 'vue';
import { useActiveSchedulerStore } from '../stores/activeScheduler';
import { useGlobalStore } from '../stores/global';
import { checkPersonDateAvailability, formatLocalDate } from '../utils/availabilityHelper';

export default {
  name: 'AnimationsPlanningView',
  props: {
    locations: {
      type: Array,
      default: () => []
    },
    activities: {
      type: Array,
      default: () => []
    },
    facilitators: {
      type: Array,
      default: () => []
    },
    participants: {
      type: Array,
      default: () => []
    },
    timeslots: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const schedulerStore = useActiveSchedulerStore();
    const globalStore = useGlobalStore();

    // View state
    const viewMode = ref('week'); // 'week' | 'day' | 'month'
    const currentDate = ref(new Date());
    const lastNavAction = ref(null); // 'prev' | 'next' | 'today' | 'date-input' | null
    const highlightedSlotId = ref(null);
    const isParticipantPlacementMode = ref(false);

    const isPlacingParticipants = computed(() => isParticipantPlacementMode.value);

    function toggleParticipantMode() {
      isParticipantPlacementMode.value = !isParticipantPlacementMode.value;
      if (isParticipantPlacementMode.value) {
        globalStore.addInfo('Mode Salle & Bénéficiaires : Les créneaux de salle sont mis au premier plan et les animations passent en transparence.', 'Créneaux de Salle');
      }
    }

    // Collapse / Expand state (Collapsed by default)
    const expandedSlotIds = ref(new Set());

    function isSlotExpanded(slot) {
      if (!slot) return false;
      const slotId = String(slot.documentId || slot.id);
      return expandedSlotIds.value.has(slotId);
    }

    function toggleSlotExpand(slot, event) {
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
      if (!slot) return;
      const slotId = String(slot.documentId || slot.id);
      const nextSet = new Set(expandedSlotIds.value);
      if (nextSet.has(slotId)) {
        nextSet.delete(slotId);
      } else {
        nextSet.add(slotId);
      }
      expandedSlotIds.value = nextSet;
    }

    function expandAllSlots() {
      const nextSet = new Set(expandedSlotIds.value);
      (currentPeriodSlots.value || []).forEach(s => {
        const slotId = String(s.documentId || s.id);
        nextSet.add(slotId);
      });
      expandedSlotIds.value = nextSet;
    }

    function collapseAllSlots() {
      expandedSlotIds.value = new Set();
    }

    function toggleAllSlots() {
      if (areAllSlotsExpanded.value) {
        collapseAllSlots();
      } else {
        expandAllSlots();
      }
    }

    const areAllSlotsExpanded = computed(() => {
      const slots = currentPeriodSlots.value || [];
      if (slots.length === 0) return false;
      return slots.every(s => expandedSlotIds.value.has(String(s.documentId || s.id)));
    });

    function isDayAllExpanded(day) {
      if (!day || !day.slots || day.slots.length === 0) return false;
      return day.slots.every(s => expandedSlotIds.value.has(String(s.documentId || s.id)));
    }

    function toggleDaySlots(day) {
      if (!day || !day.slots || day.slots.length === 0) return;
      const isAllExp = isDayAllExpanded(day);
      const nextSet = new Set(expandedSlotIds.value);
      day.slots.forEach(s => {
        const slotId = String(s.documentId || s.id);
        if (isAllExp) {
          nextSet.delete(slotId);
        } else {
          nextSet.add(slotId);
        }
      });
      expandedSlotIds.value = nextSet;
    }

    // Modals state
    const showSlotModal = ref(false);
    const editingSlotId = ref(null);
    const isSavingModal = ref(false);
    const slotForm = ref({
      dateMode: 'single', // 'single' | 'range'
      activityTemplate: '',
      date: '',
      startDate: '',
      endDate: '',
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '10:00',
      endTime: '11:30',
      location: '',
      facilitators: [],
      participants: []
    });
    const activitySearchQuery = ref('');
    const facilitatorSearchQuery = ref('');
    const participantSearchQuery = ref('');
    const locationSearchQuery = ref('');

    const backgroundJob = ref({
      active: false,
      current: 0,
      total: 0,
      activityName: '',
      isDone: false
    });

    const showDuplicateModal = ref(false);
    const duplicateForm = ref({
      sourceDate: '',
      targetDates: [],
      includeFacilitators: true,
      includeParticipants: true
    });

    const showQuickAddModal = ref(false);
    const quickAddSlot = ref(null);
    const quickAddSelectedIds = ref([]);
    const quickAddSearch = ref('');
    const quickAddFilterMode = ref('all');

    const filteredActivities = computed(() => {
      const q = activitySearchQuery.value.trim().toLowerCase();
      const selectedId = String(slotForm.value.activityTemplate || '');
      return props.activities.filter(act => {
        const id = String(act.documentId || act.id || '');
        const matches = !q || (act.name || '').toLowerCase().includes(q) ||
          (Array.isArray(act.tags) && act.tags.some(tag => (tag || '').toLowerCase().includes(q)));
        return matches || id === selectedId;
      });
    });

    const filteredLocations = computed(() => {
      const q = locationSearchQuery.value.trim().toLowerCase();
      const selectedId = String(slotForm.value.location || '');
      return props.locations.filter(loc => {
        const id = String(loc.documentId || loc.id || '');
        return (!q || (loc.name || '').toLowerCase().includes(q)) || id === selectedId;
      });
    });

    const filteredFacilitators = computed(() => {
      const q = facilitatorSearchQuery.value.trim().toLowerCase();
      const selectedIds = new Set((slotForm.value.facilitators || []).map(id => String(id)));
      return props.facilitators.filter(fac => {
        const full = `${fac.firstName || ''} ${fac.lastName || ''}`.toLowerCase();
        return (!q || full.includes(q)) || selectedIds.has(String(fac.documentId || fac.id));
      });
    });

    const filteredParticipants = computed(() => {
      const q = participantSearchQuery.value.trim().toLowerCase();
      const selectedIds = new Set((slotForm.value.participants || []).map(id => String(id)));
      return props.participants.filter(part => {
        const full = `${part.firstName || ''} ${part.lastName || ''}`.toLowerCase();
        return (!q || full.includes(q)) || selectedIds.has(String(part.documentId || part.id));
      });
    });

    // Formatters
    const currentDateStr = computed(() => {
      const d = currentDate.value;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    const todayFormatted = computed(() => {
      return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    });

    // Helper: compute ISO week number
    function getWeekNumber(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // Helper: start of week (Monday)
    function getMonday(d) {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday;
    }

    // Header labels
    const periodTitle = computed(() => {
      if (viewMode.value === 'day') {
        return currentDate.value.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      if (viewMode.value === 'week') {
        const weekNum = getWeekNumber(currentDate.value);
        return `Semaine ${weekNum} (${currentDate.value.getFullYear()})`;
      }
      return currentDate.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    });

    // Room / Location Filter
    const selectedLocationFilter = ref('');

    function toggleLocationFilter(locId) {
      const targetStr = String(locId);
      if (selectedLocationFilter.value === targetStr) {
        selectedLocationFilter.value = '';
      } else {
        selectedLocationFilter.value = targetStr;
      }
    }

    const filteredTimeslots = computed(() => {
      const allSlots = schedulerStore.timeslots || [];
      if (!selectedLocationFilter.value) {
        return allSlots;
      }
      if (selectedLocationFilter.value === 'unassigned') {
        return allSlots.filter(s => !s.location);
      }
      const targetId = String(selectedLocationFilter.value);
      return allSlots.filter(s => {
        if (!s.location) return false;
        const sLocId = String(s.location.documentId || s.location.id || s.location);
        return sLocId === targetId;
      });
    });

    const locationSlotCounts = computed(() => {
      const counts = { total: 0, unassigned: 0 };
      let periodSlots = schedulerStore.timeslots || [];
      if (viewMode.value === 'day') {
        periodSlots = periodSlots.filter(s => s.startDate && s.startDate.slice(0, 10) === currentDateStr.value);
      } else if (viewMode.value === 'week') {
        const mon = getMonday(currentDate.value);
        const weekDates = new Set();
        for (let i = 0; i < 7; i++) {
          const d = new Date(mon);
          d.setDate(mon.getDate() + i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dayNum = String(d.getDate()).padStart(2, '0');
          weekDates.add(`${y}-${m}-${dayNum}`);
        }
        periodSlots = periodSlots.filter(s => s.startDate && weekDates.has(s.startDate.slice(0, 10)));
      } else {
        const y = currentDate.value.getFullYear();
        const m = String(currentDate.value.getMonth() + 1).padStart(2, '0');
        periodSlots = periodSlots.filter(s => s.startDate && s.startDate.startsWith(`${y}-${m}`));
      }

      counts.total = periodSlots.length;
      periodSlots.forEach(s => {
        if (!s.location) {
          counts.unassigned = (counts.unassigned || 0) + 1;
        } else {
          const id = String(s.location.documentId || s.location.id || s.location);
          counts[id] = (counts[id] || 0) + 1;
        }
      });

      return counts;
    });

    const weekDaysList = computed(() => {
      const mon = getMonday(currentDate.value);
      const days = [];
      const todayStr = new Date().toISOString().slice(0, 10);

      for (let i = 0; i < 7; i++) {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dayNum}`;

        const slots = filteredTimeslots.value.filter(s => {
          return s.startDate && s.startDate.slice(0, 10) === dateStr;
        }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        days.push({
          date: d,
          dateStr,
          dayName: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
          dayNumber: d.getDate(),
          monthShort: d.toLocaleDateString('fr-FR', { month: 'short' }),
          isToday: dateStr === todayStr,
          isWeekend: i >= 5,
          slots
        });
      }
      return days;
    });

    const weekDaysRangeLabel = computed(() => {
      if (weekDaysList.value.length === 0) return '';
      const first = weekDaysList.value[0];
      const last = weekDaysList.value[6];
      return `Du ${first.dayNumber} ${first.monthShort} au ${last.dayNumber} ${last.monthShort} ${first.date.getFullYear()}`;
    });

    const selectedDayObject = computed(() => {
      const d = currentDate.value;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayNum}`;

      return {
        dateStr,
        dayName: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
        dayNumber: d.getDate(),
        monthFull: d.toLocaleDateString('fr-FR', { month: 'long' }),
        year: d.getFullYear(),
        isToday: dateStr === new Date().toISOString().slice(0, 10)
      };
    });

    const selectedDaySlots = computed(() => {
      const dateStr = currentDateStr.value;
      return filteredTimeslots.value.filter(s => {
        return s.startDate && s.startDate.slice(0, 10) === dateStr;
      }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    });

    const selectedDayFacilitatorsCount = computed(() => {
      const set = new Set();
      selectedDaySlots.value.forEach(s => {
        (s.facilitators || []).forEach(f => set.add(f.documentId || f.id));
      });
      return set.size;
    });

    const selectedDayParticipantsCount = computed(() => {
      return selectedDaySlots.value.reduce((acc, s) => acc + (s.participants || []).length, 0);
    });

    // Month view days
    const monthCalendarDays = computed(() => {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const startDate = getMonday(firstDay);
      const days = [];
      const todayStr = new Date().toISOString().slice(0, 10);

      let cur = new Date(startDate);
      for (let i = 0; i < 35; i++) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const slots = filteredTimeslots.value.filter(s => {
          return s.startDate && s.startDate.slice(0, 10) === dateStr;
        });

        days.push({
          dateStr,
          dayNumber: cur.getDate(),
          isCurrentMonth: cur.getMonth() === month,
          isToday: dateStr === todayStr,
          slots
        });

        cur.setDate(cur.getDate() + 1);
      }
      return days;
    });

    // Period Slots Count
    const currentPeriodSlots = computed(() => {
      if (viewMode.value === 'day') return selectedDaySlots.value;
      if (viewMode.value === 'week') {
        const weekDates = new Set(weekDaysList.value.map(d => d.dateStr));
        return filteredTimeslots.value.filter(s => s.startDate && weekDates.has(s.startDate.slice(0, 10)));
      }
      const y = currentDate.value.getFullYear();
      const m = String(currentDate.value.getMonth() + 1).padStart(2, '0');
      const prefix = `${y}-${m}`;
      return filteredTimeslots.value.filter(s => s.startDate && s.startDate.startsWith(prefix));
    });

    const currentPeriodSlotsCount = computed(() => currentPeriodSlots.value.length);

    // Summary Metrics
    const metrics = computed(() => {
      const slots = currentPeriodSlots.value;
      const facSet = new Set();
      let totalParts = 0;
      let totalMinutes = 0;
      let unassignedFacCount = 0;
      let conflicts = 0;

      slots.forEach(s => {
        const facs = s.facilitators || [];
        if (facs.length === 0) unassignedFacCount++;
        facs.forEach(f => facSet.add(f.documentId || f.id));

        const parts = s.participants || [];
        totalParts += parts.length;

        if (s.startDate && s.endDate) {
          const diff = new Date(s.endDate) - new Date(s.startDate);
          if (diff > 0) totalMinutes += Math.round(diff / 60000);
        }

        if (slotConflicts(s).length > 0) conflicts++;
      });

      return {
        totalSlots: slots.length,
        activeFacilitatorsCount: facSet.size,
        unassignedFacilitatorsSlotsCount: unassignedFacCount,
        totalParticipantsRegistrations: totalParts,
        totalDurationHours: Math.round((totalMinutes / 60) * 10) / 10,
        conflictCount: conflicts
      };
    });

    function getParticipantWeeklySlotsCount(person) {
      const pId = person.documentId || person.id;
      const weekDates = new Set(weekDaysList.value.map(d => d.dateStr));
      return (schedulerStore.timeslots || []).filter(s => {
        if (!s.startDate || !weekDates.has(s.startDate.slice(0, 10))) return false;
        return (s.participants || []).some(p => (p.documentId || p.id) === pId);
      }).length;
    }

    function getFacilitatorWeeklySlotsCount(person) {
      const fId = person.documentId || person.id;
      const weekDates = new Set(weekDaysList.value.map(d => d.dateStr));
      return (schedulerStore.timeslots || []).filter(s => {
        if (!s.startDate || !weekDates.has(s.startDate.slice(0, 10))) return false;
        return (s.facilitators || []).some(f => (f.documentId || f.id) === fId);
      }).length;
    }

    // Availability Helpers
    function getFacilitatorAvailabilityClass(fac) {
      const evalRes = checkPersonDateAvailability(fac, currentDateStr.value, 'facilitator', schedulerStore.timeslots);
      if (!evalRes.available) return 'badge-unavailable';
      return 'badge-available';
    }

    function getFacilitatorAvailabilityLabel(fac) {
      const evalRes = checkPersonDateAvailability(fac, currentDateStr.value, 'facilitator', schedulerStore.timeslots);
      if (!evalRes.available) return evalRes.reason || 'Indisponible';
      return '🟢 Disponible';
    }

    function getParticipantTodayAvailabilityClass(part) {
      const evalRes = checkPersonDateAvailability(part, currentDateStr.value, 'participant', schedulerStore.timeslots);
      if (!evalRes.available) return 'badge-unavailable';
      return 'badge-available';
    }

    function getParticipantTodayAvailabilityLabel(part) {
      const evalRes = checkPersonDateAvailability(part, currentDateStr.value, 'participant', schedulerStore.timeslots);
      if (!evalRes.available) return evalRes.reason || 'Indisponible';
      return '🟢 Dispo aujourd\'hui';
    }

    // Conflict calculations on a slot
    function slotConflicts(slot) {
      const alerts = [];
      const dateStr = slot.startDate ? slot.startDate.slice(0, 10) : '';

      // Capacity warnings
      const minP = getMinParticipants(slot);
      const maxP = getMaxParticipants(slot);
      const partCount = (slot.participants || []).length;
      if (partCount > maxP) alerts.push(`Surcapacité : ${partCount}/${maxP} bénéficiaires inscrits`);

      // Facilitators conflicts
      (slot.facilitators || []).forEach(f => {
        const conf = getPersonSlotConflict(f, slot, 'facilitator');
        if (conf) alerts.push(`${f.firstName} ${f.lastName} : ${conf}`);
      });

      // Participants conflicts
      (slot.participants || []).forEach(p => {
        const conf = getPersonSlotConflict(p, slot, 'participant');
        if (conf) alerts.push(`${p.firstName} ${p.lastName} : ${conf}`);
      });

      return alerts;
    }

    function getPersonSlotConflict(person, currentSlot, type) {
      if (!person || !currentSlot.startDate || !currentSlot.endDate) return null;
      const pId = person.documentId || person.id;
      const curSlotId = currentSlot.documentId || currentSlot.id;
      const dateStr = currentSlot.startDate.slice(0, 10);

      // Check date availability (congés/planning)
      const baseEval = checkPersonDateAvailability(person, dateStr, type, schedulerStore.timeslots, curSlotId);
      if (!baseEval.available) return baseEval.reason;

      // Check slot time overlap with other slots
      const cStart = new Date(currentSlot.startDate).getTime();
      const cEnd = new Date(currentSlot.endDate).getTime();

      const otherOverlap = (schedulerStore.timeslots || []).find(s => {
        if ((s.documentId || s.id) === curSlotId) return false;
        if (!s.startDate || !s.endDate || s.startDate.slice(0, 10) !== dateStr) return false;
        const oStart = new Date(s.startDate).getTime();
        const oEnd = new Date(s.endDate).getTime();

        const overlaps = (cStart < oEnd && cEnd > oStart);
        if (!overlaps) return false;

        if (type === 'facilitator') {
          return (s.facilitators || []).some(f => (f.documentId || f.id) === pId);
        } else {
          return (s.participants || []).some(p => (p.documentId || p.id) === pId);
        }
      });

      if (otherOverlap) {
        return `Déjà inscrit sur "${otherOverlap.activityTemplate?.name || 'autre animation'}" sur le même horaire`;
      }

      return null;
    }

    // Capacity gauges helpers
    function getMinParticipants(slot) {
      return slot.activityTemplate?.minParticipants || 0;
    }

    function getMaxParticipants(slot) {
      if (slot.activityTemplate?.maxParticipants) return slot.activityTemplate.maxParticipants;
      if (slot.location?.capacity) return slot.location.capacity;
      return 10;
    }

    function getCapacityPercentage(slot) {
      const max = getMaxParticipants(slot);
      const count = (slot.participants || []).length;
      return Math.min(100, Math.round((count / max) * 100));
    }

    function getCapacityClass(slot) {
      const count = (slot.participants || []).length;
      const min = getMinParticipants(slot);
      const max = getMaxParticipants(slot);

      if (count > max) return 'cap-overload';
      if (count === max) return 'cap-full';
      if (count < min) return 'cap-low';
      return 'cap-good';
    }

    function isUnderMinParticipants(slot) {
      return (slot.participants || []).length < getMinParticipants(slot);
    }

    function isOverMaxParticipants(slot) {
      return (slot.participants || []).length > getMaxParticipants(slot);
    }

    function isFullParticipants(slot) {
      return (slot.participants || []).length === getMaxParticipants(slot);
    }

    function getActivityTag(slot) {
      const tags = slot.activityTemplate?.tags;
      if (Array.isArray(tags) && tags.length > 0) return tags[0];
      return null;
    }

    function getFacilitatorsSummaryText(slot) {
      const facs = slot.facilitators || [];
      if (facs.length === 0) return 'Sans animateur';
      if (facs.length === 1) return `${facs[0].firstName || ''} ${facs[0].lastName || ''}`.trim() || '1 animateur';
      return `${facs.length} animateurs`;
    }

    function getFacilitatorsSummaryTooltip(slot) {
      const facs = slot.facilitators || [];
      if (facs.length === 0) return 'Aucun animateur assigné';
      const names = facs.map(f => `${f.firstName || ''} ${f.lastName || ''}`.trim()).filter(Boolean).join(', ');
      return 'Animateur(s) : ' + names;
    }

    function formatSlotTimeRange(start, end) {
      if (!start) return '';
      const s = new Date(start);
      const e = end ? new Date(end) : null;
      const sh = String(s.getHours()).padStart(2, '0') + ':' + String(s.getMinutes()).padStart(2, '0');
      if (!e) return sh;
      const eh = String(e.getHours()).padStart(2, '0') + ':' + String(e.getMinutes()).padStart(2, '0');
      return `${sh} - ${eh}`;
    }

    function getSlotDurationMinutes(slot) {
      if (!slot.startDate || !slot.endDate) return 60;
      const diff = new Date(slot.endDate) - new Date(slot.startDate);
      return Math.max(15, Math.round(diff / 60000));
    }

    // Direct Removal Handlers
    async function removeFacilitator(slot, fac) {
      try {
        await schedulerStore.removeFacilitatorFromSlot(slot.documentId || slot.id, fac.documentId || fac.id);
      } catch (err) {
        globalStore.addError(err.message || 'Erreur lors du retrait.', 'Erreur');
      }
    }

    async function removeParticipant(slot, part) {
      try {
        await schedulerStore.removeParticipantFromSlot(slot.documentId || slot.id, part.documentId || part.id);
      } catch (err) {
        globalStore.addError(err.message || 'Erreur lors de la désinscription.', 'Erreur');
      }
    }

    async function removeLocation(slot) {
      try {
        await schedulerStore.setLocationForSlot(slot.documentId || slot.id, null);
      } catch (err) {
        globalStore.addError(err.message || 'Erreur lors du retrait de la salle.', 'Erreur');
      }
    }

    async function confirmDeleteSlot(slot) {
      const name = slot.activityTemplate?.name || 'cette animation';
      if (confirm(`Confirmez-vous la suppression de l'animation "${name}" ?`)) {
        try {
          await schedulerStore.deleteSlot(slot.documentId || slot.id);
        } catch (err) {
          globalStore.addError(err.message || 'Erreur lors de la suppression.', 'Erreur');
        }
      }
    }

    async function confirmClearCurrentPeriod() {
      if (confirm(`Voulez-vous supprimer l'ensemble des ${currentPeriodSlotsCount.value} animation(s) de la période affichée ?`)) {
        const ids = currentPeriodSlots.value.map(s => s.documentId || s.id);
        try {
          await schedulerStore.batchDeleteSlots(ids);
        } catch (err) {
          globalStore.addError(err.message || 'Erreur lors de la suppression groupée.', 'Erreur');
        }
      }
    }

    // Navigation & View switching
    function setViewMode(mode) {
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
    }

    function goToToday() {
      lastNavAction.value = 'today';
      currentDate.value = new Date();
    }

    function onDirectDateChange(event) {
      if (event.target.value) {
        lastNavAction.value = 'date-input';
        const [y, m, d] = event.target.value.split('-').map(Number);
        currentDate.value = new Date(y, m - 1, d);
      }
    }

    function selectDayFromMonth(dateStr) {
      lastNavAction.value = 'date-input';
      const [y, m, d] = dateStr.split('-').map(Number);
      currentDate.value = new Date(y, m - 1, d);
      viewMode.value = 'day';
    }

    watch(() => schedulerStore.loading, (isLoading) => {
      if (!isLoading) {
        lastNavAction.value = null;
      }
    });

    // Modal Create / Edit Slot
    const modalContextTitle = ref('');

    // Range mode options & helpers
    const weekDaysOptions = [
      { id: 1, label: 'Lun', full: 'Lundi' },
      { id: 2, label: 'Mar', full: 'Mardi' },
      { id: 3, label: 'Mer', full: 'Mercredi' },
      { id: 4, label: 'Jeu', full: 'Jeudi' },
      { id: 5, label: 'Ven', full: 'Vendredi' },
      { id: 6, label: 'Sam', full: 'Samedi' },
      { id: 7, label: 'Dim', full: 'Dimanche' }
    ];

    function setSlotDaysPreset(preset) {
      if (preset === 'workdays') {
        slotForm.value.daysOfWeek = [1, 2, 3, 4, 5];
      } else if (preset === 'all') {
        slotForm.value.daysOfWeek = [1, 2, 3, 4, 5, 6, 7];
      } else if (preset === 'same-day') {
        const dStr = slotForm.value.startDate || currentDateStr.value;
        const [y, m, d] = dStr.split('-').map(Number);
        const startDt = new Date(y, m - 1, d, 12, 0, 0);
        const jsDay = startDt.getDay();
        const dayOfWeek = jsDay === 0 ? 7 : jsDay;
        slotForm.value.daysOfWeek = [dayOfWeek];
      }
    }

    function toggleSlotDay(dayId) {
      const idx = slotForm.value.daysOfWeek.indexOf(dayId);
      if (idx === -1) {
        slotForm.value.daysOfWeek.push(dayId);
        slotForm.value.daysOfWeek.sort((a, b) => a - b);
      } else {
        if (slotForm.value.daysOfWeek.length > 1) {
          slotForm.value.daysOfWeek.splice(idx, 1);
        }
      }
    }

    const modalTargetDates = computed(() => {
      if (slotForm.value.dateMode !== 'range') {
        return slotForm.value.date ? [slotForm.value.date] : [];
      }
      if (!slotForm.value.startDate || !slotForm.value.endDate) return [];
      if (slotForm.value.startDate > slotForm.value.endDate) return [];

      const dates = [];
      const [sY, sM, sD] = slotForm.value.startDate.split('-').map(Number);
      const [eY, eM, eD] = slotForm.value.endDate.split('-').map(Number);
      const start = new Date(sY, sM - 1, sD, 12, 0, 0);
      const end = new Date(eY, eM - 1, eD, 12, 0, 0);
      const maxDays = 180;
      let count = 0;
      const current = new Date(start);

      while (current <= end && count < maxDays) {
        const jsDay = current.getDay();
        const dayOfWeek = jsDay === 0 ? 7 : jsDay;
        if (slotForm.value.daysOfWeek.includes(dayOfWeek)) {
          dates.push(formatLocalDate(current));
        }
        current.setDate(current.getDate() + 1);
        count++;
      }

      return dates;
    });

    function formatTargetDatesSummary(dates) {
      if (!dates || dates.length === 0) return '';
      if (dates.length <= 5) {
        return dates.map(d => {
          const [y, m, day] = d.split('-').map(Number);
          const dt = new Date(y, m - 1, day, 12, 0, 0);
          return dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'numeric' });
        }).join(', ');
      }
      const [fYear, fMonth, fDay] = dates[0].split('-').map(Number);
      const first = new Date(fYear, fMonth - 1, fDay, 12, 0, 0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const [lYear, lMonth, lDay] = dates[dates.length - 1].split('-').map(Number);
      const last = new Date(lYear, lMonth - 1, lDay, 12, 0, 0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      return `Du ${first} au ${last} (${dates.length} séances)`;
    }

    function applyTimePreset(timeStr) {
      slotForm.value.startTime = timeStr;
      recomputeEndTime();
    }

    function openCreateModal(defaults = {}) {
      editingSlotId.value = null;
      activitySearchQuery.value = '';
      facilitatorSearchQuery.value = '';
      participantSearchQuery.value = '';
      locationSearchQuery.value = '';
      const initialDate = defaults.date || currentDateStr.value;
      const firstAct = props.activities[0];
      const selectedActId = defaults.activityTemplate || (firstAct ? (firstAct.documentId || firstAct.id) : '');

      if (defaults.activityTemplate) {
        const actObj = props.activities.find(a => (a.documentId || a.id) === defaults.activityTemplate);
        modalContextTitle.value = actObj ? `✨ Programmer : ${actObj.name}` : '➕ Nouveau Créneau d\'Animation';
      } else {
        modalContextTitle.value = '➕ Nouveau Créneau d\'Animation';
      }

      const [initY, initM, initD] = initialDate.split('-').map(Number);
      const nextWeek = new Date(initY, initM - 1, initD + 7, 12, 0, 0);
      const defaultEndDate = formatLocalDate(nextWeek);

      slotForm.value = {
        dateMode: 'single',
        activityTemplate: selectedActId,
        date: initialDate,
        startDate: initialDate,
        endDate: defaultEndDate,
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: defaults.startTime || '10:00',
        endTime: '11:30',
        location: defaults.location || '',
        facilitators: defaults.facilitators || [],
        participants: defaults.participants || []
      };

      recomputeEndTime();
      showSlotModal.value = true;
    }

    function openEditModal(slot) {
      editingSlotId.value = slot.documentId || slot.id;
      activitySearchQuery.value = '';
      facilitatorSearchQuery.value = '';
      participantSearchQuery.value = '';
      locationSearchQuery.value = '';
      const s = new Date(slot.startDate);
      const e = new Date(slot.endDate);

      const y = s.getFullYear();
      const m = String(s.getMonth() + 1).padStart(2, '0');
      const d = String(s.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const sh = String(s.getHours()).padStart(2, '0') + ':' + String(s.getMinutes()).padStart(2, '0');
      const eh = String(e.getHours()).padStart(2, '0') + ':' + String(e.getMinutes()).padStart(2, '0');

      slotForm.value = {
        dateMode: 'single',
        activityTemplate: slot.activityTemplate?.documentId || slot.activityTemplate?.id || '',
        date: dateStr,
        startDate: dateStr,
        endDate: dateStr,
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: sh,
        endTime: eh,
        location: slot.location?.documentId || slot.location?.id || '',
        facilitators: (slot.facilitators || []).map(f => f.documentId || f.id),
        participants: (slot.participants || []).map(p => p.documentId || p.id)
      };

      showSlotModal.value = true;
    }

    function closeSlotModal() {
      showSlotModal.value = false;
      editingSlotId.value = null;
    }

    function onModalActivityChange() {
      recomputeEndTime();
    }

    function recomputeEndTime() {
      const act = props.activities.find(a => (a.documentId || a.id) === slotForm.value.activityTemplate);
      const duration = act?.standardDuration || 60;
      const [sh, sm] = slotForm.value.startTime.split(':').map(Number);
      if (isNaN(sh) || isNaN(sm)) return;

      const totalMins = sh * 60 + sm + duration;
      const eh = Math.floor(totalMins / 60) % 24;
      const em = totalMins % 60;
      slotForm.value.endTime = String(eh).padStart(2, '0') + ':' + String(em).padStart(2, '0');
    }

    function selectAllParticipants() {
      slotForm.value.participants = props.participants.map(p => p.documentId || p.id);
    }

    async function saveSlotForm() {
      if (!slotForm.value.activityTemplate) {
        globalStore.addError('Veuillez sélectionner une activité.', 'Champ manquant');
        return;
      }

      // Cas 1 : Modification d'un créneau existant
      if (editingSlotId.value) {
        isSavingModal.value = true;
        try {
          const [y, m, d] = slotForm.value.date.split('-').map(Number);
          const [sh, sm] = slotForm.value.startTime.split(':').map(Number);
          const [eh, em] = slotForm.value.endTime.split(':').map(Number);

          const start = new Date(y, m - 1, d, sh, sm, 0);
          const end = new Date(y, m - 1, d, eh, em, 0);

          const payload = {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            activityTemplate: slotForm.value.activityTemplate,
            location: slotForm.value.location || null,
            facilitators: slotForm.value.facilitators
          };

          await schedulerStore.updateSlot(editingSlotId.value, payload);
          closeSlotModal();
        } catch (err) {
          globalStore.addError(err.message || 'Erreur lors de la modification.', 'Erreur');
        } finally {
          isSavingModal.value = false;
        }
        return;
      }

      // Cas 2 : Création d'une date unique
      if (slotForm.value.dateMode === 'single') {
        if (!slotForm.value.date) {
          globalStore.addError('Veuillez sélectionner une date.', 'Champ manquant');
          return;
        }
        isSavingModal.value = true;
        try {
          const [y, m, d] = slotForm.value.date.split('-').map(Number);
          const [sh, sm] = slotForm.value.startTime.split(':').map(Number);
          const [eh, em] = slotForm.value.endTime.split(':').map(Number);

          const start = new Date(y, m - 1, d, sh, sm, 0);
          const end = new Date(y, m - 1, d, eh, em, 0);

          const payload = {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            activityTemplate: slotForm.value.activityTemplate,
            location: slotForm.value.location || null,
            facilitators: slotForm.value.facilitators,
            participants: slotForm.value.participants || []
          };

          await schedulerStore.createSlot(payload);
          closeSlotModal();
        } catch (err) {
          globalStore.addError(err.message || 'Erreur lors de la création.', 'Erreur');
        } finally {
          isSavingModal.value = false;
        }
        return;
      }

      // Cas 3 : Création sur une plage de dates avec répétitivité (Génération en arrière-plan)
      if (slotForm.value.dateMode === 'range') {
        if (!slotForm.value.startDate || !slotForm.value.endDate) {
          globalStore.addError('Veuillez renseigner une date de début et une date de fin.', 'Champs manquants');
          return;
        }
        if (slotForm.value.startDate > slotForm.value.endDate) {
          globalStore.addError('La date de fin doit être postérieure ou égale à la date de début.', 'Date invalide');
          return;
        }
        const targetDates = [...modalTargetDates.value];
        if (targetDates.length === 0) {
          globalStore.addError('Aucune date correspondante trouvée pour cette période.', 'Sélection vide');
          return;
        }

        const act = props.activities.find(a => (a.documentId || a.id) === slotForm.value.activityTemplate);
        const actName = act ? act.name : 'l\'animation';

        const payload = {
          dates: targetDates,
          startTime: slotForm.value.startTime,
          endTime: slotForm.value.endTime,
          activityTemplate: slotForm.value.activityTemplate,
          location: slotForm.value.location || null,
          facilitators: [...slotForm.value.facilitators],
          participants: [...slotForm.value.participants]
        };

        // Fermeture immédiate de la modale pour rendre la main
        closeSlotModal();

        // Activation du bandeau flottant de progression
        backgroundJob.value = {
          active: true,
          current: 0,
          total: targetDates.length,
          activityName: actName,
          isDone: false
        };

        globalStore.addInfo(
          `Programmation de ${targetDates.length} créneau(x) pour "${actName}" lancée en arrière-plan...`,
          'Génération en arrière-plan'
        );

        // Exécution en tâche d'arrière-plan
        (async () => {
          try {
            await schedulerStore.createRecurringSlots(payload, (progress) => {
              backgroundJob.value.current = progress.current;
            });
            globalStore.addSuccess(
              `${targetDates.length} séance(s) de "${actName}" programmée(s) avec succès !`,
              'Programmation terminée'
            );
          } catch (err) {
            console.error('Erreur programmation récurrente:', err);
            globalStore.addError(err.message || 'Erreur lors de la programmation en arrière-plan.', 'Erreur');
          } finally {
            setTimeout(() => {
              backgroundJob.value.active = false;
            }, 1500);
          }
        })();
      }
    }

    // Modal Duplication
    function openDuplicateModal() {
      duplicateForm.value.sourceDate = currentDateStr.value;
      duplicateForm.value.targetDates = [];
      showDuplicateModal.value = true;
    }

    function countSlotsOnDate(dateStr) {
      if (!dateStr) return 0;
      return (schedulerStore.timeslots || []).filter(s => s.startDate && s.startDate.slice(0, 10) === dateStr).length;
    }

    async function executeDuplication() {
      try {
        await schedulerStore.duplicateDaySlots(duplicateForm.value.sourceDate, duplicateForm.value.targetDates, {
          includeFacilitators: duplicateForm.value.includeFacilitators,
          includeParticipants: duplicateForm.value.includeParticipants
        });
        showDuplicateModal.value = false;
      } catch (err) {
        globalStore.addError(err.message || 'Erreur lors de la duplication.', 'Erreur');
      }
    }

    // Modal Quick Add Participants
    function openQuickAddParticipants(slot) {
      quickAddSlot.value = slot;
      quickAddSelectedIds.value = (slot.participants || []).map(p => p.documentId || p.id);
      quickAddSearch.value = '';
      quickAddFilterMode.value = 'all';
      showQuickAddModal.value = true;
    }

    const unassignedQuickAddParticipantsCount = computed(() => {
      return props.participants.filter(p => getParticipantWeeklySlotsCount(p) === 0).length;
    });

    const filteredQuickAddParticipants = computed(() => {
      let list = props.participants;
      const selectedIds = new Set(quickAddSelectedIds.value.map(id => String(id)));

      if (quickAddFilterMode.value === 'unassigned_week') {
        list = list.filter(p => getParticipantWeeklySlotsCount(p) === 0);
      } else if (quickAddFilterMode.value === 'available_today') {
        list = list.filter(p => checkPersonDateAvailability(p, currentDateStr.value, 'participant', schedulerStore.timeslots).available);
      }

      const q = quickAddSearch.value.trim().toLowerCase();
      if (q) {
        list = list.filter(p => {
          const full = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
          return full.includes(q) || selectedIds.has(String(p.documentId || p.id));
        });
      }
      return list;
    });

    async function saveQuickAddParticipants() {
      if (!quickAddSlot.value) return;
      try {
        await schedulerStore.updateSlot(quickAddSlot.value.documentId || quickAddSlot.value.id, {
          participants: quickAddSelectedIds.value
        });
        showQuickAddModal.value = false;
      } catch (err) {
        globalStore.addError(err.message || 'Erreur lors de l\'affectation.', 'Erreur');
      }
    }

    function printPage() {
      window.print();
    }

    return {
      schedulerStore,
      viewMode,
      currentDate,
      currentDateStr,
      todayFormatted,
      periodTitle,
      weekDaysList,
      weekDaysRangeLabel,
      selectedDayObject,
      selectedDaySlots,
      selectedDayFacilitatorsCount,
      selectedDayParticipantsCount,
      monthCalendarDays,
      currentPeriodSlotsCount,
      metrics,
      highlightedSlotId,
      isParticipantPlacementMode,
      isPlacingParticipants,
      toggleParticipantMode,
      showSlotModal,
      editingSlotId,
      isSavingModal,
      slotForm,
       activitySearchQuery,
       facilitatorSearchQuery,
       participantSearchQuery,
       locationSearchQuery,
       filteredActivities,
       filteredLocations,
       filteredFacilitators,
       filteredParticipants,
       showDuplicateModal,
      duplicateForm,
      showQuickAddModal,
      quickAddSlot,
      quickAddSelectedIds,
      quickAddSearch,
      quickAddFilterMode,
      filteredQuickAddParticipants,
      unassignedQuickAddParticipantsCount,
      getParticipantWeeklySlotsCount,
      getFacilitatorWeeklySlotsCount,
      getFacilitatorAvailabilityClass,
      getFacilitatorAvailabilityLabel,
      getParticipantTodayAvailabilityClass,
      getParticipantTodayAvailabilityLabel,
      slotConflicts,
      getPersonSlotConflict,
      getMinParticipants,
      getMaxParticipants,
      getCapacityPercentage,
      getCapacityClass,
      isUnderMinParticipants,
      isOverMaxParticipants,
      isFullParticipants,
      getActivityTag,
      formatSlotTimeRange,
      getSlotDurationMinutes,
      removeFacilitator,
      removeParticipant,
      removeLocation,
      confirmDeleteSlot,
      confirmClearCurrentPeriod,
      setViewMode,
      navigateDate,
      goToToday,
      onDirectDateChange,
      selectDayFromMonth,
      openCreateModal,
      openEditModal,
      closeSlotModal,
      onModalActivityChange,
      recomputeEndTime,
      selectAllParticipants,
      saveSlotForm,
      openDuplicateModal,
      countSlotsOnDate,
      executeDuplication,
      openQuickAddParticipants,
      saveQuickAddParticipants,
      printPage,
      selectedLocationFilter,
      toggleLocationFilter,
      filteredTimeslots,
      locationSlotCounts,
      modalContextTitle,
      applyTimePreset,
      expandedSlotIds,
      isSlotExpanded,
      toggleSlotExpand,
      expandAllSlots,
      collapseAllSlots,
      toggleAllSlots,
      areAllSlotsExpanded,
      isDayAllExpanded,
      toggleDaySlots,
      getFacilitatorsSummaryText,
      getFacilitatorsSummaryTooltip,
      lastNavAction,
      weekDaysOptions,
      setSlotDaysPreset,
      toggleSlotDay,
      modalTargetDates,
      formatTargetDatesSummary,
      backgroundJob
    };
  }
};
</script>

<style scoped>
/* ════════════════ STYLES: ANIMATIONS PLANNING VIEW ════════════════ */
.animations-planning-root {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  position: relative;
  font-family: inherit;
}

/* Header & Toolbar */
.view-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--panel-bg-solid, #0f172a);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.45);
}

.header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-title-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.title-with-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.title-with-pill h2 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
}

.mode-tag-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  border-radius: 20px;
  text-transform: uppercase;
}

.subtitle {
  margin: 0.2rem 0 0 0;
  font-size: 0.88rem;
  color: var(--text-muted, #94a3b8);
}

/* View Switcher */
.view-switcher-pill {
  display: flex;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px;
  border-radius: 10px;
  gap: 4px;
}

.view-pill-btn {
  border: none;
  background: transparent;
  padding: 0.45rem 0.9rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #94a3b8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-pill-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
}

.view-pill-btn.active {
  background: linear-gradient(135deg, #0d9488 0%, #059669 100%);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.4);
}

/* Toolbar Row */
.header-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.date-nav-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.nav-arrow-btn, .today-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.nav-arrow-btn {
  min-width: 36px;
  height: 36px;
  padding: 0;
  font-size: 0.95rem;
  color: #f8fafc;
}

.today-btn {
  height: 36px;
  padding: 0 0.9rem;
  background: rgba(13, 148, 136, 0.2);
  border-color: rgba(13, 148, 136, 0.4);
  color: #5eead4;
}

.nav-arrow-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.today-btn:hover {
  background: rgba(13, 148, 136, 0.35);
  border-color: #5eead4;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.4);
}

.nav-arrow-btn:active, .today-btn:active {
  transform: translateY(0);
}

.period-title-block {
  display: flex;
  flex-direction: column;
  margin: 0 0.5rem;
}

.current-period-title {
  font-size: 1.08rem;
  font-weight: 700;
  color: #f8fafc;
}

.period-subtitle {
  font-size: 0.78rem;
  font-weight: 500;
  color: #94a3b8;
}

.direct-date-input {
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 0 0.65rem;
  border-radius: 8px;
  font-size: 0.85rem;
  height: 36px;
  background: rgba(15, 23, 42, 0.85);
  color: #ffffff;
  font-weight: 500;
  transition: border-color 0.2s;
}

.direct-date-input:focus {
  border-color: #0d9488;
  outline: none;
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.25);
}

/* Action tools */
.action-tools-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.active {
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
  border-color: rgba(99, 102, 241, 0.3);
}

.primary-btn {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  color: #ffffff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
  transition: all 0.2s;
}

.primary-btn:hover {
  background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
  transform: translateY(-1px);
}

.danger-tool-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
}

/* Metrics bar */
.metrics-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

/* Location Filter Bar */
.location-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.6rem 1rem;
  background: var(--panel-bg-solid, #0f172a);
  border-radius: 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  flex-wrap: wrap;
}

.filter-bar-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #cbd5e1;
  white-space: nowrap;
}

.filter-chips-container {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  flex-grow: 1;
}

.room-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #cbd5e1;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.room-filter-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.room-filter-pill.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
}

.filter-count-badge {
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 700;
}

.room-filter-pill.active .filter-count-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.badge-has-slots {
  background: rgba(99, 102, 241, 0.25);
  color: #a5b4fc;
}

.room-filter-pill.active .badge-has-slots {
  background: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.room-filter-pill.unassigned-pill {
  border-style: dashed;
}

.clear-filter-btn {
  margin-left: auto;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-filter-btn:hover {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.metric-icon {
  font-size: 1.4rem;
}

.metric-info {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 600;
}

.metric-value {
  font-size: 1rem;
  font-weight: 700;
  color: #f8fafc;
}

.warning-text {
  color: #fbbf24;
}

.metric-warn-badge {
  font-size: 0.7rem;
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
  padding: 0.1rem 0.35rem;
  border-radius: 6px;
  margin-left: 0.3rem;
}

/* ──────────────── MAIN PLANNING LAYOUT ──────────────── */
.main-planning-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  align-items: start;
}

.planning-canvas-container {
  position: relative;
  width: 100%;
  min-width: 0;
}

/* ──────────────── KANBAN BOARD (WEEK VIEW) ──────────────── */
.week-columns-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(210px, 1fr));
  gap: 0.85rem;
  overflow-x: auto;
  padding-bottom: 1rem;
}

.day-kanban-column {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  min-height: 520px;
  transition: all 0.2s;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
}

.day-kanban-column.is-today {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
}

.day-kanban-column.is-weekend {
  background: rgba(15, 23, 42, 0.55);
}

/* Column Header */
.column-header {
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(30, 41, 59, 0.5);
  border-top-left-radius: 13px;
  border-top-right-radius: 13px;
}

.day-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.35rem;
}

.day-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: #f8fafc;
  text-transform: capitalize;
}

.day-badge-date {
  font-size: 0.78rem;
  font-weight: 600;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.day-kanban-column.is-today .day-badge-date {
  background: #4f46e5;
  color: #ffffff;
}

.day-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
}

.slots-count-chip {
  font-size: 0.72rem;
  font-weight: 600;
  color: #94a3b8;
}

.slots-count-chip.has-slots {
  color: #818cf8;
}

.day-collapse-toggle-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.65rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.day-collapse-toggle-btn:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
  color: #a5b4fc;
}

.quick-add-day-btn {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.quick-add-day-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

/* Column Slots List */
.column-slots-list {
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex-grow: 1;
}

.empty-day-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.2rem 0.5rem;
  text-align: center;
  color: #94a3b8;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.empty-day-state.clickable-empty-day {
  cursor: pointer;
  border: 1px dashed transparent;
}

.empty-day-state.clickable-empty-day:hover {
  background: rgba(99, 102, 241, 0.06);
  border-color: rgba(99, 102, 241, 0.3);
  color: #818cf8;
}

.empty-day-icon {
  font-size: 1.8rem;
  margin-bottom: 0.4rem;
}

.empty-day-text {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
}

.quick-add-slot-btn {
  margin-top: 0.5rem;
  margin-bottom: 0.3rem;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: #a5b4fc;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
}

.quick-add-slot-btn:hover {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}

/* ──────────────── ANIMATION CARDS (KANBAN) ──────────────── */
.animation-card {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  transition: all 0.2s ease;
  position: relative;
}

.animation-card:hover {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

.animation-card.is-collapsed {
  padding: 0.55rem 0.65rem;
  gap: 0.4rem;
  border-left: 3px solid #6366f1;
}

.animation-card.is-collapsed:hover {
  border-color: #818cf8;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.2);
}

.animation-card.is-expanded {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.animation-card.has-conflict {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}

.anim-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.3rem;
}

.anim-card-header.is-clickable,
.anim-title-row.is-clickable {
  cursor: pointer;
}

.anim-title-row.is-clickable:hover .anim-name {
  color: #818cf8;
}

.toggle-card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 0.7rem;
}

.toggle-card-btn:hover {
  color: #818cf8;
  background: rgba(99, 102, 241, 0.15);
}

.chevron-icon {
  display: inline-block;
  font-size: 0.6rem;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform: rotate(-90deg);
}

.chevron-icon.is-rotated {
  transform: rotate(0deg);
}

/* ──────────────── ROOM SLOT / PARTICIPANT PLACEMENT MODE ──────────────── */
.animation-card.is-participant-mode,
.day-slot-expanded-card.is-participant-mode {
  border-color: #0284c7;
  border-left: 4px solid #38bdf8;
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.2) 0%, rgba(15, 23, 42, 0.85) 100%);
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.2);
}

.animation-card.is-participant-mode:hover,
.day-slot-expanded-card.is-participant-mode:hover {
  border-color: #38bdf8;
  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.3);
}

/* Subtle transparent watermark of activity in background */
.room-slot-activity-watermark {
  position: absolute;
  right: 0.75rem;
  bottom: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  max-width: 65%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.watermark-icon {
  font-size: 0.85rem;
  opacity: 0.35;
}

.watermark-text {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Room placement header in card */
.room-placement-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  z-index: 1;
}

.room-placement-primary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.room-placement-time {
  display: flex;
  align-items: center;
}

.room-time-chip {
  background: rgba(2, 132, 199, 0.25);
  color: #7dd3fc;
  font-weight: 700;
  border-color: rgba(2, 132, 199, 0.45);
}

.room-name-primary {
  font-size: 0.95rem;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.25;
}

.room-placement-badges {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* Ghost activity banner in background */
.room-placement-ghost-activity {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px dashed rgba(2, 132, 199, 0.4);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  font-size: 0.76rem;
  color: #cbd5e1;
  z-index: 1;
  backdrop-filter: blur(4px);
}

.ghost-tag {
  color: #38bdf8;
  font-weight: 600;
  opacity: 0.9;
}

.ghost-name {
  font-weight: 600;
  color: #e2e8f0;
  opacity: 0.9;
}

.participant-preview-names {
  font-size: 0.72rem;
  color: #bae6fd;
  font-weight: 600;
  background: rgba(2, 132, 199, 0.25);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.participant-mode-toggle-btn {
  background: rgba(2, 132, 199, 0.1);
  color: #38bdf8;
  border: 1px solid rgba(2, 132, 199, 0.35);
  font-weight: 600;
}

.participant-mode-toggle-btn:hover {
  background: rgba(2, 132, 199, 0.2);
  border-color: #0284c7;
  color: #7dd3fc;
}

.participant-mode-toggle-btn.active {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  color: #ffffff;
  border-color: #0369a1;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);
}

/* Collapsed Summary Badges */
.anim-collapsed-summary {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  cursor: pointer;
  padding-top: 0.1rem;
}

.collapsed-badges-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.12rem 0.4rem;
  border-radius: 5px;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}

.summary-badge.loc-badge {
  background: rgba(22, 163, 74, 0.15);
  color: #86efac;
  border: 1px solid rgba(22, 163, 74, 0.35);
}

.summary-badge.loc-badge.badge-empty {
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  font-weight: 500;
}

.summary-badge.fac-badge {
  background: rgba(37, 99, 235, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(37, 99, 235, 0.35);
}

.summary-badge.fac-badge.badge-empty {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px dashed rgba(245, 158, 11, 0.35);
  font-weight: 500;
}

.summary-badge.part-badge {
  border: 1px solid transparent;
}

.summary-badge.part-badge.cap-good {
  background: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.35);
}

.summary-badge.part-badge.cap-full {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.35);
}

.summary-badge.part-badge.cap-low {
  background: rgba(245, 158, 11, 0.18);
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.35);
}

.summary-badge.part-badge.cap-overload {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.35);
}

/* Expanded body animations */
.anim-expanded-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  animation: animFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes animFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.time-and-tag {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-chip {
  font-size: 0.75rem;
  font-weight: 700;
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
}

.category-tag-chip {
  font-size: 0.68rem;
  font-weight: 600;
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.2);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  align-self: flex-start;
}

.card-quick-actions {
  display: flex;
  gap: 2px;
}

.card-action-btn {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  padding: 0.2rem;
  cursor: pointer;
  opacity: 0.7;
  color: #cbd5e1;
  border-radius: 4px;
  transition: all 0.2s;
}

.card-action-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.anim-title-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.anim-icon {
  font-size: 1rem;
}

.anim-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.25;
}

.slot-conflict-alert {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fcd34d;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.45rem;
  border-radius: 6px;
}

/* Sections inside card (Location, Facilitators, Participants) */
.anim-section {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label-text {
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}

.count-badge {
  font-size: 0.68rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
}

/* Location chip */
.location-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.25rem 0.45rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #f8fafc;
}

.loc-cap {
  font-size: 0.68rem;
  color: #94a3b8;
}

/* Chips list */
.facilitators-chips-list, .participants-chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.person-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  transition: all 0.2s;
}

.facilitator-chip {
  background: rgba(37, 99, 235, 0.2);
  border: 1px solid rgba(37, 99, 235, 0.35);
  color: #93c5fd;
}

.participant-chip {
  background: rgba(22, 163, 74, 0.2);
  border: 1px solid rgba(22, 163, 74, 0.35);
  color: #86efac;
}

.person-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.remove-chip-btn, .clear-chip-btn {
  background: transparent;
  border: none;
  font-size: 0.68rem;
  cursor: pointer;
  opacity: 0.6;
  padding: 0 0.15rem;
  border-radius: 3px;
  color: inherit;
}

.remove-chip-btn:hover, .clear-chip-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
}

.conflict-warn-dot {
  font-size: 0.7rem;
  cursor: help;
}

.empty-assignment-slot {
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.35rem 0.45rem;
  text-align: center;
  font-size: 0.72rem;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.2);
}

/* Capacity gauge */
.capacity-gauge-pill {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.capacity-progress-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.capacity-progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.cap-low, .capacity-gauge-pill.cap-low {
  background: rgba(245, 158, 11, 0.18);
  color: #fcd34d;
}
.capacity-progress-fill.cap-low {
  background: #f59e0b;
}

.cap-good, .capacity-gauge-pill.cap-good {
  background: rgba(16, 185, 129, 0.18);
  color: #6ee7b7;
}
.capacity-progress-fill.cap-good {
  background: #10b981;
}

.cap-full, .capacity-gauge-pill.cap-full {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}
.capacity-progress-fill.cap-full {
  background: #3b82f6;
}

.cap-overload, .capacity-gauge-pill.cap-overload {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}
.capacity-progress-fill.cap-overload {
  background: #ef4444;
}

/* Column bottom add area */
.column-bottom-add-zone {
  margin: 0 0.65rem 0.65rem 0.65rem;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.74rem;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.2s;
}

.column-bottom-add-zone:hover {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.35);
  color: #c7d2fe;
}

/* ──────────────── DAY VIEW ──────────────── */
.day-detail-board {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.day-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--panel-bg-solid, #0f172a);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  padding: 1rem 1.25rem;
  border-radius: 12px;
}

.day-badge-large {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
}

.day-large-name {
  font-size: 1.3rem;
  font-weight: 800;
  text-transform: capitalize;
  color: #f8fafc;
}

.day-large-date {
  font-size: 1rem;
  color: #94a3b8;
  font-weight: 600;
}

.day-stats-pills {
  display: flex;
  gap: 0.5rem;
}

.stat-pill {
  background: rgba(255, 255, 255, 0.06);
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.day-slots-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.day-slot-expanded-card {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.day-slot-expanded-card.is-collapsed {
  padding: 0.9rem 1.2rem;
  gap: 0.5rem;
  border-left: 4px solid #6366f1;
}

.day-slot-expanded-card.is-collapsed:hover {
  border-color: #818cf8;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.2);
}

.day-collapsed-badges-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.toggle-day-slot-btn {
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: #a5b4fc;
  font-size: 0.8rem;
}

.toggle-day-slot-btn:hover {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}

.day-slot-expanded-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: animFadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-main-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.time-badge-large {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-weight: 700;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.duration-pill {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  color: #cbd5e1;
}

.title-and-tags-large {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-grow: 1;
}

.anim-heading {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #f8fafc;
}

.tags-row {
  display: flex;
  gap: 0.5rem;
}

.rules-tag-chip {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  color: #cbd5e1;
  font-weight: 600;
}

.expanded-middle-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .expanded-middle-row {
    grid-template-columns: 1fr;
  }
}

.location-box, .facilitators-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.box-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}

.expanded-participants-section {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.large-grid {
  gap: 0.5rem;
}

.person-chip.large {
  padding: 0.35rem 0.7rem;
  font-size: 0.85rem;
}

/* ──────────────── MONTH VIEW ──────────────── */
.month-calendar-board {
  background: var(--panel-bg-solid, #0f172a);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.month-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-weight: 700;
  color: #94a3b8;
  font-size: 0.85rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.month-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding-top: 4px;
}

.month-day-cell {
  min-height: 90px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(15, 23, 42, 0.5);
}

.month-day-cell:hover {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(99, 102, 241, 0.4);
}

.month-day-cell.is-today {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
}

.month-day-cell.other-month {
  opacity: 0.35;
}

.month-cell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cell-day-num {
  font-size: 0.8rem;
  font-weight: 700;
  color: #f8fafc;
}

.month-slot-count-badge {
  font-size: 0.68rem;
  background: #4f46e5;
  color: #ffffff;
  padding: 0.05rem 0.35rem;
  border-radius: 10px;
  font-weight: 700;
}

.month-slots-preview {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.month-slot-pill {
  font-size: 0.68rem;
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 3px;
}

.pill-dot {
  font-size: 0.5rem;
}

.month-more-pill {
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: 600;
}

.entity-search-box,
.quick-add-search-box {
  position: relative;
  margin-bottom: 0.65rem;
}

.entity-search-input,
.quick-add-search-input {
  width: 100%;
  padding: 0.45rem 1.8rem 0.45rem 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 0.82rem;
  background: rgba(0, 0, 0, 0.35);
  color: #ffffff;
  outline: none;
}

.entity-search-input:focus,
.quick-add-search-input:focus {
  border-color: #0d9488;
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.25);
}

.participant-filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 0.75rem;
}

.filter-pill-btn {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-pill-btn:hover {
  background: rgba(13, 148, 136, 0.15);
  color: #5eead4;
  border-color: rgba(13, 148, 136, 0.4);
}

.filter-pill-btn.active {
  background: #0d9488;
  color: #ffffff;
  border-color: #5eead4;
}

.filter-pill-btn.highlight-pill {
  border-color: rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

.filter-pill-btn.highlight-pill.active {
  background: #f59e0b;
  color: #ffffff;
}

.inline-entity-meta {
  display: block;
  margin-top: 0.15rem;
  color: #94a3b8;
  font-size: 0.65rem;
  font-weight: 500;
}

/* ──────────────── MODALS ──────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(11, 19, 32, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-card {
  background: #0f172a !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 16px;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  color: #f8fafc;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #ffffff;
}

.close-modal-btn {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #94a3b8;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  transition: all 0.15s;
}

.close-modal-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.modal-form {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
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

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-input {
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  font-size: 0.9rem;
  background: rgba(0, 0, 0, 0.35);
  color: #ffffff;
  color-scheme: dark;
  outline: none;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: #0d9488;
  background: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.25);
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
select.form-input optgroup,
.form-input option {
  background-color: #0f172a !important;
  color: #f8fafc !important;
  padding: 8px 12px;
}

.form-hint {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

.target-days-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.75rem;
  border-radius: 8px;
  max-height: 180px;
  overflow-y: auto;
}

/* Time Presets */
.time-presets-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: rgba(13, 148, 136, 0.08);
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(13, 148, 136, 0.25);
}

.presets-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #5eead4;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.presets-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.preset-pill-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-pill-btn:hover {
  background: rgba(13, 148, 136, 0.2);
  border-color: rgba(13, 148, 136, 0.5);
  color: #5eead4;
}

.preset-pill-btn.active {
  background: #0d9488;
  color: #ffffff;
  border-color: #5eead4;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.35);
}

.multi-select-box {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  background: rgba(0, 0, 0, 0.3);
}

.scrollable-select {
  max-height: 180px;
  overflow-y: auto;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.85rem;
  color: #f1f5f9;
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  border-radius: 4px;
  transition: background 0.15s;
}

.checkbox-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.slot-inherited-info {
  background: rgba(59, 130, 246, 0.12);
  border: 1px dashed rgba(59, 130, 246, 0.35);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #93c5fd;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label-with-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-links {
  display: flex;
  gap: 0.5rem;
}

.link-btn {
  background: transparent;
  border: none;
  color: #5eead4;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.link-btn:hover {
  color: #ffffff;
}

.modal-actions-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* DATE MODE SELECTOR & RANGE BOX */
.date-mode-toggle-group {
  display: flex;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 3px;
  gap: 4px;
}

.date-mode-btn {
  flex: 1;
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.55rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.date-mode-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.05);
}

.date-mode-btn.active {
  background: #0d9488;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.35);
}

.range-date-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.range-date-box {
  background: rgba(13, 148, 136, 0.05);
  border: 1px solid rgba(13, 148, 136, 0.22);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.days-selector-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.days-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.days-selector-header label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
}

.days-quick-presets {
  display: flex;
  gap: 0.35rem;
}

.preset-pill-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  font-size: 0.72rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-pill-btn:hover {
  background: rgba(13, 148, 136, 0.25);
  color: #5eead4;
  border-color: rgba(13, 148, 136, 0.5);
}

.days-checkbox-pills {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.day-pill-toggle {
  flex: 1;
  min-width: 38px;
  padding: 0.45rem 0.2rem;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-pill-toggle:hover {
  border-color: rgba(94, 234, 212, 0.4);
  color: #f8fafc;
}

.day-pill-toggle.active {
  background: rgba(13, 148, 136, 0.3);
  border-color: #0d9488;
  color: #5eead4;
  font-weight: 700;
  box-shadow: inset 0 0 8px rgba(13, 148, 136, 0.2);
}

.day-pill-toggle.weekend.active {
  background: rgba(245, 158, 11, 0.25);
  border-color: #f59e0b;
  color: #fcd34d;
}

.range-summary-banner {
  padding: 0.65rem 0.85rem;
  border-radius: 6px;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.range-summary-banner.has-dates {
  background: rgba(13, 148, 136, 0.15);
  border: 1px solid rgba(13, 148, 136, 0.35);
  color: #ccfbf1;
}

.range-summary-banner.no-dates {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
}

.range-summary-banner .summary-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.range-summary-banner .summary-icon {
  font-size: 1.1rem;
}

.summary-detail {
  margin: 0.2rem 0 0 0;
  font-size: 0.74rem;
  opacity: 0.85;
}

.range-mode-hint {
  font-size: 0.75rem;
  color: #5eead4;
  background: rgba(13, 148, 136, 0.1);
  border: 1px dashed rgba(13, 148, 136, 0.3);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  margin: 0;
}

/* FLOATING BACKGROUND JOB CARD */
.background-job-card {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 99999;
  background: #0f172a;
  border: 1.5px solid #0d9488;
  border-radius: 12px;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.65), 0 0 20px rgba(13, 148, 136, 0.3);
  padding: 1rem 1.25rem;
  min-width: 320px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  backdrop-filter: blur(10px);
}

.job-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.job-spinner {
  width: 1.35rem;
  height: 1.35rem;
  border: 2.5px solid rgba(94, 234, 212, 0.2);
  border-top-color: #5eead4;
  border-radius: 50%;
  animation: jobSpinner 0.8s linear infinite;
  flex-shrink: 0;
}

.job-title-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.job-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.job-title-row strong {
  font-size: 0.85rem;
  color: #f8fafc;
}

.job-percentage {
  font-size: 0.82rem;
  font-weight: 700;
  color: #5eead4;
}

.job-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.job-progress-bar-bg {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  overflow: hidden;
}

.job-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0d9488, #5eead4);
  border-radius: 999px;
  transition: width 0.25s ease;
}

.job-fade-enter-active,
.job-fade-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.job-fade-enter-from,
.job-fade-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

@keyframes jobSpinner {
  to { transform: rotate(360deg); }
}

/* ──────────────── PRINT STYLES ──────────────── */
.only-print {
  display: none;
}

@media print {
  .no-print {
    display: none !important;
  }
  .only-print {
    display: block !important;
  }
  .main-planning-layout {
    grid-template-columns: 1fr !important;
  }
  .week-columns-grid {
    grid-template-columns: repeat(7, 1fr) !important;
    gap: 4px !important;
  }
  .day-kanban-column {
    min-height: auto !important;
    border: 1px solid #000000 !important;
    box-shadow: none !important;
  }
  .animation-card {
    border: 1px solid #666666 !important;
    box-shadow: none !important;
    page-break-inside: avoid;
    padding: 0.5rem !important;
  }
  .anim-expanded-body,
  .day-slot-expanded-body {
    display: flex !important;
  }
}
</style>
