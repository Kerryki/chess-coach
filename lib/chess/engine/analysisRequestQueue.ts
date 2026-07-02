/**
 * Priority queue for serializing analysis requests against a single
 * underlying engine resource that can only run one search at a time.
 *
 * Framework/worker-independent by design: it's driven entirely through the
 * injected callbacks rather than touching `self`/`Worker` globals directly,
 * so the ordering and preemption rules can be unit tested without spinning
 * up an actual Web Worker.
 */

import { AnalysisPriority } from '@/lib/chess/engine/types';

export interface QueuedAnalysisTask {
  readonly priority: AnalysisPriority;
  readonly requestId: number;
  readonly run: () => Promise<void>;
}

export interface AnalysisRequestQueueCallbacks {
  /** A queued 'interactive' task was superseded by a newer one before it ran */
  readonly onSuperseded: (requestId: number) => void;
  /** Interrupt whatever task is currently running (e.g. send UCI 'stop') */
  readonly onInterruptCurrent: () => void;
  /** Whether a task is currently mid-run and can be interrupted */
  readonly isInterruptible: () => boolean;
}

/**
 * Priority-ordered task queue: an 'interactive' request (the position the
 * user is currently viewing) always jumps ahead of queued 'background'
 * requests (e.g. a bulk per-move sweep). A new 'interactive' request also:
 *   - interrupts whatever is currently running, regardless of that task's
 *     priority, since it represents the freshest user intent;
 *   - immediately supersedes any *other already-queued* 'interactive' task
 *     rather than leaving it to run later, since the user has moved on
 *     from whatever position that request was for.
 */
export class AnalysisRequestQueue {
  private pending: QueuedAnalysisTask[] = [];
  private draining = false;
  private currentPriority: AnalysisPriority | null = null;
  private currentRequestId: number | null = null;

  constructor(private readonly callbacks: AnalysisRequestQueueCallbacks) {}

  /** Number of tasks waiting to run (excludes the currently-running task, if any) */
  get pendingCount(): number {
    return this.pending.length;
  }

  enqueue(task: QueuedAnalysisTask): void {
    if (task.priority === 'interactive') {
      this.supersedeQueuedInteractiveTasks();
      this.insertAheadOfBackgroundTasks(task);
      this.interruptCurrentTaskIfAny();
    } else {
      this.pending.push(task);
    }

    this.drain();
  }

  /**
   * Upgrades an already-queued 'background' task to 'interactive' priority
   * in place, rather than starting a second, duplicate search for the same
   * position. Used when a caller wants the exact same FEN that a
   * background request is already analyzing.
   *
   * @param requestId - requestId of the task to promote
   */
  promote(requestId: number): void {
    if (this.currentRequestId === requestId) {
      // Already running - nothing to reorder, and interrupting it here
      // would just restart the same search from scratch for no benefit.
      return;
    }

    const index = this.pending.findIndex((t) => t.requestId === requestId);
    if (index === -1) {
      // Already finished, or an unrecognized requestId - nothing to do.
      return;
    }

    const [task] = this.pending.splice(index, 1);
    this.supersedeQueuedInteractiveTasks();
    this.insertAheadOfBackgroundTasks({ ...task, priority: 'interactive' });
    this.interruptCurrentTaskIfAny();
  }

  private supersedeQueuedInteractiveTasks(): void {
    this.pending = this.pending.filter((queued) => {
      if (queued.priority === 'interactive') {
        this.callbacks.onSuperseded(queued.requestId);
        return false;
      }
      return true;
    });
  }

  private insertAheadOfBackgroundTasks(task: QueuedAnalysisTask): void {
    const firstBackgroundIndex = this.pending.findIndex((t) => t.priority === 'background');
    if (firstBackgroundIndex === -1) {
      this.pending.push(task);
    } else {
      this.pending.splice(firstBackgroundIndex, 0, task);
    }
  }

  private interruptCurrentTaskIfAny(): void {
    if (this.currentPriority !== null && this.callbacks.isInterruptible()) {
      this.callbacks.onInterruptCurrent();
    }
  }

  private async drain(): Promise<void> {
    if (this.draining) {
      return;
    }
    this.draining = true;

    while (this.pending.length > 0) {
      const task = this.pending.shift()!;
      this.currentPriority = task.priority;
      this.currentRequestId = task.requestId;
      try {
        await task.run();
      } catch {
        // A single task's failure must not stop the queue from draining
        // the rest - callers are expected to report their own errors
        // (e.g. via a callback inside run()); this only guards queue
        // liveness against an uncaught rejection.
      }
    }

    this.currentPriority = null;
    this.currentRequestId = null;
    this.draining = false;
  }
}
