<template>
  <v-app class="app-background">
    <!-- AppBar Header -->
    <v-app-bar flat color="surface" border="b">
      <v-container class="d-flex align-center py-0 px-4">
        <v-icon color="primary" class="mr-2" size="28">mdi-calendar-check</v-icon>
        <v-app-bar-title class="font-weight-bold text-h6">
          NSD Leave Entry
        </v-app-bar-title>

        <v-spacer />

        <!-- User Profile Action -->
        <v-fade-transition>
          <div v-if="user" class="d-flex align-center gap-3">
            <div class="text-right d-none d-sm-block">
              <div class="text-subtitle-2 font-weight-bold leading-tight">
                {{ user.firstName }} {{ user.lastName }}
              </div>
              <v-chip color="secondary" size="x-small" variant="tonal" class="text-uppercase font-weight-bold px-2">
                {{ ROLE_LABELS[user.role] }}
              </v-chip>
            </div>
            
            <v-menu min-width="200px" rounded="xl">
              <template #activator="{ props }">
                <v-avatar color="primary" class="cursor-pointer elevation-2" v-bind="props">
                  <v-icon color="white">mdi-account</v-icon>
                </v-avatar>
              </template>
              <v-card class="pa-2 mt-2" elevation="6">
                <v-card-text class="pa-3">
                  <div class="text-subtitle-1 font-weight-bold">{{ user.firstName }} {{ user.lastName }}</div>
                  <div class="text-caption text-medium-emphasis mb-2">{{ user.email }}</div>
                  <v-divider class="my-2" />
                  <div class="text-caption">
                    <strong>Building:</strong> {{ user.buildingId || 'None assigned' }}
                  </div>
                  <div class="text-caption">
                    <strong>Role:</strong> {{ ROLE_LABELS[user.role] }}
                  </div>
                </v-card-text>
                <v-divider />
                <v-card-actions class="pa-2">
                  <v-btn block color="error" rounded="pill" prepend-icon="mdi-logout" variant="tonal" @click="logout">
                    Sign Out
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-menu>
          </div>
        </v-fade-transition>
      </v-container>
    </v-app-bar>

    <v-main>
      <!-- Loading State -->
      <v-container v-if="loading" class="d-flex flex-column align-center justify-center fill-height" style="min-height: 80vh;">
        <v-progress-circular color="primary" indeterminate size="64" width="6" class="mb-4" />
        <span class="text-body-1 font-weight-medium text-medium-emphasis">Syncing profiles...</span>
      </v-container>

      <!-- Logged Out State (Google Sign In) -->
      <v-container v-else-if="!user" class="d-flex align-center justify-center fill-height" style="min-height: 85vh;">
        <v-card class="pa-8 text-center glass-card" max-width="450" width="100%" rounded="xl" elevation="12">
          <div class="logo-circle mx-auto mb-6">
            <v-icon size="40" color="primary">mdi-calendar-check</v-icon>
          </div>
          <h1 class="text-h4 font-weight-bold mb-2">Welcome to NSD Leave</h1>
          <p class="text-body-1 text-medium-emphasis mb-6">
            Neosho School District Leave Approval &amp; Tracking Portal
          </p>

          <!-- Error Message Banner -->
          <v-alert v-if="error" type="error" variant="tonal" class="mb-6 rounded-lg text-left" closable>
            {{ error }}
          </v-alert>

          <v-btn
            color="primary"
            size="large"
            block
            rounded="pill"
            prepend-icon="mdi-google"
            class="py-4 font-weight-bold"
            elevation="4"
            @click="login"
          >
            Sign in with Google
          </v-btn>

          <!-- Local Developer Mode Sandbox Info -->
          <div class="mt-8 pt-6 border-t border-dashed">
            <v-btn size="small" variant="text" color="secondary" prepend-icon="mdi-code-braces" @click="useDemoMode">
              Demo Access (Mock Account)
            </v-btn>
          </div>
        </v-card>
      </v-container>

      <!-- Logged In Dashboard -->
      <v-container v-else class="py-8 px-4">
        <!-- Developer Sandbox Switcher -->
        <v-expand-transition>
          <div v-if="isDemoMode" class="mb-6">
            <v-alert type="warning" variant="tonal" border="start" rounded="lg" class="d-flex align-center justify-between py-3">
              <template #prepend>
                <v-icon>mdi-laptop</v-icon>
              </template>
              <div>
                <strong class="text-subtitle-2">Demo Developer Mode</strong>
                <div class="text-caption">Change roles to test dashboards and Firestore security validation:</div>
              </div>
              <v-spacer />
              <div class="d-flex gap-2 flex-wrap mt-2 mt-sm-0">
                <v-btn
                  v-for="roleName in Object.keys(ROLE_LABELS)"
                  :key="roleName"
                  size="x-small"
                  :variant="user.role === roleName ? 'elevated' : 'outlined'"
                  :color="user.role === roleName ? 'primary' : 'secondary'"
                  rounded="pill"
                  class="font-weight-bold text-caption"
                  @click="simulateRole(roleName)"
                >
                  {{ ROLE_LABELS[roleName] }}
                </v-btn>
              </div>
            </v-alert>
          </div>
        </v-expand-transition>

        <!-- Dynamic Role Action Header Info -->
        <div class="mb-8 d-flex flex-column flex-sm-row justify-space-between align-start align-sm-center">
          <div>
            <h1 class="text-h4 font-weight-bold">Dashboard</h1>
            <p class="text-body-1 text-medium-emphasis">
              Welcome back, {{ user.firstName }}. You are viewing the leave tracking portal.
            </p>
          </div>
          
          <v-chip color="primary" variant="flat" class="mt-2 mt-sm-0 font-weight-bold">
            <v-icon start size="16">mdi-domain</v-icon>
            Building: {{ user.buildingId || 'N/A' }}
          </v-chip>
        </div>

        <!-- Navigation Tabs -->
        <v-card rounded="xl" elevation="2" border class="mb-8 overflow-hidden">
          <v-tabs v-model="activeTab" bg-color="surface-variant" slider-color="primary" grow>
            <!-- Available to All -->
            <v-tab value="request" class="font-weight-bold text-body-2">
              <v-icon start>mdi-calendar-edit</v-icon>
              Request Leave
            </v-tab>

            <!-- Building Admins / Assistants -->
            <v-tab
              v-if="user.role === 'admin' || user.role === 'assistant'"
              value="building-review"
              class="font-weight-bold text-body-2"
            >
              <v-icon start>mdi-domain</v-icon>
              {{ user.role === 'admin' ? 'Review Requests' : 'Building Log' }}
            </v-tab>

            <!-- District Admin Tools -->
            <v-tab v-if="user.role === 'districtAdmin'" value="importer" class="font-weight-bold text-body-2">
              <v-icon start>mdi-database-import</v-icon>
              Bulk Importer
            </v-tab>

            <v-tab v-if="user.role === 'districtAdmin'" value="manage-types" class="font-weight-bold text-body-2">
              <v-icon start>mdi-cog-outline</v-icon>
              Leave Types
            </v-tab>

            <v-tab v-if="user.role === 'districtAdmin'" value="district-report" class="font-weight-bold text-body-2">
              <v-icon start>mdi-chart-line</v-icon>
              District Report
            </v-tab>
          </v-tabs>
        </v-card>

        <!-- Tab Items Content -->
        <v-window v-model="activeTab" class="bg-transparent">
          <v-window-item value="request">
            <EmployeeRequestForm />
          </v-window-item>

          <v-window-item value="building-review">
            <BuildingAdminDashboard />
          </v-window-item>

          <v-window-item value="importer">
            <CSVImporter />
          </v-window-item>

          <v-window-item value="manage-types">
            <LeaveTypeManager />
          </v-window-item>

          <v-window-item value="district-report">
            <DistrictReportDashboard />
          </v-window-item>
        </v-window>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { ROLE_LABELS } from '@/models'
import CSVImporter from '@/components/CSVImporter.vue'
import LeaveTypeManager from '@/components/LeaveTypeManager.vue'
import EmployeeRequestForm from '@/components/EmployeeRequestForm.vue'
import BuildingAdminDashboard from '@/components/BuildingAdminDashboard.vue'
import DistrictReportDashboard from '@/components/DistrictReportDashboard.vue'

const { user: authUser, loading, error, login, logout } = useAuth()

// Demo mode references
const isDemoMode = ref(false)
const demoUser = ref(null)

// Computed active user (allows overriding role for dev simulation)
const user = ref(null)

// Watch authUser changes
import { watch } from 'vue'
watch(() => authUser.value, (newVal) => {
  if (newVal) {
    user.value = { ...newVal }
  } else {
    user.value = null
    isDemoMode.value = false
  }
}, { immediate: true })

// Tabs
const activeTab = ref('request')

// Local demo mode to preview views without complex authentication config
function useDemoMode() {
  isDemoMode.value = true
  user.value = {
    uid: 'demo-dev-uid',
    email: 'developer@neoshosd.org',
    firstName: 'Demo',
    lastName: 'Administrator',
    buildingId: 'NHS', // Neosho High School
    role: 'districtAdmin', // Start as district admin to showcase all modules
  }
}

// Simulate changing user roles locally
function simulateRole(role) {
  if (user.value) {
    user.value.role = role
    
    // Automatically set matching buildingId scenarios
    if (role === 'admin' || role === 'assistant') {
      user.value.buildingId = 'NHS'
    } else {
      user.value.buildingId = 'NMS'
    }
  }
}
</script>

<style scoped>
.app-background {
  background-color: #0f1117 !important;
}

.glass-card {
  background: rgba(26, 29, 39, 0.8) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.logo-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(108, 140, 255, 0.1);
  display: flex;
  align-center: center;
  justify-content: center;
}

.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
</style>
