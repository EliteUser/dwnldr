import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { heavyOperationGuard, resetHeavyOperationGuardForTests } from './heavy-operation-guard.js';

describe('heavyOperationGuard', () => {
  beforeEach(() => {
    resetHeavyOperationGuardForTests();
  });

  it('rejects concurrent media work and releases the slot when the response finishes', () => {
    const firstResponse = new EventEmitter();
    const secondResponse = Object.assign(new EventEmitter(), { setHeader: vi.fn() });
    const firstNext = vi.fn();
    const secondNext = vi.fn();

    heavyOperationGuard({} as never, firstResponse as never, firstNext);
    heavyOperationGuard({} as never, secondResponse as never, secondNext);

    expect(firstNext).toHaveBeenCalledWith();
    expect(secondNext).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SERVER_BUSY',
        statusCode: 503,
      }),
    );
    expect(secondResponse.setHeader).toHaveBeenCalledWith('Retry-After', '30');

    firstResponse.emit('finish');
    const thirdNext = vi.fn();
    heavyOperationGuard({} as never, new EventEmitter() as never, thirdNext);
    expect(thirdNext).toHaveBeenCalledWith();
  });
});
