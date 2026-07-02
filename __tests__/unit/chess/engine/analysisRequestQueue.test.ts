/**
 * Unit tests for the priority-ordered analysis request queue
 * Covers the ordering/preemption rules that fixed a live bug where
 * interactive (user-facing) analysis requests could get stuck behind a
 * long-running background sweep and spuriously time out.
 */

import { AnalysisRequestQueue, QueuedAnalysisTask } from '../../../../lib/chess/engine/analysisRequestQueue'

interface Deferred<T = void> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function createDeferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** Flushes any settled microtasks so `await`ed promise chains catch up */
async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

function makeTask(
  requestId: number,
  priority: 'interactive' | 'background',
  deferred: Deferred = createDeferred(),
): { task: QueuedAnalysisTask; deferred: Deferred } {
  const task: QueuedAnalysisTask = {
    priority,
    requestId,
    run: () => deferred.promise,
  }
  return { task, deferred }
}

describe('AnalysisRequestQueue', () => {
  it('runs background tasks in FIFO order when nothing preempts them', async () => {
    const order: number[] = []
    const queue = new AnalysisRequestQueue({
      onSuperseded: jest.fn(),
      onInterruptCurrent: jest.fn(),
      isInterruptible: () => false,
    })

    const a = makeTask(1, 'background')
    a.deferred = createDeferred()
    const bDeferred = createDeferred()
    const cDeferred = createDeferred()

    queue.enqueue({ ...a.task, run: async () => { order.push(1); await a.deferred.promise } })
    queue.enqueue({ priority: 'background', requestId: 2, run: async () => { order.push(2); await bDeferred.promise } })
    queue.enqueue({ priority: 'background', requestId: 3, run: async () => { order.push(3); await cDeferred.promise } })

    a.deferred.resolve()
    await flush()
    bDeferred.resolve()
    await flush()
    cDeferred.resolve()
    await flush()

    expect(order).toEqual([1, 2, 3])
  })

  it('runs an interactive task ahead of queued background tasks', async () => {
    const order: number[] = []
    const queue = new AnalysisRequestQueue({
      onSuperseded: jest.fn(),
      onInterruptCurrent: jest.fn(),
      isInterruptible: () => false,
    })

    const runningDeferred = createDeferred()
    const bgDeferred = createDeferred()
    const interactiveDeferred = createDeferred()

    // Task A starts running immediately (queue was empty).
    queue.enqueue({ priority: 'background', requestId: 1, run: async () => { order.push(1); await runningDeferred.promise } })
    // While A is running, queue a background task then an interactive task.
    queue.enqueue({ priority: 'background', requestId: 2, run: async () => { order.push(2); await bgDeferred.promise } })
    queue.enqueue({ priority: 'interactive', requestId: 3, run: async () => { order.push(3); await interactiveDeferred.promise } })

    runningDeferred.resolve()
    await flush()
    // The interactive task (3) should run before the background task (2),
    // even though 2 was queued first.
    interactiveDeferred.resolve()
    await flush()
    bgDeferred.resolve()
    await flush()

    expect(order).toEqual([1, 3, 2])
  })

  it('supersedes an already-queued interactive task with a newer one', async () => {
    const superseded: number[] = []
    const order: number[] = []
    const queue = new AnalysisRequestQueue({
      onSuperseded: (requestId) => superseded.push(requestId),
      onInterruptCurrent: jest.fn(),
      isInterruptible: () => false,
    })

    const runningDeferred = createDeferred()
    const newerDeferred = createDeferred()

    queue.enqueue({ priority: 'background', requestId: 1, run: async () => { order.push(1); await runningDeferred.promise } })
    // Queued but never runs - gets superseded by requestId 3 below.
    queue.enqueue({ priority: 'interactive', requestId: 2, run: async () => { order.push(2) } })
    queue.enqueue({ priority: 'interactive', requestId: 3, run: async () => { order.push(3); await newerDeferred.promise } })

    expect(superseded).toEqual([2])

    runningDeferred.resolve()
    await flush()
    newerDeferred.resolve()
    await flush()

    // Task 2 never ran - only 1 (already running) and 3 (the newer interactive request) did.
    expect(order).toEqual([1, 3])
  })

  it('interrupts the currently-running task when a new interactive request arrives and interruption is possible', async () => {
    const onInterruptCurrent = jest.fn()
    const queue = new AnalysisRequestQueue({
      onSuperseded: jest.fn(),
      onInterruptCurrent,
      isInterruptible: () => true,
    })

    const runningDeferred = createDeferred()
    queue.enqueue({ priority: 'background', requestId: 1, run: () => runningDeferred.promise })

    queue.enqueue({ priority: 'interactive', requestId: 2, run: async () => {} })

    expect(onInterruptCurrent).toHaveBeenCalledTimes(1)
  })

  it('does not interrupt when isInterruptible reports nothing can be interrupted', async () => {
    const onInterruptCurrent = jest.fn()
    const queue = new AnalysisRequestQueue({
      onSuperseded: jest.fn(),
      onInterruptCurrent,
      isInterruptible: () => false,
    })

    const runningDeferred = createDeferred()
    queue.enqueue({ priority: 'background', requestId: 1, run: () => runningDeferred.promise })

    queue.enqueue({ priority: 'interactive', requestId: 2, run: async () => {} })

    expect(onInterruptCurrent).not.toHaveBeenCalled()
  })

  it('does not interrupt when the queue is idle (nothing currently running)', () => {
    const onInterruptCurrent = jest.fn()
    const queue = new AnalysisRequestQueue({
      onSuperseded: jest.fn(),
      onInterruptCurrent,
      isInterruptible: () => true,
    })

    // First-ever enqueue: currentPriority starts null, so there is nothing
    // to interrupt regardless of what isInterruptible() would report.
    queue.enqueue({ priority: 'interactive', requestId: 1, run: async () => {} })

    expect(onInterruptCurrent).not.toHaveBeenCalled()
  })

  it('interrupts an already-running interactive task for a newer interactive request', async () => {
    const onInterruptCurrent = jest.fn()
    const queue = new AnalysisRequestQueue({
      onSuperseded: jest.fn(),
      onInterruptCurrent,
      isInterruptible: () => true,
    })

    const runningDeferred = createDeferred()
    queue.enqueue({ priority: 'interactive', requestId: 1, run: () => runningDeferred.promise })

    queue.enqueue({ priority: 'interactive', requestId: 2, run: async () => {} })

    // Preemption applies regardless of the currently-running task's own
    // priority - the newest interactive request always wins.
    expect(onInterruptCurrent).toHaveBeenCalledTimes(1)
  })

  it('never supersedes or interrupts for background-only traffic', async () => {
    const onSuperseded = jest.fn()
    const onInterruptCurrent = jest.fn()
    const queue = new AnalysisRequestQueue({
      onSuperseded,
      onInterruptCurrent,
      isInterruptible: () => true,
    })

    const runningDeferred = createDeferred()
    queue.enqueue({ priority: 'background', requestId: 1, run: () => runningDeferred.promise })
    queue.enqueue({ priority: 'background', requestId: 2, run: async () => {} })
    queue.enqueue({ priority: 'background', requestId: 3, run: async () => {} })

    expect(onSuperseded).not.toHaveBeenCalled()
    expect(onInterruptCurrent).not.toHaveBeenCalled()
    expect(queue.pendingCount).toBe(2)
  })

  it('exposes pendingCount for tasks waiting to run', () => {
    const queue = new AnalysisRequestQueue({
      onSuperseded: jest.fn(),
      onInterruptCurrent: jest.fn(),
      isInterruptible: () => false,
    })

    expect(queue.pendingCount).toBe(0)

    const runningDeferred = createDeferred()
    queue.enqueue({ priority: 'background', requestId: 1, run: () => runningDeferred.promise })
    // Task 1 starts running immediately, so it's not "pending".
    expect(queue.pendingCount).toBe(0)

    queue.enqueue({ priority: 'background', requestId: 2, run: async () => {} })
    expect(queue.pendingCount).toBe(1)
  })

  it('continues draining subsequent tasks after one fails', async () => {
    const order: number[] = []
    const queue = new AnalysisRequestQueue({
      onSuperseded: jest.fn(),
      onInterruptCurrent: jest.fn(),
      isInterruptible: () => false,
    })

    queue.enqueue({
      priority: 'background',
      requestId: 1,
      run: async () => {
        order.push(1)
        throw new Error('boom')
      },
    })
    queue.enqueue({ priority: 'background', requestId: 2, run: async () => { order.push(2) } })

    await flush()
    await flush()

    expect(order).toEqual([1, 2])
  })

  describe('promote', () => {
    it('moves a queued background task ahead of other background tasks and interrupts the current one', async () => {
      const order: number[] = []
      const onInterruptCurrent = jest.fn()
      const queue = new AnalysisRequestQueue({
        onSuperseded: jest.fn(),
        onInterruptCurrent,
        isInterruptible: () => true,
      })

      const runningDeferred = createDeferred()
      const promotedDeferred = createDeferred()
      const laterBackgroundDeferred = createDeferred()

      queue.enqueue({ priority: 'background', requestId: 1, run: () => { order.push(1); return runningDeferred.promise } })
      queue.enqueue({ priority: 'background', requestId: 2, run: () => { order.push(2); return promotedDeferred.promise } })
      queue.enqueue({ priority: 'background', requestId: 3, run: () => { order.push(3); return laterBackgroundDeferred.promise } })

      queue.promote(2)
      expect(onInterruptCurrent).toHaveBeenCalledTimes(1)

      runningDeferred.resolve()
      await flush()
      // Promoted task (2) should run before the still-background task (3).
      promotedDeferred.resolve()
      await flush()
      laterBackgroundDeferred.resolve()
      await flush()

      expect(order).toEqual([1, 2, 3])
    })

    it('is a no-op when the target request is already running', () => {
      const onInterruptCurrent = jest.fn()
      const queue = new AnalysisRequestQueue({
        onSuperseded: jest.fn(),
        onInterruptCurrent,
        isInterruptible: () => true,
      })

      const runningDeferred = createDeferred()
      queue.enqueue({ priority: 'background', requestId: 1, run: () => runningDeferred.promise })

      queue.promote(1)

      // Promoting the task that's already running would just restart the
      // same search for no benefit, so nothing should be interrupted.
      expect(onInterruptCurrent).not.toHaveBeenCalled()
    })

    it('is a no-op for an unknown or already-finished request ID', async () => {
      const onInterruptCurrent = jest.fn()
      const queue = new AnalysisRequestQueue({
        onSuperseded: jest.fn(),
        onInterruptCurrent,
        isInterruptible: () => true,
      })

      const runningDeferred = createDeferred()
      queue.enqueue({ priority: 'background', requestId: 1, run: () => runningDeferred.promise })

      expect(() => queue.promote(999)).not.toThrow()
      expect(onInterruptCurrent).not.toHaveBeenCalled()
    })

    it('supersedes other queued interactive tasks when promoting', async () => {
      const superseded: number[] = []
      const queue = new AnalysisRequestQueue({
        onSuperseded: (requestId) => superseded.push(requestId),
        onInterruptCurrent: jest.fn(),
        isInterruptible: () => true,
      })

      const runningDeferred = createDeferred()
      queue.enqueue({ priority: 'background', requestId: 1, run: () => runningDeferred.promise })
      // Queued but stale by the time promotion happens below.
      queue.enqueue({ priority: 'interactive', requestId: 2, run: async () => {} })
      queue.enqueue({ priority: 'background', requestId: 3, run: async () => {} })

      queue.promote(3)

      expect(superseded).toEqual([2])
    })
  })
})
