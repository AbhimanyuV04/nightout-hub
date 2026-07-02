"use client";

import { useState } from "react";

export default function BillScanner({ onAmount }: { onAmount: (amount: number) => void }) {
  const [status, setStatus] = useState("");
  const [candidates, setCandidates] = useState<number[]>([]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("Scanning bill...");
    setCandidates([]);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(file, "eng");
      const amounts = [...data.text.matchAll(/\d[\d,]*\.\d{2}/g)]
        .map((m) => parseFloat(m[0].replace(/,/g, "")))
        .filter((n) => n > 0);
      const top = [...new Set(amounts)].sort((a, b) => b - a).slice(0, 5);
      setCandidates(top);
      setStatus(top.length ? "Tap the bill total:" : "No amounts found in image");
    } catch {
      setStatus("Could not read image");
    }
  }

  return (
    <div className="space-y-2 border p-2">
      <label className="block text-sm">
        Scan bill (optional)
        <input type="file" accept="image/*" onChange={handleFile} className="block w-full" />
      </label>
      {status && <p className="text-sm">{status}</p>}
      {candidates.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onAmount(n)}
          className="border px-2 py-1 mr-2 text-sm"
        >
          ₹{n.toFixed(2)}
        </button>
      ))}
    </div>
  );
}
