import { useEffect, useMemo, useState } from 'react';

export const TABLE_PAGE_SIZE = 10;

export function useTablePagination<T>(
  items: T[],
  options?: { pageSize?: number; resetDeps?: unknown[] },
) {
  const pageSize = options?.pageSize ?? TABLE_PAGE_SIZE;
  const [page, setPage] = useState(1);

  const totalCount = items.length;
  const showPagination = totalCount > pageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when caller filters change
  }, options?.resetDeps ?? []);

  const pageItems = useMemo(() => {
    if (!showPagination) return items;
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, showPagination, safePage, pageSize]);

  const rangeFrom = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeTo = showPagination
    ? Math.min(safePage * pageSize, totalCount)
    : totalCount;

  return {
    page: safePage,
    setPage,
    pageItems,
    totalCount,
    showPagination,
    totalPages,
    rangeFrom,
    rangeTo,
  };
}
