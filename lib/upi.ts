export const VPA_REGEX = /^[\w.-]+@[\w-]+$/;

export function upiPayLink(vpa: string, name: string, amount: number, note?: string): string {
  if (!VPA_REGEX.test(vpa)) throw new Error(`Invalid UPI ID: ${vpa}`);
  if (!(amount > 0)) throw new Error("Amount must be positive");
  const params: [string, string][] = [
    ["pa", vpa],
    ["pn", name],
    ["am", amount.toFixed(2)],
    ["cu", "INR"],
  ];
  if (note) params.push(["tn", note]);
  return "upi://pay?" + params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}
