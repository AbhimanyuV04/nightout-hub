export type ExpenseInput = {
  paidBy: string;
  amount: number;
  splits: { userId: string; shareAmount: number }[];
};

export type Settlement = { fromUser: string; toUser: string; amount: number };

const toPaise = (n: number) => Math.round(n * 100);

export function netBalances(memberIds: string[], expenses: ExpenseInput[]): Map<string, number> {
  const balances = new Map<string, number>(memberIds.map((id) => [id, 0]));
  for (const e of expenses) {
    balances.set(e.paidBy, (balances.get(e.paidBy) ?? 0) + toPaise(e.amount));
    for (const s of e.splits) {
      balances.set(s.userId, (balances.get(s.userId) ?? 0) - toPaise(s.shareAmount));
    }
  }
  return balances;
}

// ponytail: sorted-array greedy, not heaps — same ≤ n−1 transfer guarantee
// (true minimum is NP-hard); swap in heaps if groups ever exceed ~1000 members.
export function simplifyDebts(memberIds: string[], expenses: ExpenseInput[]): Settlement[] {
  const creditors: { id: string; paise: number }[] = [];
  const debtors: { id: string; paise: number }[] = [];
  for (const [id, paise] of netBalances(memberIds, expenses)) {
    if (paise > 0) creditors.push({ id, paise });
    else if (paise < 0) debtors.push({ id, paise: -paise });
  }
  creditors.sort((a, b) => b.paise - a.paise);
  debtors.sort((a, b) => b.paise - a.paise);

  const settlements: Settlement[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const paid = Math.min(creditors[ci].paise, debtors[di].paise);
    settlements.push({
      fromUser: debtors[di].id,
      toUser: creditors[ci].id,
      amount: paid / 100,
    });
    creditors[ci].paise -= paid;
    debtors[di].paise -= paid;
    if (creditors[ci].paise === 0) ci++;
    if (debtors[di].paise === 0) di++;
  }
  return settlements;
}

export function evenSplit(amount: number, userIds: string[]): { userId: string; shareAmount: number }[] {
  const total = toPaise(amount);
  const base = Math.floor(total / userIds.length);
  const remainder = total - base * userIds.length;
  return userIds.map((userId, i) => ({
    userId,
    shareAmount: (base + (i < remainder ? 1 : 0)) / 100,
  }));
}
