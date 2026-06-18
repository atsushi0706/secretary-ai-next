"use client";

import { useState } from "react";

export default function CopyButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={userId}
        readOnly
        className="flex-1 p-3 border-2 border-purple-200 rounded-lg text-sm font-mono bg-gray-50"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
        onClick={() => {
          navigator.clipboard.writeText(userId);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="bg-[var(--accent)] hover:opacity-90 text-white px-4 py-3 rounded-lg font-bold text-sm whitespace-nowrap"
      >
        {copied ? "✓ コピー済み" : "📋 コピー"}
      </button>
    </div>
  );
}
