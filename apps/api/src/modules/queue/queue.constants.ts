/**
 * BullMQ queue name constants.
 * All queue names are defined here to avoid magic strings scattered across the codebase.
 */

/** Primary order synchronisation queue */
export const ORDER_SYNC_QUEUE = 'order-sync';

/** Dead Letter Queue — receives jobs that have exhausted all retry attempts */
export const ORDER_SYNC_DLQ = 'order-sync-dlq';

/** BullMQ job name used for order sync jobs */
export const ORDER_SYNC_JOB = 'sync-order';
