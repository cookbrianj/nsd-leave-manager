<template>
  <v-container class="pa-0">
    <v-row>
      <!-- Request Form Column -->
      <v-col cols="12" md="5">
        <v-card class="elevation-1 rounded-xl border" height="100%">
          <v-card-item class="pa-6 border-b">
            <v-card-title class="text-h5 font-weight-bold d-flex align-center text-slate-900">
              <v-icon color="primary" class="mr-2">mdi-calendar-edit</v-icon>
              Request Leave
            </v-card-title>
            <v-card-subtitle class="mt-1">
              Submit a new leave request for review.
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="pa-6">
            <v-form ref="formRef" v-model="formValid" lazy-validation>
              <!-- Leave Type Select -->
              <v-select
                v-model="form.selectedType"
                :items="activeLeaveTypes"
                item-title="name"
                item-value="typeId"
                return-object
                label="Select Leave Type *"
                placeholder="Choose from active leave categories"
                :rules="[v => !!v || 'Leave Type is required']"
                :loading="loadingLeaveTypes"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                required
              />

              <!-- Start Date -->
              <v-text-field
                v-model="form.startDate"
                label="Start Date *"
                type="date"
                :rules="[v => !!v || 'Start Date is required']"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                required
              />

              <!-- End Date -->
              <v-text-field
                v-model="form.endDate"
                label="End Date *"
                type="date"
                :rules="[
                  v => !!v || 'End Date is required',
                  v => v >= form.startDate || 'End Date must be same or after Start Date'
                ]"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                required
              />

              <!-- Reason -->
              <v-textarea
                v-model="form.reason"
                label="Reason / Notes"
                placeholder="Optional reason for request..."
                variant="outlined"
                density="comfortable"
                rows="3"
                class="mb-2"
              />
            </v-form>
          </v-card-text>

          <v-divider />

          <v-card-actions class="pa-6 d-flex justify-end">
            <v-btn
              variant="outlined"
              color="secondary"
              rounded="pill"
              class="mr-2"
              :disabled="isSubmitting"
              @click="resetForm"
            >
              Reset
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              rounded="pill"
              prepend-icon="mdi-send-outline"
              :disabled="!formValid || isSubmitting"
              :loading="isSubmitting"
              @click="submitRequest"
            >
              Submit Request
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- History Column -->
      <v-col cols="12" md="7">
        <v-card class="elevation-1 rounded-xl border" height="100%">
          <v-card-item class="pa-6 border-b">
            <v-card-title class="text-h5 font-weight-bold d-flex align-center text-slate-900">
              <v-icon color="secondary" class="mr-2">mdi-history</v-icon>
              Your Leave History
            </v-card-title>
            <v-card-subtitle class="mt-1">
              Track and monitor the status of your submitted requests.
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="pa-0">
            <v-data-table
              :headers="historyHeaders"
              :items="requestHistory"
              :loading="loadingHistory"
              loading-text="Syncing requests from Firestore..."
              no-data-text="You have not submitted any leave requests yet."
              class="bg-transparent"
              density="comfortable"
            >
              <!-- Dates Column -->
              <template #[`item.dates`]="{ item }">
                <div class="font-weight-bold">
                  {{ formatDate(item.startDate) }}
                  <span class="text-medium-emphasis mx-1">to</span>
                  {{ formatDate(item.endDate) }}
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

              <!-- Reason and Reviewer Note Column -->
              <template #[`item.notes`]="{ item }">
                <div v-if="item.reason" class="text-caption text-medium-emphasis">
                  <strong>Reason:</strong> {{ item.reason }}
                </div>
                <div v-if="item.reviewerNote" class="text-caption text-info mt-1">
                  <strong>Admin Note:</strong> {{ item.reviewerNote }}
                </div>
                <div v-if="!item.reason && !item.reviewerNote" class="text-caption text-disabled italic">
                  No notes
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Notification Toast -->
    <v-snackbar v-model="alert.show" :color="alert.color" timeout="4500" rounded="lg">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ alert.icon }}</v-icon>
        <span>{{ alert.message }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/composables/useAuth'
import { STATUS_CONFIG } from '@/models'

// Current user state
const { user } = useAuth()

// Active leave types dropdown list
const activeLeaveTypes = ref([])
const loadingLeaveTypes = ref(true)

// Historical requests data
const requestHistory = ref([])
const loadingHistory = ref(true)

// Form states
const formRef = ref(null)
const formValid = ref(false)
const isSubmitting = ref(false)
const form = ref({
  selectedType: null,
  startDate: '',
  endDate: '',
  reason: ''
})

// Toast alerts
const alert = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle'
})

// Table Headers
const historyHeaders = [
  { title: 'Type', key: 'leaveTypeName', align: 'start', sortable: true, width: '150px' },
  { title: 'Date Range', key: 'dates', align: 'start', sortable: true, width: '220px' },
  { title: 'Status', key: 'status', align: 'center', sortable: true, width: '120px' },
  { title: 'Details & Notes', key: 'notes', align: 'start', sortable: false }
]

// Unsubscribe handles
let unsubscribeLeaveTypes = null
let unsubscribeHistory = null

onMounted(() => {
  // 1. Fetch active leave types for the select list
  const leaveTypesQuery = query(
    collection(db, 'leaveTypes'),
    where('isActive', '==', true)
  )
  unsubscribeLeaveTypes = onSnapshot(leaveTypesQuery, (snap) => {
    activeLeaveTypes.value = snap.docs.map(doc => ({
      typeId: doc.id,
      name: doc.data().name
    }))
    loadingLeaveTypes.value = false
  }, (err) => {
    console.error('Error fetching active leave types:', err)
    loadingLeaveTypes.value = false
  })

  // 2. Setup watcher for User log-in to sync history
  watch(() => user.value, (newUser) => {
    if (newUser) {
      syncHistory(newUser.uid)
    } else {
      requestHistory.value = []
      loadingHistory.value = false
    }
  }, { immediate: true })
})

onUnmounted(() => {
  if (unsubscribeLeaveTypes) unsubscribeLeaveTypes()
  if (unsubscribeHistory) unsubscribeHistory()
})

// Real-time synchronization of employee leave history
function syncHistory(uid) {
  loadingHistory.value = true
  if (unsubscribeHistory) unsubscribeHistory()

  const historyQuery = query(
    collection(db, 'leaveRequests'),
    where('uid', '==', uid),
    orderBy('timestamp', 'desc')
  )

  unsubscribeHistory = onSnapshot(historyQuery, (snap) => {
    requestHistory.value = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    loadingHistory.value = false
  }, (err) => {
    console.error('Error syncing history:', err)
    showNotification('Unable to fetch history. Missing indexes?', 'error', 'mdi-alert-circle')
    loadingHistory.value = false
  })
}

// Format raw YYYY-MM-DD date to friendly text
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

// Reset form
function resetForm() {
  if (formRef.value) formRef.value.reset()
  form.value = {
    selectedType: null,
    startDate: '',
    endDate: '',
    reason: ''
  }
}

// Submit Leave Request
async function submitRequest() {
  if (!formValid.value || !user.value) return
  isSubmitting.value = true

  try {
    const requestDoc = {
      uid: user.value.uid,
      employeeName: `${user.value.firstName || ''} ${user.value.lastName || ''}`.trim() || 'Employee',
      employeeEmail: user.value.email,
      employeeRole: user.value.role || 'employee',
      buildingId: user.value.buildingId || 'default',
      leaveTypeId: form.value.selectedType.typeId,
      leaveTypeName: form.value.selectedType.name,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      status: 'pending',
      reason: form.value.reason.trim(),
      timestamp: serverTimestamp()
    }

    await addDoc(collection(db, 'leaveRequests'), requestDoc)
    
    showNotification('Leave request submitted successfully!')
    resetForm()
  } catch (err) {
    console.error('Error submitting leave request:', err)
    showNotification(`Submission failed: ${err.message}`, 'error', 'mdi-alert-circle')
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
:deep(.v-data-table) {
  background-color: transparent !important;
}
:deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
