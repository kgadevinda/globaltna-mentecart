import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import type http from "node:http";
import { after, before, beforeEach, describe, it } from "node:test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

type CreateApp = (typeof import("../src/app"))["createApp"];
type EnsureAdminUser = (typeof import("../src/services/bootstrap.service"))["ensureAdminUser"];
type ServiceModelType = (typeof import("../src/models/service.model"))["ServiceModel"];
type SlotInventoryModelType = (typeof import("../src/models/slot-inventory.model"))["SlotInventoryModel"];
type BookingModelType = (typeof import("../src/models/booking.model"))["BookingModel"];
type CartModelType = (typeof import("../src/models/cart.model"))["CartModel"];
type UserModelType = (typeof import("../src/models/user.model"))["UserModel"];

type ApiRequestOptions = {
  method?: string;
  token?: string;
  body?: unknown;
};

let createApp: CreateApp;
let ensureAdminUser: EnsureAdminUser;
let ServiceModel: ServiceModelType;
let SlotInventoryModel: SlotInventoryModelType;
let BookingModel: BookingModelType;
let CartModel: CartModelType;
let UserModel: UserModelType;

let mongoServer: MongoMemoryServer;
let server: http.Server;
let baseUrl = "";
let fixture: {
  serviceId: string;
  futureStartsAt: Date;
};

before(async () => {
  mongoServer = await MongoMemoryServer.create();

  Object.assign(process.env, {
    NODE_ENV: "test",
    PORT: "4010",
    MONGODB_URI: mongoServer.getUri("mentecart-tests"),
    JWT_SECRET: "integration-test-secret-12345",
    JWT_EXPIRES_IN: "12h",
    CLIENT_ORIGIN: "*",
    SLOT_HOLD_MINUTES: "15",
    MAX_BOOKINGS_PER_DAY: "3",
    CANCELLATION_CUTOFF_HOURS: "6",
    HOLD_CLEANUP_INTERVAL_MS: "60000",
    SEED_ON_STARTUP: "false",
    USE_IN_MEMORY_DB: "false",
    PUBLIC_SERVER_URL: "",
    PAYHERE_SANDBOX: "true",
    PAYHERE_MERCHANT_ID: "1211145",
    PAYHERE_MERCHANT_SECRET: "payhere-secret-123",
    PAYHERE_NOTIFY_URL: "https://merchant.example.com/api/payments/payhere/notify",
    PAYHERE_RETURN_URL: "",
    PAYHERE_CANCEL_URL: "",
    PAYHERE_CURRENCY: "LKR",
    ADMIN_EMAIL: "admin@mentecart.local",
    ADMIN_PASSWORD: "AdminPass123!",
    ADMIN_NAME: "Operations Admin",
  });

  ({ createApp } = await import("../src/app"));
  ({ ensureAdminUser } = await import("../src/services/bootstrap.service"));
  ({ ServiceModel } = await import("../src/models/service.model"));
  ({ SlotInventoryModel } = await import("../src/models/slot-inventory.model"));
  ({ BookingModel } = await import("../src/models/booking.model"));
  ({ CartModel } = await import("../src/models/cart.model"));
  ({ UserModel } = await import("../src/models/user.model"));

  await mongoose.connect(process.env.MONGODB_URI!);

  server = createApp().listen(0);
  await once(server, "listening");

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve test server address");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  if (server) {
    server.close();
  }
});

beforeEach(async () => {
  await Promise.all([
    BookingModel.deleteMany({}),
    CartModel.deleteMany({}),
    SlotInventoryModel.deleteMany({}),
    ServiceModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);

  await ensureAdminUser();

  const futureStartsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  futureStartsAt.setUTCMinutes(0, 0, 0);

  const service = await ServiceModel.create({
    title: "Deep Focus Session",
    description: "One-on-one tutoring session for integration testing.",
    price: 75,
    durationMinutes: 90,
    category: "tutoring",
    imageUrl: "https://images.example.com/focus-session.jpg",
    slotCapacity: 5,
    slots: [
      {
        startsAt: futureStartsAt,
        capacity: 5,
      },
    ],
  });

  await SlotInventoryModel.create({
    serviceId: service._id,
    startsAt: futureStartsAt,
    capacity: 5,
    reservedCount: 0,
    bookedCount: 0,
  });

  fixture = {
    serviceId: service._id.toString(),
    futureStartsAt,
  };
});

describe("MenteCart API integration", () => {
  it("walks through signup, catalogue, cart, and checkout successfully", async () => {
    const signup = await apiRequest("/api/auth/signup", {
      body: {
        name: "Alice Booker",
        email: "alice@example.com",
        password: "Password123!",
      },
    });

    assert.equal(signup.status, 201);
    assert.equal(signup.body.user.role, "customer");

    const token = signup.body.token as string;

    const services = await apiRequest("/api/services");
    assert.equal(services.status, 200);
    assert.equal(services.body.total, 1);
    assert.equal(services.body.items[0].id, fixture.serviceId);

    const addToCart = await apiRequest("/api/cart/items", {
      token,
      body: {
        serviceId: fixture.serviceId,
        scheduledAt: fixture.futureStartsAt.toISOString(),
        quantity: 2,
      },
    });

    assert.equal(addToCart.status, 201);
    assert.equal(addToCart.body.cart.itemCount, 2);
    assert.equal(addToCart.body.cart.items[0].quantity, 2);

    const checkout = await apiRequest("/api/bookings/checkout", {
      token,
      body: {
        paymentMethod: "cash",
      },
    });

    assert.equal(checkout.status, 201);
    assert.equal(checkout.body.booking.status, "confirmed");
    assert.equal(checkout.body.booking.paymentStatus, "unpaid");

    const bookings = await apiRequest("/api/bookings", { token });
    assert.equal(bookings.status, 200);
    assert.equal(bookings.body.bookings.length, 1);

    const cart = await apiRequest("/api/cart", { token });
    assert.equal(cart.status, 200);
    assert.equal(cart.body.cart.items.length, 0);

    const slotInventory = await SlotInventoryModel.findOne({
      serviceId: fixture.serviceId,
      startsAt: fixture.futureStartsAt,
    }).lean();

    assert.equal(slotInventory?.reservedCount, 0);
    assert.equal(slotInventory?.bookedCount, 2);
  });

  it("releases booked capacity when a confirmed booking is cancelled", async () => {
    const token = await signupAndReturnToken("bob@example.com");
    const bookingId = await createConfirmedBooking(token, 1);

    const cancellation = await apiRequest(`/api/bookings/${bookingId}/cancel`, {
      token,
      body: {},
    });

    assert.equal(cancellation.status, 200);
    assert.equal(cancellation.body.booking.status, "cancelled");
    assert.equal(cancellation.body.booking.auditLog.at(-1)?.status, "cancelled");

    const booking = await apiRequest(`/api/bookings/${bookingId}`, { token });
    assert.equal(booking.status, 200);
    assert.equal(booking.body.booking.status, "cancelled");

    const slotInventory = await SlotInventoryModel.findOne({
      serviceId: fixture.serviceId,
      startsAt: fixture.futureStartsAt,
    }).lean();

    assert.equal(slotInventory?.reservedCount, 0);
    assert.equal(slotInventory?.bookedCount, 0);
  });

  it("blocks customers from completing bookings and allows admins to complete finished bookings", async () => {
    const customerToken = await signupAndReturnToken("charlie@example.com");
    const bookingId = await createConfirmedBooking(customerToken, 1);

    const forbidden = await apiRequest(`/api/bookings/${bookingId}/complete`, {
      token: customerToken,
      body: {
        note: "Trying to self-complete should fail",
      },
    });

    assert.equal(forbidden.status, 403);
    assert.equal(forbidden.body.errorCode, "AUTH_FORBIDDEN");

    const bookingDocument = await BookingModel.findById(bookingId);

    assert.ok(bookingDocument);
    bookingDocument.items[0].scheduledAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    bookingDocument.cancelBy = new Date(Date.now() - 4 * 60 * 60 * 1000);
    await bookingDocument.save();

    const adminLogin = await apiRequest("/api/auth/login", {
      body: {
        email: "admin@mentecart.local",
        password: "AdminPass123!",
      },
    });

    assert.equal(adminLogin.status, 200);
    assert.equal(adminLogin.body.user.role, "admin");

    const adminToken = adminLogin.body.token as string;
    const completion = await apiRequest(`/api/bookings/${bookingId}/complete`, {
      token: adminToken,
      body: {
        note: "Service delivered and verified by operations.",
      },
    });

    assert.equal(completion.status, 200);
    assert.equal(completion.body.booking.status, "completed");
    assert.equal(completion.body.booking.auditLog.at(-1)?.status, "completed");
    assert.equal(
      completion.body.booking.auditLog.at(-1)?.note,
      "Service delivered and verified by operations.",
    );

    const repeatCompletion = await apiRequest(`/api/bookings/${bookingId}/complete`, {
      token: adminToken,
      body: {
        note: "Should not complete twice",
      },
    });

    assert.equal(repeatCompletion.status, 409);
    assert.equal(repeatCompletion.body.errorCode, "BOOKING_CANNOT_BE_COMPLETED");
  });

  it("creates a PayHere checkout session and confirms the booking after a verified webhook", async () => {
    const token = await signupAndReturnToken("payhere-success@example.com");
    const checkout = await createPayHerePendingBooking(token, 1);

    assert.equal(checkout.status, 201);
    assert.equal(checkout.body.booking.status, "pending");
    assert.equal(checkout.body.booking.paymentMethod, "payhere");
    assert.equal(checkout.body.booking.paymentStatus, "pending");
    assert.equal(checkout.body.payment.provider, "payhere");
    assert.match(checkout.body.payment.checkoutUrl, /\/api\/payments\/payhere\/checkout\//);

    const checkoutPage = await fetch(checkout.body.payment.checkoutUrl);
    assert.equal(checkoutPage.status, 200);
    assert.match(checkoutPage.headers.get("content-type") ?? "", /text\/html/);
    const checkoutHtml = await checkoutPage.text();
    assert.match(checkoutHtml, /Redirecting to PayHere/);
    assert.match(checkoutHtml, /name="merchant_id" value="1211145"/);
    assert.match(checkoutHtml, new RegExp(`name="order_id" value="${checkout.body.booking.bookingNumber}"`));

    const reservedBefore = await SlotInventoryModel.findOne({
      serviceId: fixture.serviceId,
      startsAt: fixture.futureStartsAt,
    }).lean();

    assert.equal(reservedBefore?.reservedCount, 1);
    assert.equal(reservedBefore?.bookedCount, 0);

    const successWebhook = await payHereNotifyRequest(
      checkout.body.booking.bookingNumber as string,
      Number(checkout.body.booking.subtotal).toFixed(2),
      2,
      {
        paymentId: "PH-SUCCESS-001",
        statusMessage: "Sandbox payment captured",
        method: "VISA",
      },
    );

    assert.equal(successWebhook.status, 200);
    assert.equal(successWebhook.body.duplicate, false);
    assert.equal(successWebhook.body.status, "confirmed");
    assert.equal(successWebhook.body.paymentStatus, "paid");

    const duplicateWebhook = await payHereNotifyRequest(
      checkout.body.booking.bookingNumber as string,
      Number(checkout.body.booking.subtotal).toFixed(2),
      2,
      {
        paymentId: "PH-SUCCESS-001",
        statusMessage: "Sandbox payment captured",
        method: "VISA",
      },
    );

    assert.equal(duplicateWebhook.status, 200);
    assert.equal(duplicateWebhook.body.duplicate, true);
    assert.equal(duplicateWebhook.body.status, "confirmed");
    assert.equal(duplicateWebhook.body.paymentStatus, "paid");

    const reservedAfter = await SlotInventoryModel.findOne({
      serviceId: fixture.serviceId,
      startsAt: fixture.futureStartsAt,
    }).lean();

    assert.equal(reservedAfter?.reservedCount, 0);
    assert.equal(reservedAfter?.bookedCount, 1);
  });

  it("marks failed PayHere payments as failed and releases reserved capacity", async () => {
    const token = await signupAndReturnToken("payhere-failure@example.com");
    const checkout = await createPayHerePendingBooking(token, 2);

    assert.equal(checkout.status, 201);
    assert.equal(checkout.body.booking.status, "pending");

    const failedWebhook = await payHereNotifyRequest(
      checkout.body.booking.bookingNumber as string,
      Number(checkout.body.booking.subtotal).toFixed(2),
      -1,
      {
        paymentId: "PH-FAILED-001",
        statusMessage: "Sandbox payment cancelled",
        method: "VISA",
      },
    );

    assert.equal(failedWebhook.status, 200);
    assert.equal(failedWebhook.body.duplicate, false);
    assert.equal(failedWebhook.body.status, "failed");
    assert.equal(failedWebhook.body.paymentStatus, "failed");

    const booking = await BookingModel.findOne({
      bookingNumber: checkout.body.booking.bookingNumber,
    }).lean();

    assert.equal(booking?.status, "failed");
    assert.equal(booking?.paymentStatus, "failed");
    assert.equal(booking?.auditLog.at(-1)?.status, "failed");

    const slotInventory = await SlotInventoryModel.findOne({
      serviceId: fixture.serviceId,
      startsAt: fixture.futureStartsAt,
    }).lean();

    assert.equal(slotInventory?.reservedCount, 0);
    assert.equal(slotInventory?.bookedCount, 0);
  });

  it("rejects PayHere webhooks with an invalid signature and keeps the booking pending", async () => {
    const token = await signupAndReturnToken("payhere-invalid-signature@example.com");
    const checkout = await createPayHerePendingBooking(token, 1);

    assert.equal(checkout.status, 201);

    const invalidPayload = new URLSearchParams({
      merchant_id: process.env.PAYHERE_MERCHANT_ID!,
      order_id: checkout.body.booking.bookingNumber as string,
      payment_id: "PH-BAD-SIG-001",
      payhere_amount: Number(checkout.body.booking.subtotal).toFixed(2),
      payhere_currency: process.env.PAYHERE_CURRENCY ?? "LKR",
      status_code: "2",
      md5sig: "INVALID",
      status_message: "Sandbox payment captured",
      method: "VISA",
    }).toString();

    const response = await fetch(`${baseUrl}/api/payments/payhere/notify`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: invalidPayload,
    });

    const raw = await response.text();
    const body = raw ? JSON.parse(raw) : null;

    assert.equal(response.status, 400);
    assert.equal(body.errorCode, "PAYHERE_SIGNATURE_INVALID");

    const booking = await BookingModel.findOne({
      bookingNumber: checkout.body.booking.bookingNumber,
    }).lean();

    assert.equal(booking?.status, "pending");
    assert.equal(booking?.paymentStatus, "pending");

    const slotInventory = await SlotInventoryModel.findOne({
      serviceId: fixture.serviceId,
      startsAt: fixture.futureStartsAt,
    }).lean();

    assert.equal(slotInventory?.reservedCount, 1);
    assert.equal(slotInventory?.bookedCount, 0);
  });
});

async function signupAndReturnToken(email: string): Promise<string> {
  const signup = await apiRequest("/api/auth/signup", {
    body: {
      name: "Integration User",
      email,
      password: "Password123!",
    },
  });

  assert.equal(signup.status, 201);
  return signup.body.token as string;
}

async function createConfirmedBooking(token: string, quantity: number): Promise<string> {
  const addToCart = await apiRequest("/api/cart/items", {
    token,
    body: {
      serviceId: fixture.serviceId,
      scheduledAt: fixture.futureStartsAt.toISOString(),
      quantity,
    },
  });

  assert.equal(addToCart.status, 201);

  const checkout = await apiRequest("/api/bookings/checkout", {
    token,
    body: {
      paymentMethod: "cash",
    },
  });

  assert.equal(checkout.status, 201);
  return checkout.body.booking.id as string;
}

async function createPayHerePendingBooking(token: string, quantity: number) {
  const addToCart = await apiRequest("/api/cart/items", {
    token,
    body: {
      serviceId: fixture.serviceId,
      scheduledAt: fixture.futureStartsAt.toISOString(),
      quantity,
    },
  });

  assert.equal(addToCart.status, 201);

  return apiRequest("/api/bookings/checkout", {
    token,
    body: {
      paymentMethod: "payhere",
      billingDetails: {
        fullName: "PayHere Test User",
        phone: "0771234567",
        address: "123 Galle Road",
        city: "Colombo",
        country: "Sri Lanka",
      },
    },
  });
}

async function payHereNotifyRequest(
  bookingNumber: string,
  amount: string,
  statusCode: number,
  overrides: {
    paymentId: string;
    statusMessage?: string;
    method?: string;
  },
) {
  const merchantId = process.env.PAYHERE_MERCHANT_ID!;
  const currency = process.env.PAYHERE_CURRENCY ?? "LKR";
  const payload = new URLSearchParams({
    merchant_id: merchantId,
    order_id: bookingNumber,
    payment_id: overrides.paymentId,
    payhere_amount: amount,
    payhere_currency: currency,
    status_code: String(statusCode),
    md5sig: createPayHereMd5Sig(merchantId, bookingNumber, amount, currency, String(statusCode)),
    status_message: overrides.statusMessage ?? "",
    method: overrides.method ?? "",
  }).toString();

  const response = await fetch(`${baseUrl}/api/payments/payhere/notify`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : null;

  return {
    status: response.status,
    body,
  };
}

function createPayHereMd5Sig(
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  statusCode: string,
): string {
  const secretHash = createHash("md5")
    .update(process.env.PAYHERE_MERCHANT_SECRET!, "utf8")
    .digest("hex")
    .toUpperCase();

  return createHash("md5")
    .update(`${merchantId}${orderId}${amount}${currency}${statusCode}${secretHash}`, "utf8")
    .digest("hex")
    .toUpperCase();
}

async function apiRequest(path: string, options: ApiRequestOptions = {}) {
  const headers: Record<string, string> = {};

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : null;

  return {
    status: response.status,
    body,
  };
}
