import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Sparkles, TrendingUp } from "lucide-react";
import type { Insight, InsightTone } from "../types";

const TONE_ICONS: Record<InsightTone, typeof Sparkles> = { highlight: Sparkles, warning: AlertTriangle, opportunity: TrendingUp, positive: CheckCircle2, quiet: Info };

export function InsightCard({ insight }: { insight: Insight }) {
  const Icon = TONE_ICONS[insight.tone];
  return (
    <article className={`insight insight--${insight.tone}`}>
      <span className="insight-icon"><Icon size={17} aria-hidden="true" /></span>
      <div className="insight-body">
        <strong>{insight.title}</strong>
        <p>{insight.body}</p>
        {insight.href && <Link href={insight.href}>{insight.cta ?? "Voir"} <ArrowRight size={13} aria-hidden="true" /></Link>}
      </div>
    </article>
  );
}