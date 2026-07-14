/**
 * Barrel export for all data models.
 *
 * Import from here:
 *   import { createUser, userFromDoc, USER_ROLES, ... } from '@/models'
 */

export {
  createUser,
  userFromDoc,
  USER_ROLES,
  ROLE_LABELS,
} from './User.js'

export {
  createBuilding,
  buildingFromDoc,
} from './Building.js'

export {
  createLeaveType,
  leaveTypeFromDoc,
} from './LeaveType.js'

export {
  createLeaveRequest,
  leaveRequestFromDoc,
  LEAVE_STATUSES,
  STATUS_CONFIG,
} from './LeaveRequest.js'
