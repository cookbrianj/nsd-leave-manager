/**
 * Building document stored in the `buildings` collection.
 *
 * @typedef {Object} Building
 * @property {string}   buildingId    - Unique identifier (also the document ID).
 * @property {string}   buildingName  - Human-readable building name.
 * @property {string[]} adminUids     - UIDs of Building Admins assigned here.
 * @property {string[]} assistantUids - UIDs of Building Assistants assigned here.
 */

/**
 * Creates a default Building object.
 * @param {Partial<Building>} [overrides={}]
 * @returns {Building}
 */
export function createBuilding(overrides = {}) {
  return {
    buildingId: '',
    buildingName: '',
    adminUids: [],
    assistantUids: [],
    ...overrides,
  }
}

/**
 * Converts a Firestore document snapshot to a Building object.
 * @param {import('firebase/firestore').DocumentSnapshot} doc
 * @returns {Building}
 */
export function buildingFromDoc(doc) {
  const data = doc.data()
  return {
    buildingId: doc.id,
    buildingName: data.buildingName ?? '',
    adminUids: data.adminUids ?? [],
    assistantUids: data.assistantUids ?? [],
  }
}
