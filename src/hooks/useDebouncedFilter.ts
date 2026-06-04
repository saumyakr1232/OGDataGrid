import { useEffect, useRef, useState, useTransition } from 'react';

/**
 * Decouples a text-like filter input from the expensive filter commit.
 *
 * The returned `value` updates synchronously on every keystroke (so the input
 * never lags), while the `onCommit` call — which triggers the O(rows) re-filter
 * — is debounced and run inside a `useTransition`, keeping it interruptible so
 * it can't jank typing on large datasets.
 *
 * `committed` is the source-of-truth value (e.g. `column.getFilterValue()`); the
 * local value re-syncs to it when it changes from the outside (programmatic
 * reset, "clear all"), without clobbering in-flight typing. For non-primitive
 * values (e.g. a range tuple) pass a stable reference for the empty case so the
 * external-sync comparison stays reference-stable.
 */
export function useDebouncedFilter<V>(
  committed: V,
  onCommit: (value: V) => void,
  delay = 200,
): { value: V; setValue: (next: V) => void; isPending: boolean } {
  const [value, setValue] = useState<V>(committed);
  const [isPending, startTransition] = useTransition();

  // Track the value we last reconciled with `committed` so we can tell an
  // external change apart from our own in-flight edit.
  const lastCommittedRef = useRef<V>(committed);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // External resets: pull the new committed value into the local input.
  useEffect(() => {
    if (committed !== lastCommittedRef.current) {
      lastCommittedRef.current = committed;
      setValue(committed);
    }
  }, [committed]);

  // Debounced, interruptible commit of local edits. Skips when there's nothing
  // new to push (covers the initial mount and the render right after a commit).
  useEffect(() => {
    if (value === lastCommittedRef.current) return;
    const id = setTimeout(() => {
      lastCommittedRef.current = value;
      startTransition(() => onCommitRef.current(value));
    }, delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return { value, setValue, isPending };
}
