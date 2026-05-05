import { Types } from "mongoose";

import { env } from "../config/env";
import type { BookingStatus, PaymentMethod, PaymentStatus } from "../constants/booking";
import { AppError } from "../errors/app-error";
import type { BookingDocument } from "../models/booking.model";
import {
  countActiveBookedUnitsForDay,
  createBooking,
  findBookingById,
  findBookingByIdForUser,
  findBookingByNumber,
  findBookingByPayHereCheckoutTokenDigest,
  findExpiredPendingPayHereBookings,
  findBookingsByUserId,
} from "../repositories/booking.repository";
import { findCartByUserId } from "../repositories/cart.repository";
import { findUserById } from "../repositories/user.repository";
import { cleanupExpiredHolds, confirmReservedSlotOrThrow, releaseBookedSlotOrThrow, releaseReservedSlotOrThrow } from "./capacity.service";
import { serializeBooking } from "../utils/serializers";
import { createBookingNumber, getUtcDayBounds, subtractHours } from "../utils/date";
import {
  type PayHereCustomerDetails,
  assertPayHereConfigured,
  checkoutInputDigest,
  createPayHereCancelUrl,
  createPayHereCheckoutPagePayload,
  createPayHereCheckoutToken,
  createPayHereCheckoutUrl,
  createPayHereReturnUrl,
  parseAndVerifyPayHereNotification,
  renderPayHereAutoSubmitPage,
} from "./payhere.service";
import { withIdempotencyLock } from "./cache.service";

type CheckoutInput = {
  paymentMethod: PaymentMethod;
  simulatePaymentSuccess?: boolean;
  billingDetails?: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    country: string;
  };
};

type CompleteBookingInput = {
  note?: string;
};

export async function checkout(userId: string, input: CheckoutInput, publicBaseUrl: string) {
  await cleanupExpiredHolds(userId);
  await cleanupExpiredPayHereBookings(userId);

  const cart = await findCartByUserId(new Types.ObjectId(userId));
  const user = await findUserById(new Types.ObjectId(userId));

  if (!cart || cart.items.length === 0) {
    throw new AppError(400, "Your cart is empty", "CART_EMPTY");
  }

  if (!user) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  await enforceDailyBookingCap(userId, cart.items.map((item) => ({
    scheduledAt: item.scheduledAt,
    quantity: item.quantity,
  })));

  const now = new Date();
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const earliestSlot = cart.items.reduce(
    (earliest, item) =>
      item.scheduledAt.getTime() < earliest.getTime() ? item.scheduledAt : earliest,
    cart.items[0].scheduledAt,
  );

  const initialStatus: BookingStatus = input.paymentMethod === "mock_card" ? "pending" : "confirmed";
  const initialPaymentStatus: PaymentStatus =
    input.paymentMethod === "mock_card" ? "pending" : "unpaid";
  const itemTitle =
    cart.items.length === 1
      ? cart.items[0].title
      : `${cart.items.length} MenteCart services`;
  const customer = buildBookingCustomer(input, user.email);

  let payhere:
    | {
        checkoutToken: string;
        checkoutTokenDigest: string;
        checkoutExpiresAt: Date;
      }
    | undefined;

  if (input.paymentMethod === "payhere") {
    assertPayHereConfigured();
    const checkoutToken = createPayHereCheckoutToken();
    payhere = {
      checkoutToken,
      checkoutTokenDigest: checkoutInputDigest(checkoutToken),
      checkoutExpiresAt: new Date(Date.now() + env.slotHoldMinutes * 60_000),
    };
  }

  const resolvedInitialStatus: BookingStatus =
    input.paymentMethod === "mock_card" || input.paymentMethod === "payhere"
      ? "pending"
      : initialStatus;
  const resolvedInitialPaymentStatus: PaymentStatus =
    input.paymentMethod === "mock_card" || input.paymentMethod === "payhere"
      ? "pending"
      : initialPaymentStatus;

  const booking = await createBooking({
    bookingNumber: createBookingNumber(),
    userId: new Types.ObjectId(userId),
    items: cart.items.map((item) => ({
      serviceId: item.serviceId,
      title: item.title,
      category: item.category,
      imageUrl: item.imageUrl,
      price: item.price,
      durationMinutes: item.durationMinutes,
      scheduledAt: item.scheduledAt,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    itemCount,
    subtotal,
    customer,
    status: resolvedInitialStatus,
    paymentMethod: input.paymentMethod,
    paymentStatus: resolvedInitialPaymentStatus,
    cancelBy: subtractHours(earliestSlot, env.cancellationCutoffHours),
    confirmedAt: resolvedInitialStatus === "confirmed" ? now : undefined,
    payhere,
    auditLog: [
      {
        status: resolvedInitialStatus,
        changedAt: now,
        note:
          input.paymentMethod === "mock_card"
            ? "Booking created pending mock card payment"
            : input.paymentMethod === "payhere"
              ? "Booking created pending PayHere confirmation"
            : "Booking confirmed for offline payment",
      },
    ],
  });

  if (input.paymentMethod === "payhere") {
    cart.items.splice(0, cart.items.length);
    await Promise.all([cart.save(), booking.save()]);

    return {
      booking: serializeBooking(booking),
      payment: {
        provider: "payhere",
        checkoutUrl: createPayHereCheckoutUrl(publicBaseUrl, payhere!.checkoutToken),
        expiresAt: payhere!.checkoutExpiresAt.toISOString(),
        itemTitle,
      },
    };
  }

  if (input.paymentMethod === "mock_card") {
    const simulateSuccess = input.simulatePaymentSuccess ?? true;

    if (simulateSuccess) {
      for (const item of cart.items) {
        await confirmReservedSlotOrThrow(
          new Types.ObjectId(item.serviceId.toString()),
          item.scheduledAt,
          item.quantity,
        );
      }

      booking.status = "confirmed";
      booking.paymentStatus = "paid";
      booking.confirmedAt = new Date();
      booking.auditLog.push({
        status: "confirmed",
        changedAt: new Date(),
        note: "Mock card payment succeeded",
      });
    } else {
      for (const item of cart.items) {
        await releaseReservedSlotOrThrow(
          new Types.ObjectId(item.serviceId.toString()),
          item.scheduledAt,
          item.quantity,
        );
      }

      booking.status = "failed";
      booking.paymentStatus = "failed";
      booking.failedAt = new Date();
      booking.auditLog.push({
        status: "failed",
        changedAt: new Date(),
        note: "Mock card payment failed and capacity was released",
      });
    }
  } else {
    for (const item of cart.items) {
      await confirmReservedSlotOrThrow(
        new Types.ObjectId(item.serviceId.toString()),
        item.scheduledAt,
        item.quantity,
      );
    }
  }

  cart.items.splice(0, cart.items.length);
  await Promise.all([cart.save(), booking.save()]);

  return {
    booking: serializeBooking(booking),
    payment: null,
  };
}

export async function getBookings(userId: string) {
  await cleanupExpiredPayHereBookings(userId);
  const bookings = await findBookingsByUserId(new Types.ObjectId(userId));
  return bookings.map(serializeBooking);
}

export async function getBooking(userId: string, bookingId: string) {
  await cleanupExpiredPayHereBookings(userId);
  const booking = await findBookingByIdForUser(new Types.ObjectId(bookingId), new Types.ObjectId(userId));

  if (!booking) {
    throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
  }

  return serializeBooking(booking);
}

export async function cancelBooking(userId: string, bookingId: string) {
  const booking = await findBookingByIdForUser(new Types.ObjectId(bookingId), new Types.ObjectId(userId));

  if (!booking) {
    throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
  }

  if (!["pending", "confirmed"].includes(booking.status)) {
    throw new AppError(409, "Only pending or confirmed bookings can be cancelled", "CANNOT_CANCEL_BOOKING");
  }

  if (booking.cancelBy.getTime() < Date.now()) {
    throw new AppError(409, "Cancellation cutoff has passed", "CANCELLATION_CUTOFF_PASSED");
  }

  if (booking.paymentMethod === "payhere" && booking.status === "pending") {
    throw new AppError(
      409,
      "PayHere payments must finish or fail before the booking can be cancelled",
      "PAYHERE_PAYMENT_PENDING",
    );
  }

  if (booking.status === "pending") {
    for (const item of booking.items) {
      await releaseReservedSlotOrThrow(
        new Types.ObjectId(item.serviceId.toString()),
        item.scheduledAt,
        item.quantity,
      );
    }
  }

  if (booking.status === "confirmed") {
    for (const item of booking.items) {
      await releaseBookedSlotOrThrow(
        new Types.ObjectId(item.serviceId.toString()),
        item.scheduledAt,
        item.quantity,
      );
    }
  }

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.auditLog.push({
    status: "cancelled",
    changedAt: new Date(),
    note: "Booking cancelled by user",
  });

  await booking.save();

  return serializeBooking(booking);
}

export async function completeBookingAsAdmin(bookingId: string, input: CompleteBookingInput) {
  const booking = await findBookingById(new Types.ObjectId(bookingId));

  if (!booking) {
    throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
  }

  if (booking.status !== "confirmed") {
    throw new AppError(
      409,
      "Only confirmed bookings can be marked as completed",
      "BOOKING_CANNOT_BE_COMPLETED",
    );
  }

  const latestServiceEnd = booking.items.reduce((latest, item) => {
    const endsAt = new Date(item.scheduledAt.getTime() + item.durationMinutes * 60_000);
    return endsAt.getTime() > latest.getTime() ? endsAt : latest;
  }, booking.items[0].scheduledAt);

  if (latestServiceEnd.getTime() > Date.now()) {
    throw new AppError(
      409,
      "Booking cannot be completed before the scheduled service window has ended",
      "BOOKING_NOT_READY_TO_COMPLETE",
    );
  }

  booking.status = "completed";
  booking.completedAt = new Date();
  booking.auditLog.push({
    status: "completed",
    changedAt: new Date(),
    note: input.note?.trim() || "Booking marked as completed by admin",
  });

  await booking.save();

  return serializeBooking(booking);
}

export async function getPayHereCheckoutPageHtml(checkoutToken: string, publicBaseUrl: string) {
  const booking = await findBookingByPayHereCheckoutTokenDigest(checkoutInputDigest(checkoutToken));

  if (!booking || booking.paymentMethod !== "payhere" || !booking.payhere?.checkoutTokenDigest) {
    throw new AppError(404, "PayHere checkout session not found", "PAYHERE_CHECKOUT_NOT_FOUND");
  }

  if (booking.status !== "pending" || booking.paymentStatus !== "pending") {
    throw new AppError(409, "This PayHere checkout session is no longer active", "PAYHERE_CHECKOUT_INACTIVE");
  }

  if (!booking.payhere.checkoutExpiresAt || booking.payhere.checkoutExpiresAt.getTime() <= Date.now()) {
    await expirePendingPayHereBooking(booking, "PayHere checkout session expired before payment started");
    throw new AppError(409, "This PayHere checkout session has expired", "PAYHERE_CHECKOUT_EXPIRED");
  }

  const payload = createPayHereCheckoutPagePayload({
    bookingNumber: booking.bookingNumber,
    subtotal: booking.subtotal,
    itemTitle:
      booking.items.length === 1
        ? booking.items[0].title
        : `${booking.items.length} MenteCart services`,
    customer: normalizePayHereCustomer(booking.customer),
    returnUrl: createPayHereReturnUrl(publicBaseUrl, booking.bookingNumber),
    cancelUrl: createPayHereCancelUrl(publicBaseUrl, booking.bookingNumber),
    custom1: booking._id.toString(),
    custom2: booking.payhere.checkoutTokenDigest,
  });

  return renderPayHereAutoSubmitPage(payload);
}

export async function handlePayHereNotification(rawBody: string): Promise<{
  booking: ReturnType<typeof serializeBooking>;
  duplicate: boolean;
}> {
  const notification = parseAndVerifyPayHereNotification(rawBody);

  const processed = await withIdempotencyLock(
    `payhere:webhook:${notification.orderId}`,
    15_000,
    async () => processPayHereNotification(notification),
  );

  if (!processed) {
    const booking = await findBookingByNumber(notification.orderId);

    if (!booking) {
      throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
    }

    return {
      booking: serializeBooking(booking),
      duplicate: true,
    };
  }

  return processed;
}

export async function cleanupExpiredPayHereBookings(userId?: string): Promise<void> {
  const now = new Date();
  const bookings = await findExpiredPendingPayHereBookings(now);

  for (const booking of bookings) {
    if (userId && booking.userId.toString() !== userId) {
      continue;
    }

    await expirePendingPayHereBooking(booking, "PayHere payment window expired and reserved capacity was released");
  }
}

async function enforceDailyBookingCap(
  userId: string,
  items: Array<{ scheduledAt: Date; quantity: number }>,
): Promise<void> {
  const requestedByDay = new Map<string, number>();

  for (const item of items) {
    const key = item.scheduledAt.toISOString().slice(0, 10);
    requestedByDay.set(key, (requestedByDay.get(key) ?? 0) + item.quantity);
  }

  for (const [key, quantity] of requestedByDay.entries()) {
    const date = new Date(`${key}T00:00:00.000Z`);
    const bounds = getUtcDayBounds(date);
    const existingQuantity = await countActiveBookedUnitsForDay(
      new Types.ObjectId(userId),
      bounds.start,
      bounds.end,
    );

    if (existingQuantity + quantity > env.maxBookingsPerDay) {
      throw new AppError(
        409,
        `Daily booking limit exceeded for ${key}. Limit is ${env.maxBookingsPerDay}.`,
        "DAILY_BOOKING_LIMIT_EXCEEDED",
      );
    }
  }
}

async function processPayHereNotification(notification: ReturnType<typeof parseAndVerifyPayHereNotification>) {
  const booking = await findBookingByNumber(notification.orderId);

  if (!booking) {
    throw new AppError(404, "Booking not found", "BOOKING_NOT_FOUND");
  }

  if (booking.paymentMethod !== "payhere") {
    throw new AppError(409, "Booking is not linked to PayHere", "PAYHERE_BOOKING_MISMATCH");
  }

  const alreadyProcessed =
    booking.payhere?.paymentId === notification.paymentId &&
    booking.payhere?.statusCode === notification.statusCode &&
    booking.payhere?.rawBodyHash === notification.rawBodyHash;

  if (alreadyProcessed) {
    return {
      booking: serializeBooking(booking),
      duplicate: true,
    };
  }

  booking.payhere = {
    ...booking.payhere,
    statusCode: notification.statusCode,
    statusMessage: notification.statusMessage ?? undefined,
    method: notification.method ?? undefined,
    md5sig: notification.md5sig,
    rawBodyHash: notification.rawBodyHash,
    lastNotifiedAt: new Date(),
    paymentId: notification.paymentId,
  };

  if (notification.statusCode === 2) {
    if (booking.status === "confirmed" && booking.paymentStatus === "paid") {
      await booking.save();
      return {
        booking: serializeBooking(booking),
        duplicate: true,
      };
    }

    if (booking.status === "pending") {
      for (const item of booking.items) {
        await confirmReservedSlotOrThrow(
          new Types.ObjectId(item.serviceId.toString()),
          item.scheduledAt,
          item.quantity,
        );
      }

      booking.status = "confirmed";
      booking.paymentStatus = "paid";
      booking.confirmedAt = new Date();
      booking.payhere = {
        ...booking.payhere,
        checkoutToken: undefined,
        checkoutTokenDigest: undefined,
      };
      booking.auditLog.push({
        status: "confirmed",
        changedAt: new Date(),
        note: "PayHere payment verified and booking confirmed",
      });
    }

    await booking.save();

    return {
      booking: serializeBooking(booking),
      duplicate: false,
    };
  }

  if (booking.status === "pending") {
    await expirePendingPayHereBooking(
      booking,
      notification.statusMessage ?? "PayHere reported that payment did not complete",
      notification,
    );
  } else {
    await booking.save();
  }

  return {
    booking: serializeBooking(booking),
    duplicate: false,
  };
}

async function expirePendingPayHereBooking(
  booking: BookingDocument,
  note: string,
  notification?: ReturnType<typeof parseAndVerifyPayHereNotification>,
): Promise<void> {
  if (booking.status !== "pending") {
    if (notification) {
      booking.payhere = {
        ...booking.payhere,
        statusCode: notification.statusCode,
        statusMessage: notification.statusMessage ?? undefined,
        method: notification.method ?? undefined,
        md5sig: notification.md5sig,
        rawBodyHash: notification.rawBodyHash,
        lastNotifiedAt: new Date(),
        paymentId: notification.paymentId,
      };
      await booking.save();
    }
    return;
  }

  for (const item of booking.items) {
    await releaseReservedSlotOrThrow(
      new Types.ObjectId(item.serviceId.toString()),
      item.scheduledAt,
      item.quantity,
    );
  }

  booking.status = "failed";
  booking.paymentStatus = "failed";
  booking.failedAt = new Date();
  booking.payhere = {
    ...booking.payhere,
    checkoutToken: undefined,
    checkoutTokenDigest: undefined,
    statusCode: notification?.statusCode ?? booking.payhere?.statusCode,
    statusMessage: notification?.statusMessage ?? note,
    method: notification?.method ?? booking.payhere?.method,
    md5sig: notification?.md5sig ?? booking.payhere?.md5sig,
    rawBodyHash: notification?.rawBodyHash ?? booking.payhere?.rawBodyHash,
    lastNotifiedAt: notification ? new Date() : booking.payhere?.lastNotifiedAt,
    paymentId: notification?.paymentId ?? booking.payhere?.paymentId,
  };
  booking.auditLog.push({
    status: "failed",
    changedAt: new Date(),
    note,
  });

  await booking.save();
}

function buildBookingCustomer(
  input: CheckoutInput,
  email: string,
): {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
} {
  const fullName = input.billingDetails?.fullName?.trim() || "MenteCart Customer";

  return {
    fullName,
    email,
    phone: input.billingDetails?.phone?.trim() || undefined,
    address: input.billingDetails?.address?.trim() || undefined,
    city: input.billingDetails?.city?.trim() || undefined,
    country: input.billingDetails?.country?.trim() || undefined,
  };
}

function normalizePayHereCustomer(customer: {
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}): PayHereCustomerDetails {
  return {
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    city: customer.city ?? "",
    country: customer.country ?? "Sri Lanka",
  };
}
