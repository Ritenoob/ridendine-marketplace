# Runtime Sample Fixtures

Generated: 2026-06-07T21:39:57.172Z

This smoke fixture record resolves stable sample values for dynamic runtime proof actions. Values are IDs or slugs only; authentication credentials are never printed.

## Summary

| Metric | Count |
|---|---:|
| Sample slots | 9 |
| Ready slots | 7 |
| Missing slots | 2 |

## Samples

| Status | Sample | Env var | Value | Source |
|---|---|---|---|---|
| READY | Chef ID | `RIDENDINE_SAMPLE_CHEF_ID` | b2b2b2b2-0002-0002-0002-b2b2b2b2b2b2 | customer /api/storefronts?limit=1 |
| READY | Chef slug | `RIDENDINE_SAMPLE_CHEF_SLUG` | hoang-gia-pho | customer /api/storefronts?limit=1 |
| READY | Storefront ID | `RIDENDINE_SAMPLE_STOREFRONT_ID` | b2b2b2b2-0002-0002-0021-b2b2b2b2b2b2 | customer /api/storefronts?limit=1 |
| MISSING | Customer ID | `RIDENDINE_SAMPLE_CUSTOMER_ID` | - | missing |
| READY | Driver ID | `RIDENDINE_SAMPLE_DRIVER_ID` | 8083f95d-8505-45a4-8cbc-2a276b85e634 | ops /api/drivers |
| READY | Delivery ID | `RIDENDINE_SAMPLE_DELIVERY_ID` | e3ecf842-8e8e-4d78-8d71-46b2df93e9e9 | ops /api/deliveries |
| READY | Order ID | `RIDENDINE_SAMPLE_ORDER_ID` | ce7d45c3-8745-4a88-9a36-7434d6e71d1f | customer /api/orders |
| MISSING | Payout run ID | `RIDENDINE_SAMPLE_PAYOUT_RUN_ID` | - | missing |
| READY | Support ticket ID | `RIDENDINE_SAMPLE_SUPPORT_TICKET_ID` | 0ad92de7-3c2b-4ffa-a99e-a55051965bd7 | customer /api/support controlled fixture |

## Notes

None found.
