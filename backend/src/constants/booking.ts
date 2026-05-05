export const bookingStatuses = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "failed",
] as const;

export const paymentMethods = ["cash", "pay_on_arrival", "mock_card", "payhere"] as const;

export const paymentStatuses = ["pending", "paid", "unpaid", "failed"] as const;

export type BookingStatus = (typeof bookingStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
