<template>
  <v-card class="rounded-xl border overflow-hidden" elevation="1">
    <v-card-title class="pa-4 text-h6 font-weight-bold border-b text-slate-900 d-flex align-center justify-space-between">
      <span>Staff Directory</span>
      <v-btn color="primary" prepend-icon="mdi-account-plus" rounded="pill" size="small" @click="openAddDialog">
        Add Staff Member
      </v-btn>
    </v-card-title>

    <!-- Search & Filter Header -->
    <v-card-text class="pa-4 border-b bg-grey-lighten-5">
      <v-row class="align-center">
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            v-model="search"
            label="Search staff..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-select
            v-model="roleFilter"
            label="Filter by Role"
            :items="roleOptions"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-select
            v-model="buildingFilter"
            label="Filter by Building"
            :items="buildingOptions"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Users Data Table -->
    <v-card-text class="pa-0">
      <v-data-table
        :headers="headers"
        :items="filteredUsers"
        :loading="isLoading"
        loading-text="Syncing staff directory..."
        no-data-text="No staff members found."
        density="comfortable"
      >
        <!-- Name Column -->
        <template #[`item.name`]="{ item }">
          <div class="font-weight-bold">{{ item.firstName }} {{ item.lastName }}</div>
          <v-chip v-if="!item.uid" size="x-small" color="warning" variant="tonal" class="font-weight-bold mt-1">
            Unregistered (No Login Yet)
          </v-chip>
        </template>

        <!-- Role Column -->
        <template #[`item.role`]="{ item }">
          <v-chip size="small" :color="getRoleColor(item.role)" variant="flat" class="font-weight-bold text-uppercase">
            {{ ROLE_LABELS[item.role] || item.role }}
          </v-chip>
        </template>

        <!-- Building Column -->
        <template #[`item.buildingId`]="{ item }">
          <span class="font-weight-medium">{{ getBuildingName(item.buildingId) }}</span>
        </template>

        <!-- Actions Column -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex gap-2 justify-end">
            <v-btn icon="mdi-pencil" variant="text" size="small" color="primary" @click="openEditDialog(item)" />
            <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
          </div>
        </template>
      </v-data-table>
    </v-card-text>

    <!-- Add/Edit Staff Dialog -->
    <v-dialog v-model="dialog.show" max-width="500px" persistent>
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="text-h6 font-weight-bold">
          {{ dialog.isEdit ? 'Edit Staff Member' : 'Add Staff Member' }}
        </v-card-title>
        <v-divider class="my-2" />

        <v-card-text class="pa-4">
          <v-form ref="formRef" v-model="formValid">
            <v-text-field
              v-model="form.email"
              label="Email Address *"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              :disabled="dialog.isEdit"
              :rules="[
                v => !!v || 'Email is required',
                v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email format',
                v => v.toLowerCase().endsWith('@neoshosd.org') || 'Must be a @neoshosd.org email'
              ]"
            />
            <v-text-field
              v-model="form.firstName"
              label="First Name *"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              :rules="[v => !!v || 'First name is required']"
            />
            <v-text-field
              v-model="form.lastName"
              label="Last Name *"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              :rules="[v => !!v || 'Last name is required']"
            />
            <v-select
              v-model="form.role"
              label="Role *"
              :items="formRoleOptions"
              variant="outlined"
              density="comfortable"
              class="mb-4"
              :rules="[v => !!v || 'Role is required']"
            />
            <v-select
              v-model="form.buildingId"
              label="Assigned Building"
              :items="formBuildingOptions"
              variant="outlined"
              density="comfortable"
              :disabled="form.role === 'districtAdmin'"
              hint="District Admins do not require a building assignment."
              persistent-hint
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="d-flex justify-end gap-2 pa-4">
          <v-btn variant="outlined" rounded="pill" color="secondary" @click="dialog.show = false">
            Cancel
          </v-btn>
          <v-btn
            variant="elevated"
            rounded="pill"
            color="primary"
            :disabled="!formValid || isSubmitting"
            :loading="isSubmitting"
            @click="saveStaff"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog.show" max-width="400px">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="text-h6 font-weight-bold text-error d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-alert</v-icon>
          Delete Account?
        </v-card-title>
        <v-card-text class="pa-4">
          Are you sure you want to delete the staff profile for <strong>{{ deleteDialog.item?.firstName }} {{ deleteDialog.item?.lastName }}</strong> ({{ deleteDialog.item?.email }})?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions class="d-flex justify-end gap-2 pa-4">
          <v-btn variant="text" color="medium-emphasis" @click="deleteDialog.show = false">Cancel</v-btn>
          <v-btn color="error" variant="elevated" rounded="pill" :loading="isSubmitting" @click="deleteStaff">
            Delete Profile
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { ROLE_LABELS } from '@/models'

const users = ref([])
const buildings = ref([])
const isLoading = ref(true)
const isSubmitting = ref(false)

const search = ref('')
const roleFilter = ref(null)
const buildingFilter = ref(null)

const formValid = ref(false)
const formRef = ref(null)

const headers = [
  { title: 'Name', key: 'name', align: 'start', sortable: true },
  { title: 'Email Address', key: 'email', align: 'start', sortable: true },
  { title: 'Role', key: 'role', align: 'start', sortable: true },
  { title: 'Building', key: 'buildingId', align: 'start', sortable: true },
  { title: 'Actions', key: 'actions', align: 'end', sortable: false }
]

const dialog = ref({
  show: false,
  isEdit: false,
  item: null
})

const deleteDialog = ref({
  show: false,
  item: null
})

const form = ref({
  email: '',
  firstName: '',
  lastName: '',
  role: 'employee',
  buildingId: 'default'
})

const snackbar = ref({ show: false, text: '', color: 'success' })

let unsubscribeUsers = null
let unsubscribeBuildings = null

// Load and watch database
onMounted(() => {
  // Sync users
  const usersQuery = query(collection(db, 'users'))
  unsubscribeUsers = onSnapshot(usersQuery, (snap) => {
    users.value = snap.docs.map(doc => ({
      email: doc.id,
      ...doc.data()
    }))
    isLoading.value = false
  }, (err) => {
    console.error('Error fetching users:', err)
    showSnackbar('Failed to load users', 'error')
  })

  // Sync buildings
  const buildingsQuery = query(collection(db, 'buildings'))
  unsubscribeBuildings = onSnapshot(buildingsQuery, (snap) => {
    buildings.value = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }, (err) => {
    console.error('Error fetching buildings:', err)
  })
})

onUnmounted(() => {
  if (unsubscribeUsers) unsubscribeUsers()
  if (unsubscribeBuildings) unsubscribeBuildings()
})

// Options mappings
const roleOptions = [
  { title: 'Employee', value: 'employee' },
  { title: 'School Admin', value: 'admin' },
  { title: 'School Assistant', value: 'assistant' },
  { title: 'District Admin', value: 'districtAdmin' }
]

const formRoleOptions = [
  { title: 'Employee', value: 'employee' },
  { title: 'School Admin (Building Admin)', value: 'admin' },
  { title: 'School Assistant (Building Assistant)', value: 'assistant' },
  { title: 'District Admin', value: 'districtAdmin' }
]

const buildingOptions = computed(() => {
  const list = buildings.value.map(b => ({ title: b.buildingName, value: b.id }))
  list.unshift({ title: 'District Office / Default', value: 'default' })
  return list
})

const formBuildingOptions = computed(() => {
  return buildings.value.map(b => ({ title: b.buildingName, value: b.id }))
})

// Get names/labels for UI
function getBuildingName(id) {
  if (id === 'default' || !id) return 'District Office / Default'
  const b = buildings.value.find(x => x.id === id)
  return b ? b.buildingName : id
}

function getRoleColor(role) {
  switch (role) {
    case 'districtAdmin': return 'indigo'
    case 'admin': return 'primary'
    case 'assistant': return 'secondary'
    default: return 'grey-darken-1'
  }
}

function showSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

// Filter users list
const filteredUsers = computed(() => {
  return users.value.filter(u => {
    const nameMatch = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(search.value?.toLowerCase() || '')
    const emailMatch = u.email.toLowerCase().includes(search.value?.toLowerCase() || '')
    const roleMatch = !roleFilter.value || u.role === roleFilter.value
    const buildingMatch = !buildingFilter.value || u.buildingId === buildingFilter.value

    return (nameMatch || emailMatch) && roleMatch && buildingMatch
  })
})

// Dialog controls
function openAddDialog() {
  form.value = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'employee',
    buildingId: 'default'
  }
  dialog.value = { show: true, isEdit: false, item: null }
}

function openEditDialog(item) {
  form.value = {
    email: item.email,
    firstName: item.firstName || '',
    lastName: item.lastName || '',
    role: item.role || 'employee',
    buildingId: item.buildingId || 'default'
  }
  dialog.value = { show: true, isEdit: true, item }
}

function confirmDelete(item) {
  deleteDialog.value = { show: true, item }
}

// Actions
async function saveStaff() {
  if (isSubmitting.value) return
  isSubmitting.value = true

  const emailClean = form.value.email.trim().toLowerCase()
  const userRef = doc(db, 'users', emailClean)

  // For district admins, they don't belong to a specific building
  let buildingVal = form.value.buildingId
  if (form.value.role === 'districtAdmin') {
    buildingVal = 'default'
  }

  const payload = {
    email: emailClean,
    firstName: form.value.firstName.trim(),
    lastName: form.value.lastName.trim(),
    role: form.value.role,
    buildingId: buildingVal
  }

  try {
    if (dialog.value.isEdit) {
      const existing = dialog.value.item
      // If UID exists, keep it
      if (existing.uid) {
        payload.uid = existing.uid
      }
      
      // Update document
      await setDoc(userRef, payload, { merge: true })

      // Sync building configurations if role/building changed and user has a uid
      if (existing.uid && (existing.role !== payload.role || existing.buildingId !== payload.buildingId)) {
        await syncUserBuildingAccess(existing.uid, existing.buildingId, existing.role, payload.buildingId, payload.role)
      }
      
      showSnackbar('Staff member updated successfully')
    } else {
      // Create new profile (pre-provisioned)
      // Check if email already exists
      const emailExists = users.value.some(u => u.email === emailClean)
      if (emailExists) {
        showSnackbar('A staff member with this email already exists', 'error')
        isSubmitting.value = false
        return
      }

      await setDoc(userRef, payload)
      showSnackbar('Staff member pre-provisioned successfully')
    }

    dialog.value.show = false
  } catch (err) {
    console.error('Error saving staff profile:', err)
    showSnackbar('Failed to save staff profile: ' + err.message, 'error')
  } finally {
    isSubmitting.value = false
  }
}

async function deleteStaff() {
  const item = deleteDialog.value.item
  if (!item || isSubmitting.value) return
  isSubmitting.value = true

  try {
    await deleteDoc(doc(db, 'users', item.email))
    
    // Sync building configurations to remove their UID
    if (item.uid) {
      await syncUserBuildingAccess(item.uid, item.buildingId, item.role, 'default', 'employee')
    }

    showSnackbar('Staff member deleted successfully')
    deleteDialog.value.show = false
  } catch (err) {
    console.error('Error deleting staff:', err)
    showSnackbar('Failed to delete staff member', 'error')
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Helper to update building records to add/remove UIDs from adminUids/assistantUids arrays.
 */
import { getDoc } from 'firebase/firestore'
async function syncUserBuildingAccess(uid, oldBuildingId, oldRole, newBuildingId, newRole) {
  try {
    // 1. Remove from old building arrays
    if (oldBuildingId && oldBuildingId !== 'default') {
      const oldBuildingRef = doc(db, 'buildings', oldBuildingId)
      const oldBuildingSnap = await getDoc(oldBuildingRef)
      if (oldBuildingSnap.exists()) {
        const data = oldBuildingSnap.data()
        const updates = {}
        if (oldRole === 'admin') {
          updates.adminUids = (data.adminUids || []).filter(id => id !== uid)
        } else if (oldRole === 'assistant') {
          updates.assistantUids = (data.assistantUids || []).filter(id => id !== uid)
        }
        if (Object.keys(updates).length > 0) {
          await updateDoc(oldBuildingRef, updates)
        }
      }
    }

    // 2. Add to new building arrays
    if (newBuildingId && newBuildingId !== 'default') {
      const newBuildingRef = doc(db, 'buildings', newBuildingId)
      const newBuildingSnap = await getDoc(newBuildingRef)
      if (newBuildingSnap.exists()) {
        const data = newBuildingSnap.data()
        const updates = {}
        if (newRole === 'admin') {
          const admins = data.adminUids || []
          if (!admins.includes(uid)) {
            updates.adminUids = [...admins, uid]
          }
        } else if (newRole === 'assistant') {
          const assistants = data.assistantUids || []
          if (!assistants.includes(uid)) {
            updates.assistantUids = [...assistants, uid]
          }
        }
        if (Object.keys(updates).length > 0) {
          await updateDoc(newBuildingRef, updates)
        }
      }
    }
  } catch (err) {
    console.error('Error syncing user building arrays:', err)
  }
}
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>
