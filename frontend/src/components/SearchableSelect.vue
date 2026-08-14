<template>
  <div class="searchable-select-root" ref="rootRef" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <label v-if="label" class="searchable-select-label">{{ label }}</label>

    <div class="searchable-select-container" @click="handleContainerClick">
      <!-- Search Icon or Type Icon -->
      <span class="select-icon">{{ icon || defaultIcon }}</span>

      <!-- Text input for real-time search -->
      <input
        ref="inputRef"
        type="text"
        class="searchable-select-input"
        :value="searchQuery"
        @input="onInput"
        @focus="openDropdown"
        @keydown.down.prevent="navigateOptions(1)"
        @keydown.up.prevent="navigateOptions(-1)"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.esc.prevent="closeDropdown"
        :placeholder="displayPlaceholder"
        :disabled="disabled"
        autocomplete="off"
        spellcheck="false"
      />

      <!-- Clear / Reset button when text or item is selected -->
      <button
        v-if="searchQuery || selectedItem"
        type="button"
        class="clear-btn"
        @click.stop="clearSelection"
        title="Effacer la sélection / recherche"
      >
        ✕
      </button>

      <!-- Dropdown Toggle Arrow -->
      <span class="dropdown-arrow" :class="{ rotated: isOpen }">▼</span>
    </div>

    <!-- Dropdown Menu -->
    <transition name="dropdown-fade">
      <div v-if="isOpen" class="searchable-select-dropdown" ref="dropdownRef">
        <!-- Results Counter / Summary -->
        <div class="dropdown-header">
          <span class="results-count">
            {{ filteredOptions.length }} résultat{{ filteredOptions.length > 1 ? 's' : '' }}
            <template v-if="searchQuery.trim()"> pour "<strong>{{ searchQuery }}</strong>"</template>
          </span>
          <span v-if="selectedItem" class="selected-hint">
            ✓ {{ getItemLabel(selectedItem) }}
          </span>
        </div>

        <!-- Options List -->
        <div class="options-list" ref="optionsListRef">
          <div
            v-for="(item, index) in filteredOptions"
            :key="getItemKey(item)"
            class="option-item"
            :class="{
              'is-selected': isSelected(item),
              'is-highlighted': index === highlightedIndex
            }"
            @mouseenter="highlightedIndex = index"
            @click.stop="selectItem(item)"
          >
            <!-- Avatar / Icon -->
            <div class="option-avatar">
              {{ getItemIcon(item) }}
            </div>

            <!-- Item Main Information -->
            <div class="option-content">
              <div class="option-name">
                <span v-html="highlightMatches(getItemLabel(item))"></span>
                <span v-if="item.skills" class="option-badge skills-badge">{{ item.skills }}</span>
                <span v-if="item.capacity" class="option-badge capacity-badge">{{ item.capacity }} pers.</span>
              </div>
              <div v-if="item.email || item.description" class="option-sub">
                <span v-if="item.email" class="option-email" v-html="highlightMatches(item.email)"></span>
                <span v-else-if="item.description" class="option-desc">{{ item.description }}</span>
              </div>
            </div>

            <!-- Checkmark for selected item -->
            <span v-if="isSelected(item)" class="selected-checkmark">✓</span>
          </div>

          <!-- Empty State -->
          <div v-if="filteredOptions.length === 0" class="no-options">
            <span class="no-options-icon">🔍</span>
            <p>{{ emptyMessage || 'Aucun résultat correspondant' }}</p>
            <small v-if="searchQuery">Essayez une autre lettre ou effacez la recherche</small>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'SearchableSelect',
  props: {
    modelValue: {
      type: [String, Number, null],
      default: null
    },
    options: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: 'Rechercher par lettre, nom ou email...'
    },
    label: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'facilitator' // 'facilitator', 'participant', 'location', 'generic'
    },
    emptyMessage: {
      type: String,
      default: 'Aucune personne trouvée'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'change', 'clear'],
  data() {
    return {
      isOpen: false,
      searchQuery: '',
      highlightedIndex: 0
    };
  },
  computed: {
    defaultIcon() {
      switch (this.type) {
        case 'facilitator': return '👨‍🏫';
        case 'participant': return '👥';
        case 'location': return '📍';
        default: return '🔍';
      }
    },
    selectedItem() {
      if (!this.modelValue) return null;
      return this.options.find(item => this.getItemKey(item) === this.modelValue || item.id === this.modelValue) || null;
    },
    displayPlaceholder() {
      if (this.selectedItem && !this.isOpen) {
        return this.getItemLabel(this.selectedItem);
      }
      return this.placeholder;
    },
    normalizedQuery() {
      return this.removeAccents(this.searchQuery.trim().toLowerCase());
    },
    filteredOptions() {
      if (!this.normalizedQuery) {
        return this.options;
      }
      return this.options.filter(item => {
        const fullName = this.removeAccents(this.getItemLabel(item).toLowerCase());
        const email = this.removeAccents((item.email || '').toLowerCase());
        const skills = this.removeAccents((item.skills || '').toLowerCase());
        const desc = this.removeAccents((item.description || '').toLowerCase());
        const locationName = this.removeAccents((item.name || '').toLowerCase());

        return (
          fullName.includes(this.normalizedQuery) ||
          email.includes(this.normalizedQuery) ||
          skills.includes(this.normalizedQuery) ||
          desc.includes(this.normalizedQuery) ||
          locationName.includes(this.normalizedQuery)
        );
      });
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(val) {
        if (!val) {
          if (!this.isOpen) this.searchQuery = '';
        }
      }
    },
    isOpen(val) {
      if (val) {
        this.highlightedIndex = 0;
        this.$nextTick(() => {
          if (this.$refs.inputRef) {
            this.$refs.inputRef.select();
          }
        });
      } else {
        // When closing, reset search query if an item is selected
        if (this.selectedItem) {
          this.searchQuery = '';
        }
      }
    }
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    removeAccents(str) {
      return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    },
    getItemKey(item) {
      if (!item) return '';
      return item.documentId || item.id || String(item);
    },
    getItemLabel(item) {
      if (!item) return '';
      if (this.type === 'location' || item.name) {
        return item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim();
      }
      return `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.name || item.email || '';
    },
    getItemIcon(item) {
      if (this.type === 'facilitator') return '👨‍🏫';
      if (this.type === 'participant') return '👤';
      if (this.type === 'location') return '📍';
      return '✨';
    },
    isSelected(item) {
      if (!this.modelValue || !item) return false;
      const key = this.getItemKey(item);
      return key === this.modelValue || item.id === this.modelValue;
    },
    handleContainerClick() {
      if (this.disabled) return;
      this.isOpen = true;
      if (this.$refs.inputRef) {
        this.$refs.inputRef.focus();
      }
    },
    openDropdown() {
      if (this.disabled) return;
      this.isOpen = true;
    },
    closeDropdown() {
      this.isOpen = false;
    },
    handleClickOutside(event) {
      if (this.$refs.rootRef && !this.$refs.rootRef.contains(event.target)) {
        this.closeDropdown();
      }
    },
    onInput(event) {
      this.searchQuery = event.target.value;
      this.isOpen = true;
      this.highlightedIndex = 0;
    },
    navigateOptions(direction) {
      if (!this.isOpen) {
        this.isOpen = true;
        return;
      }
      const count = this.filteredOptions.length;
      if (count === 0) return;
      this.highlightedIndex = (this.highlightedIndex + direction + count) % count;
      this.scrollHighlightedIntoView();
    },
    scrollHighlightedIntoView() {
      this.$nextTick(() => {
        const list = this.$refs.optionsListRef;
        if (!list) return;
        const highlightedEl = list.children[this.highlightedIndex];
        if (highlightedEl) {
          highlightedEl.scrollIntoView({ block: 'nearest' });
        }
      });
    },
    selectHighlighted() {
      if (this.filteredOptions.length > 0 && this.highlightedIndex >= 0) {
        const item = this.filteredOptions[this.highlightedIndex];
        if (item) {
          this.selectItem(item);
        }
      }
    },
    selectItem(item) {
      const key = this.getItemKey(item);
      this.$emit('update:modelValue', key);
      this.$emit('change', item);
      this.searchQuery = '';
      this.isOpen = false;
    },
    clearSelection() {
      this.searchQuery = '';
      this.$emit('update:modelValue', null);
      this.$emit('change', null);
      this.$emit('clear');
      if (this.$refs.inputRef) {
        this.$refs.inputRef.focus();
      }
    },
    highlightMatches(text) {
      if (!text) return '';
      if (!this.searchQuery.trim()) return this.escapeHtml(text);

      const query = this.searchQuery.trim();
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return this.escapeHtml(text).replace(regex, '<mark class="select-match">$1</mark>');
    },
    escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }
};
</script>

<style scoped>
.searchable-select-root {
  position: relative;
  width: 100%;
  font-family: inherit;
}

.searchable-select-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary, #94a3b8);
  margin-bottom: 0.4rem;
}

.searchable-select-container {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--bg-input, rgba(15, 23, 42, 0.6));
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.12));
  border-radius: 0.6rem;
  padding: 0.4rem 0.8rem;
  min-height: 2.75rem;
  cursor: text;
  transition: all 0.2s ease;
}

.searchable-select-root.is-open .searchable-select-container,
.searchable-select-container:focus-within {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.25);
  background: rgba(15, 23, 42, 0.85);
}

.select-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  user-select: none;
}

.searchable-select-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary, #f8fafc);
  font-size: 0.95rem;
  font-weight: 500;
  min-width: 80px;
  width: 100%;
}

.searchable-select-input::placeholder {
  color: var(--text-secondary, #94a3b8);
  opacity: 0.85;
}

.clear-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: var(--text-secondary, #94a3b8);
  border-radius: 50%;
  width: 1.4rem;
  height: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.dropdown-arrow {
  font-size: 0.65rem;
  color: var(--text-secondary, #94a3b8);
  transition: transform 0.2s ease;
  user-select: none;
  flex-shrink: 0;
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
}

/* Dropdown Menu */
.searchable-select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
  z-index: 1050;
  overflow: hidden;
  backdrop-filter: blur(16px);
  animation: dropdown-pop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dropdown-pop {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.85rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.results-count strong {
  color: #38bdf8;
}

.selected-hint {
  color: #10b981;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.options-list {
  max-height: 260px;
  overflow-y: auto;
  padding: 0.35rem;
  scroll-behavior: smooth;
}

.options-list::-webkit-scrollbar {
  width: 6px;
}

.options-list::-webkit-scrollbar-track {
  background: transparent;
}

.options-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.option-item:hover,
.option-item.is-highlighted {
  background: rgba(13, 148, 136, 0.15);
  color: #ffffff;
}

.option-item.is-selected {
  background: rgba(13, 148, 136, 0.28);
  border: 1px solid rgba(13, 148, 136, 0.4);
}

.option-avatar {
  font-size: 1.2rem;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  flex-shrink: 0;
}

.option-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.option-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.option-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 1rem;
  font-weight: 500;
}

.skills-badge {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.capacity-badge {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.option-sub {
  font-size: 0.78rem;
  color: var(--text-secondary, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-checkmark {
  color: #10b981;
  font-weight: bold;
  font-size: 1rem;
  margin-left: 0.5rem;
}

.no-options {
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--text-secondary, #94a3b8);
}

.no-options-icon {
  font-size: 1.8rem;
  display: block;
  margin-bottom: 0.4rem;
  opacity: 0.6;
}

.no-options p {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
}

.no-options small {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.75rem;
  color: #64748b;
}

:deep(.select-match) {
  background: rgba(234, 179, 8, 0.35);
  color: #fef08a;
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 700;
}

/* Dropdown Transitions */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
