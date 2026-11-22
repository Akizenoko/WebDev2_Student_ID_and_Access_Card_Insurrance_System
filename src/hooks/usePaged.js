import { useState } from 'react';

export const PAGE_SIZE = 7;

export function usePaged(items) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  return {
    page: current,
    pages,
    total: items.length,
    start: items.length ? start + 1 : 0,
    end: Math.min(start + PAGE_SIZE, items.length),
    items: items.slice(start, start + PAGE_SIZE),
    setPage,
  };
}
