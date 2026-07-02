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
    <form action={action} className="space-y-2 border p-4">
      <h2 className="font-semibold">Add expense</h2>
      <input type="hidden" name="roomId" value={roomId} />
      <input type="hidden" name="roomCode" value={roomCode} />
      <input name="description" placeholder="Description" required className="border p-2 w-full" />
      <input
        name="amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="Amount (₹)"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border p-2 w-full"
      />
      <BillScanner onAmount={(n) => setAmount(n.toFixed(2))} />
      <fieldset className="space-y-1">
        <legend className="text-sm">Split between:</legend>
        {members.map((m) => (
          <label key={m.id} className="block text-sm">
            <input type="checkbox" name="participants" value={m.id} defaultChecked /> {m.display_name}
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={pending} className="border p-2 w-full">
        {pending ? "Adding..." : "Add expense"}
      </button>
      {state?.error && <p className="text-red-600 text-sm">{state.error}</p>}
    </form>
  );
}
