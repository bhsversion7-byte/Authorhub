// Shared debounce primitives. AuthorHub had this hand-rolled three times
// (shimoAdapter local save, shimoAdapter cloud save, App.jsx per-novel shared
// save), each with its own timer/pending-payload bookkeeping - easy for one
// copy to gain a flush-on-hide path (as the shared save did) while the others
// don't notice the drift. One implementation, reused everywhere.

// A single pending call, coalesced to the last `schedule()` within `delayMs`.
export function createDebouncer(delayMs) {
  let timer = null;
  let pending = null;

  function schedule(run) {
    pending = run;
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      const run = pending;
      pending = null;
      run?.();
    }, delayMs);
  }

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const run = pending;
    pending = null;
    return run?.();
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending = null;
  }

  return { schedule, flush, cancel };
}

// Independent per-key debouncing (e.g. one timer per shared novel id), so an
// edit to one key never resets or clobbers another key's pending save.
export function createKeyedDebouncer(delayMs) {
  const entries = new Map();

  function schedule(key, run) {
    const existing = entries.get(key);
    if (existing) clearTimeout(existing.timer);

    function runNow() {
      entries.delete(key);
      run();
    }

    entries.set(key, { timer: window.setTimeout(runNow, delayMs), run: runNow });
  }

  function has(key) {
    return entries.has(key);
  }

  // Flushes one key, or every still-pending key when called with no argument.
  function flush(key) {
    if (key === undefined) {
      for (const { timer, run } of Array.from(entries.values())) {
        clearTimeout(timer);
        run();
      }
      return;
    }
    const entry = entries.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.run();
  }

  // Drops a pending call without running it - for when the thing it would
  // have saved no longer exists (e.g. the row was just detached), so firing
  // the save would resurrect it instead of persisting a real edit.
  function cancel(key) {
    const entry = entries.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    entries.delete(key);
  }

  return { schedule, flush, has, cancel };
}
