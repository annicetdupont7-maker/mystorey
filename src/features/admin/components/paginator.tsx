"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Paginator({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="admin-pagination" aria-label="Pagination">
      <button type="button" className="admin-page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Page précédente">
        <ChevronLeft size={16} aria-hidden="true" /> Précédent
      </button>
      <span className="admin-page-info">Page {page} sur {pages}</span>
      <button type="button" className="admin-page-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Page suivante">
        Suivant <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}