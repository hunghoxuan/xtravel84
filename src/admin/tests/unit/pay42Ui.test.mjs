import test from "node:test";
import assert from "node:assert/strict";
import { formatMetric, formatMoney, roleLabel, statusTone } from "../../modules/42pay/pages/pay42Ui.js";

test("Pays UI formatters expose stable money, status, and role values", () => {
  assert.equal(formatMoney(12.5), "$12.50");
  assert.equal(formatMetric(4), "4");
  assert.equal(roleLabel({ roles: ["seller"] }), "seller");
  assert.equal(statusTone("PAID"), "#1fc7d4");
});
