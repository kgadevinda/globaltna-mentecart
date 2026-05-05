import { Types } from "mongoose";

import { BookingModel, type BookingDocument } from "../models/booking.model";

export async function createBooking(
  data: Record<string, unknown>,
): Promise<BookingDocument> {
  return BookingModel.create(data);
}

export async function findBookingsByUserId(userId: Types.ObjectId): Promise<BookingDocument[]> {
  return BookingModel.find({ userId }).sort({ createdAt: -1 }).exec();
}

export async function findBookingByIdForUser(
  bookingId: Types.ObjectId,
  userId: Types.ObjectId,
): Promise<BookingDocument | null> {
  return BookingModel.findOne({ _id: bookingId, userId }).exec();
}

export async function findBookingById(bookingId: Types.ObjectId): Promise<BookingDocument | null> {
  return BookingModel.findById(bookingId).exec();
}

export async function findBookingByNumber(bookingNumber: string): Promise<BookingDocument | null> {
  return BookingModel.findOne({ bookingNumber }).exec();
}

export async function findBookingByPayHereCheckoutTokenDigest(
  checkoutTokenDigest: string,
): Promise<BookingDocument | null> {
  return BookingModel.findOne({ "payhere.checkoutTokenDigest": checkoutTokenDigest }).exec();
}

export async function findExpiredPendingPayHereBookings(now: Date): Promise<BookingDocument[]> {
  return BookingModel.find({
    paymentMethod: "payhere",
    status: "pending",
    paymentStatus: "pending",
    "payhere.checkoutExpiresAt": { $lte: now },
  }).exec();
}

export async function countActiveBookedUnitsForDay(
  userId: Types.ObjectId,
  startsAt: Date,
  endsAt: Date,
): Promise<number> {
  const results = await BookingModel.aggregate<{ totalQuantity: number }>([
    {
      $match: {
        userId,
        status: { $in: ["pending", "confirmed", "completed"] },
      },
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.scheduledAt": {
          $gte: startsAt,
          $lte: endsAt,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: "$items.quantity" },
      },
    },
  ]).exec();

  return results[0]?.totalQuantity ?? 0;
}
