// ==========================================
// WEB APP ENGINE CLIENT
// FND-016: uses shared getEngine/errorResponse/successResponse
// ==========================================

import { registerPaymentAdapter } from '@ridendine/engine';
import { stripePaymentAdapter } from './stripe-adapter';

// Wire Stripe adapter so engine can void payments on reject/cancel
registerPaymentAdapter(stripePaymentAdapter);

// Re-export shared helpers so existing imports don't break
export { getAdminEngine as getEngine, errorResponse, successResponse } from '@ridendine/engine';
export { getCustomerActorContext, getSystemActor } from '@ridendine/engine/server';
