import { Types } from "mongoose";

import { SlotInventoryModel, type SlotInventoryDocument } from "../models/slot-inventory.model";

export async function listSlotInventoryForService(
  serviceId: Types.ObjectId,
): Promise<SlotInventoryDocument[]> {
  return SlotInventoryModel.find({ serviceId }).sort({ startsAt: 1 }).exec();
}

export async function findSlotInventory(
  serviceId: Types.ObjectId,
  startsAt: Date,
): Promise<SlotInventoryDocument | null> {
  return SlotInventoryModel.findOne({ serviceId, startsAt }).exec();
}

export async function reserveSlotCapacity(
  serviceId: Types.ObjectId,
  startsAt: Date,
  quantity: number,
): Promise<SlotInventoryDocument | null> {
  return SlotInventoryModel.findOneAndUpdate(
    {
      serviceId,
      startsAt,
      $expr: {
        $lte: [{ $add: ["$reservedCount", "$bookedCount", quantity] }, "$capacity"],
      },
    },
    {
      $inc: { reservedCount: quantity },
    },
    { returnDocument: "after" },
  ).exec();
}

export async function releaseReservedSlotCapacity(
  serviceId: Types.ObjectId,
  startsAt: Date,
  quantity: number,
): Promise<SlotInventoryDocument | null> {
  return SlotInventoryModel.findOneAndUpdate(
    {
      serviceId,
      startsAt,
      reservedCount: { $gte: quantity },
    },
    {
      $inc: { reservedCount: -quantity },
    },
    { returnDocument: "after" },
  ).exec();
}

export async function confirmReservedSlotCapacity(
  serviceId: Types.ObjectId,
  startsAt: Date,
  quantity: number,
): Promise<SlotInventoryDocument | null> {
  return SlotInventoryModel.findOneAndUpdate(
    {
      serviceId,
      startsAt,
      reservedCount: { $gte: quantity },
    },
    {
      $inc: { reservedCount: -quantity, bookedCount: quantity },
    },
    { returnDocument: "after" },
  ).exec();
}

export async function releaseBookedSlotCapacity(
  serviceId: Types.ObjectId,
  startsAt: Date,
  quantity: number,
): Promise<SlotInventoryDocument | null> {
  return SlotInventoryModel.findOneAndUpdate(
    {
      serviceId,
      startsAt,
      bookedCount: { $gte: quantity },
    },
    {
      $inc: { bookedCount: -quantity },
    },
    { returnDocument: "after" },
  ).exec();
}

export async function insertSlotInventory(
  slots: Array<{
    serviceId: Types.ObjectId;
    startsAt: Date;
    capacity: number;
    reservedCount?: number;
    bookedCount?: number;
  }>,
): Promise<void> {
  await SlotInventoryModel.insertMany(slots);
}
