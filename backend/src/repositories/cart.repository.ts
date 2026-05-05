import { Types } from "mongoose";

import { CartModel, type CartDocument } from "../models/cart.model";

export async function findCartByUserId(userId: Types.ObjectId): Promise<CartDocument | null> {
  return CartModel.findOne({ userId }).exec();
}

export async function findOrCreateCart(userId: Types.ObjectId): Promise<CartDocument> {
  const cart = await CartModel.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after" },
  ).exec();

  return cart;
}

export async function findCartsWithExpiredItems(now: Date): Promise<CartDocument[]> {
  return CartModel.find({ "items.holdExpiresAt": { $lte: now } }).exec();
}
