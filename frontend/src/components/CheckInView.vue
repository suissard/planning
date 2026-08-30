<template>
  <div class="checkin-view-root printable-checkin">
    <!-- ════════════════ TOP CONTROLS & HEADER (NO PRINT) ════════════════ -->
    <div class="view-header no-print">
      <div class="header-main">
        <div class="header-title-wrapper">
          <div class="header-icon-box">🏛️</div>
          <div>
            <div class="title-with-pill">
              <h2>Pointage & Émargement des Salles et Créneaux</h2>
              <span class="mode-tag-pill">Admin</span>
              <span class="checkin-badge-pill">✨ Salles, Créneaux & Activités</span>
            </div>
            <p class="subtitle">
              Chaque salle dispose de créneaux d'accueil (ex: 10h–17h). Les bénéficiaires sont inscrits sur le créneau de salle et participent à ses activités programmées.
            </p>
          </div>
        </div>

        <!-- TOP ACTIONS (PRINT, TODAY) -->
        <div class="header-actions">
          <button 
            type="button" 
            class="tool-btn print-btn" 
            @click="printAttendanceSheet" 
            title="Imprimer la feuille d'émargement officielle de la journée"
          >
            🖨️ Imprimer la feuille d'émargement
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
            @click="navigateDate(-1)" 
            title="Jour précédent"
          >
            ◄
          </button>
          <button 
            type="button" 
            class="today-btn" 
            @click="goToToday" 
            title="Revenir à aujourd'hui"
          >
            Aujourd'hui
          </button>
          <button 
            type="button" 
            class="nav-arrow-btn" 
            @click="navigateDate(1)" 
            title="Jour suivant"
          >
            ►
          </button>
          
          <div class="period-title-block">
            <span class="current-period-title">{{ formattedSelectedDate }}</span>
            <span class="period-subtitle">{{ daySlots.length }} créneau(x) de salle actif(s)</span>
          </div>

          <!-- Date Picker input to jump anywhere -->
          <div class="direct-date-input-wrapper">
            <input 
              type="date" 
              v-model="selectedDate" 
              class="direct-date-input" 
              title="Sélectionner une date précise"
            />
          </div>
        </div>

        <!-- QUICK SEARCH & STATUS FILTERS -->
        <div class="action-tools-group">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Rechercher une salle, un participant ou une activité..." 
              class="search-input-field"
            />
            <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
          </div>

          <div class="status-filters-pills">
            <button 
              type="button" 
              class="filter-pill" 
              :class="{ active: statusFilter === 'all' }" 
              @click="statusFilter = 'all'"
            >
              Tous ({{ totalParticipantsCount }})
            </button>
            <button 
              type="button" 
              class="filter-pill present-pill" 
              :class="{ active: statusFilter === 'present' }" 
              @click="statusFilter = 'present'"
            >
              🟢 Sur place ({{ totalCurrentlyOnSiteCount }})
            </button>
            <button 
              type="button" 
              class="filter-pill departed-pill" 
              :class="{ active: statusFilter === 'departed' }" 
              @click="statusFilter = 'departed'"
            >
              🚪 Partis ({{ totalDepartedCount }})
            </button>
            <button 
              type="button" 
              class="filter-pill absent-pill" 
              :class="{ active: statusFilter === 'absent' }" 
              @click="statusFilter = 'absent'"
            >
              ❌ Absents ({{ totalAbsentCount }})
            </button>
            <button 
              type="button" 
              class="filter-pill unmarked-pill" 
              :class="{ active: statusFilter === 'unmarked' }" 
              @click="statusFilter = 'unmarked'"
            >
              ⏳ À pointer ({{ totalUnmarkedCount }})
            </button>
          </div>
        </div>
      </div>

      <!-- ════════════════ SUMMARY KPI STATS CARDS ════════════════ -->
      <div class="kpi-grid-wrapper">
        <div class="kpi-card">
          <div class="kpi-icon-box blue">🏛️</div>
          <div class="kpi-content">
            <span class="kpi-label">Salles & Créneaux</span>
            <strong class="kpi-value">{{ daySlots.length }}</strong>
            <span class="kpi-sub">{{ dayLocationsCount }} salle(s) mobilisée(s)</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box purple">👥</div>
          <div class="kpi-content">
            <span class="kpi-label">Bénéficiaires Inscrits</span>
            <strong class="kpi-value">{{ totalParticipantsCount }}</strong>
            <span class="kpi-sub">sur les créneaux du jour</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box green">🟢</div>
          <div class="kpi-content">
            <span class="kpi-label">Actuellement Sur Place</span>
            <strong class="kpi-value highlight-green">{{ totalCurrentlyOnSiteCount }}</strong>
            <span class="kpi-sub">{{ totalDepartedCount }} parti(s) • {{ totalPresentCount }} venus au total</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-box amber">🎯</div>
          <div class="kpi-content">
            <span class="kpi-label">Activités Programmées</span>
            <strong class="kpi-value highlight-amber">{{ totalScheduledActivitiesCount }}</strong>
            <span class="kpi-sub">{{ totalPassagesCount }} pointage(s) enregistré(s)</span>
          </div>
        </div>

        <div class="kpi-card wide-card">
          <div class="kpi-gauge-content">
            <div class="gauge-header">
              <span class="kpi-label">Taux d'Assiduité / Présence Global</span>
              <strong class="gauge-pct">{{ overallAttendanceRate }}%</strong>
            </div>
            <div class="gauge-bar-bg">
              <div 
                class="gauge-bar-fill" 
                :style="{ width: overallAttendanceRate + '%', background: getAttendanceColor(overallAttendanceRate) }"
              ></div>
            </div>
            <span class="gauge-sub">
              {{ totalPresentCount }} bénéficiaire(s) ayant émargé sur {{ totalParticipantsCount }} inscrits ({{ totalAbsentCount }} notifiés absents)
            </span>
          </div>
        </div>
      </div>

      <!-- ════════════════ TIME-SLOT / ROOM FILTER TABS ════════════════ -->
      <div class="slot-filter-chips-row" v-if="daySlots.length > 0">
        <span class="chips-label">🏛️ Filtrer par salle / créneau :</span>
        <div class="chips-scrollable">
          <button 
            type="button" 
            class="slot-chip" 
            :class="{ active: selectedSlotFilterId === null }" 
            @click="selectedSlotFilterId = null"
          >
            🌟 Tous les créneaux ({{ daySlots.length }})
          </button>
          <button 
            type="button" 
            v-for="slot in daySlots" 
            :key="slot.documentId || slot.id" 
            class="slot-chip" 
            :class="{ active: selectedSlotFilterId === (slot.documentId || slot.id) }" 
            @click="selectedSlotFilterId = (slot.documentId || slot.id)"
          >
            <span class="chip-time">{{ formatSlotTimeRange(slot) }}</span>
            <span class="chip-name">{{ getSlotDisplayName(slot) }}</span>
            <span class="chip-badge" :class="getSlotBadgeClass(slot)">
              {{ checkInStore.getSlotStats(slot).present }}/{{ (slot.participants || []).length }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- ════════════════ PRINTABLE ONLY HEADER ════════════════ -->
    <div class="print-only print-header-document">
      <div class="print-brand-row">
        <div class="print-brand-info">
          <h1>🌿 EHPAD Les Écrivains — Accueil de Jour</h1>
          <p>Feuille d'Émargement des Créneaux de Salle & Activités Programmées</p>
        </div>
        <div class="print-date-badge">
          <strong>{{ formattedSelectedDate }}</strong>
        </div>
      </div>
      <div class="print-kpi-summary">
        <span>Créneaux : <strong>{{ daySlots.length }}</strong></span> | 
        <span>Inscrits totaux : <strong>{{ totalParticipantsCount }}</strong></span> | 
        <span>Total Présents : <strong>{{ totalPresentCount }}</strong></span> | 
        <span>Taux de présence : <strong>{{ overallAttendanceRate }}%</strong></span>
      </div>
    </div>

    <!-- ════════════════ MAIN CONTENT: LIST OF ROOM SLOTS & CHECKINS ════════════════ -->
    <div class="checkin-content-area">
      <!-- Loading State -->
      <div v-if="checkInStore.loading" class="loading-state-box">
        <span class="big-spinner"></span>
        <p>Chargement des feuilles d'émargement et des créneaux...</p>
      </div>

      <!-- Empty State: No Time Slots on this date -->
      <div v-else-if="daySlots.length === 0" class="empty-state-box">
        <span class="empty-icon">📅</span>
        <h3>Aucun créneau horaire de salle programmé pour le {{ formattedSelectedDate }}</h3>
        <p>
          Il n'y a aucun créneau de salle planifié à cette date. Vous pouvez naviguer vers un autre jour ou programmer des créneaux d'ouverture de salle dans le planning.
        </p>
        <div class="empty-actions">
          <button type="button" class="action-btn primary-btn" @click="$emit('navigate', 'timeslots')">
            🎯 Aller au Planning des Créneaux
          </button>
          <button type="button" class="tool-btn" @click="goToToday">
            📆 Revenir à Aujourd'hui
          </button>
        </div>
      </div>

      <!-- List of Filtered Slots -->
      <div v-else class="slots-checkin-list">
        <div 
          v-for="slot in filteredDaySlots" 
          :key="slot.documentId || slot.id" 
          class="slot-checkin-card"
          :class="{ 'is-focused': selectedSlotFilterId === (slot.documentId || slot.id) }"
        >
          <!-- ─── CARD HEADER (ROOM & TIME SLOT) ─── -->
          <div class="slot-card-header">
            <div class="slot-header-left">
              <div class="slot-time-badge">
                <span class="time-icon">⏰</span>
                <strong>{{ formatSlotTimeRange(slot) }}</strong>
              </div>
              <div class="slot-title-group">
                <h3 class="slot-activity-name">
                  🏛️ {{ slot.location?.name || 'Salle Principale' }}
                </h3>
                <div class="slot-meta-tags">
                  <span class="meta-tag fac-tag" v-if="slot.facilitators && slot.facilitators.length">
                    👨‍🏫 Encadrement : {{ slot.facilitators.map(f => f.firstName + ' ' + f.lastName).join(', ') }}
                  </span>
                  <span class="meta-tag cap-tag" v-if="slot.location?.capacity">
                    Capacité salle : {{ slot.location.capacity }} pers.
                  </span>
                  <span class="meta-tag enrolled-tag">
                    Inscrits sur ce créneau : {{ (slot.participants || []).length }} pers.
                  </span>
                </div>
              </div>
            </div>

            <!-- SLOT ATTENDANCE GAUGE & ACTIONS -->
            <div class="slot-header-right no-print">
              <!-- Mini Attendance Gauge -->
              <div class="slot-progress-wrapper">
                <div class="slot-progress-labels">
                  <span class="prog-text">
                    <strong>{{ checkInStore.getSlotStats(slot).currentlyOnSite }}</strong> sur place ({{ checkInStore.getSlotStats(slot).present }}/{{ (slot.participants || []).length }} émargés)
                  </span>
                  <span class="prog-pct" :style="{ color: getAttendanceColor(checkInStore.getSlotStats(slot).rate) }">
                    {{ checkInStore.getSlotStats(slot).rate }}%
                  </span>
                </div>
                <div class="slot-progress-bar">
                  <div 
                    class="slot-progress-fill" 
                    :style="{ width: checkInStore.getSlotStats(slot).rate + '%', background: getAttendanceColor(checkInStore.getSlotStats(slot).rate) }"
                  ></div>
                </div>
              </div>

              <!-- Quick Slot Action Buttons -->
              <div class="slot-action-buttons">
                <button 
                  type="button" 
                  class="slot-btn mark-all-present-btn" 
                  @click="markAllSlotParticipants(slot, true)"
                  title="Pointer tous les bénéficiaires de ce créneau comme arrivés / présents"
                >
                  ✅ Tout Présent
                </button>
                <button 
                  type="button" 
                  class="slot-btn mark-all-absent-btn" 
                  @click="markAllSlotParticipants(slot, false)"
                  title="Marquer tous les participants comme absents"
                >
                  ❌ Tout Absent
                </button>
                <button 
                  type="button" 
                  class="slot-btn reset-slot-btn" 
                  @click="resetSlotCheckIns(slot)"
                  title="Réinitialiser les pointages pour ce créneau"
                >
                  🔄 Reset
                </button>
                <button 
                  type="button" 
                  class="slot-btn add-extra-btn" 
                  @click="openAddWalkInModal(slot)"
                  title="Inscrire un participant supplémentaire à ce créneau de salle"
                >
                  ➕ Inscrire un participant
                </button>
              </div>
            </div>
          </div>

          <!-- ─── PROGRAMME DES ACTIVITÉS DU CRÉNEAU ─── -->
          <div class="slot-scheduled-activities-section">
            <div class="scheduled-activities-header">
              <div class="activities-header-title">
                <span class="sec-icon">🎯</span>
                <span class="sec-title">Programme des activités de ce créneau de salle :</span>
                <span class="act-count-pill">{{ getSlotActivities(slot).length }} activité(s)</span>
              </div>
              <button 
                type="button" 
                class="add-act-btn no-print" 
                @click="openAddActivityModal(slot)"
                title="Ajouter une activité spécifique se déroulant dans ce créneau"
              >
                ➕ Programmer une activité
              </button>
            </div>

            <!-- List of Scheduled Activities in this Slot -->
            <div class="scheduled-activities-list" v-if="getSlotActivities(slot).length > 0">
              <div 
                v-for="act in getSlotActivities(slot)" 
                :key="act.documentId || act.id" 
                class="scheduled-act-card"
              >
                <div class="act-time-badge">
                  ⏱️ {{ formatTimeRangeFromDates(act.startDate, act.endDate) }}
                </div>
                <div class="act-info">
                  <strong class="act-name">{{ act.name }}</strong>
                  <span class="act-desc" v-if="act.description">{{ act.description }}</span>
                </div>
                <div class="act-facilitators" v-if="act.facilitators && act.facilitators.length">
                  <span class="fac-chip" v-for="f in act.facilitators" :key="f.documentId || f.id">
                    👤 {{ f.firstName }} {{ f.lastName }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="no-activities-inline">
              <em>Aucune activité spécifique n'est encore programmée dans ce créneau. Les participants inscrits sont accueillis dans la salle.</em>
            </div>
          </div>

          <!-- ─── PARTICIPANTS CHECKIN LIST / MULTI-PASSAGES ─── -->
          <div class="slot-card-body">
            <div class="participants-section-header">
              <div class="section-title-wrapper">
                <h4>👥 Émargement des Bénéficiaires du Créneau ({{ getFilteredSlotParticipants(slot).length }})</h4>
                <p class="section-sub">
                  Les participants inscrits sont présents dans la salle et participent aux activités programmées ci-dessus.
                </p>
              </div>
            </div>

            <!-- No participants scheduled on slot -->
            <div v-if="(slot.participants || []).length === 0" class="no-participants-box">
              <span class="empty-icon">👥</span>
              <p>Aucun bénéficiaire n'est actuellement inscrit sur ce créneau de salle.</p>
              <button 
                type="button" 
                class="action-btn secondary-btn" 
                @click="openAddWalkInModal(slot)"
              >
                ➕ Inscrire un participant maintenant
              </button>
            </div>

            <!-- Participants Multi-Passages Container -->
            <div v-else class="checkin-participants-wrapper">
              <div 
                v-for="p in getFilteredSlotParticipants(slot)" 
                :key="p.documentId || p.id"
                class="participant-checkin-block"
                :class="'status-' + checkInStore.getParticipantStatus(slot.documentId || slot.id, p.documentId || p.id)"
              >
                <!-- Participant Header Row -->
                <div class="participant-row-header">
                  <div class="participant-profile-info">
                    <div class="participant-avatar">
                      {{ getInitials(p) }}
                    </div>
                    <div class="participant-identity">
                      <div class="name-status-row">
                        <strong class="participant-name">{{ p.firstName }} {{ p.lastName }}</strong>
                        <span 
                          class="status-pill" 
                          :class="checkInStore.getParticipantStatus(slot.documentId || slot.id, p.documentId || p.id)"
                        >
                          {{ getStatusLabel(checkInStore.getParticipantStatus(slot.documentId || slot.id, p.documentId || p.id)) }}
                        </span>
                      </div>
                      <span class="participant-email">{{ p.email }}</span>
                    </div>
                  </div>

                  <!-- Quick Action Buttons for Participant (NO PRINT) -->
                  <div class="participant-header-actions no-print">
                    <!-- If unmarked, show quick initial check-in button -->
                    <button 
                      type="button" 
                      v-if="checkInStore.getParticipantPassages(slot.documentId || slot.id, p.documentId || p.id).length === 0"
                      class="presence-btn btn-present" 
                      @click="addNewPassage(slot, p, true)"
                      title="Pointer l'arrivée maintenant"
                    >
                      <span class="btn-check">✓</span> Pointer Arrivée
                    </button>

                    <!-- Mark as Absent if unmarked -->
                    <button 
                      type="button" 
                      v-if="checkInStore.getParticipantPassages(slot.documentId || slot.id, p.documentId || p.id).length === 0"
                      class="presence-btn btn-absent" 
                      @click="addNewPassage(slot, p, false, 'Absent notifié')"
                      title="Marquer comme absent"
                    >
                      <span class="btn-cross">✕</span> Absent
                    </button>

                    <!-- Add extra passage (Retour) if already has passages -->
                    <button 
                      type="button" 
                      v-if="checkInStore.getParticipantPassages(slot.documentId || slot.id, p.documentId || p.id).length > 0"
                      class="add-passage-btn"
                      @click="addNewPassage(slot, p, true)"
                      title="Enregistrer un nouveau passage (ex: retour après une sortie/pause)"
                    >
                      ➕ Nouveau passage (Retour)
                    </button>
                  </div>
                </div>

                <!-- ─── PASSAGES LIST (Multi Check-Ins for this participant) ─── -->
                <div class="passages-container" v-if="checkInStore.getParticipantPassages(slot.documentId || slot.id, p.documentId || p.id).length > 0">
                  <div 
                    v-for="(passage, pIndex) in checkInStore.getParticipantPassages(slot.documentId || slot.id, p.documentId || p.id)" 
                    :key="passage.documentId || passage.id"
                    class="passage-card"
                    :class="{ 'is-departed': !!passage.checkOutTime, 'is-absent': !passage.isPresent }"
                  >
                    <div class="passage-badge-title">
                      <span class="passage-num">Passage #{{ pIndex + 1 }}</span>
                      <span v-if="!passage.isPresent" class="passage-tag tag-absent">Absent(e)</span>
                      <span v-else-if="passage.checkOutTime" class="passage-tag tag-departed">Parti(e) à {{ formatTimeOnly(passage.checkOutTime) }}</span>
                      <span v-else class="passage-tag tag-on-site">🟢 Sur place</span>
                    </div>

                    <!-- PASSAGE TIME CONTROLS (SCREEN) -->
                    <div class="passage-times-row no-print">
                      <!-- Arrival Time Input -->
                      <div class="time-field-box">
                        <label>🟢 Arrivée :</label>
                        <input 
                          type="time" 
                          :value="toTimeInputValue(passage.checkInTime)" 
                          @change="onPassageTimeChange(passage, 'checkInTime', $event.target.value)"
                          class="time-input" 
                        />
                      </div>

                      <!-- Departure Time Input / Button -->
                      <div class="time-field-box">
                        <label>🚪 Départ :</label>
                        <div class="departure-control-group">
                          <input 
                            type="time" 
                            :value="toTimeInputValue(passage.checkOutTime)" 
                            @change="onPassageTimeChange(passage, 'checkOutTime', $event.target.value)"
                            class="time-input" 
                          />
                          <button 
                            type="button" 
                            v-if="!passage.checkOutTime && passage.isPresent"
                            class="quick-checkout-btn" 
                            @click="recordNowDeparture(passage)"
                            title="Pointer le départ à l'heure actuelle"
                          >
                            🚪 Noter départ
                          </button>
                          <button 
                            type="button" 
                            v-else-if="passage.checkOutTime"
                            class="clear-checkout-btn" 
                            @click="clearDeparture(passage)"
                            title="Annuler l'heure de départ (toujours sur place)"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <!-- Delete Passage Button -->
                      <button 
                        type="button" 
                        class="delete-passage-btn" 
                        @click="deletePassage(passage)"
                        title="Supprimer ce passage"
                      >
                        🗑️
                      </button>
                    </div>

                    <!-- PRINT ONLY PASSAGE TIMES -->
                    <div class="print-only print-passage-times">
                      <span><strong>Arrivée :</strong> {{ formatTimeOnly(passage.checkInTime) || '—' }}</span>
                      <span style="margin-left: 1.5rem;"><strong>Départ :</strong> {{ formatTimeOnly(passage.checkOutTime) || 'En cours' }}</span>
                    </div>

                    <!-- PASSAGE COMMENT BOX -->
                    <div class="passage-comment-wrapper">
                      <div class="comment-editor-box no-print">
                        <input 
                          type="text" 
                          :value="getPassageCommentModel(passage)" 
                          @input="onPassageCommentInput(passage, $event.target.value)" 
                          @blur="onPassageCommentBlur(passage)"
                          placeholder="Observation sur ce passage (ex: parti pour RDV médical, retour en forme...)" 
                          class="passage-comment-input" 
                        />
                        <!-- Quick Suggestions for passage -->
                        <div class="quick-chips-row" v-if="!getPassageCommentModel(passage)">
                          <button type="button" class="quick-chip" @click="applyPassageQuickComment(passage, 'Très participatif(ve)')">🌟 Participatif</button>
                          <button type="button" class="quick-chip" @click="applyPassageQuickComment(passage, 'Parti(e) pour RDV médical')">🏥 RDV Médical</button>
                          <button type="button" class="quick-chip" @click="applyPassageQuickComment(passage, 'Fatigué(e) / En retrait')">😴 Fatigué</button>
                          <button type="button" class="quick-chip" @click="applyPassageQuickComment(passage, 'Arrivé(e) en retard')">⏰ En retard</button>
                          <button type="button" class="quick-chip" @click="applyPassageQuickComment(passage, 'De retour après pause')">🔄 De retour</button>
                        </div>
                      </div>

                      <!-- PRINT ONLY COMMENT -->
                      <div class="print-only print-passage-comment">
                        <strong>Remarque :</strong> {{ passage.comment || '—' }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Unmarked fallback for print -->
                <div v-else class="print-only print-unmarked-note">
                  <em>Non pointé</em>
                </div>
              </div>
            </div>
          </div>

          <!-- Print-Only Footer for Each Slot Sheet -->
          <div class="print-only print-slot-sign-row">
            <div class="sign-block">
              <span>Visa de l'Animateur Référent : ___________________________</span>
            </div>
            <div class="sign-block">
              <span>Signature Responsable d'Accueil : ___________________________</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════ ADD SCHEDULED ACTIVITY MODAL ════════════════ -->
    <div class="modal-overlay" v-if="isAddActivityModalOpen" @click.self="isAddActivityModalOpen = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>🎯 Programmer une Activité dans ce Créneau</h3>
          <button class="modal-close-btn" @click="isAddActivityModalOpen = false">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-desc">
            Créneau : <strong>{{ targetSlotForActivity?.location?.name || 'Salle' }}</strong> ({{ formatSlotTimeRange(targetSlotForActivity) }})
          </p>

          <div class="form-group">
            <label>Choisir un modèle d'activité (optionnel) :</label>
            <select v-model="newActivityTemplateId" @change="onSelectActivityTemplate" class="form-select">
              <option value="">-- Saisie libre ou sélectionner un modèle --</option>
              <option v-for="tpl in activities" :key="tpl.documentId || tpl.id" :value="tpl.documentId || tpl.id">
                {{ tpl.name }} ({{ tpl.standardDuration }} min)
              </option>
            </select>
          </div>

          <div class="form-group mt-3">
            <label>Nom de l'activité * :</label>
            <input type="text" v-model="newActivityName" placeholder="Ex: Gym Douce & Équilibre" class="form-input" />
          </div>

          <div class="form-row mt-3">
            <div class="form-group half">
              <label>Heure de début :</label>
              <input type="time" v-model="newActivityStartTime" class="form-input" />
            </div>
            <div class="form-group half">
              <label>Heure de fin :</label>
              <input type="time" v-model="newActivityEndTime" class="form-input" />
            </div>
          </div>

          <div class="form-group mt-3">
            <label>Animateur(s) encadrant l'activité :</label>
            <select multiple v-model="newActivityFacilitatorIds" class="form-select multiple-select">
              <option v-for="f in facilitators" :key="f.documentId || f.id" :value="f.documentId || f.id">
                {{ f.firstName }} {{ f.lastName }}
              </option>
            </select>
          </div>

          <div class="form-group mt-3">
            <label>Description / Remarques :</label>
            <input type="text" v-model="newActivityDescription" placeholder="Ex: Matériel ballons souples..." class="form-input" />
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="tool-btn" @click="isAddActivityModalOpen = false">
            Annuler
          </button>
          <button 
            type="button" 
            class="action-btn primary-btn" 
            :disabled="!newActivityName.trim()" 
            @click="confirmAddScheduledActivity"
          >
            Enregistrer l'Activité
          </button>
        </div>
      </div>
    </div>

    <!-- ════════════════ ADD WALK-IN PARTICIPANT MODAL ════════════════ -->
    <div class="modal-overlay" v-if="isAddWalkInModalOpen" @click.self="isAddWalkInModalOpen = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>➕ Inscrire un Bénéficiaire au Créneau de Salle</h3>
          <button class="modal-close-btn" @click="isAddWalkInModalOpen = false">✕</button>
        </div>

        <div class="modal-body">
          <p class="modal-desc">
            Sélectionnez un bénéficiaire à inscrire au créneau <strong>{{ targetSlotForWalkIn?.location?.name }}</strong> de <strong>{{ formatSlotTimeRange(targetSlotForWalkIn) }}</strong>.
          </p>

          <div class="form-group">
            <label for="walkInSelect">Bénéficiaire à ajouter :</label>
            <select id="walkInSelect" v-model="selectedWalkInParticipantId" class="form-select">
              <option value="" disabled>-- Sélectionner un bénéficiaire --</option>
              <option 
                v-for="p in availableParticipantsForWalkIn" 
                :key="p.documentId || p.id" 
                :value="p.documentId || p.id"
              >
                {{ p.firstName }} {{ p.lastName }} ({{ p.email }})
              </option>
            </select>
          </div>

          <div class="form-group mt-3">
            <label>Statut de présence immédiat :</label>
            <div class="presence-toggle-group">
              <button 
                type="button" 
                class="presence-btn btn-present" 
                :class="{ active: walkInIsPresent }" 
                @click="walkInIsPresent = true"
              >
                ✓ Présent (Arrivée maintenant)
              </button>
              <button 
                type="button" 
                class="presence-btn btn-absent" 
                :class="{ active: !walkInIsPresent }" 
                @click="walkInIsPresent = false"
              >
                ✕ Absent
              </button>
            </div>
          </div>

          <div class="form-group mt-3">
            <label for="walkInComment">Observation / Motif d'ajout :</label>
            <input 
              type="text" 
              id="walkInComment" 
              v-model="walkInComment" 
              placeholder="Ex: Présent en renfort, venu spontanément..." 
              class="form-input"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="tool-btn" @click="isAddWalkInModalOpen = false">
            Annuler
          </button>
          <button 
            type="button" 
            class="action-btn primary-btn" 
            :disabled="!selectedWalkInParticipantId" 
            @click="confirmAddWalkInParticipant"
          >
            Valider l'Ajout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../services/api';
import { useAppSettingsStore } from '../stores/appSettings';
import { useCheckInStore } from '../stores/checkInStore';
import { useActiveSchedulerStore } from '../stores/activeScheduler';
import { useGlobalStore } from '../stores/global';

const props = defineProps({
  locations: { type: Array, default: () => [] },
  activities: { type: Array, default: () => [] },
  facilitators: { type: Array, default: () => [] },
  participants: { type: Array, default: () => [] },
  timeslots: { type: Array, default: () => [] }
});

const emit = defineEmits(['navigate', 'refresh-data']);

const checkInStore = useCheckInStore();
const schedulerStore = useActiveSchedulerStore();
const globalStore = useGlobalStore();

// Helper: Format Date to YYYY-MM-DD using local time
function formatDateStr(d) {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Selected Date (YYYY-MM-DD)
const selectedDate = ref(checkInStore.selectedDate || formatDateStr(new Date()));
const selectedSlotFilterId = ref(null);
const searchQuery = ref('');
const statusFilter = ref('all'); // 'all' | 'present' | 'departed' | 'absent' | 'unmarked'

// Local cache for passage comments during typing
const localPassageComments = ref({});

// Walk-in modal state
const isAddWalkInModalOpen = ref(false);
const targetSlotForWalkIn = ref(null);
const selectedWalkInParticipantId = ref('');
const walkInIsPresent = ref(true);
const walkInComment = ref('Ajout ponctuel');

// Add Scheduled Activity modal state
const isAddActivityModalOpen = ref(false);
const targetSlotForActivity = ref(null);
const newActivityTemplateId = ref('');
const newActivityName = ref('');
const newActivityStartTime = ref('10:30');
const newActivityEndTime = ref('11:30');
const newActivityFacilitatorIds = ref([]);
const newActivityDescription = ref('');

// Debounce timer for saving comments
let commentSaveTimeout = null;

// Formatted Selected Date in French
const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return '';
  const [y, m, d] = selectedDate.value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

// All time slots matching the selected date
const daySlots = computed(() => {
  const targetDateStr = selectedDate.value;
  if (!targetDateStr) return [];

  return (props.timeslots || []).filter(slot => {
    if (!slot.startDate) return false;
    const slotDateStr = slot.startDate.slice(0, 10);
    return slotDateStr === targetDateStr;
  }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
});

// Helper: Get display name for slot chip (Room name)
function getSlotDisplayName(slot) {
  if (!slot) return 'Créneau';
  if (slot.location?.name) return slot.location.name;
  if (slot.scheduledActivities && slot.scheduledActivities[0]?.name) return slot.scheduledActivities[0].name;
  if (slot.activityTemplate?.name) return slot.activityTemplate.name;
  return 'Salle';
}

// Slots after applying search and specific slot tab filter
const filteredDaySlots = computed(() => {
  let list = daySlots.value;

  if (selectedSlotFilterId.value) {
    list = list.filter(s => (s.documentId || s.id) === selectedSlotFilterId.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(slot => {
      const locName = (slot.location?.name || '').toLowerCase();
      const hasActMatch = (getSlotActivities(slot) || []).some(a => (a.name || '').toLowerCase().includes(q));
      const hasPartMatch = (slot.participants || []).some(p => 
        (p.firstName || '').toLowerCase().includes(q) || 
        (p.lastName || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
      return locName.includes(q) || hasActMatch || hasPartMatch;
    });
  }

  return list;
});

// Get scheduled activities inside a slot
function getSlotActivities(slot) {
  if (!slot) return [];
  if (slot.scheduledActivities && slot.scheduledActivities.length > 0) {
    return [...slot.scheduledActivities].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }
  if (slot.activityTemplate?.name) {
    return [{
      documentId: `legacy_${slot.documentId || slot.id}`,
      name: slot.activityTemplate.name,
      startDate: slot.startDate,
      endDate: slot.endDate,
      description: slot.activityTemplate.description || '',
      facilitators: slot.facilitators || []
    }];
  }
  return [];
}

// Total count of scheduled participants across all slots today
const totalParticipantsCount = computed(() => {
  let count = 0;
  for (const slot of daySlots.value) {
    count += (slot.participants || []).length;
  }
  return count;
});

// Total currently on site
const totalCurrentlyOnSiteCount = computed(() => {
  let count = 0;
  for (const slot of daySlots.value) {
    count += checkInStore.getSlotStats(slot).currentlyOnSite;
  }
  return count;
});

// Total departed
const totalDepartedCount = computed(() => {
  let count = 0;
  for (const slot of daySlots.value) {
    count += checkInStore.getSlotStats(slot).departed;
  }
  return count;
});

// Total present count today (overall)
const totalPresentCount = computed(() => {
  let count = 0;
  for (const slot of daySlots.value) {
    count += checkInStore.getSlotStats(slot).present;
  }
  return count;
});

// Total absent count today
const totalAbsentCount = computed(() => {
  let count = 0;
  for (const slot of daySlots.value) {
    count += checkInStore.getSlotStats(slot).absent;
  }
  return count;
});

// Total unmarked count today
const totalUnmarkedCount = computed(() => {
  let count = 0;
  for (const slot of daySlots.value) {
    count += checkInStore.getSlotStats(slot).unmarked;
  }
  return count;
});

// Total passages across all slots today
const totalPassagesCount = computed(() => {
  let count = 0;
  for (const slot of daySlots.value) {
    count += checkInStore.getSlotStats(slot).passagesCount;
  }
  return count;
});

// Total scheduled activities count today
const totalScheduledActivitiesCount = computed(() => {
  let count = 0;
  for (const slot of daySlots.value) {
    count += getSlotActivities(slot).length;
  }
  return count;
});

// Number of distinct locations used today
const dayLocationsCount = computed(() => {
  const locSet = new Set();
  for (const slot of daySlots.value) {
    if (slot.location?.name) locSet.add(slot.location.name);
  }
  return locSet.size;
});

// Global Attendance Rate (%)
const overallAttendanceRate = computed(() => {
  if (totalParticipantsCount.value === 0) return 0;
  return Math.round((totalPresentCount.value / totalParticipantsCount.value) * 100);
});

// Filter participants in a slot based on status filter and search query
function getFilteredSlotParticipants(slot) {
  let parts = slot.participants || [];
  const slotId = slot.documentId || slot.id;

  if (statusFilter.value !== 'all') {
    parts = parts.filter(p => {
      const pId = p.documentId || p.id;
      const st = checkInStore.getParticipantStatus(slotId, pId);
      return st === statusFilter.value;
    });
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    parts = parts.filter(p => 
      (p.firstName || '').toLowerCase().includes(q) || 
      (p.lastName || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  }

  return parts;
}

// Available participants for walk-in
const availableParticipantsForWalkIn = computed(() => {
  if (!targetSlotForWalkIn.value) return [];
  const currentSlotPartIds = new Set((targetSlotForWalkIn.value.participants || []).map(p => p.documentId || p.id));
  return (props.participants || []).filter(p => !currentSlotPartIds.has(p.documentId || p.id));
});

// ─── ACTIONS & HELPERS ────────────────────────────────────────────────────────
function navigateDate(days) {
  const curStr = selectedDate.value || formatDateStr(new Date());
  const [y, m, d] = curStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  selectedDate.value = formatDateStr(dt);
  checkInStore.selectedDate = selectedDate.value;
}

function goToToday() {
  selectedDate.value = formatDateStr(new Date());
  checkInStore.selectedDate = selectedDate.value;
}

function formatSlotTimeRange(slot) {
  if (!slot || !slot.startDate) return 'Horaire non défini';
  const start = new Date(slot.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const end = slot.endDate ? new Date(slot.endDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  return end ? `${start} – ${end}` : start;
}

function formatTimeRangeFromDates(startIso, endIso) {
  if (!startIso) return '';
  const s = new Date(startIso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const e = endIso ? new Date(endIso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  return e ? `${s} – ${e}` : s;
}

function formatTimeOnly(isoStr) {
  if (!isoStr) return '';
  const dt = new Date(isoStr);
  return dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function toTimeInputValue(isoStr) {
  if (!isoStr) return '';
  const dt = new Date(isoStr);
  const h = String(dt.getHours()).padStart(2, '0');
  const m = String(dt.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function getInitials(p) {
  if (!p) return '??';
  const f = (p.firstName || '').charAt(0).toUpperCase();
  const l = (p.lastName || '').charAt(0).toUpperCase();
  return `${f}${l}` || '👤';
}

function getStatusLabel(status) {
  switch (status) {
    case 'present': return '🟢 Sur place';
    case 'departed': return '🚪 Parti(e)';
    case 'absent': return '❌ Absent(e)';
    default: return '⏳ À pointer';
  }
}

function getAttendanceColor(rate) {
  if (rate >= 80) return '#10b981'; // green
  if (rate >= 50) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function getSlotBadgeClass(slot) {
  const stats = checkInStore.getSlotStats(slot);
  if (stats.rate >= 80) return 'badge-green';
  if (stats.rate >= 50) return 'badge-amber';
  return 'badge-gray';
}

// Add a new check-in passage
async function addNewPassage(slot, participant, isPresent = true, comment = '') {
  const now = new Date();
  const [y, m, d] = (selectedDate.value || formatDateStr(now)).split('-').map(Number);
  const checkInDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), 0, 0);

  await checkInStore.addCheckInPassage({
    timeSlot: slot,
    participant,
    isPresent,
    checkInTime: checkInDate.toISOString(),
    comment
  });
}

// Quick record checkout
async function recordNowDeparture(passage) {
  const now = new Date();
  const [y, m, d] = (selectedDate.value || formatDateStr(now)).split('-').map(Number);
  const checkOutDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), 0, 0);

  await checkInStore.recordCheckOut(passage.documentId || passage.id, checkOutDate.toISOString());
  globalStore.addSuccess('Heure de départ enregistrée.', 'Départ noté');
}

// Clear checkout time (participant still on site)
async function clearDeparture(passage) {
  await checkInStore.updatePassage(passage.documentId || passage.id, {
    checkOutTime: null
  });
}

// Handle time input change (checkInTime or checkOutTime)
async function onPassageTimeChange(passage, field, timeHHMM) {
  if (!timeHHMM) {
    if (field === 'checkOutTime') {
      await clearDeparture(passage);
    }
    return;
  }

  const [h, m] = timeHHMM.split(':').map(Number);
  const [y, mon, d] = (selectedDate.value || formatDateStr(new Date())).split('-').map(Number);
  const targetDate = new Date(y, mon - 1, d, h, m, 0, 0);

  await checkInStore.updatePassage(passage.documentId || passage.id, {
    [field]: targetDate.toISOString()
  });
}

// Delete passage
async function deletePassage(passage) {
  if (!confirm('Supprimer ce passage d\'émargement ?')) return;
  await checkInStore.deletePassage(passage.documentId || passage.id);
}

// Mark all participants of a slot
async function markAllSlotParticipants(slot, isPresent) {
  const participants = slot.participants || [];
  if (participants.length === 0) return;

  await checkInStore.markAllForSlot({
    timeSlot: slot,
    participants,
    isPresent
  });
}

// Reset check-ins for a slot
async function resetSlotCheckIns(slot) {
  if (!confirm(`Voulez-vous vraiment réinitialiser les pointages pour le créneau "${slot.location?.name || 'Créneau'}" ?`)) {
    return;
  }
  await checkInStore.resetSlotCheckIns({
    timeSlot: slot,
    participants: slot.participants || []
  });
}

// Get passage comment from local cache or store
function getPassageCommentModel(passage) {
  const id = passage.documentId || passage.id;
  if (localPassageComments.value[id] !== undefined) {
    return localPassageComments.value[id];
  }
  return passage.comment || '';
}

// Handle passage comment typing
function onPassageCommentInput(passage, value) {
  const id = passage.documentId || passage.id;
  localPassageComments.value[id] = value;

  if (commentSaveTimeout) clearTimeout(commentSaveTimeout);
  commentSaveTimeout = setTimeout(() => {
    savePassageComment(passage, value);
  }, 700);
}

// Handle passage comment blur
function onPassageCommentBlur(passage) {
  const id = passage.documentId || passage.id;
  const value = localPassageComments.value[id];
  if (value !== undefined) {
    savePassageComment(passage, value);
  }
}

// Apply quick suggestion chip to passage
function applyPassageQuickComment(passage, text) {
  const id = passage.documentId || passage.id;
  localPassageComments.value[id] = text;
  savePassageComment(passage, text);
}

async function savePassageComment(passage, comment) {
  await checkInStore.updatePassage(passage.documentId || passage.id, {
    comment
  });
}

// Open Walk-In modal
function openAddWalkInModal(slot) {
  targetSlotForWalkIn.value = slot;
  selectedWalkInParticipantId.value = '';
  walkInIsPresent.value = true;
  walkInComment.value = 'Ajout ponctuel';
  isAddWalkInModalOpen.value = true;
}

// Confirm addition of walk-in participant
async function confirmAddWalkInParticipant() {
  if (!targetSlotForWalkIn.value || !selectedWalkInParticipantId.value) return;

  const p = props.participants.find(part => (part.documentId || part.id) === selectedWalkInParticipantId.value);
  if (!p) return;

  // Add participant to the slot in scheduler store
  const slotId = targetSlotForWalkIn.value.documentId || targetSlotForWalkIn.value.id;
  await schedulerStore.addParticipantToSlot(slotId, selectedWalkInParticipantId.value);

  // Mark check-in passage
  await checkInStore.addCheckInPassage({
    timeSlot: targetSlotForWalkIn.value,
    participant: p,
    isPresent: walkInIsPresent.value,
    comment: walkInComment.value
  });

  isAddWalkInModalOpen.value = false;
  globalStore.addSuccess(`${p.firstName} ${p.lastName} ajouté(e) avec succès au créneau.`, 'Participant ajouté');
}

// ─── ADD SCHEDULED ACTIVITY IN SLOT MODAL ───
function openAddActivityModal(slot) {
  targetSlotForActivity.value = slot;
  newActivityTemplateId.value = '';
  newActivityName.value = '';
  newActivityStartTime.value = slot?.startDate ? toTimeInputValue(slot.startDate) : '10:30';
  newActivityEndTime.value = slot?.endDate ? toTimeInputValue(slot.endDate) : '11:30';
  newActivityFacilitatorIds.value = (slot?.facilitators || []).map(f => f.documentId || f.id);
  newActivityDescription.value = '';
  isAddActivityModalOpen.value = true;
}

function onSelectActivityTemplate() {
  if (!newActivityTemplateId.value) return;
  const tpl = props.activities.find(a => (a.documentId || a.id) === newActivityTemplateId.value);
  if (tpl) {
    newActivityName.value = tpl.name;
    if (tpl.description) newActivityDescription.value = tpl.description;
  }
}

async function confirmAddScheduledActivity() {
  if (!targetSlotForActivity.value || !newActivityName.value.trim()) return;

  const slot = targetSlotForActivity.value;
  const [y, mon, d] = (selectedDate.value || formatDateStr(new Date())).split('-').map(Number);

  const [sh, sm] = newActivityStartTime.value.split(':').map(Number);
  const [eh, em] = newActivityEndTime.value.split(':').map(Number);

  const startDt = new Date(y, mon - 1, d, sh, sm, 0, 0);
  const endDt = new Date(y, mon - 1, d, eh, em, 0, 0);

  const newActivityObj = {
    documentId: `sch_act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    id: `sch_act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name: newActivityName.value.trim(),
    startDate: startDt.toISOString(),
    endDate: endDt.toISOString(),
    description: newActivityDescription.value,
    facilitators: newActivityFacilitatorIds.value.map(id => props.facilitators.find(f => (f.documentId || f.id) === id)).filter(Boolean)
  };

  const appSettings = useAppSettingsStore();
  if (!appSettings.useMockData) {
    try {
      const res = await api.post('/scheduled-activities', {
        data: {
          name: newActivityName.value.trim(),
          startDate: startDt.toISOString(),
          endDate: endDt.toISOString(),
          description: newActivityDescription.value,
          timeSlot: slot.documentId || slot.id,
          activityTemplate: newActivityTemplateId.value || null,
          location: slot.location?.documentId || slot.location?.id || null,
          facilitators: newActivityFacilitatorIds.value
        }
      });
      if (res.data?.data) {
        newActivityObj.documentId = res.data.data.documentId || res.data.data.id;
        newActivityObj.id = res.data.data.id;
      }
    } catch (e) {
      console.warn('Erreur lors de la persistance de l’activité programmée dans Strapi:', e);
    }
  }

  if (!slot.scheduledActivities) {
    slot.scheduledActivities = [];
  }
  slot.scheduledActivities.push(newActivityObj);

  isAddActivityModalOpen.value = false;
  globalStore.addSuccess(`Activité "${newActivityName.value}" programmée dans le créneau.`, 'Activité ajoutée');
}

// Print attendance sheet
function printAttendanceSheet() {
  window.print();
}

// Watch selectedDate change to sync with store
watch(selectedDate, (newDate) => {
  checkInStore.selectedDate = newDate;
});

onMounted(async () => {
  await checkInStore.fetchCheckIns();
});
</script>

<style scoped>
/* ════════════════ MAIN CONTAINER ════════════════ */
.checkin-view-root {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0.25rem 2rem 0.25rem;
  width: 100%;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ════════════════ HEADER & CONTROLS ════════════════ */
.view-header {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.header-title-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon-box {
  width: 3rem;
  height: 3rem;
  border-radius: 0.85rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.4));
  border: 1px solid rgba(59, 130, 246, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
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
  color: #f8fafc;
  margin: 0;
}

.mode-tag-pill {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.2rem 0.55rem;
  border-radius: 2rem;
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.checkin-badge-pill {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.65rem;
  border-radius: 2rem;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.subtitle {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0.25rem 0 0 0;
}

/* ════════════════ TOOLBAR & NAV ROW ════════════════ */
.header-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.date-nav-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-arrow-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  padding: 0.45rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.nav-arrow-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
}

.today-btn {
  background: rgba(59, 130, 246, 0.18);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #93c5fd;
  padding: 0.45rem 0.9rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.today-btn:hover {
  background: rgba(59, 130, 246, 0.3);
  color: #ffffff;
}

.period-title-block {
  display: flex;
  flex-direction: column;
  margin: 0 0.5rem;
}

.current-period-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
  text-transform: capitalize;
}

.period-subtitle {
  font-size: 0.75rem;
  color: #64748b;
}

.direct-date-input {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}

/* ════════════════ ACTIONS & SEARCH TOOLS ════════════════ */
.action-tools-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.85rem;
  color: #64748b;
  pointer-events: none;
}

.search-input-field {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  padding: 0.45rem 2rem 0.45rem 2.1rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  width: 260px;
  transition: all 0.2s;
}

.search-input-field:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
  width: 300px;
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.75rem;
}

.status-filters-pills {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.filter-pill {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.35rem 0.65rem;
  border-radius: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-pill:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.05);
}

.filter-pill.active {
  background: rgba(255, 255, 255, 0.15);
  color: #f8fafc;
}

.filter-pill.present-pill.active {
  background: rgba(16, 185, 129, 0.25);
  color: #34d399;
}

.filter-pill.departed-pill.active {
  background: rgba(148, 163, 184, 0.25);
  color: #cbd5e1;
}

.filter-pill.absent-pill.active {
  background: rgba(239, 68, 68, 0.25);
  color: #f87171;
}

.filter-pill.unmarked-pill.active {
  background: rgba(245, 158, 11, 0.25);
  color: #fbbf24;
}

/* ════════════════ KPI CARDS ════════════════ */
.kpi-grid-wrapper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.75rem;
  padding: 1rem;
  transition: transform 0.2s, border-color 0.2s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.15);
}

.kpi-card.wide-card {
  grid-column: span 2;
}

.kpi-icon-box {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  flex-shrink: 0;
}

.kpi-icon-box.blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.kpi-icon-box.purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
.kpi-icon-box.green { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.kpi-icon-box.amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

.kpi-content {
  display: flex;
  flex-direction: column;
}

.kpi-label {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 500;
}

.kpi-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.2;
}

.kpi-value.highlight-green { color: #34d399; }
.kpi-value.highlight-amber { color: #fbbf24; }

.kpi-sub {
  font-size: 0.7rem;
  color: #64748b;
}

/* Gauge Content */
.kpi-gauge-content {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}

.gauge-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.gauge-pct {
  font-size: 1.25rem;
  font-weight: 800;
  color: #34d399;
}

.gauge-bar-bg {
  width: 100%;
  height: 0.65rem;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.gauge-bar-fill {
  height: 100%;
  border-radius: 1rem;
  transition: width 0.4s ease;
}

.gauge-sub {
  font-size: 0.7rem;
  color: #94a3b8;
}

/* ════════════════ CHIPS ════════════════ */
.slot-filter-chips-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.chips-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
}

.chips-scrollable {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.slot-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 0.35rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.slot-chip:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
}

.slot-chip.active {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(59, 130, 246, 0.5);
  color: #93c5fd;
  font-weight: 600;
}

.chip-time {
  font-weight: 700;
  color: #67e8f9;
}

.chip-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 1rem;
  font-weight: 700;
}

.badge-green { background: rgba(16, 185, 129, 0.3); color: #34d399; }
.badge-amber { background: rgba(245, 158, 11, 0.3); color: #fbbf24; }
.badge-gray { background: rgba(100, 116, 139, 0.3); color: #cbd5e1; }

/* ════════════════ SLOTS CHECKIN LIST ════════════════ */
.slots-checkin-list {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.slot-checkin-card {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s;
}

.slot-checkin-card.is-focused {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}

/* Card Header */
.slot-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: rgba(30, 41, 59, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
}

.slot-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.slot-time-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.35);
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
}

.slot-activity-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.slot-meta-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 0.35rem;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.fac-tag { color: #fcd34d; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); }
.cap-tag { color: #5eead4; background: rgba(20, 184, 166, 0.15); border-color: rgba(20, 184, 166, 0.3); }
.enrolled-tag { color: #c084fc; background: rgba(168, 85, 247, 0.15); border-color: rgba(168, 85, 247, 0.3); }

/* Slot Header Right & Actions */
.slot-header-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.slot-progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 140px;
}

.slot-progress-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
}

.prog-text { color: #cbd5e1; }
.prog-pct { font-weight: 700; }

.slot-progress-bar {
  width: 100%;
  height: 0.45rem;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 1rem;
  overflow: hidden;
}

.slot-progress-fill {
  height: 100%;
  border-radius: 1rem;
  transition: width 0.3s;
}

.slot-action-buttons {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.slot-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  padding: 0.35rem 0.65rem;
  border-radius: 0.45rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.slot-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #f8fafc;
}

.mark-all-present-btn {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.35);
  color: #34d399;
}
.mark-all-present-btn:hover {
  background: rgba(16, 185, 129, 0.3);
  color: #ffffff;
}

.mark-all-absent-btn {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}
.mark-all-absent-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #ffffff;
}

.add-extra-btn {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.35);
  color: #a5b4fc;
}
.add-extra-btn:hover {
  background: rgba(99, 102, 241, 0.3);
  color: #ffffff;
}

/* ════════════════ SCHEDULED ACTIVITIES SECTION ════════════════ */
.slot-scheduled-activities-section {
  background: rgba(15, 23, 42, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.scheduled-activities-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.activities-header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sec-icon {
  font-size: 1.1rem;
}

.sec-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #cbd5e1;
}

.act-count-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.add-act-btn {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #93c5fd;
  padding: 0.3rem 0.75rem;
  border-radius: 0.45rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-act-btn:hover {
  background: rgba(59, 130, 246, 0.3);
  color: #ffffff;
}

.scheduled-activities-list {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.scheduled-act-card {
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid #38bdf8;
  border-radius: 0.5rem;
  padding: 0.6rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 220px;
  flex-shrink: 0;
}

.act-time-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: #38bdf8;
}

.act-info {
  display: flex;
  flex-direction: column;
}

.act-name {
  font-size: 0.88rem;
  color: #f8fafc;
}

.act-desc {
  font-size: 0.75rem;
  color: #94a3b8;
}

.act-facilitators {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
}

.fac-chip {
  font-size: 0.7rem;
  color: #fcd34d;
  background: rgba(245, 158, 11, 0.15);
  padding: 0.1rem 0.4rem;
  border-radius: 0.3rem;
}

.no-activities-inline {
  font-size: 0.8rem;
  color: #64748b;
  padding: 0.25rem 0;
}

/* ════════════════ PARTICIPANTS SECTION ════════════════ */
.participants-section-header {
  padding: 0 0 0.5rem 0;
}

.section-title-wrapper h4 {
  font-size: 1rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.section-sub {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0.2rem 0 0 0;
}

.checkin-participants-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0;
}

.participant-checkin-block {
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: all 0.2s;
}

.participant-checkin-block:hover {
  background: rgba(30, 41, 59, 0.65);
  border-color: rgba(255, 255, 255, 0.12);
}

.participant-checkin-block.status-present {
  border-left: 4px solid #10b981;
}

.participant-checkin-block.status-departed {
  border-left: 4px solid #94a3b8;
}

.participant-checkin-block.status-absent {
  border-left: 4px solid #ef4444;
}

.participant-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.participant-profile-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.participant-avatar {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #334155, #1e293b);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  color: #f8fafc;
  flex-shrink: 0;
}

.participant-identity {
  display: flex;
  flex-direction: column;
}

.name-status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.participant-name {
  font-size: 0.95rem;
  color: #f8fafc;
}

.status-pill {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.status-pill.present { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.status-pill.departed { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }
.status-pill.absent { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.status-pill.unmarked { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

.participant-email {
  font-size: 0.75rem;
  color: #64748b;
}

.participant-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.add-passage-btn {
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: #a5b4fc;
  padding: 0.35rem 0.75rem;
  border-radius: 0.45rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-passage-btn:hover {
  background: rgba(99, 102, 241, 0.3);
  color: #ffffff;
}

/* Presence Buttons */
.presence-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  padding: 0.4rem 0.85rem;
  border-radius: 0.45rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.presence-btn.btn-present {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.presence-btn.btn-present:hover {
  background: #10b981;
  color: #ffffff;
}

.presence-btn.btn-absent {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.presence-btn.btn-absent:hover {
  background: #ef4444;
  color: #ffffff;
}

/* ─── PASSAGES CONTAINER ─── */
.passages-container {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.25rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.passage-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.passage-badge-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.passage-num {
  font-size: 0.75rem;
  font-weight: 700;
  color: #93c5fd;
}

.passage-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 0.35rem;
}

.tag-on-site { background: rgba(16, 185, 129, 0.2); color: #34d399; }
.tag-departed { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }
.tag-absent { background: rgba(239, 68, 68, 0.2); color: #f87171; }

.passage-times-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
}

.time-field-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.time-field-box label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
}

.time-input {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  padding: 0.3rem 0.5rem;
  border-radius: 0.35rem;
  font-size: 0.8rem;
  font-family: inherit;
}

.departure-control-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.quick-checkout-btn {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
  padding: 0.3rem 0.6rem;
  border-radius: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-checkout-btn:hover {
  background: #f59e0b;
  color: #000000;
}

.clear-checkout-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  padding: 0.3rem 0.5rem;
  border-radius: 0.35rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.clear-checkout-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #ffffff;
}

.delete-passage-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.2rem;
  transition: color 0.15s;
}

.delete-passage-btn:hover {
  color: #f87171;
}

.passage-comment-wrapper {
  display: flex;
  flex-direction: column;
}

.passage-comment-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  padding: 0.4rem 0.65rem;
  border-radius: 0.35rem;
  font-size: 0.82rem;
  transition: all 0.2s;
}

.passage-comment-input:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.quick-chips-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.35rem;
}

.quick-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 0.15rem 0.45rem;
  border-radius: 0.3rem;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-chip:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  border-color: rgba(255, 255, 255, 0.2);
}

/* Empty & Loading States */
.empty-state-box, .loading-state-box, .no-participants-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-state-box h3 {
  font-size: 1.25rem;
  color: #f8fafc;
  margin: 0 0 0.5rem 0;
}

.empty-state-box p, .no-participants-box p {
  color: #94a3b8;
  max-width: 500px;
  font-size: 0.9rem;
  margin: 0 0 1.25rem 0;
}

.empty-actions {
  display: flex;
  gap: 0.75rem;
}

.primary-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #ffffff;
  border: none;
  padding: 0.55rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-btn:hover {
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.tool-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.print-btn {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  color: #93c5fd;
}

.print-btn:hover {
  background: rgba(59, 130, 246, 0.35);
  color: #ffffff;
}

/* ════════════════ MODAL ════════════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-card {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  background: rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h3 {
  font-size: 1.15rem;
  color: #f8fafc;
  margin: 0;
}

.modal-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
}

.modal-desc {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-row {
  display: flex;
  gap: 0.75rem;
}

.form-group.half {
  flex: 1;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #cbd5e1;
}

.form-select, .form-input {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  padding: 0.6rem 0.85rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

.form-select.multiple-select {
  height: 80px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: rgba(15, 23, 42, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* ════════════════ PRINT MEDIA STYLES ════════════════ */
.print-only {
  display: none !important;
}

@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .no-print {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  .checkin-view-root {
    padding: 0;
    gap: 1.5rem;
  }

  .print-header-document {
    border-bottom: 2px solid #000000;
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }

  .print-brand-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .print-brand-info h1 {
    font-size: 16pt;
    margin: 0;
    color: #000000;
  }

  .print-brand-info p {
    font-size: 11pt;
    color: #555555;
    margin: 0.2rem 0 0 0;
  }

  .print-date-badge {
    font-size: 13pt;
    border: 1px solid #000000;
    padding: 0.3rem 0.8rem;
    border-radius: 4px;
  }

  .print-kpi-summary {
    font-size: 10pt;
    margin-top: 0.5rem;
    color: #333333;
  }

  .slot-checkin-card {
    background: #ffffff !important;
    border: 1px solid #000000 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    page-break-inside: avoid;
    margin-bottom: 2rem;
  }

  .slot-card-header {
    background: #f1f5f9 !important;
    border-bottom: 1px solid #000000 !important;
    padding: 0.75rem 1rem !important;
  }

  .slot-activity-name {
    color: #000000 !important;
    font-size: 12pt !important;
  }

  .meta-tag {
    background: transparent !important;
    color: #000000 !important;
    border: none !important;
    padding: 0 !important;
  }

  .participant-checkin-block {
    background: #ffffff !important;
    border: 1px solid #cccccc !important;
    border-radius: 0 !important;
    margin-bottom: 0.75rem;
  }

  .participant-avatar {
    display: none !important;
  }

  .participant-name {
    color: #000000 !important;
    font-size: 10pt !important;
  }

  .passage-card {
    background: #f8fafc !important;
    border: 1px dashed #999999 !important;
    margin-top: 0.4rem;
  }

  .print-passage-times {
    font-size: 9pt;
    color: #000000;
  }

  .print-passage-comment {
    font-size: 9pt;
    font-style: italic;
    color: #333333;
    margin-top: 0.2rem;
  }

  .print-slot-sign-row {
    display: flex !important;
    justify-content: space-between;
    padding: 1rem;
    font-size: 9pt;
    border-top: 1px dashed #666666;
    margin-top: 0.5rem;
  }
}
</style>
