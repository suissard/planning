<template>
  <div class="pil-root">
    <div v-if="!participants.length" class="pil-empty">
      Aucun bénéficiaire affecté pour le moment.
    </div>
    <ul v-else class="pil-list">
      <li v-for="p in sortedParticipants" :key="p.documentId || p.id || p.email" class="pil-item">
        <span class="pil-avatar">{{ initials(p) }}</span>
        <div class="pil-main">
          <span class="pil-name">{{ p.firstName }} {{ p.lastName }}</span>
          <span v-if="p.other" class="pil-note" :title="p.other">⚕️ {{ p.other }}</span>
        </div>
        <span v-if="p.transport" class="pil-chip transport" title="Transport assuré par l'accueil de jour">🚐 Transport</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  participants: { type: Array, default: () => [] }
});

const sortedParticipants = computed(() =>
  [...props.participants].sort((a, b) =>
    `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(`${b.lastName || ''} ${b.firstName || ''}`, 'fr', { sensitivity: 'base' })
  )
);

function initials(p) {
  return `${(p.firstName || '?')[0] || ''}${(p.lastName || '')[0] || ''}`.toUpperCase();
}
</script>

<style scoped>
.pil-empty {
  font-size: 0.82rem;
  color: var(--text-muted);
  padding: 0.5rem 0;
  font-style: italic;
}
.pil-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 0.4rem;
}
.pil-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.6rem;
  border-radius: var(--radius-sm);
  background: var(--panel-bg-subtle);
  border: 1px solid var(--border-color-subtle);
  min-width: 0;
}
.pil-avatar {
  flex-shrink: 0;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent-text);
  background: var(--accent-light);
  border: 1px solid var(--accent-border);
}
.pil-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.pil-name {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
}
.pil-note {
  font-size: 0.72rem;
  color: var(--warm-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pil-chip {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-pill);
}
.pil-chip.transport {
  background: var(--accent-light);
  color: var(--accent-text);
  border: 1px solid var(--accent-border);
}
</style>
