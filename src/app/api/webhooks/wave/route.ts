import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { getWaveClient, type WaveWebhookPayload } from "@/lib/wave/client";
import { NextRequest, NextResponse } from "next/server";
import { paymentAmountMatches } from "@/features/subscriptions/payment-rules";
import { z } from "zod";

export const dynamic = "force-dynamic";

const waveWebhookSchema = z.object({
  type: z.enum(["payment.completed", "payment.failed"]),
  payment_id: z.string().min(1),
  amount: z.number().finite(),
  status: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-wave-signature") || "";

    // Verify webhook authenticity
    const waveClient = getWaveClient();
    const isValid = await waveClient.verifyWebhookSignature(body, signature);

    if (!isValid) {
      console.error("[Wave Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const parsedPayload = waveWebhookSchema.safeParse(parsedBody);
    if (!parsedPayload.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const payload: WaveWebhookPayload = parsedPayload.data;
    const supabase = createSupabaseServiceClient();

    // Find the payment record
    const { data: payment } = await supabase
      .from("wave_payments")
      .select("*")
      .eq("wave_payment_id", payload.payment_id)
      .maybeSingle();

    if (!payment) {
      console.error(`[Wave Webhook] Payment not found: ${payload.payment_id}`);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payload.type === "payment.completed" && payment.status === "completed") return NextResponse.json({ success: true, duplicate: true });
    if (!paymentAmountMatches(payment.amount, payload.amount)) return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });

    if (payload.type === "payment.completed") {
      // Activate subscription
      const { error } = await supabase
        .from("seller_subscriptions")
        .upsert(
          {
            store_id: payment.store_id,
            plan_id: payment.plan_id,
            wave_payment_id: payment.id,
            status: "active",
            payment_status: "paid",
            provider: "wave",
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id" }
        );

      if (error) {
        console.error("[Wave Webhook] Failed to activate subscription:", error);
        return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
      }

      const { error: paymentError } = await supabase
        .from("wave_payments")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      if (paymentError) return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });

      console.log(`[Wave Webhook] Payment completed: ${payload.payment_id}, subscription activated for store: ${payment.store_id}`);
    } else if (payload.type === "payment.failed") {
      await supabase
        .from("wave_payments")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      console.log(`[Wave Webhook] Payment failed: ${payload.payment_id}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Wave Webhook Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
