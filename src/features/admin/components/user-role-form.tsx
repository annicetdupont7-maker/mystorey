"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateUserRole, type AdminActionState } from "@/features/admin/actions";
import type { AdminRole } from "@/features/admin/types";

function SubmitButton({ roleChanged }: { roleChanged: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="vf-button vf-button--sm vf-button--dark" type="submit" disabled={pending || !roleChanged} aria-disabled={pending || !roleChanged}>
      {pending ? "Enregistrement…" : "Enregistrer le rôle"}
    </button>
  );
}

export function UserRoleForm({ userId, initialRole }: { userId: string; initialRole: AdminRole | null }) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(updateUserRole, {});
  const [role, setRole] = useState<AdminRole>(initialRole ?? "seller");
  const roleChanged = role !== (initialRole ?? "seller");

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!roleChanged) {
          event.preventDefault();
          return;
        }
        if (!window.confirm(`Confirmer le changement de rôle de ce compte vers « ${role === "admin" ? "Administrateur" : "Vendeur"} » ?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <div className="admin-role-form">
        <select className="toolbar-select" name="role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)} aria-label="Rôle administrateur">
          <option value="seller">Vendeur</option>
          <option value="admin">Administrateur</option>
        </select>
        <SubmitButton roleChanged={roleChanged} />
      </div>
      {state.success && <p className="form-success" role="status">{state.success}</p>}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}