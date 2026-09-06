"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { createCategory, deleteCategory, renameCategory } from "../actions";
import type { CategoryActionState } from "../schemas";

type Row = { id: string; name: string; count: number };

export function CategoryManager({ storeId, categories }: { storeId: string; categories: Row[] }) {
  return (
    <section className="category-manager">
      <NewCategoryForm storeId={storeId} />
      {categories.length === 0 ? (
        <p className="muted">Vous n’avez encore aucune catégorie. Créez la première ci-dessus.</p>
      ) : (
        <ul className="category-list">
          {categories.map((c) => (
            <CategoryRow key={c.id} storeId={storeId} category={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NewCategoryForm({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(createCategory, {});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open) {
    return (
      <div className="category-new">
        <button type="button" className="text-button" onClick={() => setOpen(true)}><Plus size={16} /> Créer une catégorie</button>
      </div>
    );
  }
  return (
    <form className="category-create" action={(fd) => { setName(""); action(fd); }} onSubmit={() => { if (state.success) router.refresh(); }}>
      <input type="hidden" name="storeId" value={storeId} />
      <label className="field"><span>Nom de la catégorie</span>
        <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Robes, Sacs, Chaussures…" maxLength={60} required autoFocus />
        {state.fieldErrors?.name && <small>{state.fieldErrors.name[0]}</small>}
      </label>
      <div className="form-row">
        <button className="vf-button vf-button--sm" disabled={pending}>{pending ? "Création…" : "Créer la catégorie"}</button>
        <button type="button" className="text-button" onClick={() => setOpen(false)}>Annuler</button>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-ok" role="status">{state.success}</p>}
    </form>
  );
}

function CategoryRow({ storeId, category }: { storeId: string; category: Row }) {
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  return (
    <li className="category-row">
      {mode === "view" && (
        <>
          <span className="tag tag--category"><Tag size={11} aria-hidden="true" /> {category.name}</span>
          <span className="muted">{category.count} produit{category.count > 1 ? "s" : ""}</span>
          <div className="category-row-actions">
            <button type="button" className="icon-button" aria-label={`Renommer ${category.name}`} onClick={() => setMode("rename")}><Pencil size={16} /></button>
            <button type="button" className="icon-button" aria-label={`Supprimer ${category.name}`} onClick={() => setMode("delete")}><Trash2 size={16} /></button>
          </div>
        </>
      )}
      {mode === "rename" && (
        <RenameForm storeId={storeId} categoryId={category.id} initialName={category.name} onDone={() => setMode("view")} />
      )}
      {mode === "delete" && (
        <DeleteForm storeId={storeId} category={category} onDone={() => setMode("view")} />
      )}
    </li>
  );
}

function RenameForm({ storeId, categoryId, initialName, onDone }: { storeId: string; categoryId: string; initialName: string; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(renameCategory, {});
  const [name, setName] = useState(initialName);
  return (
    <form className="category-inline-form" action={(fd) => { action(fd); onDone(); router.refresh(); }}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus />
      <button className="icon-button" aria-label="Enregistrer le renommage" disabled={pending}><Check size={16} /></button>
      <button type="button" className="icon-button" aria-label="Annuler" onClick={onDone}><X size={16} /></button>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}

function DeleteForm({ storeId, category, onDone }: { storeId: string; category: Row; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(deleteCategory, {});
  return (
    <form className="category-delete" action={(fd) => { action(fd); onDone(); router.refresh(); }}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="categoryId" value={category.id} />
      <div>
        {category.count > 0 ? (
          <>
            <p>Cette catégorie contient <strong>{category.count} produit{category.count > 1 ? "s" : ""}</strong>. Que souhaitez-vous faire de ces produits ?</p>
            <p className="muted">Leur catégorie sera retirée, mais aucun produit ne sera supprimé.</p>
          </>
        ) : (
          <p>Supprimer définitivement la catégorie « {category.name} » ?</p>
        )}
      </div>
      <div className="category-delete-actions">
        <button className="vf-button vf-button--danger vf-button--sm" disabled={pending}>{pending ? "Suppression…" : category.count > 0 ? "Retirer la catégorie des produits" : "Supprimer"}</button>
        <button type="button" className="text-button" onClick={onDone}>Annuler</button>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}