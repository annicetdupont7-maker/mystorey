import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guard, in the style of migration-order.test.ts.
 *
 * Every reader in features/admin/data.ts goes through the Supabase service client,
 * which bypasses RLS. requireAdmin() in the /admin layout is NOT a sufficient gate: a
 * layout and the page under it render in parallel, so the page finished fetching and
 * its payload was serialised into the redirect response — an anonymous GET /admin
 * answered 307 to /login while carrying real store names and a user's email address.
 *
 * So each exported reader must assert the caller is an administrator itself. This test
 * fails if a new one is added without the guard.
 */
const PREFIX = "export async function ";
const source = readFileSync(join(process.cwd(), "src", "features", "admin", "data.ts"), "utf8");

/** Each exported reader, paired with its body up to the next exported declaration. */
const readers = source
  .split(PREFIX)
  .slice(1)
  .map((chunk) => ({ name: chunk.slice(0, chunk.indexOf("(")).trim(), body: chunk }));

describe("admin data readers are gated on their own", () => {
  it("finds the exported readers", () => {
    expect(readers.length).toBeGreaterThan(0);
    expect(readers.map((reader) => reader.name)).toContain("getAdminDashboard");
  });

  it("uses the service client, which is exactly why the guard is required", () => {
    expect(source).toContain("createSupabaseServiceClient");
  });

  it.each(readers.map((reader) => reader.name))("%s asserts the caller is an administrator", (name) => {
    const reader = readers.find((candidate) => candidate.name === name);
    expect(reader).toBeDefined();
    expect(reader?.body).toContain("await assertAdmin();");
  });

  it("routes the guard through requireAdmin", () => {
    expect(source).toContain('from "@/features/auth/admin"');
    expect(source).toContain("async function assertAdmin()");
    expect(source).toContain("await requireAdmin();");
  });
});
