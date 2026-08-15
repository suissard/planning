<template>
  <div class="animations-planning-root printable-animations-planning" :class="{ 'is-dragging-active': !!activeDragType, ['drag-' + activeDragType]: !!activeDragType }">
    
    <!-- ════════════════ TOP HEADER CONTROLS (NO PRINT) ════════════════ -->
    <div class="view-header no-print">
      <div class="header-main">
        <div class="header-title-wrapper">
          <div class="header-icon-box">🎯</div>
          <div>
            <div class="title-with-pill">
              <h2>Planning des Animations & Activités</h2>
              <span class="mode-tag-pill">Admin</span>
              <span class="dnd-badge-pill">✨ Glisser-Déposer Actif</span>
            </div>
            <p class="subtitle">
              Planifiez facilement votre semaine : glissez des activités sur les jours, assignez des animateurs, des salles et inscrivez les bénéficiaires.
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

          <button type="button" class="action-btn primary-btn" @click="openCreateModal()" title="Créer un créneau d'animation">
            ➕ Nouvelle Animation
          </button>

          <button type="button" class="tool-btn duplicate-btn" @click="openDuplicateModal" title="Dupliquer les animations vers d'autres dates">
            📋 Dupliquer
          </button>

          <button type="button" class="tool-btn shortcut-btn" @click="$emit('navigate', 'room-sessions')" title="Accéder directement à l'ouverture des salles">
            🚪 Ouverture Salles
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

    <!-- ════════════════ MAIN CONTENT AREA WITH OPTIONAL SIDE PALETTE ════════════════ -->
    <div class="main-planning-layout" :class="{ 'has-open-palette': isPaletteOpen }">
      
      <!-- ──────────────── CENTRAL PLANNING CANVAS ──────────────── -->
      <div class="planning-canvas-container">
        
        <!-- LOADING SPINNER -->
        <div v-if="schedulerStore.loading" class="loading-state">
          <div class="spinner"></div>
          <p>Chargement des animations...</p>
        </div>

        <!-- ────────── VIEW 1: WEEK VIEW (COLUMNS KANBAN D&D) ────────── -->
        <div v-else-if="viewMode === 'week'" class="week-kanban-board">
          <div class="week-columns-grid">
            <div 
              v-for="day in weekDaysList" 
              :key="day.dateStr" 
              class="day-kanban-column"
              :class="{ 
                'is-today': day.isToday, 
                'is-weekend': day.isWeekend,
                'drop-active-column': activeDragType === 'activity'
              }"
              @dragover.prevent="onDragOver($event, ['activity'])"
              @dragleave="onDragLeave($event)"
              @drop.prevent="onDropOnDay($event, day)"
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
                <!-- Drop invitation prompt at top of day column if dragging an activity -->
                <div 
                  v-if="activeDragType === 'activity'" 
                  class="drop-placeholder-zone activity-drop-placeholder"
                  @dragover.prevent="onDragOver($event, ['activity'])"
                  @drop.prevent="onDropOnDay($event, day)"
                >
                  📥 Déposer l'activité pour {{ day.dayName }}
                </div>

                <!-- Empty Day State (Clickable & Quick Action) -->
                <div 
                  v-if="day.slots.length === 0 && activeDragType !== 'activity'" 
                  class="empty-day-state clickable-empty-day"
                  @click="openCreateModal({ date: day.dateStr })"
                  title="Cliquer pour créer un créneau d'animation ou glisser une activité"
                >
                  <span class="empty-day-icon">🏖️</span>
                  <p class="empty-day-text">Aucune animation</p>
                  <button type="button" class="quick-add-slot-btn no-print" @click.stop="openCreateModal({ date: day.dateStr })">
                    ➕ Créer un créneau
                  </button>
                  <small class="empty-day-subtext">ou glissez une activité ici</small>
                </div>

                <!-- Animation Slot Cards -->
                <div 
                  v-for="slot in day.slots" 
                  :key="slot.documentId || slot.id" 
                  class="animation-card"
                  :class="{
                    'has-conflict': slotConflicts(slot).length > 0,
                    'is-under-min': isUnderMinParticipants(slot),
                    'is-over-max': isOverMaxParticipants(slot),
                    'is-full': isFullParticipants(slot),
                    'highlighted-card': highlightedSlotId === (slot.documentId || slot.id)
                  }"
                  :id="'slot-card-' + (slot.documentId || slot.id)"
                  @dragover.prevent="onDragOver($event, ['activity', 'facilitator', 'participant', 'location'])"
                  @dragleave="onDragLeave($event)"
                  @drop.prevent="onDropOnCard($event, slot)"
                >
                  <!-- Card Header: Time, Title, Tag & Actions -->
                  <div class="anim-card-header">
                    <div class="time-and-tag">
                      <span class="time-chip" title="Horaire de l'animation">
                        🕒 {{ formatSlotTimeRange(slot.startDate, slot.endDate) }}
                      </span>
                      <span v-if="getActivityTag(slot)" class="category-tag-chip">
                        {{ getActivityTag(slot) }}
                      </span>
                    </div>

                    <div class="card-quick-actions no-print">
                      <button 
                        type="button" 
                        class="card-action-btn edit-btn" 
                        @click="openEditModal(slot)" 
                        title="Modifier l'animation"
                      >
                        ✏️
                      </button>
                      <button 
                        type="button" 
                        class="card-action-btn delete-btn" 
                        @click="confirmDeleteSlot(slot)" 
                        title="Supprimer l'animation"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <!-- Activity Name & Duration -->
                  <div class="anim-title-row">
                    <span class="anim-icon">🎯</span>
                    <strong class="anim-name">{{ slot.activityTemplate?.name || 'Activité sans nom' }}</strong>
                  </div>

                  <!-- Conflict Warning Alert Banner -->
                  <div v-if="slotConflicts(slot).length > 0" class="slot-conflict-alert" :title="slotConflicts(slot).join('\n')">
                    ⚠️ {{ slotConflicts(slot)[0] }}
                  </div>

                  <!-- ──────── LOCATION TARGET ──────── -->
                  <div 
                    class="anim-section location-section"
                    :class="{ 'drop-target-active': activeDragType === 'location' }"
                    @dragover.prevent="onDragOver($event, ['location'])"
                    @dragleave="onDragLeave($event)"
                    @drop.prevent="onDropOnSlot($event, slot, 'location')"
                  >
                    <div class="section-label-row">
                      <span class="label-text">📍 Salle / Lieu</span>
                      <button 
                        v-if="slot.location" 
                        type="button" 
                        class="clear-chip-btn no-print" 
                        @click="clearSlotLocation(slot)" 
                        title="Retirer la salle"
                      >✕</button>
                    </div>

                    <div v-if="slot.location" class="location-chip">
                      <span class="loc-name">{{ slot.location.name }}</span>
                      <span v-if="slot.location.capacity" class="loc-cap">Max {{ slot.location.capacity }}p</span>
                    </div>
                    <div v-else class="empty-drop-slot location-drop-slot">
                      <span class="drop-invite-text">👉 Glisser une salle ici</span>
                    </div>
                  </div>

                  <!-- ──────── FACILITATORS (ANIMATEURS) TARGET ──────── -->
                  <div 
                    class="anim-section facilitators-section"
                    :class="{ 'drop-target-active': activeDragType === 'facilitator' }"
                    @dragover.prevent="onDragOver($event, ['facilitator'])"
                    @dragleave="onDragLeave($event)"
                    @drop.prevent="onDropOnSlot($event, slot, 'facilitator')"
                  >
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
                        draggable="true"
                        @dragstart="onDragStart($event, { type: 'facilitator', data: fac, fromSlotId: slot.documentId || slot.id })"
                        @dragend="onDragEnd($event)"
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
                        >✕</button>
                      </div>
                    </div>

                    <!-- Drop invite if no facilitator -->
                    <div v-else class="empty-drop-slot facilitator-drop-slot">
                      <span class="drop-invite-text">👉 Glisser un animateur ici</span>
                    </div>
                  </div>

                  <!-- ──────── PARTICIPANTS (BÉNÉFICIAIRES) TARGET ──────── -->
                  <div 
                    class="anim-section participants-section"
                    :class="{ 'drop-target-active': activeDragType === 'participant' }"
                    @dragover.prevent="onDragOver($event, ['participant'])"
                    @dragleave="onDragLeave($event)"
                    @drop.prevent="onDropOnSlot($event, slot, 'participant')"
                  >
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
                        draggable="true"
                        @dragstart="onDragStart($event, { type: 'participant', data: part, fromSlotId: slot.documentId || slot.id })"
                        @dragend="onDragEnd($event)"
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

                    <!-- Drop Target Prompt -->
                    <div class="participants-drop-zone-cta">
                      <span class="drop-cta-text">📥 Glisser des bénéficiaires ici</span>
                    </div>
                  </div>

                </div>
              </div>

              <!-- Bottom Add Area on Column -->
              <div 
                class="column-bottom-add-zone"
                @dragover.prevent="onDragOver($event, ['activity'])"
                @drop.prevent="onDropOnDay($event, day)"
                @click="openCreateModal({ date: day.dateStr })"
              >
                <span>➕ Ajouter / Glisser une activité</span>
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

          <!-- Day Drop Banner for Activity -->
          <div 
            class="day-full-drop-banner"
            :class="{ 'drop-active': activeDragType === 'activity' }"
            @dragover.prevent="onDragOver($event, ['activity'])"
            @dragleave="onDragLeave($event)"
            @drop.prevent="onDropOnDay($event, selectedDayObject)"
          >
            <span>🎯 Glissez une activité ici pour la planifier ce {{ selectedDayObject.dayName }} {{ selectedDayObject.dayNumber }} {{ selectedDayObject.monthFull }}</span>
          </div>

          <!-- Empty State in Day View -->
          <div v-if="selectedDaySlots.length === 0" class="empty-state-large">
            <span class="empty-icon-large">🏖️</span>
            <h3>Aucune animation programmée pour cette journée</h3>
            <p>Glissez une activité depuis la palette latérale à droite ou cliquez sur le bouton ci-dessous.</p>
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
                'has-conflict': slotConflicts(slot).length > 0,
                'is-under-min': isUnderMinParticipants(slot),
                'is-over-max': isOverMaxParticipants(slot),
                'is-full': isFullParticipants(slot)
              }"
            >
              <div class="card-main-info">
                <div class="time-badge-large">
                  <span class="time-clock">🕒</span>
                  <span class="time-range-text">{{ formatSlotTimeRange(slot.startDate, slot.endDate) }}</span>
                  <span class="duration-pill">{{ getSlotDurationMinutes(slot) }} min</span>
                </div>

                <div class="title-and-tags-large">
                  <h3 class="anim-heading">{{ slot.activityTemplate?.name || 'Activité' }}</h3>
                  <div class="tags-row">
                    <span v-if="getActivityTag(slot)" class="category-tag-chip">{{ getActivityTag(slot) }}</span>
                    <span class="rules-tag-chip">Min: {{ getMinParticipants(slot) }} • Max: {{ getMaxParticipants(slot) }}</span>
                  </div>
                </div>

                <div class="card-actions-top no-print">
                  <button type="button" class="tool-btn" @click="openEditModal(slot)">✏️ Modifier</button>
                  <button type="button" class="tool-btn danger-tool-btn" @click="confirmDeleteSlot(slot)">🗑️ Supprimer</button>
                </div>
              </div>

              <!-- Location & Facilitators Row -->
              <div class="expanded-middle-row">
                <!-- Location Target -->
                <div 
                  class="location-box"
                  :class="{ 'drop-target-active': activeDragType === 'location' }"
                  @dragover.prevent="onDragOver($event, ['location'])"
                  @dragleave="onDragLeave($event)"
                  @drop.prevent="onDropOnSlot($event, slot, 'location')"
                >
                  <span class="box-title">📍 Salle / Lieu</span>
                  <div v-if="slot.location" class="location-chip large">
                    <strong>{{ slot.location.name }}</strong>
                    <span v-if="slot.location.capacity" class="cap-text">Capacité: {{ slot.location.capacity }}</span>
                    <button type="button" class="remove-chip-btn no-print" @click="clearSlotLocation(slot)">✕</button>
                  </div>
                  <div v-else class="empty-drop-slot">
                    <span>👉 Glisser une salle ici</span>
                  </div>
                </div>

                <!-- Facilitators Target -->
                <div 
                  class="facilitators-box"
                  :class="{ 'drop-target-active': activeDragType === 'facilitator' }"
                  @dragover.prevent="onDragOver($event, ['facilitator'])"
                  @dragleave="onDragLeave($event)"
                  @drop.prevent="onDropOnSlot($event, slot, 'facilitator')"
                >
                  <span class="box-title">👨‍🏫 Animateur(s) ({{ (slot.facilitators || []).length }})</span>
                  <div class="facilitators-chips-list" v-if="slot.facilitators && slot.facilitators.length > 0">
                    <div 
                      v-for="fac in slot.facilitators" 
                      :key="fac.documentId || fac.id" 
                      class="person-chip facilitator-chip large"
                      draggable="true"
                      @dragstart="onDragStart($event, { type: 'facilitator', data: fac, fromSlotId: slot.documentId || slot.id })"
                      @dragend="onDragEnd($event)"
                    >
                      <span class="person-name">{{ fac.firstName }} {{ fac.lastName }}</span>
                      <span v-if="getPersonSlotConflict(fac, slot, 'facilitator')" class="conflict-warn-dot" :title="getPersonSlotConflict(fac, slot, 'facilitator')">⚠️</span>
                      <button type="button" class="remove-chip-btn no-print" @click.stop="removeFacilitator(slot, fac)">✕</button>
                    </div>
                  </div>
                  <div v-else class="empty-drop-slot">
                    <span>👉 Glisser un animateur ici</span>
                  </div>
                </div>
              </div>

              <!-- Participants Section -->
              <div 
                class="expanded-participants-section"
                :class="{ 'drop-target-active': activeDragType === 'participant' }"
                @dragover.prevent="onDragOver($event, ['participant'])"
                @dragleave="onDragLeave($event)"
                @drop.prevent="onDropOnSlot($event, slot, 'participant')"
              >
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
                    draggable="true"
                    @dragstart="onDragStart($event, { type: 'participant', data: part, fromSlotId: slot.documentId || slot.id })"
                    @dragend="onDragEnd($event)"
                  >
                    <span class="person-avatar">👤</span>
                    <span class="person-name">{{ part.firstName }} {{ part.lastName }}</span>
                    <span v-if="getPersonSlotConflict(part, slot, 'participant')" class="conflict-warn-dot" :title="getPersonSlotConflict(part, slot, 'participant')">⚠️</span>
                    <button type="button" class="remove-chip-btn no-print" @click.stop="removeParticipant(slot, part)">✕</button>
                  </div>
                </div>

                <div class="participants-drop-zone-cta large-cta">
                  <span>📥 Glisser des bénéficiaires ici depuis la palette ou une autre animation</span>
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

      <!-- ──────────────── DOCKABLE SIDE PALETTE (DRAG & DROP PALETTE) ──────────────── -->
      <aside class="side-dnd-palette no-print" v-show="isPaletteOpen">
        <!-- Palette Header with Tabs -->
        <div class="palette-header">
          <div class="palette-title-row">
            <h3>✨ Palette Drag & Drop</h3>
            <button type="button" class="close-palette-btn" @click="isPaletteOpen = false" title="Fermer la palette">✕</button>
          </div>
          <p class="palette-subtitle">Attrapez un élément et déposez-le sur le planning :</p>

          <!-- Palette Navigation Tabs -->
          <div class="palette-tabs">
            <button 
              type="button" 
              class="palette-tab-btn" 
              :class="{ active: paletteTab === 'activities' }" 
              @click="paletteTab = 'activities'"
            >
              🎯 Activités <span class="tab-count-badge">{{ activities.length }}</span>
            </button>
            <button 
              type="button" 
              class="palette-tab-btn" 
              :class="{ active: paletteTab === 'facilitators' }" 
              @click="paletteTab = 'facilitators'"
            >
              👨‍🏫 Animateurs <span class="tab-count-badge">{{ facilitators.length }}</span>
            </button>
            <button 
              type="button" 
              class="palette-tab-btn" 
              :class="{ active: paletteTab === 'participants' }" 
              @click="paletteTab = 'participants'"
            >
              👥 Bénéficiaires <span class="tab-count-badge">{{ participants.length }}</span>
            </button>
            <button 
              type="button" 
              class="palette-tab-btn" 
              :class="{ active: paletteTab === 'locations' }" 
              @click="paletteTab = 'locations'"
            >
              📍 Salles <span class="tab-count-badge">{{ locations.length }}</span>
            </button>
          </div>
        </div>

        <!-- Palette Tab Content Area -->
        <div class="palette-content-scroll">
          
          <!-- ─── TAB 1: ACTIVITIES ─── -->
          <div v-if="paletteTab === 'activities'" class="palette-tab-pane">
            <div class="palette-search-box">
              <input 
                type="text" 
                v-model="activitySearchQuery" 
                placeholder="🔍 Rechercher une activité..."
                class="palette-search-input"
              />
              <button v-if="activitySearchQuery" class="clear-search-btn" @click="activitySearchQuery = ''">✕</button>
            </div>

            <!-- Activities Draggable List -->
            <div class="palette-items-list">
              <div 
                v-for="act in filteredPaletteActivities" 
                :key="act.documentId || act.id" 
                class="draggable-palette-item activity-palette-item"
                draggable="true"
                @dragstart="onDragStart($event, { type: 'activity', data: act })"
                @dragend="onDragEnd($event)"
              >
                <div class="item-drag-handle">⠿</div>
                <div class="item-info">
                  <div class="item-header-row">
                    <strong class="item-title">🎯 {{ act.name }}</strong>
                    <span class="duration-badge">⏱️ {{ act.standardDuration || 60 }} min</span>
                  </div>
                  <div class="item-meta-row">
                    <span class="rule-chip">👥 {{ act.minParticipants || 0 }}-{{ act.maxParticipants || 10 }} pers.</span>
                    <span v-if="getActivityTag({ activityTemplate: act })" class="tag-chip">
                      {{ getActivityTag({ activityTemplate: act }) }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="filteredPaletteActivities.length === 0" class="palette-empty-search">
                <p>Aucune activité trouvée</p>
              </div>
            </div>
          </div>

          <!-- ─── TAB 2: FACILITATORS ─── -->
          <div v-if="paletteTab === 'facilitators'" class="palette-tab-pane">
            <div class="palette-search-box">
              <input 
                type="text" 
                v-model="facilitatorSearchQuery" 
                placeholder="🔍 Rechercher un animateur..."
                class="palette-search-input"
              />
              <button v-if="facilitatorSearchQuery" class="clear-search-btn" @click="facilitatorSearchQuery = ''">✕</button>
            </div>

            <!-- Facilitators Draggable List -->
            <div class="palette-items-list">
              <div 
                v-for="fac in filteredPaletteFacilitators" 
                :key="fac.documentId || fac.id" 
                class="draggable-palette-item facilitator-palette-item"
                draggable="true"
                @dragstart="onDragStart($event, { type: 'facilitator', data: fac })"
                @dragend="onDragEnd($event)"
              >
                <div class="item-drag-handle">⠿</div>
                <div class="item-info">
                  <div class="item-header-row">
                    <strong class="item-title">👨‍🏫 {{ fac.firstName }} {{ fac.lastName }}</strong>
                    <span class="availability-badge" :class="getFacilitatorAvailabilityClass(fac)">
                      {{ getFacilitatorAvailabilityLabel(fac) }}
                    </span>
                  </div>
                  <div class="item-meta-row">
                    <span class="subtext-chip">📅 {{ getFacilitatorWeeklySlotsCount(fac) }} anim. cette semaine</span>
                  </div>
                </div>
              </div>

              <div v-if="filteredPaletteFacilitators.length === 0" class="palette-empty-search">
                <p>Aucun animateur trouvé</p>
              </div>
            </div>
          </div>

          <!-- ─── TAB 3: PARTICIPANTS ─── -->
          <div v-if="paletteTab === 'participants'" class="palette-tab-pane">
            <div class="palette-search-box">
              <input 
                type="text" 
                v-model="participantSearchQuery" 
                placeholder="🔍 Rechercher un bénéficiaire..."
                class="palette-search-input"
              />
              <button v-if="participantSearchQuery" class="clear-search-btn" @click="participantSearchQuery = ''">✕</button>
            </div>

            <!-- Participant Fast Filter Pills -->
            <div class="participant-filter-pills">
              <button 
                type="button" 
                class="filter-pill-btn" 
                :class="{ active: participantFilterMode === 'all' }" 
                @click="participantFilterMode = 'all'"
              >
                Tous ({{ participants.length }})
              </button>
              <button 
                type="button" 
                class="filter-pill-btn highlight-pill" 
                :class="{ active: participantFilterMode === 'unassigned_week' }" 
                @click="participantFilterMode = 'unassigned_week'"
                title="Bénéficiaires sans aucune animation cette semaine"
              >
                ⚡ Non inscrits ({{ unassignedWeeklyParticipantsCount }})
              </button>
              <button 
                type="button" 
                class="filter-pill-btn" 
                :class="{ active: participantFilterMode === 'available_today' }" 
                @click="participantFilterMode = 'available_today'"
              >
                ✅ Dispos ce jour
              </button>
            </div>

            <!-- Participants Draggable List -->
            <div class="palette-items-list">
              <div 
                v-for="part in filteredPaletteParticipants" 
                :key="part.documentId || part.id" 
                class="draggable-palette-item participant-palette-item"
                draggable="true"
                @dragstart="onDragStart($event, { type: 'participant', data: part })"
                @dragend="onDragEnd($event)"
              >
                <div class="item-drag-handle">⠿</div>
                <div class="item-info">
                  <div class="item-header-row">
                    <strong class="item-title">👤 {{ part.firstName }} {{ part.lastName }}</strong>
                    <span class="weekly-presence-pill" :class="{ 'zero-count': getParticipantWeeklySlotsCount(part) === 0 }">
                      📅 {{ getParticipantWeeklySlotsCount(part) }} anim./sem.
                    </span>
                  </div>
                  <div class="item-meta-row">
                    <span class="availability-badge small" :class="getParticipantTodayAvailabilityClass(part)">
                      {{ getParticipantTodayAvailabilityLabel(part) }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="filteredPaletteParticipants.length === 0" class="palette-empty-search">
                <p>Aucun bénéficiaire correspondant aux filtres</p>
              </div>
            </div>
          </div>

          <!-- ─── TAB 4: LOCATIONS ─── -->
          <div v-if="paletteTab === 'locations'" class="palette-tab-pane">
            <div class="palette-search-box">
              <input 
                type="text" 
                v-model="locationSearchQuery" 
                placeholder="🔍 Rechercher une salle..."
                class="palette-search-input"
              />
              <button v-if="locationSearchQuery" class="clear-search-btn" @click="locationSearchQuery = ''">✕</button>
            </div>

            <!-- Locations Draggable List -->
            <div class="palette-items-list">
              <div 
                v-for="loc in filteredPaletteLocations" 
                :key="loc.documentId || loc.id" 
                class="draggable-palette-item location-palette-item"
                draggable="true"
                @dragstart="onDragStart($event, { type: 'location', data: loc })"
                @dragend="onDragEnd($event)"
              >
                <div class="item-drag-handle">⠿</div>
                <div class="item-info">
                  <div class="item-header-row">
                    <strong class="item-title">📍 {{ loc.name }}</strong>
                    <span v-if="loc.capacity" class="cap-badge">Max {{ loc.capacity }}p</span>
                  </div>
                </div>
              </div>

              <div v-if="filteredPaletteLocations.length === 0" class="palette-empty-search">
                <p>Aucune salle trouvée</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Palette Bottom Trash / Unassign Zone -->
        <div 
          class="palette-trash-zone"
          :class="{ 'drop-trash-hover': activeDragType && isTrashHovered }"
          @dragover.prevent="onTrashDragOver($event)"
          @dragleave="onTrashDragLeave($event)"
          @drop.prevent="onDropOnTrash($event)"
        >
          <span class="trash-icon">🗑️</span>
          <div class="trash-text-block">
            <strong>Zone de désaffectation</strong>
            <small>Glissez un animateur, un résident ou une salle ici pour le retirer</small>
          </div>
        </div>
      </aside>

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
            <select v-model="slotForm.activityTemplate" required class="form-input" @change="onModalActivityChange">
              <option value="" disabled>Sélectionner une activité...</option>
              <option v-for="act in activities" :key="act.documentId || act.id" :value="act.documentId || act.id">
                {{ act.name }} ({{ act.standardDuration || 60 }} min)
              </option>
            </select>
          </div>

          <!-- Date & Time Range -->
          <div class="form-row-2">
            <div class="form-group">
              <label>📅 Date *</label>
              <input type="date" v-model="slotForm.date" required class="form-input" />
            </div>
            <div class="form-group">
              <label>📍 Salle / Lieu</label>
              <select v-model="slotForm.location" class="form-input">
                <option value="">Aucune salle assignée</option>
                <option v-for="loc in locations" :key="loc.documentId || loc.id" :value="loc.documentId || loc.id">
                  {{ loc.name }} (Capacité: {{ loc.capacity || 'N/A' }})
                </option>
              </select>
            </div>
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
            <div class="multi-select-box">
              <label v-for="fac in facilitators" :key="fac.documentId || fac.id" class="checkbox-item">
                <input 
                  type="checkbox" 
                  :value="fac.documentId || fac.id" 
                  v-model="slotForm.facilitators" 
                />
                <span>{{ fac.firstName }} {{ fac.lastName }}</span>
              </label>
            </div>
          </div>

          <!-- Participants Multi-select -->
          <div class="form-group">
            <div class="label-with-actions">
              <label>👥 Bénéficiaires inscrits ({{ slotForm.participants.length }})</label>
              <div class="quick-links">
                <button type="button" class="link-btn" @click="selectAllParticipants">Tous</button>
                <button type="button" class="link-btn" @click="slotForm.participants = []">Aucun</button>
              </div>
            </div>
            <div class="multi-select-box scrollable-select">
              <label v-for="part in participants" :key="part.documentId || part.id" class="checkbox-item">
                <input 
                  type="checkbox" 
                  :value="part.documentId || part.id" 
                  v-model="slotForm.participants" 
                />
                <span>{{ part.firstName }} {{ part.lastName }}</span>
              </label>
            </div>
          </div>

          <div class="modal-actions-footer">
            <button type="button" class="tool-btn" @click="closeSlotModal">Annuler</button>
            <button type="submit" class="action-btn primary-btn" :disabled="isSavingModal">
              {{ isSavingModal ? 'Enregistrement...' : (editingSlotId ? 'Sauvegarder les modifications' : 'Créer l\'animation') }}
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

          <div class="palette-search-box">
            <input 
              type="text" 
              v-model="quickAddSearch" 
              placeholder="🔍 Filtrer les bénéficiaires..."
              class="palette-search-input"
            />
          </div>

          <div class="multi-select-box scrollable-select">
            <label v-for="part in filteredQuickAddParticipants" :key="part.documentId || part.id" class="checkbox-item">
              <input 
                type="checkbox" 
                :value="part.documentId || part.id" 
                v-model="quickAddSelectedIds" 
              />
              <span>{{ part.firstName }} {{ part.lastName }}</span>
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

  </div>
</template>

<script>
import { computed, ref, onMounted } from 'vue';
import { useActiveSchedulerStore } from '../stores/activeScheduler';
import { useGlobalStore } from '../stores/global';
import { checkPersonDateAvailability } from '../utils/availabilityHelper';

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
    const isPaletteOpen = ref(true);
    const paletteTab = ref('activities'); // 'activities' | 'facilitators' | 'participants' | 'locations'
    const highlightedSlotId = ref(null);

    // Search queries in palette
    const activitySearchQuery = ref('');
    const facilitatorSearchQuery = ref('');
    const participantSearchQuery = ref('');
    const locationSearchQuery = ref('');
    const participantFilterMode = ref('all'); // 'all' | 'unassigned_week' | 'available_today'

    // Drag and Drop state
    const activeDragType = ref(null); // 'activity' | 'facilitator' | 'participant' | 'location'
    const draggedItem = ref(null);
    const isTrashHovered = ref(false);

    // Modals state
    const showSlotModal = ref(false);
    const editingSlotId = ref(null);
    const isSavingModal = ref(false);
    const slotForm = ref({
      activityTemplate: '',
      date: '',
      startTime: '10:00',
      endTime: '11:30',
      location: '',
      facilitators: [],
      participants: []
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

    // Weekly presence counts for participants
    const unassignedWeeklyParticipantsCount = computed(() => {
      return props.participants.filter(p => getParticipantWeeklySlotsCount(p) === 0).length;
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

    // Palette filtered lists
    const filteredPaletteActivities = computed(() => {
      const q = activitySearchQuery.value.trim().toLowerCase();
      if (!q) return props.activities;
      return props.activities.filter(a => {
        return (a.name || '').toLowerCase().includes(q) ||
               (Array.isArray(a.tags) && a.tags.some(t => t.toLowerCase().includes(q)));
      });
    });

    const filteredPaletteFacilitators = computed(() => {
      const q = facilitatorSearchQuery.value.trim().toLowerCase();
      if (!q) return props.facilitators;
      return props.facilitators.filter(f => {
        const full = `${f.firstName || ''} ${f.lastName || ''}`.toLowerCase();
        return full.includes(q);
      });
    });

    const filteredPaletteParticipants = computed(() => {
      const q = participantSearchQuery.value.trim().toLowerCase();
      let list = props.participants;

      if (participantFilterMode.value === 'unassigned_week') {
        list = list.filter(p => getParticipantWeeklySlotsCount(p) === 0);
      } else if (participantFilterMode.value === 'available_today') {
        list = list.filter(p => checkPersonDateAvailability(p, currentDateStr.value, 'participant', schedulerStore.timeslots).available);
      }

      if (q) {
        list = list.filter(p => {
          const full = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
          return full.includes(q);
        });
      }
      return list;
    });

    const filteredPaletteLocations = computed(() => {
      const q = locationSearchQuery.value.trim().toLowerCase();
      if (!q) return props.locations;
      return props.locations.filter(l => (l.name || '').toLowerCase().includes(q));
    });

    // ──────────────── DRAG AND DROP HANDLERS ────────────────
    function onDragStart(event, payload) {
      activeDragType.value = payload.type;
      draggedItem.value = payload;
      event.dataTransfer.effectAllowed = 'copyMove';
      event.dataTransfer.setData('application/json', JSON.stringify(payload));
    }

    function onDragEnd() {
      activeDragType.value = null;
      draggedItem.value = null;
      isTrashHovered.value = false;
      document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover'));
    }

    function onDragOver(event, acceptedTypes = []) {
      if (!activeDragType.value) return;
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(activeDragType.value)) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }
      event.dataTransfer.dropEffect = 'copy';
      const target = event.currentTarget;
      if (target) target.classList.add('drop-hover');
    }

    function onDragLeave(event) {
      const target = event.currentTarget;
      if (target) target.classList.remove('drop-hover');
    }

    // Drop on Day Column (Propose to create a new slot with preset activity / person)
    function onDropOnDay(event, dayObj) {
      const target = event.currentTarget;
      if (target) target.classList.remove('drop-hover');

      if (!draggedItem.value) return;
      const { type, data } = draggedItem.value;

      if (type === 'activity') {
        // Propose to create a timeslot with this activity pre-filled for this day
        let suggestedStartTime = '10:00';
        if (dayObj.slots && dayObj.slots.length > 0) {
          const lastSlot = dayObj.slots[dayObj.slots.length - 1];
          if (lastSlot.endDate) {
            const endHour = new Date(lastSlot.endDate).getHours();
            if (endHour <= 12) suggestedStartTime = '14:00';
            else if (endHour <= 15) suggestedStartTime = '15:30';
            else suggestedStartTime = '17:00';
          }
        }

        openCreateModal({
          activityTemplate: data.documentId || data.id,
          date: dayObj.dateStr,
          startTime: suggestedStartTime,
          facilitators: (data.authorizedFacilitators || []).map(f => f.documentId || f.id || f)
        });
      } else if (type === 'facilitator') {
        if (dayObj.slots.length === 0) {
          if (confirm(`Aucun créneau d'animation n'existe le ${dayObj.dayName} ${dayObj.dayNumber}. Voulez-vous créer un créneau pour l'animateur ${data.firstName} ${data.lastName} ?`)) {
            openCreateModal({
              date: dayObj.dateStr,
              facilitators: [data.documentId || data.id]
            });
          }
        } else {
          globalStore.addInfo('Glissez l\'animateur sur une carte d\'animation spécifique pour l\'assigner.', 'Information');
        }
      } else if (type === 'participant') {
        if (dayObj.slots.length === 0) {
          if (confirm(`Aucun créneau d'animation n'existe le ${dayObj.dayName} ${dayObj.dayNumber}. Voulez-vous créer un créneau pour inscrire ${data.firstName} ${data.lastName} ?`)) {
            openCreateModal({
              date: dayObj.dateStr,
              participants: [data.documentId || data.id]
            });
          }
        } else {
          globalStore.addInfo('Glissez le bénéficiaire sur une carte d\'animation spécifique pour l\'inscrire.', 'Information');
        }
      }
    }

    // Drop directly on animation card
    async function onDropOnCard(event, slot) {
      const target = event.currentTarget;
      if (target) target.classList.remove('drop-hover');

      if (!draggedItem.value) return;
      const { type, data, fromSlotId } = draggedItem.value;
      const slotId = slot.documentId || slot.id;

      if (type === 'activity') {
        const curName = slot.activityTemplate?.name || 'Activité actuelle';
        const newName = data.name || 'Nouvelle activité';
        if (confirm(`Voulez-vous remplacer l'activité "${curName}" par "${newName}" sur ce créneau ?`)) {
          const start = new Date(slot.startDate);
          const duration = data.standardDuration || 60;
          const end = new Date(start.getTime() + duration * 60 * 1000);
          try {
            await schedulerStore.updateSlot(slotId, {
              activityTemplate: data.documentId || data.id,
              endDate: end.toISOString()
            });
            globalStore.addSuccess(`Activité remplacée par "${newName}" !`, 'Activité modifiée');
          } catch (err) {
            globalStore.addError(err.message || 'Erreur lors du remplacement de l\'activité.', 'Erreur');
          }
        }
      } else if (type === 'facilitator') {
        if (fromSlotId && fromSlotId !== slotId) {
          await schedulerStore.removeFacilitatorFromSlot(fromSlotId, data.documentId || data.id);
        }
        await schedulerStore.addFacilitatorToSlot(slotId, data.documentId || data.id);
      } else if (type === 'participant') {
        if (fromSlotId && fromSlotId !== slotId) {
          await schedulerStore.moveParticipantBetweenSlots(fromSlotId, slotId, data.documentId || data.id);
        } else {
          await schedulerStore.addParticipantToSlot(slotId, data.documentId || data.id);
        }
      } else if (type === 'location') {
        await schedulerStore.setLocationForSlot(slotId, data.documentId || data.id);
      }
    }

    // Drop on Slot Specific Target (Assign facilitator, participant, or location)
    async function onDropOnSlot(event, slot, targetSection) {
      const target = event.currentTarget;
      if (target) target.classList.remove('drop-hover');

      if (!draggedItem.value) return;
      const { type, data, fromSlotId } = draggedItem.value;
      const slotId = slot.documentId || slot.id;

      try {
        if (type === 'facilitator') {
          if (fromSlotId && fromSlotId !== slotId) {
            await schedulerStore.removeFacilitatorFromSlot(fromSlotId, data.documentId || data.id);
          }
          await schedulerStore.addFacilitatorToSlot(slotId, data.documentId || data.id);
        } else if (type === 'participant') {
          if (fromSlotId && fromSlotId !== slotId) {
            await schedulerStore.moveParticipantBetweenSlots(fromSlotId, slotId, data.documentId || data.id);
          } else {
            await schedulerStore.addParticipantToSlot(slotId, data.documentId || data.id);
          }
        } else if (type === 'location') {
          await schedulerStore.setLocationForSlot(slotId, data.documentId || data.id);
        }
      } catch (err) {
        globalStore.addError(err.message || 'Erreur lors de l\'affectation.', 'Erreur');
      }
    }

    // Trash Drop
    function onTrashDragOver(event) {
      event.dataTransfer.dropEffect = 'move';
      isTrashHovered.value = true;
    }

    function onTrashDragLeave() {
      isTrashHovered.value = false;
    }

    async function onDropOnTrash(event) {
      isTrashHovered.value = false;
      if (!draggedItem.value) return;
      const { type, data, fromSlotId } = draggedItem.value;

      if (!fromSlotId) {
        globalStore.addWarning('Cet élément n\'appartient à aucune animation.', 'Corbeille');
        return;
      }

      try {
        if (type === 'facilitator') {
          await schedulerStore.removeFacilitatorFromSlot(fromSlotId, data.documentId || data.id);
        } else if (type === 'participant') {
          await schedulerStore.removeParticipantFromSlot(fromSlotId, data.documentId || data.id);
        } else if (type === 'location') {
          await schedulerStore.setLocationForSlot(fromSlotId, null);
        }
      } catch (err) {
        globalStore.addError(err.message || 'Erreur lors du retrait.', 'Erreur');
      }
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

    async function clearSlotLocation(slot) {
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
      currentDate.value = new Date();
    }

    function onDirectDateChange(event) {
      if (event.target.value) {
        const [y, m, d] = event.target.value.split('-').map(Number);
        currentDate.value = new Date(y, m - 1, d);
      }
    }

    function selectDayFromMonth(dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      currentDate.value = new Date(y, m - 1, d);
      viewMode.value = 'day';
    }

    // Modal Create / Edit Slot
    const modalContextTitle = ref('');

    function applyTimePreset(timeStr) {
      slotForm.value.startTime = timeStr;
      recomputeEndTime();
    }

    function openCreateModal(defaults = {}) {
      editingSlotId.value = null;
      const initialDate = defaults.date || currentDateStr.value;
      const firstAct = props.activities[0];
      const selectedActId = defaults.activityTemplate || (firstAct ? (firstAct.documentId || firstAct.id) : '');

      if (defaults.activityTemplate) {
        const actObj = props.activities.find(a => (a.documentId || a.id) === defaults.activityTemplate);
        modalContextTitle.value = actObj ? `✨ Programmer : ${actObj.name}` : '➕ Nouveau Créneau d\'Animation';
      } else {
        modalContextTitle.value = '➕ Nouveau Créneau d\'Animation';
      }

      slotForm.value = {
        activityTemplate: selectedActId,
        date: initialDate,
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
      const s = new Date(slot.startDate);
      const e = new Date(slot.endDate);

      const y = s.getFullYear();
      const m = String(s.getMonth() + 1).padStart(2, '0');
      const d = String(s.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      const sh = String(s.getHours()).padStart(2, '0') + ':' + String(s.getMinutes()).padStart(2, '0');
      const eh = String(e.getHours()).padStart(2, '0') + ':' + String(e.getMinutes()).padStart(2, '0');

      slotForm.value = {
        activityTemplate: slot.activityTemplate?.documentId || slot.activityTemplate?.id || '',
        date: dateStr,
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
          participants: slotForm.value.participants
        };

        if (editingSlotId.value) {
          await schedulerStore.updateSlot(editingSlotId.value, payload);
        } else {
          await schedulerStore.createSlot(payload);
        }

        closeSlotModal();
      } catch (err) {
        globalStore.addError(err.message || 'Erreur lors de la sauvegarde.', 'Erreur');
      } finally {
        isSavingModal.value = false;
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
      showQuickAddModal.value = true;
    }

    const filteredQuickAddParticipants = computed(() => {
      const q = quickAddSearch.value.trim().toLowerCase();
      if (!q) return props.participants;
      return props.participants.filter(p => {
        const full = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
        return full.includes(q);
      });
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
      isPaletteOpen,
      paletteTab,
      highlightedSlotId,
      activitySearchQuery,
      facilitatorSearchQuery,
      participantSearchQuery,
      locationSearchQuery,
      participantFilterMode,
      unassignedWeeklyParticipantsCount,
      filteredPaletteActivities,
      filteredPaletteFacilitators,
      filteredPaletteParticipants,
      filteredPaletteLocations,
      activeDragType,
      isTrashHovered,
      showSlotModal,
      editingSlotId,
      isSavingModal,
      slotForm,
      showDuplicateModal,
      duplicateForm,
      showQuickAddModal,
      quickAddSlot,
      quickAddSelectedIds,
      quickAddSearch,
      filteredQuickAddParticipants,
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
      onDragStart,
      onDragEnd,
      onDragOver,
      onDragLeave,
      onDropOnDay,
      onDropOnSlot,
      onTrashDragOver,
      onTrashDragLeave,
      onDropOnTrash,
      removeFacilitator,
      removeParticipant,
      clearSlotLocation,
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
      onDropOnCard
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
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
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
  color: var(--text-color, #0f172a);
}

.mode-tag-pill {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  background: #f1f5f9;
  color: #475569;
  border-radius: 20px;
  text-transform: uppercase;
}

.dnd-badge-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.65rem;
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.subtitle {
  margin: 0.2rem 0 0 0;
  font-size: 0.88rem;
  color: var(--text-muted, #64748b);
}

/* View Switcher */
.view-switcher-pill {
  display: flex;
  background: #f1f5f9;
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
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-pill-btn:hover {
  color: #0f172a;
}

.view-pill-btn.active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* Toolbar Row */
.header-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, #f1f5f9);
}

.date-nav-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.nav-arrow-btn, .today-btn {
  background: #f8fafc;
  border: 1px solid var(--border-color, #e2e8f0);
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-arrow-btn:hover, .today-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.period-title-block {
  display: flex;
  flex-direction: column;
  margin: 0 0.5rem;
}

.current-period-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-color, #0f172a);
}

.period-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted, #64748b);
}

.direct-date-input {
  border: 1px solid var(--border-color, #cbd5e1);
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  font-size: 0.85rem;
  background: #ffffff;
  color: inherit;
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
  background: #f8fafc;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
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
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

/* Metrics bar */
.metrics-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color, #f1f5f9);
}

/* Location Filter Bar */
.location-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.6rem 1rem;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  flex-wrap: wrap;
}

.filter-bar-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: #475569;
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
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.room-filter-pill:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
}

.room-filter-pill.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
}

.filter-count-badge {
  background: rgba(0, 0, 0, 0.08);
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
  background: #e0e7ff;
  color: #4338ca;
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
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fca5a5;
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
  background: #f8fafc;
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
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
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
}

.metric-value {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.warning-text {
  color: #d97706;
}

.metric-warn-badge {
  font-size: 0.7rem;
  background: #fef3c7;
  color: #b45309;
  padding: 0.1rem 0.35rem;
  border-radius: 6px;
  margin-left: 0.3rem;
}

/* ──────────────── MAIN PLANNING LAYOUT & SIDE PALETTE ──────────────── */
.main-planning-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  align-items: start;
}

.main-planning-layout.has-open-palette {
  grid-template-columns: 1fr 340px;
}

@media (max-width: 1200px) {
  .main-planning-layout.has-open-palette {
    grid-template-columns: 1fr 300px;
  }
}

@media (max-width: 900px) {
  .main-planning-layout.has-open-palette {
    grid-template-columns: 1fr;
  }
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
  background: #ffffff;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  min-height: 520px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.day-kanban-column.is-today {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.day-kanban-column.is-weekend {
  background: #fcfcfd;
}

.day-kanban-column.drop-active-column {
  border: 2px dashed #6366f1;
  background: rgba(99, 102, 241, 0.03);
}

.day-kanban-column.drop-hover {
  background: rgba(99, 102, 241, 0.08) !important;
  border-color: #4f46e5 !important;
}

/* Column Header */
.column-header {
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
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
  color: #0f172a;
  text-transform: capitalize;
}

.day-badge-date {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  background: #e2e8f0;
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
}

.slots-count-chip {
  font-size: 0.72rem;
  font-weight: 600;
  color: #94a3b8;
}

.slots-count-chip.has-slots {
  color: #4f46e5;
}

.quick-add-day-btn {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.quick-add-day-btn:hover {
  background: #e2e8f0;
}

/* Column Slots List */
.column-slots-list {
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex-grow: 1;
}

.activity-drop-placeholder {
  border: 2px dashed #6366f1;
  background: rgba(99, 102, 241, 0.08);
  border-radius: 10px;
  padding: 0.75rem;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #4f46e5;
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
  background: rgba(99, 102, 241, 0.04);
  border-color: rgba(99, 102, 241, 0.3);
  color: #4f46e5;
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
  background: #ffffff;
  border: 1px solid #c7d2fe;
  color: #4f46e5;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.1);
  transition: all 0.2s;
}

.quick-add-slot-btn:hover {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}

.empty-day-subtext {
  font-size: 0.72rem;
  color: #94a3b8;
}

/* ──────────────── ANIMATION CARDS (KANBAN) ──────────────── */
.animation-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  position: relative;
}

.animation-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.animation-card.has-conflict {
  border-color: #f59e0b;
  background: #fffdfa;
}

.anim-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.3rem;
}

.time-and-tag {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-chip {
  font-size: 0.75rem;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
}

.category-tag-chip {
  font-size: 0.68rem;
  font-weight: 600;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
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
  opacity: 0.6;
  border-radius: 4px;
  transition: all 0.2s;
}

.card-action-btn:hover {
  opacity: 1;
  background: #f1f5f9;
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
  color: #0f172a;
  line-height: 1.25;
}

.slot-conflict-alert {
  background: #fef3c7;
  border: 1px solid #fde68a;
  color: #92400e;
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
  background: #f8fafc;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  border: 1px dashed transparent;
  transition: all 0.2s;
}

.anim-section.drop-target-active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.05);
}

.anim-section.drop-hover {
  background: rgba(99, 102, 241, 0.15) !important;
  border-color: #4f46e5 !important;
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label-text {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.count-badge {
  font-size: 0.68rem;
  font-weight: 700;
  background: #e2e8f0;
  color: #475569;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
}

/* Location chip */
.location-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 0.25rem 0.45rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #0f172a;
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
  cursor: grab;
  user-select: none;
  transition: all 0.2s;
}

.person-chip:active {
  cursor: grabbing;
}

.facilitator-chip {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}

.participant-chip {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.person-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
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
  background: rgba(0, 0, 0, 0.1);
}

.conflict-warn-dot {
  font-size: 0.7rem;
  cursor: help;
}

/* Empty drop slot invite */
.empty-drop-slot {
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  padding: 0.35rem 0.45rem;
  text-align: center;
  font-size: 0.72rem;
  color: #94a3b8;
  background: #ffffff;
}

.participants-drop-zone-cta {
  border: 1px dashed #bbf7d0;
  background: #f0fdf4;
  border-radius: 6px;
  padding: 0.3rem;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 600;
  color: #166534;
  margin-top: 0.2rem;
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
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.capacity-progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.cap-low, .capacity-gauge-pill.cap-low {
  background: #fef3c7;
  color: #92400e;
}
.capacity-progress-fill.cap-low {
  background: #f59e0b;
}

.cap-good, .capacity-gauge-pill.cap-good {
  background: #dcfce7;
  color: #166534;
}
.capacity-progress-fill.cap-good {
  background: #22c55e;
}

.cap-full, .capacity-gauge-pill.cap-full {
  background: #dbeafe;
  color: #1e40af;
}
.capacity-progress-fill.cap-full {
  background: #3b82f6;
}

.cap-overload, .capacity-gauge-pill.cap-overload {
  background: #fee2e2;
  color: #991b1b;
}
.capacity-progress-fill.cap-overload {
  background: #ef4444;
}

/* Column bottom add area */
.column-bottom-add-zone {
  margin: 0 0.65rem 0.65rem 0.65rem;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.74rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.column-bottom-add-zone:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
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
  background: #ffffff;
  border: 1px solid #e2e8f0;
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
  color: #0f172a;
}

.day-large-date {
  font-size: 1rem;
  color: #64748b;
  font-weight: 600;
}

.day-stats-pills {
  display: flex;
  gap: 0.5rem;
}

.stat-pill {
  background: #f1f5f9;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
}

.day-full-drop-banner {
  border: 2px dashed #cbd5e1;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  font-weight: 600;
  color: #64748b;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.day-full-drop-banner.drop-active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.05);
  color: #4f46e5;
}

.day-slots-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.day-slot-expanded-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
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
  background: #f1f5f9;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-weight: 700;
}

.duration-pill {
  font-size: 0.75rem;
  background: #e2e8f0;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  color: #475569;
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
  color: #0f172a;
}

.tags-row {
  display: flex;
  gap: 0.5rem;
}

.rules-tag-chip {
  font-size: 0.75rem;
  background: #f1f5f9;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  color: #64748b;
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
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.box-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.expanded-participants-section {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
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

.large-cta {
  padding: 0.5rem;
  font-size: 0.8rem;
}

/* ──────────────── MONTH VIEW ──────────────── */
.month-calendar-board {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.month-grid-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-weight: 700;
  color: #64748b;
  font-size: 0.85rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.month-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding-top: 4px;
}

.month-day-cell {
  min-height: 90px;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.month-day-cell:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.month-day-cell.is-today {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.03);
}

.month-day-cell.other-month {
  opacity: 0.4;
}

.month-cell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cell-day-num {
  font-size: 0.8rem;
  font-weight: 700;
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
  background: #eff6ff;
  color: #1e40af;
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
  color: #64748b;
  font-weight: 600;
}

/* ──────────────── DOCKABLE SIDE PALETTE ──────────────── */
.side-dnd-palette {
  background: #ffffff;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  max-height: 800px;
  position: sticky;
  top: 1rem;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.palette-header {
  padding: 1rem 1.1rem 0.5rem 1.1rem;
  border-bottom: 1px solid #f1f5f9;
}

.palette-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.palette-title-row h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
}

.close-palette-btn {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  color: #64748b;
  border-radius: 4px;
  padding: 0.2rem 0.4rem;
}

.close-palette-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.palette-subtitle {
  margin: 0.2rem 0 0.6rem 0;
  font-size: 0.78rem;
  color: #64748b;
}

.palette-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.palette-tab-btn {
  border: none;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 0.4rem 0.5rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.palette-tab-btn.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}

.tab-count-badge {
  font-size: 0.68rem;
  padding: 0.05rem 0.35rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.1);
}

.palette-content-scroll {
  padding: 0.85rem;
  overflow-y: auto;
  flex-grow: 1;
}

.palette-search-box {
  position: relative;
  margin-bottom: 0.65rem;
}

.palette-search-input {
  width: 100%;
  padding: 0.45rem 1.8rem 0.45rem 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.82rem;
  background: #f8fafc;
}

.clear-search-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 0.75rem;
  color: #94a3b8;
  cursor: pointer;
}

.participant-filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 0.75rem;
}

.filter-pill-btn {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-pill-btn.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
}

.filter-pill-btn.highlight-pill {
  border-color: #f59e0b;
  color: #b45309;
}

.filter-pill-btn.highlight-pill.active {
  background: #f59e0b;
  color: #ffffff;
}

/* Draggable palette items */
.palette-items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.draggable-palette-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  cursor: grab;
  user-select: none;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.draggable-palette-item:hover {
  border-color: #6366f1;
  transform: translateX(2px);
  box-shadow: 0 3px 8px rgba(99, 102, 241, 0.12);
}

.draggable-palette-item:active {
  cursor: grabbing;
}

.item-drag-handle {
  color: #94a3b8;
  font-size: 0.9rem;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex-grow: 1;
}

.item-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f172a;
}

.item-meta-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.duration-badge {
  font-size: 0.7rem;
  background: #f1f5f9;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-weight: 600;
  color: #475569;
}

.rule-chip, .subtext-chip {
  font-size: 0.68rem;
  color: #64748b;
}

.weekly-presence-pill {
  font-size: 0.68rem;
  font-weight: 700;
  background: #eff6ff;
  color: #1e40af;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.weekly-presence-pill.zero-count {
  background: #fef3c7;
  color: #92400e;
}

.availability-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.badge-available {
  background: #dcfce7;
  color: #166534;
}

.badge-unavailable {
  background: #fee2e2;
  color: #991b1b;
}

.palette-empty-search {
  text-align: center;
  padding: 1.5rem 0.5rem;
  color: #94a3b8;
  font-size: 0.82rem;
}

/* Palette Trash Zone */
.palette-trash-zone {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: #fff1f2;
  border-top: 1px dashed #fecdd3;
  transition: all 0.2s;
}

.palette-trash-zone.drop-trash-hover {
  background: #ffe4e6;
  border-top-color: #e11d48;
  transform: scale(1.02);
}

.trash-icon {
  font-size: 1.6rem;
}

.trash-text-block {
  display: flex;
  flex-direction: column;
}

.trash-text-block strong {
  font-size: 0.82rem;
  color: #e11d48;
}

.trash-text-block small {
  font-size: 0.7rem;
  color: #9f1239;
}

/* ──────────────── MODALS ──────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-card {
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
}

.close-modal-btn {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #94a3b8;
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
  color: #334155;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-input {
  width: 100%;
  padding: 0.55rem 0.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  color: inherit;
}

/* Time Presets */
.time-presets-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: rgba(99, 102, 241, 0.05);
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.15);
}

.presets-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #4f46e5;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.presets-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.preset-pill-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-pill-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #1e293b;
}

.preset-pill-btn.active {
  background: #4f46e5;
  color: #ffffff;
  border-color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(79, 70, 229, 0.25);
}

.multi-select-box {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: #f8fafc;
}

.scrollable-select {
  max-height: 180px;
  overflow-y: auto;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
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
  color: #4f46e5;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.modal-actions-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
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
  }
}
</style>
