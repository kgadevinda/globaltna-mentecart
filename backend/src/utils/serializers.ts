import type { BookingDocument } from "../models/booking.model";
import type { CartDocument } from "../models/cart.model";
import type { ServiceDocument } from "../models/service.model";
import type { UserDocument } from "../models/user.model";

type SlotShape = {
  startsAt: Date;
  capacity: number;
  reservedCount: number;
  bookedCount: number;
};

export function serializeUser(
  user: Pick<UserDocument, "_id" | "name" | "email" | "bookingCapPerDay" | "role">,
) {
  return {
    id: user._id.toString(),
    name: user.name ?? null,
    email: user.email,
    bookingCapPerDay: user.bookingCapPerDay,
    role: user.role ?? "customer",
  };
}

export function serializeServiceSummary(service: ServiceDocument) {
  return {
    id: service._id.toString(),
    title: service.title,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
    category: service.category,
    imageUrl: service.imageUrl,
    slotCapacity: service.slotCapacity,
  };
}

export function serializeServiceDetail(service: ServiceDocument, slots: SlotShape[]) {
  return {
    ...serializeServiceSummary(service),
    slots: slots.map((slot) => ({
      startsAt: slot.startsAt.toISOString(),
      capacity: slot.capacity,
      reservedCount: slot.reservedCount,
      bookedCount: slot.bookedCount,
      remainingCapacity: Math.max(slot.capacity - slot.reservedCount - slot.bookedCount, 0),
    })),
  };
}

export function serializeCart(cart: CartDocument | null) {
  const items = cart?.items ?? [];

  return {
    id: cart?._id.toString() ?? null,
    items: items.map((item) => ({
      id: item._id.toString(),
      serviceId: item.serviceId.toString(),
      title: item.title,
      category: item.category,
      imageUrl: item.imageUrl,
      price: item.price,
      durationMinutes: item.durationMinutes,
      scheduledAt: item.scheduledAt.toISOString(),
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      holdExpiresAt: item.holdExpiresAt.toISOString(),
    })),
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.lineTotal, 0),
  };
}

export function serializeBooking(booking: BookingDocument) {
  return {
    id: booking._id.toString(),
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    subtotal: booking.subtotal,
    itemCount: booking.itemCount,
    cancelBy: booking.cancelBy.toISOString(),
    confirmedAt: booking.confirmedAt?.toISOString() ?? null,
    completedAt: booking.completedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    failedAt: booking.failedAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    items: booking.items.map((item) => ({
      serviceId: item.serviceId.toString(),
      title: item.title,
      category: item.category,
      imageUrl: item.imageUrl,
      price: item.price,
      durationMinutes: item.durationMinutes,
      scheduledAt: item.scheduledAt.toISOString(),
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    auditLog: booking.auditLog.map((entry) => ({
      status: entry.status,
      changedAt: entry.changedAt.toISOString(),
      note: entry.note ?? null,
    })),
  };
}
