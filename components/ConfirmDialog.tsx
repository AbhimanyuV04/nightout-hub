"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative w-full max-w-xs space-y-4 overflow-hidden rounded-2xl border border-white/10 bg-[#1C1C1E]/90 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#FF375F]/20 blur-3xl" />
            <div className="relative space-y-1.5">
              <h2 className="text-lg font-bold tracking-tight">{title}</h2>
              <p className="muted text-sm leading-snug">{message}</p>
            </div>
            <div className="relative flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="btn-ghost flex-1 py-2.5"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#FF375F] to-[#FF5C7C] py-2.5 font-semibold text-white shadow-lg shadow-[#FF375F]/25 transition active:scale-95 disabled:opacity-50"
              >
                {pending ? "…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
