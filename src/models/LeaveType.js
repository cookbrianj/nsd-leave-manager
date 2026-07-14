/**
 * LeaveType document stored in the `leaveTypes` collection.
 *
 * @typedef {Object} LeaveType
 * @property {string}  typeId      - Unique identifier (also the document ID).
 * @property {string}  name        - Display name (e.g. "Sick Leave").
 * @property {string}  description - Short description of the leave type.
 * @property {boolean} isActive    - Whether this type is available for new requests.
 */

/**
 * Creates a default LeaveType object.
 * @param {Partial<LeaveType>} [overrides={}]
 * @returns {LeaveType}
 */
export function createLeaveType(overrides = {}) {
  return {
    typeId: '',
    name: '',
    description: '',
    isActive: true,
    ...overrides,
  }
}

/**
 * Converts a Firestore document snapshot to a LeaveType object.
 * @param {import('firebase/firestore').DocumentSnapshot} doc
 * @returns {LeaveType}
 */
export function leaveTypeFromDoc(doc) {
  const data = doc.data()
  return {
    typeId: doc.id,
    name: data.name ?? '',
    description: data.description ?? '',
    isActive: data.isActive ?? true,
  }
}
