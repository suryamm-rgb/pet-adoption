import { Button } from "./button";

/** Previous/next paging for lists where the API returns a full page when more may exist. */
export function Pager({ page, onPage, count, limit }: { page: number; onPage: (p: number) => void; count: number; limit: number }) {
  if (page === 1 && count < limit) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
      <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>← Previous</Button>
      <span className="text-sm text-muted">Page {page}</span>
      <Button size="sm" variant="secondary" disabled={count < limit} onClick={() => onPage(page + 1)}>Next →</Button>
    </nav>
  );
}
