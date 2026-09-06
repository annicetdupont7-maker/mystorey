import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getFedapayClient, type FedapayWebhookPayload } from "@/lib/fedapay/client";
import { NextRequest, NextResponse } from "next/server";
import { paymentAmountMatches } from "@/features/subscriptions/payment-rules";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-fedapay-signature") || req.headers.get("x-signature") || "";

    // Verify webhook authenticity
    const fedapayClient = getFedapayClient();
    const isValid = await fedapayClient.verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error("[Fedapay Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload: FedapayWebhookPayload = JSON.parse(body);
    const supabase = createSupabaseServiceClient();

    if (!payload.transaction?.id || !["transaction.approved", "transaction.declined"].includes(payload.type) || typeof payload.transaction.amount !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Find the payment record
    const { data: payment } = await supabase
      .from("fedapay_payments")
      .select("*")
      .eq("fedapay_transaction_id", payload.transaction.id)
      .maybeSingle();

    if (!payment) {
      console.error(`[Fedapay Webhook] Payment not found: ${payload.transaction.id}`);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payload.type === "transaction.approved" && payment.status === "approved") return NextResponse.json({ success: true, duplicate: true });
    if (!paymentAmountMatches(payment.amount, payload.transaction.amount)) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });

    // Update payment status
    if (payload.type === "transaction.approved") {
      const { error: paymentError } = await supabase
        .from("fedapay_payments")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      if (paymentError) return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });

      // Activate subscription
      const { error } = await supabase
        .from("seller_subscriptions")
        .upsert(
          {
            store_id: payment.store_id,
            plan_id: payment.plan_id,
            fedapay_payment_id: payment.id,
            status: "active",
            payment_status: "paid",
            provider: "fedapay",
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );

      if (error) {
        console.error("[Fedapay Webhook] Failed to activate subscription:", error);
        return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
      }

      console.log(`[Fedapay Webhook] Payment approved: ${payload.transaction.id}, subscription activated for store: ${payment.store_id}`);
    } else if (payload.type === "transaction.declined") {
      await supabase
        .from("fedapay_payments")
        .update({
          status: "declined",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      console.log(`[Fedapay Webhook] Payment declined: ${payload.transaction.id}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Fedapay Webhook Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
