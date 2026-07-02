"use client";

import { useActionState, useState } from "react";
import { addExpense } from "@/app/actions";
import BillScanner from "./BillScanner";

type Member = { id: string; display_name: string };

export default function AddExpenseForm({
  roomId,
  roomCode,
  members,
}: {
  roomId: string;
  roomCode: string;
  members: Member[];
}) {
  const [state, action, pending] = useActionState(addExpense, null);
  const [amount, setAmount] = useState("");

  return (
    <form action={action} className="card space-y-3">
      <h2 className="section-title">Add expense</h2>
      <input type="hidden" name="roomId" value={roomId} />
      <input type="hidden" name="roomCode" value={roomCode} />
      <input name="description" placeholder="Description" required className="field" />
      <input
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="Amount (₹)"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="field"
      />
      <BillScanner onAmount={(n) => setAmount(n.toFixed(2))} />
      <fieldset className="space-y-2">
        <legend className="muted text-sm">Split between</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-2 rounded-xl bg-[#111111] px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="participants"
                value={m.id}
                defaultChecked
                className="accent-[#FF375F]"
              />
              {m.display_name}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Adding..." : "Add expense"}
      </button>
      {state?.error && <p className="text-sm text-[#FF375F]">{state.error}</p>}
    </form>
  );
}
