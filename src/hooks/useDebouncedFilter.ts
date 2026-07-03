import { useEffect, useRef, useState, useTransition } from 'react';

/**
 * Decouples a filter input from the expensive filter commit: `value` updates
 * on every keystroke while `onCommit` is debounced inside a transition, so
 * typing never janks on large datasets. The local value re-syncs when
 * `committed` changes externally (e.g. "clear all") without clobbering
 * in-flight typing.
 */
export function useDebouncedFilter<V>(
  committed: V,
  onCommit: (value: V) => void,
  delay = 200,
): { value: V; setValue: (next: V) => void; isPending: boolean } {
  const [value, setValue] = useState<V>(committed);
  const [isPending, startTransition] = useTransition();

  // Distinguishes external changes from our own in-flight edits.
  const lastCommittedRef = useRef<V>(committed);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    if (committed !== lastCommittedRef.current) {
      lastCommittedRef.current = committed;
      setValue(committed);
    }
  }, [committed]);

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
