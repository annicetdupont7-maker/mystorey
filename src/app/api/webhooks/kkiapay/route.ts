import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getKkiapayClient } from "@/lib/kkiapay/client";
import { NextRequest, NextResponse } from "next/server";
import { paymentAmountMatches } from "@/features/subscriptions/payment-rules";
import { z } from "zod";

export const dynamic = "force-dynamic";

const kkiapayWebhookSchema = z.object({
  event: z.enum(["payment.success", "payment.failed", "payment.cancelled"]),
  payment_id: z.string().min(1),
  amount: z.number().finite(),
  status: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-kkiapay-signature") || req.headers.get("x-signature") || "";

    const kkiapayClient = getKkiapayClient();
    const isValid = await kkiapayClient.verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error("[Kkiapay Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const parsedPayload = kkiapayWebhookSchema.safeParse(parsedBody);
    if (!parsedPayload.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const payload = parsedPayload.data;

    const supabase = createSupabaseServiceClient();

    const { data: payment } = await supabase
      .from("fedapay_payments")
      .select("*")
      .eq("fedapay_transaction_id", payload.payment_id)
      .maybeSingle();

    if (!payment) {
      console.error(`[Kkiapay Webhook] Payment not found: ${payload.payment_id}`);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "approved" && payload.event === "payment.success") {
      return NextResponse.json({ success: true, duplicate: true });
    }

    if (!paymentAmountMatches(payment.amount, payload.amount)) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    if (payload.event === "payment.success") {
      const { error } = await supabase
        .from("seller_subscriptions")
        .upsert(
          {
            store_id: payment.store_id,
            plan_id: payment.plan_id,
            fedapay_payment_id: payment.id,
            status: "active",
            payment_status: "paid",
            provider: "kkiapay",
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );

      if (error) {
        console.error("[Kkiapay Webhook] Failed to activate subscription:", error);
        return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
      }

      const { error: paymentError } = await supabase
        .from("fedapay_payments")
        .update({ status: "approved", updated_at: new Date().toISOString(), metadata: { ...(payment.metadata ?? {}), provider: "kkiapay", webhook_status: payload.status ?? "success" } })
        .eq("id", payment.id);
      if (paymentError) return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });

      return NextResponse.json({ success: true });
    }

    if (payload.event === "payment.failed" || payload.event === "payment.cancelled") {
      await supabase
        .from("fedapay_payments")
        .update({ status: "declined", updated_at: new Date().toISOString(), metadata: { ...(payment.metadata ?? {}), provider: "kkiapay", webhook_status: payload.status ?? payload.event } })
        .eq("id", payment.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (error) {
    console.error("[Kkiapay Webhook Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
