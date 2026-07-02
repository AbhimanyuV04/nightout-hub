"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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
    <div className="space-y-2 rounded-xl border border-zinc-800 bg-[#111111] p-3">
      <label className="muted block text-sm">
        Scan bill (optional)
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="mt-1 block w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-[#2C2C2E] file:px-3 file:py-1.5 file:text-white"
        />
      </label>
      {status && <p className="text-sm">{status}</p>}
      {candidates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {candidates.map((n, i) => (
            <motion.button
              key={n}
              type="button"
              onClick={() => onAmount(n)}
              initial={{ opacity: 0, x: -24, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.05 }}
              whileTap={{ scale: 0.9 }}
              className="btn-ghost text-sm"
            >
              ₹{n.toFixed(2)}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
