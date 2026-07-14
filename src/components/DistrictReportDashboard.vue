<template>
  <v-container class="pa-0">
    <!-- Filter Controls Card -->
    <v-card class="pa-6 rounded-xl border mb-6" elevation="2">
      <div class="d-flex align-center justify-space-between mb-4">
        <div class="text-h6 font-weight-bold d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-filter-outline</v-icon>
          Report Filters
        </div>
        <v-btn
          color="secondary"
          variant="tonal"
          prepend-icon="mdi-download"
          rounded="pill"
          :disabled="filteredRequests.length === 0"
          @click="exportToCSV"
        >
          Export CSV
        </v-btn>
      </div>

      <v-row>
        <!-- Building Filter -->
        <v-col cols="12" sm="3">
          <v-select
            v-model="filters.buildingId"
            :items="buildingsList"
            item-title="buildingName"
            item-value="buildingId"
            label="Building"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
          />
        </v-col>

        <!-- Leave Type Filter -->
        <v-col cols="12" sm="3">
          <v-select
            v-model="filters.leaveTypeId"
            :items="leaveTypesList"
            item-title="name"
            item-value="typeId"
            label="Leave Type"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
          />
        </v-col>

        <!-- Date Range: From -->
        <v-col cols="12" sm="3">
          <v-text-field
            v-model="filters.dateFrom"
            label="From Date"
            type="date"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
          />
        </v-col>

        <!-- Date Range: To -->
        <v-col cols="12" sm="3">
          <v-text-field
            v-model="filters.dateTo"
            label="To Date"
            type="date"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
          />
        </v-col>
      </v-row>
    </v-card>

    <!-- Aggregate Metrics Row -->
    <v-row class="mb-6">
      <v-col cols="6" sm="3">
        <v-card class="pa-4 rounded-xl border text-center" color="surface">
          <div class="text-caption text-medium-emphasis mb-1">Total Filtered</div>
          <div class="text-h4 font-weight-bold text-primary">{{ filteredRequests.length }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4 rounded-xl border text-center" color="surface">
          <div class="text-caption text-medium-emphasis mb-1">Pending</div>
          <div class="text-h4 font-weight-bold text-warning">{{ pendingCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4 rounded-xl border text-center" color="surface">
          <div class="text-caption text-medium-emphasis mb-1">Approved</div>
          <div class="text-h4 font-weight-bold text-success">{{ approvedCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="pa-4 rounded-xl border text-center" color="surface">
          <div class="text-caption text-medium-emphasis mb-1">Denied</div>
          <div class="text-h4 font-weight-bold text-error">{{ deniedCount }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Global Requests Table -->
    <v-card class="rounded-xl border overflow-hidden" elevation="4">
      <v-card-title class="bg-surface-variant pa-4 text-h6 font-weight-bold">
        District Leave Records
      </v-card-title>
      
      <v-data-table
        :headers="headers"
        :items="filteredRequests"
        :loading="isLoading"
        loading-text="Syncing records across the district..."
        no-data-text="No requests match the selected filter criteria."
        density="comfortable"
      >
        <!-- Employee -->
        <template #[`item.employee`]="{ item }">
          <div class="font-weight-bold">{{ item.employeeName }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.employeeEmail }}</div>
        </template>

        <!-- Building Name -->
        <template #[`item.building`]="{ item }">
          <v-chip size="small" variant="outlined">
            {{ buildingNames[item.buildingId] || item.buildingId }}
          </v-chip>
        </template>

        <!-- Dates -->
        <template #[`item.dates`]="{ item }">
          <div class="text-body-2 font-weight-medium">
            {{ formatDate(item.startDate) }}
            <span class="mx-1 text-disabled">to</span>
            {{ formatDate(item.endDate) }}
          </div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip
            :color="STATUS_CONFIG[item.status]?.color || 'grey'"
            size="small"
            class="font-weight-bold text-uppercase"
          >
            {{ item.status }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>

    <!-- Toast updates -->
    <v-snackbar v-model="alert.show" :color="alert.color" timeout="4000" rounded="lg">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ alert.icon }}</v-icon>
        <span>{{ alert.message }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs
} from 'firebase/firestore'
import { db } from '@/firebase'
import { STATUS_CONFIG } from '@/models'
import Papa from 'papaparse'

const isLoading = ref(true)
const allRequests = ref([])
const employeeDetailsCache = ref({}) // uid -> { name, email }

// Filter parameters
const filters = ref({
  buildingId: null,
  leaveTypeId: null,
  dateFrom: '',
  dateTo: ''
})

// Options list dropdowns
const buildingsList = ref([])
const leaveTypesList = ref([])
const buildingNames = ref({}) // quick lookup ID -> Name

// Table Config
const headers = [
  { title: 'Employee', key: 'employee', align: 'start', sortable: true, width: '220px' },
  { title: 'Building', key: 'building', align: 'start', sortable: true, width: '130px' },
  { title: 'Category', key: 'leaveTypeName', align: 'start', sortable: true, width: '150px' },
  { title: 'Leave Dates', key: 'dates', align: 'start', sortable: true, width: '220px' },
  { title: 'Status', key: 'status', align: 'center', sortable: true, width: '120px' }
]

// Toast updates
const alert = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle'
})

// Reactive filtered list calculation
const filteredRequests = computed(() => {
  return allRequests.value.filter(req => {
    // 1. Building Filter
    if (filters.value.buildingId && req.buildingId !== filters.value.buildingId) {
      return false
    }
    // 2. Leave Type Filter
    if (filters.value.leaveTypeId && req.leaveTypeId !== filters.value.leaveTypeId) {
      return false
    }
    // 3. Date From (Start Date >= Date From)
    if (filters.value.dateFrom && req.startDate < filters.value.dateFrom) {
      return false
    }
    // 4. Date To (End Date <= Date To)
    if (filters.value.dateTo && req.endDate > filters.value.dateTo) {
      return false
    }
    return true
  })
})

// Computed KPI Stats
const pendingCount = computed(() => filteredRequests.value.filter(r => r.status === 'pending').length)
const approvedCount = computed(() => filteredRequests.value.filter(r => r.status === 'approved').length)
const deniedCount = computed(() => filteredRequests.value.filter(r => r.status === 'denied').length)

// Snapshot listener handles
let unsubscribeRequests = null
let unsubscribeBuildings = null
let unsubscribeLeaveTypes = null

onMounted(async () => {
  // 1. Listen to building options
  unsubscribeBuildings = onSnapshot(collection(db, 'buildings'), (snap) => {
    buildingsList.value = snap.docs.map(doc => {
      const data = doc.data()
      buildingNames.value[doc.id] = data.buildingName
      return {
        buildingId: doc.id,
        buildingName: data.buildingName
      }
    })
  })

  // 2. Listen to leave types options
  unsubscribeLeaveTypes = onSnapshot(collection(db, 'leaveTypes'), (snap) => {
    leaveTypesList.value = snap.docs.map(doc => ({
      typeId: doc.id,
      name: doc.data().name
    }))
  })

  // 3. Real-time sync of all request records
  const requestsQuery = query(collection(db, 'leaveRequests'), orderBy('timestamp', 'desc'))
  
  unsubscribeRequests = onSnapshot(requestsQuery, async (snap) => {
    const rawRequests = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Batch resolve employee details
    const uniqueUids = [...new Set(rawRequests.map(r => r.uid))]
    await resolveEmployeeDetails(uniqueUids)

    allRequests.value = rawRequests.map(r => {
      const details = employeeDetailsCache.value[r.uid] || { name: 'Unknown User', email: 'N/A' }
      return {
        ...r,
        employeeName: details.name,
        employeeEmail: details.email
      }
    })

    isLoading.value = false
  }, (err) => {
    console.error('Error fetching global reports:', err)
    showNotification('Error connecting to global reports database.', 'error', 'mdi-alert-circle')
    isLoading.value = false
  })
})

onUnmounted(() => {
  if (unsubscribeRequests) unsubscribeRequests()
  if (unsubscribeBuildings) unsubscribeBuildings()
  if (unsubscribeLeaveTypes) unsubscribeLeaveTypes()
})

// Queries the users collection to match uids with their names and emails
async function resolveEmployeeDetails(uids) {
  const missingUids = uids.filter(uid => !employeeDetailsCache.value[uid])
  if (!missingUids.length) return

  const chunks = []
  for (let i = 0; i < missingUids.length; i += 30) {
    chunks.push(missingUids.slice(i, i + 30))
  }

  try {
    for (const chunk of chunks) {
      const q = query(collection(db, 'users'), where('uid', 'in', chunk))
      const snapshot = await getDocs(q)
      snapshot.forEach(doc => {
        const data = doc.data()
        employeeDetailsCache.value[data.uid] = {
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Employee',
          email: doc.id
        }
      })
    }
  } catch (err) {
    console.error('Error caching user directory info:', err)
  }
}

// Format date helper
function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Export parsed CSV report using PapaParse
function exportToCSV() {
  const exportData = filteredRequests.value.map(req => ({
    'Employee Name': req.employeeName,
    'Employee Email': req.employeeEmail,
    'Building': buildingNames.value[req.buildingId] || req.buildingId,
    'Leave Category': req.leaveTypeName,
    'Start Date': req.startDate,
    'End Date': req.endDate,
    'Status': req.status.toUpperCase(),
    'Employee Comment': req.reason || '',
    'Admin Comment': req.reviewerNote || ''
  }))

  const csv = Papa.unparse(exportData)
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.setAttribute('href', url)
  link.setAttribute('download', `nsd_leave_report_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  showNotification('CSV Report downloaded successfully!')
}

// Notification Helper
function showNotification(message, color = 'success', icon = 'mdi-check-circle') {
  alert.value = {
    show: true,
    message,
    color,
    icon
  }
}
</script>

<style scoped>
:deep(.v-data-table) {
  background-color: transparent !important;
}
:deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
