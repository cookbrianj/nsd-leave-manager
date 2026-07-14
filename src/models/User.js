/**
 * @typedef {'employee' | 'admin' | 'assistant' | 'districtAdmin'} UserRole
 */

/**
 * User document stored in the `users` collection.
 *
 * @typedef {Object} User
 * @property {string}   uid         - Firebase Auth UID (also the document ID).
 * @property {string}   email       - User's email address.
 * @property {string}   firstName   - First name.
 * @property {string}   lastName    - Last name.
 * @property {string}   buildingId  - Foreign key → buildings collection.
 * @property {UserRole} role        - Access-control role.
 */

/**
 * Creates a default User object.
 * @param {Partial<User>} [overrides={}]
 * @returns {User}
 */
export function createUser(overrides = {}) {
  return {
    uid: '',
    email: '',
    firstName: '',
    lastName: '',
    buildingId: '',
    role: 'employee',
    ...overrides,
  }
}

/**
 * Converts a Firestore document snapshot to a User object.
 * @param {import('firebase/firestore').DocumentSnapshot} doc
 * @returns {User}
 */
export function userFromDoc(doc) {
  const data = doc.data()
  return {
    uid: doc.id,
    email: data.email ?? '',
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    buildingId: data.buildingId ?? '',
    role: data.role ?? 'employee',
  }
}

/** All valid roles for validation / dropdowns. */
export const USER_ROLES = /** @type {const} */ ([
  'employee',
  'admin',
  'assistant',
  'districtAdmin',
])

/** Human-readable labels for each role. */
export const ROLE_LABELS = /** @type {Record<UserRole, string>} */ ({
  employee: 'Employee',
  admin: 'Building Admin',
  assistant: 'Building Assistant',
  districtAdmin: 'District Admin',
})
