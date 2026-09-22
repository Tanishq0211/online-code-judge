import { useEffect } from 'react';

const BRAND = 'Verdict';

/** Route-level <title>. Pass undefined while the name is still loading to keep
    the previous title rather than flashing a placeholder. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · ${BRAND}`;
  }, [title]);
}
