<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
// Root App shell – all routing handled by vue-router.
</script>

<style>
/* Global High Contrast Accessibility Overrides (Light Mode) */

/* Ensure standard text is a deep, legible charcoal slate */
.text-medium-emphasis, 
.v-card-subtitle,
.v-list-item-subtitle {
  color: #334155 !important; /* slate-700 */
  opacity: 1 !important;
}

/* Secondary descriptions */
.text-disabled {
  color: #64748b !important; /* slate-500 */
  opacity: 1 !important;
}

/* Table headers - bold, clean, and dark slate */
.v-data-table-header__th,
.v-table th {
  color: #0f172a !important; /* slate-900 */
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Table content cells - crisp slate-700 */
.v-table td {
  color: #334155 !important;
  font-size: 0.9rem !important;
}

/* Minimal code blocks */
code {
  background-color: #f1f5f9 !important;
  color: #b88100 !important; /* Rich gold/brown */
  padding: 2px 6px !important;
  border-radius: 4px;
  font-weight: 700;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

/* Small caption text */
.text-caption {
  color: #475569 !important; /* slate-600 */
}

/* Text fields label contrast */
.v-label {
  color: #1e293b !important; /* slate-800 */
  opacity: 1 !important;
}

/* Clean up card border styles for a flatter, modern look */
.v-card {
  border-color: rgba(0, 0, 0, 0.08) !important;
}
</style>
