"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function DemoCopyButton({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      setStatus(copied ? "copied" : "failed");
    }
    window.setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <button className="button-secondary gap-2" onClick={copy} type="button">
      {status === "copied" ? <Check className="text-atlas" size={15} /> : <Copy size={15} />}
      <span aria-live="polite">{status === "copied" ? "Copied" : status === "failed" ? "Copy unavailable" : label}</span>
    </button>
  );
}
