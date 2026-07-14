<template>
  <v-card class="mx-auto my-6" max-width="1000" elevation="4" rounded="xl" border>
    <v-card-item class="bg-surface-variant pa-6">
      <div class="d-flex align-center justify-space-between">
        <div>
          <v-card-title class="text-h5 font-weight-bold d-flex align-center gap-2">
            <v-icon color="secondary" class="mr-2">mdi-cog-outline</v-icon>
            Leave Type Manager
          </v-card-title>
          <v-card-subtitle class="mt-1">
            Create, view, and toggle active status for district-wide leave types.
          </v-card-subtitle>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          rounded="pill"
          elevation="2"
          @click="openAddDialog"
        >
          Add Leave Type
        </v-btn>
      </div>
    </v-card-item>

    <!-- Data Table -->
    <v-card-text class="pa-0">
      <v-data-table
        :headers="headers"
        :items="leaveTypes"
        :loading="isLoading"
        loading-text="Loading leave types from Firestore..."
        no-data-text="No leave types configured. Click 'Add Leave Type' to get started."
        class="bg-transparent"
        density="comfortable"
      >
        <!-- Name Column -->
        <template #[`item.name`]="{ item }">
          <div class="font-weight-bold">{{ item.name }}</div>
        </template>

        <!-- Status / Toggle Column -->
        <template #[`item.isActive`]="{ item }">
          <v-chip
            :color="item.isActive ? 'success' : 'error'"
            size="small"
            class="mr-4"
            style="width: 80px; justify-content: center;"
          >
            {{ item.isActive ? 'Active' : 'Inactive' }}
          </v-chip>
          <v-btn
            icon
            variant="text"
            size="small"
            :color="item.isActive ? 'error' : 'success'"
            :title="item.isActive ? 'Deactivate Type' : 'Activate Type'"
            @click="toggleActiveStatus(item)"
          >
            <v-icon>
              {{ item.isActive ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline' }}
            </v-icon>
          </v-btn>
        </template>

        <!-- Description Column -->
        <template #[`item.description`]="{ item }">
          <span class="text-medium-emphasis">{{ item.description || 'No description' }}</span>
        </template>
      </v-data-table>
    </v-card-text>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialog.show" max-width="500" persistent>
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="text-h6 font-weight-bold d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-folder-plus-outline</v-icon>
          Create New Leave Type
        </v-card-title>
        <v-divider class="my-2" />
        
        <v-card-text class="pa-4">
          <v-form ref="formRef" v-model="formValid" lazy-validation>
            <v-text-field
              v-model="form.name"
              label="Leave Type Name *"
              placeholder="e.g. Personal Business Day"
              :rules="[v => !!v || 'Name is required', v => v.length >= 3 || 'Name must be at least 3 characters']"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              required
            />
            
            <v-textarea
              v-model="form.description"
              label="Description"
              placeholder="Explain eligibility, restrictions, or approval requirements..."
              variant="outlined"
              density="comfortable"
              rows="3"
              class="mb-2"
            />
            
            <v-switch
              v-model="form.isActive"
              label="Set Active immediately"
              color="success"
              hide-details
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="d-flex justify-end gap-2 pa-4">
          <v-btn variant="outlined" rounded="pill" color="secondary" @click="closeDialog">
            Cancel
          </v-btn>
          <v-btn
            variant="elevated"
            rounded="pill"
            color="primary"
            :disabled="!formValid || isSaving"
            :loading="isSaving"
            @click="saveLeaveType"
          >
            Save Type
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
  </v-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query
} from 'firebase/firestore'
import { db } from '@/firebase'

// Component State
const leaveTypes = ref([])
const isLoading = ref(true)
const isSaving = ref(false)

// Table Config
const headers = [
  { title: 'Leave Type Name', key: 'name', align: 'start', sortable: true, width: '250px' },
  { title: 'Description', key: 'description', align: 'start', sortable: false },
  { title: 'Status & Controls', key: 'isActive', align: 'end', sortable: true, width: '200px' }
]

// Dialog state
const dialog = ref({ show: false })
const formRef = ref(null)
const formValid = ref(false)
const form = ref({
  name: '',
  description: '',
  isActive: true
})

// Toast alerts
const alert = ref({
  show: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle'
})

// Real-time Firestore sync
let unsubscribe = null

onMounted(() => {
  const q = query(collection(db, 'leaveTypes'))
  unsubscribe = onSnapshot(q, (snapshot) => {
    leaveTypes.value = snapshot.docs.map(doc => ({
      typeId: doc.id,
      ...doc.data()
    }))
    isLoading.value = false
  }, (err) => {
    console.error('Firestore listener error:', err)
    showNotification('Failed to connect to real-time updates.', 'error', 'mdi-alert-circle')
    isLoading.value = false
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// Dialog controls
function openAddDialog() {
  formValid.value = false
  form.value = {
    name: '',
    description: '',
    isActive: true
  }
  dialog.value.show = true
}

function closeDialog() {
  dialog.value.show = false
}

// Save Leave Type
async function saveLeaveType() {
  if (!formValid.value) return
  isSaving.value = true

  try {
    await addDoc(collection(db, 'leaveTypes'), {
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      isActive: form.value.isActive
    })

    showNotification(`Leave Type "${form.value.name}" added successfully!`)
    closeDialog()
  } catch (err) {
    console.error('Error saving leave type:', err)
    showNotification(`Failed to save: ${err.message}`, 'error', 'mdi-alert-circle')
  } finally {
    isSaving.value = false
  }
}

// Toggle isActive status inline
async function toggleActiveStatus(item) {
  const newStatus = !item.isActive
  try {
    const typeRef = doc(db, 'leaveTypes', item.typeId)
    await updateDoc(typeRef, { isActive: newStatus })
    showNotification(
      `"${item.name}" is now ${newStatus ? 'Active' : 'Inactive'}.`,
      newStatus ? 'success' : 'warning'
    )
  } catch (err) {
    console.error('Error updating leave type status:', err)
    showNotification(`Failed to toggle status: ${err.message}`, 'error', 'mdi-alert-circle')
  }
}

// Notifications Helper
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
/* Smooth animations and subtle rows on hover */
:deep(.v-data-table) {
  background-color: transparent !important;
}
:deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
