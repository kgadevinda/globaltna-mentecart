import { Types } from "mongoose";

import { AppError } from "../errors/app-error";
import type { CartDocument } from "../models/cart.model";
import { findCartsWithExpiredItems, findCartByUserId } from "../repositories/cart.repository";
import {
  confirmReservedSlotCapacity,
  findSlotInventory,
  releaseBookedSlotCapacity,
  releaseReservedSlotCapacity,
  reserveSlotCapacity,
} from "../repositories/slot-inventory.repository";

export async function cleanupExpiredHolds(userId?: string): Promise<void> {
  const now = new Date();
  const carts: CartDocument[] = [];

  if (userId) {
    const cart = await findCartByUserId(new Types.ObjectId(userId));
    if (cart) {
      carts.push(cart);
    }
  } else {
    carts.push(...(await findCartsWithExpiredItems(now)));
  }

  for (const cart of carts) {
    const expiredItems = cart.items.filter((item) => item.holdExpiresAt.getTime() <= now.getTime());

    if (!expiredItems.length) {
      continue;
    }

    for (const item of expiredItems) {
      await releaseReservedSlotCapacity(
        new Types.ObjectId(item.serviceId.toString()),
        item.scheduledAt,
        item.quantity,
      );
    }

    cart.items = cart.items.filter((item) => item.holdExpiresAt.getTime() > now.getTime()) as typeof cart.items;
    await cart.save();
  }
}

export async function ensureSlotExists(serviceId: Types.ObjectId, startsAt: Date): Promise<void> {
  const slot = await findSlotInventory(serviceId, startsAt);

  if (!slot) {
    throw new AppError(404, "Selected slot does not exist", "SLOT_NOT_FOUND");
  }
}

export async function reserveSlotOrThrow(
  serviceId: Types.ObjectId,
  startsAt: Date,
  quantity: number,
): Promise<void> {
  const slot = await reserveSlotCapacity(serviceId, startsAt, quantity);

  if (!slot) {
    throw new AppError(409, "This slot no longer has enough capacity", "SLOT_CAPACITY_FULL");
  }
}

export async function releaseReservedSlotOrThrow(
  serviceId: Types.ObjectId,
  startsAt: Date,
  quantity: number,
): Promise<void> {
  const slot = await releaseReservedSlotCapacity(serviceId, startsAt, quantity);

  if (!slot) {
    throw new AppError(409, "Unable to release reserved slot capacity", "SLOT_RELEASE_FAILED");
  }
}

export async function confirmReservedSlotOrThrow(
  serviceId: Types.ObjectId,
  startsAt: Date,
  quantity: number,
): Promise<void> {
  const slot = await confirmReservedSlotCapacity(serviceId, startsAt, quantity);

  if (!slot) {
    throw new AppError(409, "Unable to confirm reserved slot capacity", "SLOT_CONFIRM_FAILED");
  }
}

export async function releaseBookedSlotOrThrow(
  serviceId: Types.ObjectId,
  startsAt: Date,
  quantity: number,
): Promise<void> {
  const slot = await releaseBookedSlotCapacity(serviceId, startsAt, quantity);

  if (!slot) {
    throw new AppError(409, "Unable to release booked slot capacity", "BOOKING_RELEASE_FAILED");
  }
}
