export function Pagination({ page, pages, total, start, end, onPage }) {
  if (!total || pages <= 1) return null;
  return <div className="pagination">
    <span>Showing {start}–{end} of {total}</span>
    <div className="pagination-controls">
      <button type="button" className="button button-compact" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="pagination-status">Page {page} of {pages}</span>
      <button type="button" className="button button-compact" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  </div>;
}
