// ==========================================
// CHEF-ADMIN ENGINE CLIENT
// FND-016: uses shared getEngine/errorResponse/successResponse
// ==========================================

// Re-export shared helpers
export { getAdminEngine as getEngine, errorResponse, successResponse } from '@ridendine/engine';
export {
  getChefActorContext,
  getChefBasicContext,
  verifyChefOwnsStorefront,
  verifyChefOwnsOrder,
  type GetChefActorOptions,
} from '@ridendine/engine/server';
