import assert from "node:assert/strict";
import { evenSplit, simplifyDebts } from "./debtEngine.ts";
import { upiPayLink } from "./upi.ts";

// even split distributes leftover paise
const split = evenSplit(100, ["a", "b", "c"]);
assert.equal(split.reduce((s, x) => s + Math.round(x.shareAmount * 100), 0), 10000);
assert.deepEqual(split.map((s) => s.shareAmount), [33.34, 33.33, 33.33]);

// a pays 300 split 3 ways -> b and c each owe a 100
const debts = simplifyDebts(["a", "b", "c"], [
  { paidBy: "a", amount: 300, splits: evenSplit(300, ["a", "b", "c"]) },
]);
assert.deepEqual(debts, [
  { fromUser: "b", toUser: "a", amount: 100 },
  { fromUser: "c", toUser: "a", amount: 100 },
]);

// chains collapse: a->b 50, b->c 50 becomes a->c 50
const chain = simplifyDebts(["a", "b", "c"], [
  { paidBy: "b", amount: 50, splits: [{ userId: "a", shareAmount: 50 }] },
  { paidBy: "c", amount: 50, splits: [{ userId: "b", shareAmount: 50 }] },
]);
assert.deepEqual(chain, [{ fromUser: "a", toUser: "c", amount: 50 }]);

// settled group -> no transfers; float shares don't leave dust
assert.deepEqual(
  simplifyDebts(["a", "b", "c"], [
    { paidBy: "a", amount: 0.1, splits: evenSplit(0.1, ["a", "b", "c"]) },
    { paidBy: "b", amount: 0.03, splits: [{ userId: "a", shareAmount: 0.03 }] },
    { paidBy: "c", amount: 0.03, splits: [{ userId: "a", shareAmount: 0.03 }] },
  ]),
  []
);

assert.equal(
  upiPayLink("ravi@upi", "Ravi Kumar", 123.5, "NightOut DXB492"),
  "upi://pay?pa=ravi%40upi&pn=Ravi%20Kumar&am=123.50&cu=INR&tn=NightOut%20DXB492"
);
assert.throws(() => upiPayLink("not a vpa", "x", 10));

console.log("debtEngine + upi checks passed");
