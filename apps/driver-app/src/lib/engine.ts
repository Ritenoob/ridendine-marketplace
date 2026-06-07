// ==========================================
// DRIVER-APP ENGINE CLIENT
// FND-016: uses shared getEngine/errorResponse/successResponse
// ==========================================

// Re-export shared helpers
export { getAdminEngine as getEngine, errorResponse, successResponse } from '@ridendine/engine';
export {
  getDriverActorContext,
  verifyDriverOwnsDelivery,
  type GetDriverActorOptions,
} from '@ridendine/engine/server';
