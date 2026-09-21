"use client";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Mail, MessageCircle, Store } from "lucide-react";
import { updateFeedbackStatus, type AdminActionState } from "@/features/admin/actions";
import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS, type FeedbackKind, type FeedbackStatus } from "@/features/feedback/schemas";
import type { AdminFeedbackRow } from "@/features/admin/insights-data";
import { formatDateTime } from "@/features/admin/stats";

const FILTERS: { value: "open" | FeedbackStatus | "all"; label: string }[] = [
  { value: "open", label: "À traiter" },
  { value: "new", label: "Nouveaux" },
  { value: "in_progress", label: "En cours" },
  { value: "resolved", label: "Traités" },
  { value: "all", label: "Tous" },
];

const digits = (value: string) => value.replace(/\D/g, "");

export function FeedbackView({ rows }: { rows: AdminFeedbackRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("open");
  const visible = useMemo(() => rows.filter((row) => filter === "all" ? true : filter === "open" ? row.status !== "resolved" : row.status === filter), [rows, filter]);
  return (
    <section>
      <div className="order-filters" role="group" aria-label="Filtrer les messages">
        {FILTERS.map((f) => {
          const count = rows.filter((row) => f.value === "all" ? true : f.value === "open" ? row.status !== "resolved" : row.status === f.value).length;
          return <button type="button" key={f.value} className={`order-filter${filter === f.value ? " is-active" : ""}`} onClick={() => setFilter(f.value)}>{f.label} <span className="order-filter-count">{count}</span></button>;
        })}
      </div>
      {visible.length === 0 ? (
        <div className="empty-state"><h2>Rien à traiter</h2><p>Les messages envoyés depuis « Aide &amp; suggestions » apparaissent ici.</p></div>
      ) : (
        <ul className="admin-feedback-list">
          {visible.map((row) => <FeedbackItem key={row.id} row={row} />)}
        </ul>
      )}
    </section>
  );
}

function FeedbackItem({ row }: { row: AdminFeedbackRow }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(updateFeedbackStatus, {});
  const phone = digits(row.contact).length >= 8 ? digits(row.contact) : row.storeWhatsapp ? digits(row.storeWhatsapp) : "";
  const email = row.contact.includes("@") ? row.contact : row.userEmail;
  const reply = `Bonjour ${row.userName}, ici l’équipe MYSTOREY à propos de votre message : « ${row.message.slice(0, 120)}${row.message.length > 120 ? "…" : ""} »`;
  return (
    <li className={`admin-feedback-item admin-feedback-item--${row.status}`}>
      <div className="admin-feedback-head">
        <span className={`tag feedback-kind-tag feedback-kind-tag--${row.kind}`}>{FEEDBACK_KIND_LABELS[row.kind as FeedbackKind] ?? row.kind}</span>
        <span className={`tag feedback-status feedback-status--${row.status}`}>{FEEDBACK_STATUS_LABELS[row.status as FeedbackStatus] ?? row.status}</span>
        <time className="muted" dateTime={row.createdAt}>{formatDateTime(row.createdAt)}</time>
      </div>
      <p className="admin-feedback-message">{row.message}</p>
      <div className="admin-feedback-who">
        <Link href={`/admin/users/${row.userId}`}><strong>{row.userName}</strong></Link>
        {row.userEmail && <span className="muted">{row.userEmail}</span>}
        {row.storeName && row.storeSlug && <Link className="muted" href={`/store/${row.storeSlug}`} target="_blank" rel="noopener noreferrer"><Store size={13} aria-hidden="true" /> {row.storeName}</Link>}
      </div>
      <div className="admin-feedback-reply">
        {phone && <a className="vf-button vf-button--sm" href={`https://wa.me/${phone}?text=${encodeURIComponent(reply)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} aria-hidden="true" /> Répondre sur WhatsApp</a>}
        {email && <a className="vf-button vf-button--ghost vf-button--sm" href={`mailto:${email}?subject=${encodeURIComponent("MYSTOREY — votre message")}&body=${encodeURIComponent(reply)}`}><Mail size={14} aria-hidden="true" /> Répondre par email</a>}
      </div>
      <form action={action} className="admin-feedback-form">
        <input type="hidden" name="id" value={row.id} />
        <label className="field">
          <span>Statut</span>
          <select name="status" defaultValue={row.status}>
            <option value="new">Nouveau</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Traité</option>
          </select>
        </label>
        <label className="field">
          <span>Réponse visible par la vendeuse (optionnel)</span>
          <textarea name="adminNote" rows={2} maxLength={2000} defaultValue={row.adminNote} placeholder="Ex. : c’est corrigé, merci pour votre signalement !" />
        </label>
        <button className="vf-button vf-button--sm" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le suivi"}</button>
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        {state.success && <p className="form-success" role="status">{state.success}</p>}
      </form>
    </li>
  );
}
