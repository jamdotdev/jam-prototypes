import { useEffect, type RefObject } from 'react';

export function useAutoResizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  enabled: boolean = true
) {
  useEffect(() => {
    const textarea = ref.current;
    if (textarea && enabled) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [ref, value, enabled]);
}
