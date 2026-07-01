import { getEngine, getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/kitchen/pause
 * Pause the chef's storefront - prevents new customer orders (is_paused enforced at checkout).
 */
export async function POST(): Promise<Response> {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const engine = getEngine();
    const result = await engine.kitchen.pauseStorefront(
      chefContext.storefrontId,
      'Chef paused service',
      chefContext.actor
    );

    if (!result.success) {
      const status = result.error?.code === 'FORBIDDEN' ? 403 : 500;
      return errorResponse(
        result.error?.code ?? 'PAUSE_FAILED',
        result.error?.message ?? 'Failed to pause storefront',
        status
      );
    }

    return successResponse({ isPaused: true });
  } catch (error) {
    console.error('Error pausing storefront:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * DELETE /api/kitchen/pause
 * Resume the chef's storefront - allows new customer orders.
 */
export async function DELETE(): Promise<Response> {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const engine = getEngine();
    const result = await engine.kitchen.unpauseStorefront(
      chefContext.storefrontId,
      chefContext.actor
    );

    if (!result.success) {
      const status = result.error?.code === 'FORBIDDEN' ? 403 : 500;
      return errorResponse(
        result.error?.code ?? 'RESUME_FAILED',
        result.error?.message ?? 'Failed to resume storefront',
        status
      );
    }

    return successResponse({ isPaused: false });
  } catch (error) {
    console.error('Error resuming storefront:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
