import { Types } from "mongoose";

import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { findCartByUserId, findOrCreateCart } from "../repositories/cart.repository";
import { findServiceById } from "../repositories/service.repository";
import { serializeCart } from "../utils/serializers";
import { addMinutes } from "../utils/date";
import { cleanupExpiredHolds, ensureSlotExists, releaseReservedSlotOrThrow, reserveSlotOrThrow } from "./capacity.service";

type CartItemInput = {
  serviceId: string;
  scheduledAt: Date;
  quantity: number;
};

type UpdateCartItemInput = {
  scheduledAt?: Date;
  quantity?: number;
};

export async function getCart(userId: string) {
  await cleanupExpiredHolds(userId);

  const cart = await findCartByUserId(new Types.ObjectId(userId));
  return serializeCart(cart);
}

export async function addCartItem(userId: string, input: CartItemInput) {
  await cleanupExpiredHolds(userId);

  const service = await findServiceById(new Types.ObjectId(input.serviceId));

  if (!service) {
    throw new AppError(404, "Service not found", "SERVICE_NOT_FOUND");
  }

  const cart = await findOrCreateCart(new Types.ObjectId(userId));
  const serviceObjectId = new Types.ObjectId(input.serviceId);
  await ensureSlotExists(serviceObjectId, input.scheduledAt);

  const duplicateItem = cart.items.find(
    (item) =>
      item.serviceId.toString() === input.serviceId &&
      item.scheduledAt.getTime() === input.scheduledAt.getTime(),
  );

  const holdExpiresAt = addMinutes(new Date(), env.slotHoldMinutes);

  if (duplicateItem) {
    await reserveSlotOrThrow(serviceObjectId, input.scheduledAt, input.quantity);
    duplicateItem.quantity += input.quantity;
    duplicateItem.lineTotal = duplicateItem.price * duplicateItem.quantity;
    duplicateItem.holdExpiresAt = holdExpiresAt;
  } else {
    await reserveSlotOrThrow(serviceObjectId, input.scheduledAt, input.quantity);
    cart.items.push({
      serviceId: service._id,
      title: service.title,
      category: service.category,
      imageUrl: service.imageUrl,
      price: service.price,
      durationMinutes: service.durationMinutes,
      scheduledAt: input.scheduledAt,
      quantity: input.quantity,
      lineTotal: service.price * input.quantity,
      holdExpiresAt,
    } as never);
  }

  await cart.save();

  return serializeCart(cart);
}

export async function updateCartItem(userId: string, itemId: string, input: UpdateCartItemInput) {
  await cleanupExpiredHolds(userId);

  const cart = await findCartByUserId(new Types.ObjectId(userId));

  if (!cart) {
    throw new AppError(404, "Cart not found", "CART_NOT_FOUND");
  }

  const item = cart.items.id(itemId);

  if (!item) {
    throw new AppError(404, "Cart item not found", "CART_ITEM_NOT_FOUND");
  }

  const nextScheduledAt = input.scheduledAt ?? item.scheduledAt;
  const nextQuantity = input.quantity ?? item.quantity;
  const previousScheduledAt = item.scheduledAt;
  const previousQuantity = item.quantity;
  const serviceId = new Types.ObjectId(item.serviceId.toString());

  await ensureSlotExists(serviceId, nextScheduledAt);

  if (nextScheduledAt.getTime() !== previousScheduledAt.getTime()) {
    await reserveSlotOrThrow(serviceId, nextScheduledAt, nextQuantity);
    await releaseReservedSlotOrThrow(serviceId, previousScheduledAt, previousQuantity);
    item.scheduledAt = nextScheduledAt;
    item.quantity = nextQuantity;
  } else if (nextQuantity > previousQuantity) {
    await reserveSlotOrThrow(serviceId, nextScheduledAt, nextQuantity - previousQuantity);
    item.quantity = nextQuantity;
  } else if (nextQuantity < previousQuantity) {
    await releaseReservedSlotOrThrow(serviceId, nextScheduledAt, previousQuantity - nextQuantity);
    item.quantity = nextQuantity;
  }

  item.lineTotal = item.price * item.quantity;
  item.holdExpiresAt = addMinutes(new Date(), env.slotHoldMinutes);
  await cart.save();

  return serializeCart(cart);
}

export async function removeCartItem(userId: string, itemId: string) {
  await cleanupExpiredHolds(userId);

  const cart = await findCartByUserId(new Types.ObjectId(userId));

  if (!cart) {
    throw new AppError(404, "Cart not found", "CART_NOT_FOUND");
  }

  const item = cart.items.id(itemId);

  if (!item) {
    throw new AppError(404, "Cart item not found", "CART_ITEM_NOT_FOUND");
  }

  await releaseReservedSlotOrThrow(
    new Types.ObjectId(item.serviceId.toString()),
    item.scheduledAt,
    item.quantity,
  );

  item.deleteOne();
  await cart.save();

  return serializeCart(cart);
}
