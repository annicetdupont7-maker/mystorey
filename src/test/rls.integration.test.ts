// @vitest-environment node
/**
 * Row Level Security, tested for real: an embedded Postgres (PGlite) is loaded with a
 * reconstruction of the production schema, then the launch migrations are applied and
 * each scenario runs AS the role PostgREST would use (anon / authenticated / service).
 *
 * The "before" block documents the holes production had on 2026-09-21; the rest proves
 * they are closed and that nothing the app relies on broke.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const root = join(import.meta.dirname, "..", "..");
const sql = (file: string) => readFileSync(join(root, file), "utf8");

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const STORE_A = "10000000-0000-0000-0000-00000000000a";
const STORE_B = "10000000-0000-0000-0000-00000000000b";
const ROBE = "20000000-0000-0000-0000-00000000000a";
const HIDDEN = "20000000-0000-0000-0000-0000000000a2";
const PARFUM = "20000000-0000-0000-0000-00000000000b";
const ORDER_B = "30000000-0000-0000-0000-00000000000b";

type Result = { ok: true; rows: Record<string, unknown>[] } | { ok: false; error: string };
let db: PGlite;

async function as(role: "anon" | "authenticated" | "service_role", uid: string | null, query: string, params: unknown[] = []): Promise<Result> {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)", [uid ?? "", role]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(query, params);
    await db.exec("commit");
    return { ok: true, rows: r.rows as Record<string, unknown>[] };
  } catch (error) {
    await db.exec("rollback");
    return { ok: false, error: (error as Error).message };
  }
}
const rows = (r: Result) => (r.ok ? r.rows : []);
const checkout = (productId: string, quantity = 1, store = STORE_A) =>
  `select (o).total, (o).order_number from (select public.create_checkout_order('${store}','Cliente','+22990000000','Cotonou','','[{"productId":"${productId}","quantity":${quantity}}]'::jsonb) o) x`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(sql("database/testing/prod_snapshot.sql"));
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values ('${A}','a@test','{"display_name":"A"}'), ('${B}','b@test','{"display_name":"B"}');
    insert into public.stores (id, owner_id, name, slug, status, whatsapp) values
      ('${STORE_A}','${A}','Boutique A','boutique-a','published','+229 97 00 00 01'),
      ('${STORE_B}','${B}','Boutique B','boutique-b','published','+229 97 00 00 02');
    insert into public.products (id, store_id, name, price, is_available) values
      ('${ROBE}','${STORE_A}','Robe',15000,true), ('${HIDDEN}','${STORE_A}','Sac masqué',9000,false), ('${PARFUM}','${STORE_B}','Parfum',12000,true);
    insert into public.orders (id, store_id, customer_name, customer_phone, total) values ('${ORDER_B}','${STORE_B}','Cliente de B','+22960000000',12000);
  `);
}, 60_000);

describe("production avant les migrations de lancement", () => {
  it("un vendeur pouvait se donner le rôle admin depuis le navigateur", async () => {
    const r = await as("authenticated", A, "update public.profiles set role='admin' where user_id=$1 returning role", [A]);
    expect(rows(r)[0]?.role).toBe("admin");
    await db.exec(`update public.profiles set role='seller' where user_id='${A}'`);
  });
  it("un vendeur lisait l'historique des commandes des autres boutiques", async () => {
    expect(rows(await as("authenticated", A, "select count(*)::int n from public.order_status_history"))[0]?.n).toBeGreaterThan(0);
  });
  it("le checkout acceptait un produit masqué", async () => {
    expect((await as("anon", null, checkout(HIDDEN))).ok).toBe(true);
    await db.exec("delete from public.orders where customer_name='Cliente'");
  });
});

describe("après 20260912 + 20260921", () => {
  beforeAll(async () => {
    for (let pass = 0; pass < 2; pass++) {
      // Applied twice on purpose: both files must be replayable.
      await db.exec(sql("database/migrations/20260912_product_variants.sql"));
      await db.exec(sql("database/migrations/20260921_launch_hardening.sql"));
      await db.exec(sql("database/migrations/20260923_order_flood_guard.sql"));
    }
  }, 60_000);

  it("un vendeur ne peut plus se donner le rôle admin", async () => {
    expect((await as("authenticated", A, "update public.profiles set role='admin' where user_id=$1 returning role", [A])).ok).toBe(false);
    expect(rows(await as("authenticated", A, "select public.is_admin() v"))[0]?.v).toBe(false);
  });
  it("il peut toujours changer son nom affiché", async () => {
    expect(rows(await as("authenticated", A, "update public.profiles set display_name='Awa' where user_id=$1 returning display_name", [A]))[0]?.display_name).toBe("Awa");
  });
  it("le back-office (clé service) peut toujours promouvoir un compte", async () => {
    expect(rows(await as("service_role", null, "update public.profiles set role='admin' where user_id=$1 returning role", [B]))[0]?.role).toBe("admin");
    await as("service_role", null, "update public.profiles set role='seller' where user_id=$1", [B]);
  });
  it("l'historique des commandes n'est visible que par la boutique concernée", async () => {
    expect(rows(await as("authenticated", A, "select count(*)::int n from public.order_status_history"))[0]?.n).toBe(0);
    expect(rows(await as("authenticated", B, "select count(*)::int n from public.order_status_history"))[0]?.n).toBe(1);
  });
  it("les plans sont lisibles par tous et modifiables par personne", async () => {
    expect(rows(await as("anon", null, "select count(*)::int n from public.subscription_plans"))[0]?.n).toBe(3);
    expect((await as("anon", null, "update public.subscription_plans set price=1 returning id")).ok).toBe(false);
  });
  it("checkout : produit masqué refusé, prix et total calculés par la base", async () => {
    const hidden = await as("anon", null, checkout(HIDDEN));
    expect(hidden.ok).toBe(false);
    const order = await as("anon", null, checkout(ROBE, 2));
    expect(rows(order)[0]?.total).toBe(30000);
  });
  it("checkout : impossible de commander le produit d'une autre boutique", async () => {
    expect((await as("anon", null, checkout(PARFUM, 1, STORE_A))).ok).toBe(false);
  });
  it("checkout : stock insuffisant refusé", async () => {
    await db.exec(`update public.products set stock=1 where id='${ROBE}'`);
    const r = await as("anon", null, checkout(ROBE, 3));
    expect(r.ok ? "" : r.error).toMatch(/insufficient_stock/);
    await db.exec(`update public.products set stock=null where id='${ROBE}'`);
  });
  it("vendeuse A isolée de la boutique B (ID remplacé)", async () => {
    expect(rows(await as("authenticated", A, `select count(*)::int n from public.orders where store_id='${STORE_B}'`))[0]?.n).toBe(0);
    expect(rows(await as("authenticated", A, `update public.orders set status='cancelled' where id='${ORDER_B}' returning id`))).toHaveLength(0);
    expect(rows(await as("authenticated", A, `update public.products set price=1 where id='${PARFUM}' returning id`))).toHaveLength(0);
    expect(rows(await as("authenticated", A, `update public.stores set whatsapp='+1' where id='${STORE_B}' returning id`))).toHaveLength(0);
    expect((await as("authenticated", A, `insert into public.products (store_id,name,price) values ('${STORE_B}','Pirate',1) returning id`)).ok).toBe(false);
  });
  it("une vendeuse ne peut pas s'attribuer un plan payant", async () => {
    expect(rows(await as("authenticated", A, "update public.seller_subscriptions set plan_id='pro' returning id"))).toHaveLength(0);
  });
  it("chaque boutique existante et nouvelle reçoit le plan gratuit", async () => {
    expect(rows(await as("service_role", null, "select count(*)::int n from public.seller_subscriptions where plan_id='free'"))[0]?.n).toBe(2);
  });
  it("la limite du plan gratuit (10 produits) est appliquée par la base", async () => {
    let error = "";
    for (let i = 0; i < 12 && !error; i++) {
      const r = await as("authenticated", A, `insert into public.products (store_id,name,price) values ('${STORE_A}',$1,1000) returning id`, [`P${i}`]);
      if (!r.ok) error = r.error;
    }
    expect(error).toMatch(/product_limit_reached/);
    expect(rows(await as("service_role", null, `select count(*)::int n from public.products where store_id='${STORE_A}'`))[0]?.n).toBe(10);
  });
  it("aide & suggestions : envoi pour soi uniquement, suivi réservé au back-office", async () => {
    expect((await as("authenticated", A, `insert into public.feedback (user_id, store_id, kind, message) values ($1,'${STORE_A}','problem','Je n arrive pas à publier') returning id`, [A])).ok).toBe(true);
    expect((await as("authenticated", A, "insert into public.feedback (user_id, kind, message) values ($1,'help','Au nom de B') returning id", [B])).ok).toBe(false);
    expect((await as("authenticated", A, "insert into public.feedback (user_id, kind, message, status) values ($1,'help','Déjà traité ?','resolved') returning id", [A])).ok).toBe(false);
    expect(rows(await as("authenticated", B, "select count(*)::int n from public.feedback"))[0]?.n).toBe(0);
    expect(rows(await as("authenticated", A, "update public.feedback set status='resolved' returning id"))).toHaveLength(0);
  });
  it("checkout : une même cliente ne peut pas inonder une boutique de commandes", async () => {
    await db.exec(`delete from public.orders where store_id='${STORE_A}'`);
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await as("anon", null, checkout(ROBE)));
    expect(results.slice(0, 3).every((r) => r.ok)).toBe(true);
    const refused = results[3];
    expect(refused.ok ? "" : refused.error).toMatch(/checkout_rate_limited/);
    expect(rows(await as("service_role", null, `select count(*)::int n from public.orders where store_id='${STORE_A}'`))[0]?.n).toBe(3);
  });

  it("checkout : le plafond par boutique arrête une rafale même avec des numéros différents", async () => {
    await db.exec(`delete from public.orders where store_id='${STORE_A}'`);
    const flood = (phone: string) =>
      as("anon", null, `select (o).total from (select public.create_checkout_order('${STORE_A}','Cliente','${phone}','Cotonou','','[{"productId":"${ROBE}","quantity":1}]'::jsonb) o) x`);
    let error = "";
    for (let i = 0; i < 30 && !error; i++) {
      const r = await flood(`+2299000${String(i).padStart(4, "0")}`);
      if (!r.ok) error = r.error;
    }
    expect(error).toMatch(/checkout_rate_limited/);
    expect(rows(await as("service_role", null, `select count(*)::int n from public.orders where store_id='${STORE_A}'`))[0]?.n).toBe(25);
  });

  it("la vendeuse connectée n'est jamais bridée sur ses propres saisies", async () => {
    // La boutique A est déjà au plafond public à ce stade : la vendeuse doit
    // quand même pouvoir enregistrer les commandes reçues par téléphone.
    for (let i = 0; i < 5; i++) {
      const r = await as("authenticated", A, `insert into public.orders (store_id, customer_name, customer_phone, total) values ('${STORE_A}','Cliente du marché','+22997000000',5000) returning id`);
      expect(r.ok).toBe(true);
    }
    await db.exec(`delete from public.orders where store_id='${STORE_A}'`);
  });

  it("les images sont limitées à 5 Mo et aux formats image", async () => {
    const bucket = (await db.query<{ file_size_limit: string; allowed_mime_types: string[] }>("select file_size_limit, allowed_mime_types from storage.buckets where id='product-images'")).rows[0];
    expect(Number(bucket.file_size_limit)).toBe(5 * 1024 * 1024);
    expect(bucket.allowed_mime_types).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });
});
