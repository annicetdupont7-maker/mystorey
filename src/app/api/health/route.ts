import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Battement de cœur de la plateforme, appelé une fois par jour par la tâche
 * planifiée déclarée dans `vercel.json`. Vercel la déclenche lui-même : aucune
 * portée à obtenir côté GitHub, et aucun planificateur qui se désactive tout
 * seul au bout de soixante jours sans activité.
 *
 * Deux rôles. Il garde le projet Supabase actif : le plan gratuit met un projet
 * en pause après sept jours sans requête, l'infrastructure est démontée et le
 * sous-domaine cesse même de résoudre. C'est arrivé le 09/10/2026, et plus
 * personne ne pouvait ni s'inscrire ni se connecter. Et il répond autre chose
 * que 200 dès que la base ne répond plus, ce qui fait échouer l'exécution : la
 * panne se voit dans le journal du cron sur Vercel au lieu d'être apprise par
 * une vendeuse qui n'arrive plus à se connecter.
 *
 * La lecture passe par la clé publique et ne touche qu'une table que n'importe
 * quelle visiteuse peut déjà lire. Rien de privé ne sort d'ici, et le détail
 * d'une panne reste dans les logs.
 *
 * Pas de `dynamic = "force-dynamic"` : dans cette version de Next, un
 * gestionnaire de route n'est pas mis en cache par défaut.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error("[mystorey-error]", JSON.stringify({ step: "health", message: "Supabase n'est pas configuré", at: new Date().toISOString() }));
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("subscription_plans").select("id").limit(1);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (cause) {
    // Même préfixe que src/instrumentation.ts : un seul filtre dans les logs Vercel.
    console.error("[mystorey-error]", JSON.stringify({ step: "health", message: cause instanceof Error ? cause.message : String(cause), at: new Date().toISOString() }));
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
