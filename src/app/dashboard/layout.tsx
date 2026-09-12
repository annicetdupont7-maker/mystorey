import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { viewerIsAdmin } from "@/features/auth/viewer";

export const dynamic = "force-dynamic";

/**
 * Reaching the back-office used to mean typing /admin by hand. The entry lives here,
 * in the layout, so every seller page gets it without each one having to fetch the
 * role — and sellers never see it at all.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await viewerIsAdmin();
  return (
    <>
      {children}
      {isAdmin && (
        <Link className="admin-entry" href="/admin">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Back-office</span>
        </Link>
      )}
    </>
  );
}
