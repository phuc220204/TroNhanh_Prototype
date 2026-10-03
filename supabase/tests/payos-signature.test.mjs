import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalPayosData,
  signPaymentLinkRequest,
  verifyPayosData,
} from "../functions/_shared/payos-signature.mjs";

const testKey = "local-test-key-not-a-payment-secret";

test("payment link signs exactly the five fields required by payOS", async () => {
  const request = {
    orderCode: 260924000001,
    amount: 20000,
    description: "Boost 7 ngay",
    returnUrl: "https://tronhanh.vercel.app/?boost=return",
    cancelUrl: "https://tronhanh.vercel.app/?boost=cancel",
    items: [{ name: "Ignored in signature" }],
  };
  assert.equal(
    canonicalPayosData({ amount: request.amount, cancelUrl: request.cancelUrl, description: request.description, orderCode: request.orderCode, returnUrl: request.returnUrl }),
    "amount=20000&cancelUrl=https://tronhanh.vercel.app/?boost=cancel&description=Boost 7 ngay&orderCode=260924000001&returnUrl=https://tronhanh.vercel.app/?boost=return",
  );
  const signature = await signPaymentLinkRequest(request, testKey);
  assert.equal(signature.length, 64);
  assert.equal(await verifyPayosData({ amount: request.amount, cancelUrl: request.cancelUrl, description: request.description, orderCode: request.orderCode, returnUrl: request.returnUrl }, signature, testKey), true);
});

test("webhook signature rejects tampered amount and wrong key", async () => {
  const data = {
    orderCode: 260924000001,
    amount: 20000,
    paymentLinkId: "payos-link-example",
    reference: "bank-ref-example",
    code: "00",
  };
  const signature = await signPaymentLinkRequest({
    ...data,
    description: "test",
    cancelUrl: "https://example.com/cancel",
    returnUrl: "https://example.com/return",
  }, testKey);
  assert.equal(await verifyPayosData(data, signature, testKey), false);
  const { signPayosData } = await import("../functions/_shared/payos-signature.mjs");
  const webhookSignature = await signPayosData(data, testKey);
  assert.equal(await verifyPayosData(data, webhookSignature, testKey), true);
  assert.equal(await verifyPayosData({ ...data, amount: 1 }, webhookSignature, testKey), false);
  assert.equal(await verifyPayosData(data, webhookSignature, "other-key"), false);
});

test("verifies the official payOS webhook sample", async () => {
  const data = {
    orderCode: 123,
    amount: 3000,
    description: "VQRIO123",
    accountNumber: "12345678",
    reference: "TF230204212323",
    transactionDateTime: "2023-02-04 18:25:00",
    currency: "VND",
    paymentLinkId: "124c33293c43417ab7879e14c8d9eb18",
    code: "00",
    desc: "Thành công",
    counterAccountBankId: "",
    counterAccountBankName: "",
    counterAccountName: "",
    counterAccountNumber: "",
    virtualAccountName: "",
    virtualAccountNumber: "",
  };
  assert.equal(
    await verifyPayosData(
      data,
      "412e915d2871504ed31be63c8f62a149a4410d34c4c42affc9006ef9917eaa03",
      "1a54716c8f0efb2744fb28b6e38b25da7f67a925d98bc1c18bd8faaecadd7675",
    ),
    true,
  );
});
