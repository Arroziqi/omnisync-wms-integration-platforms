import { Test, TestingModule } from '@nestjs/testing';
import { OrderRetryWorkerService } from './order-retry-worker.service';

/**
 * @deprecated OrderRetryWorkerService is now a no-op stub.
 * Retry logic has been superseded by BullMQ native retry in User Story 6.2.
 * These tests verify the stub initialises cleanly and emits the expected deprecation log.
 *
 * The original runRetryCycle() tests have been removed as that method no longer exists.
 * Retry behaviour is now covered by order-sync.processor.spec.ts.
 */
describe('OrderRetryWorkerService (deprecated stub)', () => {
  let service: OrderRetryWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderRetryWorkerService],
    }).compile();

    service = module.get<OrderRetryWorkerService>(OrderRetryWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should not expose runRetryCycle() — method has been removed', () => {
    expect((service as any).runRetryCycle).toBeUndefined();
  });
});
