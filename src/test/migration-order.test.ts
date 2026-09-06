import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = join(process.cwd(), "database", "migrations");
const migrations = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
const position = (file: string) => migrations.indexOf(file);

it("keeps migration dependencies in executable order", () => {
  expect(position("20260828_subscription_plans.sql")).toBeLessThan(position("20260901_wave_payments.sql"));
  expect(position("20260828_subscription_plans.sql")).toBeLessThan(position("20260902_fedapay_payments.sql"));
  expect(position("20260904_launch_security.sql")).toBeGreaterThan(position("20260902_fedapay_payments.sql"));
  expect(position("20260906_reengagement.sql")).toBeGreaterThan(position("20260905_subscription_plans.sql"));
});

describe("migration safety guards", () => {
  it("does not recreate products without a guard", () => {
    const products = readFileSync(join(migrationsDir, "20260828_products.sql"), "utf8");
    expect(products).toContain("create table if not exists public.products");
    expect(products).toContain("drop policy if exists");
  });

  it("declares RLS for launch-sensitive tables", () => {
    const security = readFileSync(join(migrationsDir, "20260904_launch_security.sql"), "utf8");
    const reengagement = readFileSync(join(migrationsDir, "20260906_reengagement.sql"), "utf8");
    expect(security).toContain("alter table public.seller_subscriptions enable row level security");
    expect(security).toContain("alter table public.wave_payments enable row level security");
    expect(security).toContain("alter table public.fedapay_payments enable row level security");
    expect(reengagement).toContain("alter table public.customer_contacts enable row level security");
    expect(reengagement).toContain("alter table public.reengagement_logs enable row level security");
  });
});
