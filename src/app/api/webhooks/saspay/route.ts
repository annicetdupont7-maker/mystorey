import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getSaspayClient } from "@/lib/saspay/client";
import { NextRequest, NextResponse } from "next/server";
import { paymentAmountMatches } from "@/features/subscriptions/payment-rules";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** Combien de sessions encore en attente on accepte de rapprocher pour un webhook inconnu. */
const BINDING_LOOKBACK_HOURS = 6;
const BINDING_MAX_CANDIDATES = 25;

const saspayWebhookSchema = z.object({
  event: z.string().min(1),
  data: z.object({
    id: z.string().min(1),
    reference: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    // SasPay envoie les montants en décimal sous forme de chaîne ("2000.00").
    amount: z.union([z.string(), z.number()]).optional(),
    network: z.string().optional(),
  }),
});

type PaymentRow = {
  id: string;
  store_id: string;
  plan_id: string;
  amount: number;
  status: string;
  saspay_session_id: string;
  metadata: Record<string, unknown> | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";

    const saspay = getSaspayClient();

    if (!saspay.verifyWebhookSignature(body, signature, timestamp)) {
      console.error("[SasPay Webhook] Invalid signature or stale timestamp");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const parsed = saspayWebhookSchema.safeParse(parsedBody);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const { event, data } = parsed.data;

    // La clé API a aussi le droit de décaisser. Un évènement de retrait ou de virement
    // ne doit donc jamais pouvoir arriver jusqu'à l'activation d'un abonnement.
    if (!event.startsWith("transaction.")) {
      return NextResponse.json({ success: true, ignored: event });
    }
    if (data.type && data.type.toUpperCase() !== "PAIEMENT") {
      return NextResponse.json({ success: true, ignored: `type:${data.type}` });
    }

    const supabase = createSupabaseServiceClient();

    let payment = await findPaymentByTransaction(supabase, data.id);

    // Premier webhook d'une session : SasPay ne connaît que l'identifiant de la
    // TRANSACTION, nous n'avons gardé que celui de la SESSION. On retrouve le lien en
    // demandant leur statut aux sessions encore en attente, puis on le mémorise.
    if (!payment) payment = await bindTransactionToSession(supabase, saspay, data.id);

    if (!payment) {
      console.error(`[SasPay Webhook] Payment not found for transaction ${data.id}`);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const succeeded = event === "transaction.success";

    if (payment.status === "approved" && succeeded) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    if (succeeded) {
      // Le corps du webhook dit seulement que quelque chose a bougé. Le montant et le
      // statut qui engagent un abonnement sont relus à la source.
      const transaction = await saspay.verifyPayment(data.id);

      if (transaction.status.toUpperCase() !== "SUCCESS") {
        console.error(`[SasPay Webhook] ${data.id} announced success but verify says ${transaction.status}`);
        return NextResponse.json({ error: "Payment not confirmed by provider" }, { status: 409 });
      }

      if (transaction.flow_direction && transaction.flow_direction.toUpperCase() !== "INBOUND") {
        return NextResponse.json({ error: "Not an inbound payment" }, { status: 409 });
      }

      const confirmedAmount = Number(transaction.requested_amount ?? data.amount ?? NaN);
      if (!paymentAmountMatches(payment.amount, confirmedAmount)) {
        console.error(`[SasPay Webhook] Amount mismatch on ${data.id}: expected ${payment.amount}, got ${confirmedAmount}`);
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      const { error: subscriptionError } = await supabase.from("seller_subscriptions").upsert(
        {
          store_id: payment.store_id,
          plan_id: payment.plan_id,
          saspay_payment_id: payment.id,
          status: "active",
          payment_status: "paid",
          provider: "saspay",
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" }
      );

      if (subscriptionError) {
        console.error("[SasPay Webhook] Failed to activate subscription:", subscriptionError);
        return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
      }

      const { error: paymentError } = await supabase
        .from("saspay_payments")
        .update({
          status: "approved",
          payment_method: data.network ?? null,
          updated_at: new Date().toISOString(),
          metadata: { ...(payment.metadata ?? {}), provider: "saspay", webhook_status: transaction.status, reference: transaction.reference },
        })
        .eq("id", payment.id);

      if (paymentError) return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });

      return NextResponse.json({ success: true });
    }

    if (event === "transaction.failed" || event === "transaction.cancelled") {
      await supabase
        .from("saspay_payments")
        .update({
          status: event === "transaction.cancelled" ? "cancelled" : "declined",
          updated_at: new Date().toISOString(),
          metadata: { ...(payment.metadata ?? {}), provider: "saspay", webhook_status: data.status ?? event },
        })
        .eq("id", payment.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, ignored: event });
  } catch (error) {
    console.error("[SasPay Webhook Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type ServiceClient = ReturnType<typeof createSupabaseServiceClient>;

async function findPaymentByTransaction(supabase: ServiceClient, transactionId: string): Promise<PaymentRow | null> {
  const { data } = await supabase.from("saspay_payments").select("*").eq("saspay_transaction_id", transactionId).maybeSingle();
  return (data as PaymentRow | null) ?? null;
}

async function bindTransactionToSession(
  supabase: ServiceClient,
  saspay: ReturnType<typeof getSaspayClient>,
  transactionId: string
): Promise<PaymentRow | null> {
  const since = new Date(Date.now() - BINDING_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await supabase
    .from("saspay_payments")
    .select("*")
    .eq("status", "pending")
    .is("saspay_transaction_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(BINDING_MAX_CANDIDATES);

  for (const candidate of (candidates ?? []) as PaymentRow[]) {
    let status: Awaited<ReturnType<typeof saspay.getCheckoutSessionStatus>>;
    try {
      status = await saspay.getCheckoutSessionStatus(candidate.saspay_session_id);
    } catch (error) {
      // Une session illisible ne doit pas empêcher de rapprocher les suivantes.
      console.error(`[SasPay Webhook] Could not read session ${candidate.saspay_session_id}:`, error);
      continue;
    }

    if (status.transaction_id !== transactionId) continue;

    // `saspay_transaction_id` est unique : si deux webhooks arrivent en même temps,
    // le second perd la course ici plutôt que de créer un doublon d'abonnement.
    const { data: bound } = await supabase
      .from("saspay_payments")
      .update({ saspay_transaction_id: transactionId, updated_at: new Date().toISOString() })
      .eq("id", candidate.id)
      .is("saspay_transaction_id", null)
      .select()
      .maybeSingle();

    return ((bound as PaymentRow | null) ?? (await findPaymentByTransaction(supabase, transactionId))) ?? null;
  }

  return null;
}
