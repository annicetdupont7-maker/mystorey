"use client";
import Link from "next/link";
import { Eye } from "lucide-react";

export function AdminPreviewBanner({ userName, stores }: { userName: string; stores: { name: string; slug: string }[] }) {
  return (
    <div className="preview-banner" role="note">
      <div className="preview-banner-text">
        <strong><Eye size={15} aria-hidden="true" /> Mode aperçu administrateur</strong>
        <span>Vous parcourez la vitrine de {userName} en lecture seule : aucune commande ne peut être passée.</span>
      </div>
      {stores.length > 0 && (
        <div className="preview-banner-stores">
          {stores.map((s) => <a key={s.slug} className="preview-banner-store" href={`/store/${s.slug}`} target="_blank" rel="noopener noreferrer">{s.slug}</a>)}
        </div>
      )}
      <Link className="vf-button vf-button--ghost" href="/admin/users">Quitter le mode aperçu</Link>
    </div>
  );
}