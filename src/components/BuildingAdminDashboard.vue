<template>
  <v-container class="pa-0">
    <!-- Summary Header Cards -->
    <v-row class="mb-4" v-if="mode === 'history'">
      <v-col cols="12" sm="4">
        <v-card class="pa-4 rounded-xl border text-center" color="surface">
          <div class="text-caption text-medium-emphasis mb-1">Pending Action</div>
          <div class="text-h3 font-weight-bold text-warning">{{ pendingRequests.length }}</div>
          <v-icon color="warning" class="mt-2">mdi-clock-alert-outline</v-icon>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card class="pa-4 rounded-xl border text-center" color="surface">
          <div class="text-caption text-medium-emphasis mb-1">Approved This Month</div>
          <div class="text-h3 font-weight-bold text-success">{{ approvedCount }}</div>
          <v-icon color="success" class="mt-2">mdi-checkbox-marked-circle-outline</v-icon>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card class="pa-4 rounded-xl border text-center" color="surface">
          <div class="text-caption text-medium-emphasis mb-1">Total Building Requests</div>
          <div class="text-h3 font-weight-bold text-primary">{{ allRequests.length }}</div>
          <v-icon color="primary" class="mt-2">mdi-file-document-multiple-outline</v-icon>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Content Card -->
    <v-card rounded="xl" elevation="1" border class="overflow-hidden">
      <!-- PENDING REQUESTS VIEW (mode === 'pending') -->
      <v-data-table
        v-if="mode === 'pending'"
        :headers="headers"
        :items="pendingRequests"
        :loading="isLoading"
        loading-text="Syncing pending requests..."
        no-data-text="No pending leave requests for this building."
        density="comfortable"
      >
        <!-- Employee Column -->
        <template #[`item.employee`]="{ item }">
          <div class="font-weight-bold">{{ item.employeeName }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.employeeEmail }}</div>
        </template>

        <!-- Leave Type -->
        <template #[`item.leaveTypeName`]="{ item }">
          <v-chip size="small" color="secondary" variant="tonal" class="font-weight-bold">
            {{ item.leaveTypeName }}
          </v-chip>
        </template>

        <!-- Date Range -->
        <template #[`item.dates`]="{ item }">
          <div>{{ formatDate(item.startDate) }}</div>
          <div class="text-caption text-medium-emphasis" v-if="item.startDate !== item.endDate">to {{ formatDate(item.endDate) }}</div>
          <div v-if="item.isHalfDay" class="text-caption text-secondary font-weight-bold">
            Half-Day ({{ item.halfDayPeriod }})
          </div>
        </template>

        <!-- Reason Column -->
        <template #[`item.reason`]="{ item }">
          <span class="text-body-2 italic">{{ item.reason || 'No reason specified' }}</span>
        </template>

        <!-- Actions Column -->
        <template #[`item.actions`]="{ item }">
          <div v-if="isAssistant" class="text-caption text-disabled italic">
            Read-only (Assistant)
          </div>
          <div v-else class="d-flex gap-2 justify-end">
            <v-btn
              color="success"
              variant="flat"
              size="small"
              rounded="pill"
              prepend-icon="mdi-check"
              @click="openActionDialog(item, 'approved')"
            >
              Approve
            </v-btn>
            <v-btn
              color="error"
              variant="outlined"
              size="small"
              rounded="pill"
              prepend-icon="mdi-close"
              @click="openActionDialog(item, 'denied')"
            >
              Deny
            </v-btn>
          </div>
        </template>
      </v-data-table>

      <!-- HISTORICAL LOG / LEAVE HISTORY VIEW (mode === 'history') -->
      <v-data-table
        v-else
        :headers="historyHeaders"
        :items="allRequests"
        :loading="isLoading"
        loading-text="Syncing history..."
        no-data-text="No requests found for this building."
        density="comfortable"
      >
        <!-- Employee -->
        <template #[`item.employee`]="{ item }">
          <div class="font-weight-bold">{{ item.employeeName }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.employeeEmail }}</div>
        </template>

        <!-- Leave Type -->
        <template #[`item.leaveTypeName`]="{ item }">
          <v-chip size="small" color="secondary" variant="tonal" class="font-weight-bold">
            {{ item.leaveTypeName }}
          </v-chip>
        </template>

        <!-- Date Range -->
        <template #[`item.dates`]="{ item }">
          <div>{{ formatDate(item.startDate) }}</div>
          <div class="text-caption text-medium-emphasis" v-if="item.startDate !== item.endDate">to {{ formatDate(item.endDate) }}</div>
          <div v-if="item.isHalfDay" class="text-caption text-secondary font-weight-bold">
            Half-Day ({{ item.halfDayPeriod }})
          </div>
        </template>

        <!-- Status Chip -->
        <template #[`item.status`]="{ item }">
          <v-chip
            :color="STATUS_CONFIG[item.status]?.color || 'grey'"
            size="small"
            class="font-weight-bold text-uppercase"
            prepend-icon="mdi-circle-medium"
          >
            {{ STATUS_CONFIG[item.status]?.label || item.status }}
          </v-chip>
        </template>

        <!-- Decision Details Column -->
        <template #[`item.decisionInfo`]="{ item }">
          <div v-if="item.status !== 'pending'">
            <div class="font-weight-bold">{{ item.reviewerName || item.reviewerEmail || 'Admin' }}</div>
            <div class="text-caption text-medium-emphasis" v-if="item.updatedAt">
              {{ formatDateTime(item.updatedAt) }}
            </div>
          </div>
          <span v-else-if="item.status === 'pending'" class="text-caption text-disabled italic">
            Awaiting Review
          </span>
        </template>

        <!-- Details Notes -->
        <template #[`item.notes`]="{ item }">
          <div v-if="item.reason" class="text-caption text-medium-emphasis">
            <strong>Reason:</strong> {{ item.reason }}
          </div>
          <div v-if="item.reviewerNote" class="text-caption text-info mt-1">
            <strong>Decision Note:</strong> {{ item.reviewerNote }}
          </div>
          <div v-if="item.reviewerName || item.reviewerEmail" class="text-caption text-grey-darken-1 mt-1">
            <strong>Decision by:</strong> {{ item.reviewerName || item.reviewerEmail }}
            <span v-if="item.updatedAt"> on {{ formatDateTime(item.updatedAt) }}</span>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Review Dialog (Approve or Deny action details) -->
    <v-dialog v-model="actionDialog.show" max-width="500px" persistent>
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="text-h6 font-weight-bold d-flex align-center">
          <v-icon :color="actionDialog.status === 'approved' ? 'success' : 'error'" class="mr-2">
            {{ actionDialog.status === 'approved' ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline' }}
          </v-icon>
          Review Leave Request
        </v-card-title>
        <v-card-subtitle class="mt-1">
          Reviewing {{ actionDialog.item?.employeeName }}'s request for {{ actionDialog.item?.leaveTypeName }}.
        </v-card-subtitle>
        <v-divider class="my-2" />

        <v-card-text class="pa-4">
          <v-textarea
            v-model="actionDialog.note"
            :label="actionDialog.status === 'approved' ? 'Approver Notes (Optional)' : 'Reason for Denial (Required) *'"
            :placeholder="actionDialog.status === 'approved' ? 'Optional comments for employee...' : 'Please specify why this request is denied...'"
            variant="outlined"
            density="comfortable"
            rows="3"
            :rules="[v => actionDialog.status === 'approved' || !!v || 'Reason for denial is required']"
          />
        </v-card-text>

        <v-card-actions class="d-flex justify-end gap-2 pa-4">
          <v-btn variant="outlined" rounded="pill" color="secondary" :disabled="isSubmitting" @click="closeActionDialog">
            Cancel
          </v-btn>
          <v-btn
            variant="elevated"
            rounded="pill"
            :color="actionDialog.status === 'approved' ? 'success' : 'error'"
            :disabled="actionDialog.status === 'denied' && !actionDialog.note.trim() || isSubmitting"
            :loading="isSubmitting"
            @click="submitReview"
          >
            {{ actionDialog.status === 'approved' ? 'Approve' : 'Deny' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notification Toast -->
    <v-snackbar v-model="alert.show" :color="alert.color" timeout="4000" rounded="lg">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ alert.icon }}</v-icon>
        <span>{{ alert.message }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/composables/useAuth'
import { STATUS_CONFIG } from '@/models'

const props = defineProps({
  mode: {
    type: String,
    default: 'pending' // 'pending' or 'history'
  }
})

const { user } = useAuth()

// Building Assistant check (Assistant can view historical data but cannot review)
const isAssistant = computed(() => user.value?.role === 'assistant')

const allRequests = ref([])
const employeeDetailsCache = ref({}) // Maps uid -> { name, email }
const isLoading = ref(true)
const isSubmitting = ref(false)

// Table Headers
const headers = [
  { title: 'Employee', key: 'employee', align: 'start', sortable: true, width: '220px' },
  { title: 'Leave Category', key: 'leaveTypeName', align: 'start', sortable: true, width: '160px' },
  { title: 'Requested Dates', key: 'dates', align: 'start', sortable: true, width: '160px' },
  { title: 'Employee Comments', key: 'reason', align: 'start', sortable: false },
  { title: 'Actions', key: 'actions', align: 'end', sortable: false, width: '220px' }
]

const historyHeaders = [
  { title: 'Employee', key: 'employee', align: 'start', sortable: true, width: '220px' },
  { title: 'Leave Category', key: 'leaveTypeName', align: 'start', sortable: true, width: '160px' },
  { title: 'Requested Dates', key: 'dates', align: 'start', sortable: true, width: '160px' },
  { title: 'Status', key: 'status', align: 'center', sortable: true, width: '130px' },
  { title: 'Admin User', key: 'decisionInfo', align: 'start', sortable: true, width: '200px' },
  { title: 'Notes & Comments', key: 'notes', align: 'start', sortable: false }
]

// Dialog State
const actionDialog = ref({
  show: false,
  status: 'approved',
  note: '',
  item: null
})

// Toast alerts
const alert = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle'
})

// Segmented computed items
const pendingRequests = computed(() => {
  return allRequests.value.filter(r => r.status === 'pending')
})

const processedRequests = computed(() => {
  return allRequests.value.filter(r => r.status !== 'pending')
})

const approvedCount = computed(() => {
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  return processedRequests.value.filter(r => {
    if (r.status !== 'approved') return false
    if (!r.startDate) return false
    const d = new Date(r.startDate)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).length
})

let unsubscribe = null

onMounted(() => {
  // Sync request logs matching this building
  watch(() => user.value?.buildingId, (newBuildingId) => {
    if (newBuildingId) {
      syncRequests(newBuildingId)
    } else {
      allRequests.value = []
      isLoading.value = false
    }
  }, { immediate: true })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// Real-time synchronization
function syncRequests(buildingId) {
  isLoading.value = true
  if (unsubscribe) unsubscribe()

  const q = query(
    collection(db, 'leaveRequests'),
    where('buildingId', '==', buildingId),
    orderBy('timestamp', 'desc')
  )

  unsubscribe = onSnapshot(q, async (snap) => {
    // Filter out requests submitted by Building Admins, as they go to District Admins
    const rawRequests = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(r => r.employeeRole !== 'admin')

    // Filter uids that don't have employeeName on the request document to fetch from cache (legacy support)
    const uidsToResolve = rawRequests
      .filter(r => !r.employeeName || !r.employeeEmail)
      .map(r => r.uid)
    
    if (uidsToResolve.length > 0) {
      const uniqueUids = [...new Set(uidsToResolve)]
      await resolveEmployeeDetails(uniqueUids)
    }

    allRequests.value = rawRequests.map(r => {
      const cached = employeeDetailsCache.value[r.uid] || { name: 'Unknown User', email: 'N/A' }
      return {
        ...r,
        employeeName: r.employeeName || cached.name,
        employeeEmail: r.employeeEmail || cached.email
      }
    })

    isLoading.value = false
  }, (err) => {
    console.error('Error loading requests:', err)
    showNotification('Unable to fetch building requests. Ensure Firestore indexes are built.', 'error', 'mdi-alert-circle')
    isLoading.value = false
  })
}

// Queries the users collection to match uids with their names and emails
async function resolveEmployeeDetails(uids) {
  const missingUids = uids.filter(uid => !employeeDetailsCache.value[uid])
  if (!missingUids.length) return

  // Split query in chunks of 30 because of Firestore 'in' limitation
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
          email: doc.id // Document key is the email
        }
      })
    }
  } catch (err) {
    console.error('Error resolving employee details:', err)
  }
}

// Date helper
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

function formatDateTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Dialog options
function openActionDialog(item, status) {
  actionDialog.value = {
    show: true,
    status,
    note: '',
    item
  }
}

function closeActionDialog() {
  actionDialog.value = {
    show: false,
    status: 'approved',
    note: '',
    item: null
  }
}

// Write the approval/denial record back to Firestore
async function submitReview() {
  const { item, status, note } = actionDialog.value
  if (!item || isSubmitting.value) return
  isSubmitting.value = true

  try {
    const docRef = doc(db, 'leaveRequests', item.id)
    await updateDoc(docRef, {
      status,
      reviewerUid: user.value.uid,
      reviewerName: `${user.value.firstName || ''} ${user.value.lastName || ''}`.trim() || user.value.email,
      reviewerEmail: user.value.email,
      reviewerNote: note.trim(),
      updatedAt: serverTimestamp()
    })

    showNotification(`Request for ${item.employeeName} has been ${status}.`)
    closeActionDialog()
  } catch (err) {
    console.error('Error reviewing request:', err)
    showNotification(`Review failed: ${err.message}`, 'error', 'mdi-alert-circle')
  } finally {
    isSubmitting.value = false
  }
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
.gap-2 {
  gap: 8px;
}
:deep(.v-data-table) {
  background-color: transparent !important;
}
:deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
