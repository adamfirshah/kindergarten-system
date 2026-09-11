import { useAuth } from '../context/AuthContext'
import {
  ACCESS,
  canAccessModule,
  getModuleAccess,
  hasFullAccess,
} from '../config/permissions'

export function usePermissions() {
  const { userRole } = useAuth()

  return {
    roleId: userRole,
    canAccess: (moduleId) => (userRole ? canAccessModule(userRole, moduleId) : false),
    getAccess: (moduleId) => (userRole ? getModuleAccess(userRole, moduleId) : ACCESS.NONE),
    hasFullAccess: (moduleId) => (userRole ? hasFullAccess(userRole, moduleId) : false),
  }
}
