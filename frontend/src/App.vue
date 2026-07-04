<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-logo">
        <span class="logo-icon">⚡</span>
        <h1>AetherScheduler</h1>
      </div>
      <div class="header-status">
        <span class="status-indicator online"></span>
        <span class="status-text">Backend Hook Loaded</span>
      </div>
    </header>

    <main class="app-main">
      <section class="welcome-card">
        <h2>System Abstract Architecture Initialized</h2>
        <p>The scheduler database model and booking engine constraints are ready to deploy.</p>
        <div class="system-grid">
          <div class="grid-item">
            <h3>Facilities / Locations</h3>
            <span class="badge">Model Available</span>
          </div>
          <div class="grid-item">
            <h3>Activity Templates</h3>
            <span class="badge">Model Available</span>
          </div>
          <div class="grid-item">
            <h3>Participants</h3>
            <span class="badge">Model Available</span>
          </div>
          <div class="grid-item">
            <h3>Facilitators</h3>
            <span class="badge">Model Available</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 2rem;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 1.5rem;
}

.header-logo h1 {
  font-size: 1.5rem;
  background: linear-gradient(to right, #a5b4fc, #818cf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.online {
  background-color: var(--success);
  box-shadow: 0 0 8px var(--success);
}

.app-main {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.welcome-card {
  background: var(--panel-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  padding: 3rem;
  max-width: 600px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.welcome-card h2 {
  font-size: 1.75rem;
  margin-bottom: 1rem;
}

.welcome-card p {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.system-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.grid-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  padding: 1.25rem;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.grid-item h3 {
  font-size: 0.95rem;
  font-weight: 500;
}

.badge {
  font-size: 0.75rem;
  background-color: var(--primary-light);
  color: var(--primary-hover);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  border: 1px solid rgba(99, 102, 241, 0.3);
}
</style>
