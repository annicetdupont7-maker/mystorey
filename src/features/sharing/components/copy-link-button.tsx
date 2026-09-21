"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/** One tap to put the shop link in the clipboard, with a visible confirmation. */
export function CopyLinkButton({ url, label = "Copier le lien", className = "vf-button vf-button--ghost" }: { url: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch {
      const area = document.createElement("textarea");
      area.value = url; area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area); area.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      document.body.removeChild(area);
    }
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {copied ? <><Check size={15} aria-hidden="true" /> Lien copié</> : <><Copy size={15} aria-hidden="true" /> {label}</>}
    </button>
  );
}
