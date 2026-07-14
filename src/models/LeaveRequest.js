/**
 * @typedef {'pending' | 'approved' | 'denied'} LeaveRequestStatus
 */

/**
 * LeaveRequest document stored in the `leaveRequests` collection.
 *
 * @typedef {Object} LeaveRequest
 * @property {string}             id            - Firestore document ID (auto-generated).
 * @property {string}             uid           - UID of the requesting employee.
 * @property {string}             buildingId    - Building the employee belongs to (denormalized for queries).
 * @property {string}             leaveTypeId   - Foreign key → leaveTypes collection.
 * @property {string}             leaveTypeName - Denormalized leave-type name for display.
 * @property {string}             startDate     - ISO date string (YYYY-MM-DD).
 * @property {string}             endDate       - ISO date string (YYYY-MM-DD).
 * @property {LeaveRequestStatus} status        - Current approval status.
 * @property {string}             [reason]      - Optional reason / notes from the employee.
 * @property {string}             [reviewerUid] - UID of the admin who approved/denied.
 * @property {string}             [reviewerNote]- Optional note from the reviewer.
 * @property {import('firebase/firestore').Timestamp} timestamp - Server timestamp of creation.
 * @property {import('firebase/firestore').Timestamp} [updatedAt] - Server timestamp of last status change.
 */

import { serverTimestamp } from 'firebase/firestore'

/**
 * Creates a default LeaveRequest object suitable for Firestore writes.
 * @param {Partial<LeaveRequest>} [overrides={}]
 * @returns {Object}
 */
export function createLeaveRequest(overrides = {}) {
  return {
    uid: '',
    buildingId: '',
    leaveTypeId: '',
    leaveTypeName: '',
    startDate: '',
    endDate: '',
    status: 'pending',
    reason: '',
    timestamp: serverTimestamp(),
    ...overrides,
  }
}

/**
 * Converts a Firestore document snapshot to a LeaveRequest object.
 * @param {import('firebase/firestore').DocumentSnapshot} doc
 * @returns {LeaveRequest}
 */
export function leaveRequestFromDoc(doc) {
  const data = doc.data()
  return {
    id: doc.id,
    uid: data.uid ?? '',
    buildingId: data.buildingId ?? '',
    leaveTypeId: data.leaveTypeId ?? '',
    leaveTypeName: data.leaveTypeName ?? '',
    startDate: data.startDate ?? '',
    endDate: data.endDate ?? '',
    status: data.status ?? 'pending',
    reason: data.reason ?? '',
    reviewerUid: data.reviewerUid ?? null,
    reviewerNote: data.reviewerNote ?? null,
    timestamp: data.timestamp ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

/** All valid statuses for validation / filters. */
export const LEAVE_STATUSES = /** @type {const} */ ([
  'pending',
  'approved',
  'denied',
])

/** Human-readable labels + colors for each status (Vuetify chip colors). */
export const STATUS_CONFIG = /** @type {Record<LeaveRequestStatus, { label: string, color: string, icon: string }>} */ ({
  pending: { label: 'Pending', color: 'warning', icon: 'mdi-clock-outline' },
  approved: { label: 'Approved', color: 'success', icon: 'mdi-check-circle-outline' },
  denied: { label: 'Denied', color: 'error', icon: 'mdi-close-circle-outline' },
})
