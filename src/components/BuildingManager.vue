<template>
  <v-card class="rounded-xl border overflow-hidden" elevation="1">
    <v-card-title class="pa-4 text-h6 font-weight-bold border-b text-slate-900 d-flex align-center justify-space-between">
      <span>Buildings & Admins</span>
      <v-btn color="primary" prepend-icon="mdi-plus" rounded="pill" size="small" @click="openAddDialog">
        Add Building
      </v-btn>
    </v-card-title>

    <v-card-text class="pa-0">
      <!-- Loading State -->
      <div v-if="isLoading" class="pa-6 text-center">
        <v-progress-circular indeterminate color="primary" />
        <div class="mt-2 text-medium-emphasis">Loading buildings...</div>
      </div>

      <!-- Buildings Grid -->
      <v-container v-else fluid class="pa-4">
        <v-row>
          <v-col v-for="building in buildings" :key="building.id" cols="12" md="6">
            <v-card variant="outlined" class="h-100 rounded-lg bg-white">
              <v-card-title class="d-flex align-center justify-space-between bg-grey-lighten-4 border-b">
                <span class="font-weight-bold text-subtitle-1">{{ building.buildingName }}</span>
                <v-chip size="x-small" color="primary" variant="tonal">ID: {{ building.id }}</v-chip>
              </v-card-title>
              
              <v-card-text class="pa-4">
                <!-- Admins Selection -->
                <v-autocomplete
                  v-model="building.adminUids"
                  :items="allUsers"
                  item-title="displayName"
                  item-value="uid"
                  label="Building Admins"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                  hide-details="auto"
                  @update:model-value="markDirty(building.id)"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="item.raw.email" />
                  </template>
                </v-autocomplete>

                <!-- Assistants Selection -->
                <v-autocomplete
                  v-model="building.assistantUids"
                  :items="allUsers"
                  item-title="displayName"
                  item-value="uid"
                  label="Building Assistants"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  @update:model-value="markDirty(building.id)"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="item.raw.email" />
                  </template>
                </v-autocomplete>
              </v-card-text>

              <!-- Save Action -->
              <v-card-actions class="pa-4 pt-0 justify-end" v-if="dirtyFlags[building.id]">
                <v-btn
                  color="primary"
                  variant="elevated"
                  rounded="pill"
                  size="small"
                  :loading="isSaving[building.id]"
                  @click="saveBuilding(building)"
                >
                  Save Changes
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
        
        <v-alert v-if="buildings.length === 0" type="info" variant="tonal" class="mt-4">
          No buildings exist yet. Click "Add Building" to create one.
        </v-alert>
      </v-container>
    </v-card-text>

    <!-- Add Building Dialog -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card class="rounded-xl">
        <v-card-title class="pa-4 border-b">Add New Building</v-card-title>
        <v-card-text class="pa-4">
          <v-text-field
            v-model="newBuilding.id"
            label="Building ID (e.g., NHS, NMS)"
            variant="outlined"
            class="mb-4"
            hint="A short, unique identifier for the building."
            persistent-hint
            :rules="[v => !!v || 'ID is required']"
          />
          <v-text-field
            v-model="newBuilding.name"
            label="Building Name (e.g., Neosho High School)"
            variant="outlined"
            :rules="[v => !!v || 'Name is required']"
          />
        </v-card-text>
        <v-card-actions class="pa-4 border-t justify-end">
          <v-btn variant="text" color="medium-emphasis" @click="showAddDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" rounded="pill" :loading="isAdding" @click="submitNewBuilding" :disabled="!newBuilding.id || !newBuilding.name">
            Create Building
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
import { ref, onMounted, onUnmounted } from 'vue'
import { collection, query, onSnapshot, doc, getDocs, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'

const buildings = ref([])
const allUsers = ref([])
const isLoading = ref(true)

const dirtyFlags = ref({})
const isSaving = ref({})
const isAdding = ref(false)

const showAddDialog = ref(false)
const newBuilding = ref({ id: '', name: '' })

const snackbar = ref({ show: false, text: '', color: 'success' })
let unsubscribeBuildings = null

onMounted(async () => {
  await fetchUsers()
  
  // Real-time listener for buildings
  const q = query(collection(db, 'buildings'))
  unsubscribeBuildings = onSnapshot(q, (snap) => {
    buildings.value = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure arrays exist
      adminUids: doc.data().adminUids || [],
      assistantUids: doc.data().assistantUids || []
    }))
    isLoading.value = false
  }, (err) => {
    console.error('Error fetching buildings:', err)
    showSnackbar('Failed to load buildings', 'error')
    isLoading.value = false
  })
})

onUnmounted(() => {
  if (unsubscribeBuildings) unsubscribeBuildings()
})

async function fetchUsers() {
  try {
    const snap = await getDocs(collection(db, 'users'))
    allUsers.value = snap.docs.map(doc => {
      const data = doc.data()
      return {
        email: doc.id, // User doc id is the email
        uid: data.uid,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        displayName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
        role: data.role || 'employee',
        buildingId: data.buildingId || 'default'
      }
    }).filter(u => u.uid) // Only include users who have logged in (have a uid)
  } catch (err) {
    console.error('Error fetching users:', err)
    showSnackbar('Failed to fetch user list for assignments', 'error')
  }
}

function markDirty(buildingId) {
  dirtyFlags.value[buildingId] = true
}

function showSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

function openAddDialog() {
  newBuilding.value = { id: '', name: '' }
  showAddDialog.value = true
}

async function submitNewBuilding() {
  if (!newBuilding.value.id || !newBuilding.value.name) return
  isAdding.value = true
  
  try {
    const buildingRef = doc(db, 'buildings', newBuilding.value.id)
    await setDoc(buildingRef, {
      buildingName: newBuilding.value.name,
      adminUids: [],
      assistantUids: []
    })
    showSnackbar('Building created successfully')
    showAddDialog.value = false
  } catch (err) {
    console.error('Error creating building:', err)
    showSnackbar('Failed to create building', 'error')
  } finally {
    isAdding.value = false
  }
}

async function saveBuilding(building) {
  isSaving.value[building.id] = true
  try {
    // 1. Update the building document
    const buildingRef = doc(db, 'buildings', building.id)
    await updateDoc(buildingRef, {
      adminUids: building.adminUids,
      assistantUids: building.assistantUids
    })

    // 2. Sync user roles and buildingIds in the users collection
    // Fetch users again to ensure we have the latest state before modifying
    await fetchUsers()
    
    const updatePromises = []
    
    for (const user of allUsers.value) {
      let needsUpdate = false
      let newRole = user.role
      let newBuildingId = user.buildingId

      const isNowAdmin = building.adminUids.includes(user.uid)
      const isNowAssistant = building.assistantUids.includes(user.uid)

      if (isNowAdmin) {
        if (user.role !== 'admin' || user.buildingId !== building.id) {
          newRole = 'admin'
          newBuildingId = building.id
          needsUpdate = true
        }
      } else if (isNowAssistant) {
        if (user.role !== 'assistant' || user.buildingId !== building.id) {
          newRole = 'assistant'
          newBuildingId = building.id
          needsUpdate = true
        }
      } else {
        // If they were previously assigned to THIS building, but aren't anymore, revert them to employee
        if (user.buildingId === building.id && (user.role === 'admin' || user.role === 'assistant')) {
          newRole = 'employee'
          newBuildingId = 'default'
          needsUpdate = true
        }
      }

      if (needsUpdate) {
        const userRef = doc(db, 'users', user.email)
        updatePromises.push(updateDoc(userRef, {
          role: newRole,
          buildingId: newBuildingId
        }))
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises)
    }

    showSnackbar('Building updated successfully')
    dirtyFlags.value[building.id] = false
  } catch (err) {
    console.error('Error updating building:', err)
    showSnackbar('Failed to update building and roles', 'error')
  } finally {
    isSaving.value[building.id] = false
  }
}
</script>
