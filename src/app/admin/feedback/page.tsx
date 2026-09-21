import { getAdminFeedback } from "@/features/admin/insights-data";
import { SUPPORT_EMAIL } from "@/features/feedback/schemas";
import { FeedbackView } from "./feedback-view";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  const { rows, available } = await getAdminFeedback();
  const open = rows.filter((row) => row.status !== "resolved").length;
  return (
    <div className="admin-page">
      <header className="page-head">
        <div>
          <p className="vf-eyebrow">Administration</p>
          <h1>Messages des vendeuses</h1>
          <p className="muted">Problèmes, questions et idées envoyés depuis « Aide &amp; suggestions ». {available ? `${open} à traiter.` : ""}</p>
        </div>
      </header>
      {available ? <FeedbackView rows={rows} /> : (
        <p className="banner-warn" role="status">
          La table des messages n’existe pas encore en base : appliquez la migration <code>20260921_launch_hardening.sql</code>. En attendant, les vendeuses sont invitées à écrire à {SUPPORT_EMAIL}.
        </p>
      )}
    </div>
  );
}
