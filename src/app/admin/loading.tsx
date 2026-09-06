export default function AdminLoading() {
  return (
    <div className="admin-loading" role="status" aria-label="Chargement de l'espace admin">
      <div className="admin-loading-head" />
      <div className="admin-loading-kpis">
        <div className="admin-loading-card" />
        <div className="admin-loading-card" />
        <div className="admin-loading-card" />
        <div className="admin-loading-card" />
      </div>
      <div className="admin-loading-panel" />
    </div>
  );
}