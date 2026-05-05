import { createHash, createHmac, randomUUID } from "node:crypto";

import type { Request } from "express";

import { env } from "../config/env";
import { AppError } from "../errors/app-error";

export type PayHereCustomerDetails = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
};

export type PayHereCheckoutPagePayload = {
  actionUrl: string;
  fields: Record<string, string>;
};

export type PayHereNotification = {
  merchantId: string;
  orderId: string;
  paymentId: string;
  payhereAmount: string;
  payhereCurrency: string;
  statusCode: number;
  md5sig: string;
  method: string | null;
  statusMessage: string | null;
  custom1: string | null;
  custom2: string | null;
  rawBody: string;
  rawBodyHash: string;
};

export function assertPayHereConfigured(): void {
  if (!env.payhereMerchantId || !env.payhereMerchantSecret || !env.payhereNotifyUrl) {
    throw new AppError(
      503,
      "PayHere is not configured. Set merchant credentials and a public notify URL first.",
      "PAYHERE_NOT_CONFIGURED",
    );
  }
}

export function createPayHereCheckoutPagePayload(input: {
  bookingNumber: string;
  subtotal: number;
  itemTitle: string;
  customer: PayHereCustomerDetails;
  returnUrl: string;
  cancelUrl: string;
  custom1?: string;
  custom2?: string;
}): PayHereCheckoutPagePayload {
  assertPayHereConfigured();

  const amount = formatPayHereAmount(input.subtotal);
  const hash = generatePayHereCheckoutHash(input.bookingNumber, amount, env.payhereCurrency);
  const [firstName, lastName] = splitFullName(input.customer.fullName);

  return {
    actionUrl: env.payhereSandbox
      ? "https://sandbox.payhere.lk/pay/checkout"
      : "https://www.payhere.lk/pay/checkout",
    fields: {
      merchant_id: env.payhereMerchantId!,
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      notify_url: env.payhereNotifyUrl!,
      first_name: firstName,
      last_name: lastName,
      email: input.customer.email,
      phone: input.customer.phone,
      address: input.customer.address,
      city: input.customer.city,
      country: input.customer.country,
      order_id: input.bookingNumber,
      items: input.itemTitle,
      currency: env.payhereCurrency,
      amount,
      hash,
      custom_1: input.custom1 ?? "",
      custom_2: input.custom2 ?? "",
    },
  };
}

export function createPayHereCheckoutToken(): string {
  return randomUUID().replace(/-/g, "");
}

export function createPayHereCheckoutUrl(baseUrl: string, checkoutToken: string): string {
  return `${baseUrl}/api/payments/payhere/checkout/${checkoutToken}`;
}

export function createPayHereReturnUrl(baseUrl: string, bookingNumber: string): string {
  return env.payhereReturnUrl ?? `${baseUrl}/api/payments/payhere/return?booking=${encodeURIComponent(bookingNumber)}`;
}

export function createPayHereCancelUrl(baseUrl: string, bookingNumber: string): string {
  return env.payhereCancelUrl ?? `${baseUrl}/api/payments/payhere/cancel?booking=${encodeURIComponent(bookingNumber)}`;
}

export function renderPayHereAutoSubmitPage(payload: PayHereCheckoutPagePayload): string {
  const inputs = Object.entries(payload.fields)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redirecting to PayHere</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #f7efe3, #f3fbf8);
        color: #17323a;
        font-family: Arial, sans-serif;
      }
      .card {
        max-width: 420px;
        margin: 24px;
        padding: 28px;
        border-radius: 24px;
        background: white;
        box-shadow: 0 20px 60px rgba(23, 50, 58, 0.08);
        text-align: center;
      }
      button {
        margin-top: 16px;
        border: none;
        border-radius: 999px;
        padding: 12px 20px;
        background: #0f5f66;
        color: white;
        font-size: 16px;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Redirecting to PayHere</h1>
      <p>Your booking is waiting for secure payment confirmation.</p>
      <p>If you are not redirected automatically, use the button below.</p>
      <form id="payhere-checkout" method="post" action="${escapeHtml(payload.actionUrl)}">
        ${inputs}
        <button type="submit">Continue to PayHere</button>
      </form>
    </div>
    <script>
      window.setTimeout(function () {
        document.getElementById('payhere-checkout')?.submit();
      }, 150);
    </script>
  </body>
</html>`;
}

export function renderPayHereStatusPage(input: {
  title: string;
  message: string;
  bookingNumber?: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #f7efe3, #f3fbf8);
        color: #17323a;
        font-family: Arial, sans-serif;
      }
      .card {
        max-width: 520px;
        margin: 24px;
        padding: 28px;
        border-radius: 24px;
        background: white;
        box-shadow: 0 20px 60px rgba(23, 50, 58, 0.08);
      }
      .reference {
        margin-top: 12px;
        color: #0f5f66;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${escapeHtml(input.title)}</h1>
      <p>${escapeHtml(input.message)}</p>
      ${
        input.bookingNumber
          ? `<p class="reference">Booking reference: ${escapeHtml(input.bookingNumber)}</p>`
          : ""
      }
      <p>You can close this page and return to MenteCart.</p>
    </div>
  </body>
</html>`;
}

export function parseAndVerifyPayHereNotification(rawBody: string): PayHereNotification {
  assertPayHereConfigured();

  const params = new URLSearchParams(rawBody);
  const merchantId = requiredFormField(params, "merchant_id");
  const orderId = requiredFormField(params, "order_id");
  const paymentId = requiredFormField(params, "payment_id");
  const payhereAmount = requiredFormField(params, "payhere_amount");
  const payhereCurrency = requiredFormField(params, "payhere_currency");
  const statusCodeRaw = requiredFormField(params, "status_code");
  const md5sig = requiredFormField(params, "md5sig");
  const statusCode = Number.parseInt(statusCodeRaw, 10);

  if (Number.isNaN(statusCode)) {
    throw new AppError(400, "Invalid PayHere status code", "PAYHERE_INVALID_STATUS");
  }

  if (merchantId !== env.payhereMerchantId) {
    throw new AppError(400, "PayHere merchant mismatch", "PAYHERE_MERCHANT_MISMATCH");
  }

  const localMd5Sig = generatePayHereNotificationHash({
    merchantId,
    orderId,
    payhereAmount,
    payhereCurrency,
    statusCode: statusCodeRaw,
  });

  if (localMd5Sig !== md5sig.toUpperCase()) {
    throw new AppError(400, "PayHere signature verification failed", "PAYHERE_SIGNATURE_INVALID");
  }

  return {
    merchantId,
    orderId,
    paymentId,
    payhereAmount,
    payhereCurrency,
    statusCode,
    md5sig: md5sig.toUpperCase(),
    method: optionalFormField(params, "method"),
    statusMessage: optionalFormField(params, "status_message"),
    custom1: optionalFormField(params, "custom_1"),
    custom2: optionalFormField(params, "custom_2"),
    rawBody,
    rawBodyHash: createHash("sha256").update(rawBody).digest("hex"),
  };
}

export function rawBodyFromRequest(req: Request): string {
  const body = req.body;

  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }

  if (typeof body === "string") {
    return body;
  }

  throw new AppError(400, "Expected raw PayHere webhook body", "PAYHERE_RAW_BODY_MISSING");
}

function generatePayHereCheckoutHash(orderId: string, amount: string, currency: string): string {
  return createHash("md5")
    .update(
      `${env.payhereMerchantId}${orderId}${amount}${currency}${createHash("md5")
        .update(env.payhereMerchantSecret!)
        .digest("hex")
        .toUpperCase()}`,
      "utf8",
    )
    .digest("hex")
    .toUpperCase();
}

function generatePayHereNotificationHash(input: {
  merchantId: string;
  orderId: string;
  payhereAmount: string;
  payhereCurrency: string;
  statusCode: string;
}): string {
  return createHash("md5")
    .update(
      `${input.merchantId}${input.orderId}${input.payhereAmount}${input.payhereCurrency}${input.statusCode}${createHash(
        "md5",
      )
        .update(env.payhereMerchantSecret!)
        .digest("hex")
        .toUpperCase()}`,
      "utf8",
    )
    .digest("hex")
    .toUpperCase();
}

export function checkoutInputDigest(bookingNumber: string): string {
  return createHmac("sha256", env.jwtSecret).update(bookingNumber).digest("hex");
}

function splitFullName(fullName: string): [string, string] {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const [first, ...rest] = trimmed.split(" ");

  return [first || "Customer", rest.join(" ") || "Booking"];
}

function requiredFormField(params: URLSearchParams, key: string): string {
  const value = params.get(key)?.trim();

  if (!value) {
    throw new AppError(400, `Missing PayHere field: ${key}`, "PAYHERE_FIELD_MISSING");
  }

  return value;
}

function optionalFormField(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim();
  return value ? value : null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPayHereAmount(value: number): string {
  return value.toFixed(2);
}
