import { model, Schema, Types, type HydratedDocument, type InferSchemaType } from "mongoose";

import { bookingStatuses, paymentMethods, paymentStatuses } from "../constants/booking";

const bookingItemSchema = new Schema(
  {
    serviceId: {
      type: Types.ObjectId,
      ref: "Service",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const auditLogSchema = new Schema(
  {
    status: {
      type: String,
      enum: bookingStatuses,
      required: true,
    },
    changedAt: {
      type: Date,
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const bookingCustomerSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const payHereMetadataSchema = new Schema(
  {
    checkoutToken: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    checkoutTokenDigest: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    checkoutExpiresAt: Date,
    paymentId: {
      type: String,
      trim: true,
    },
    statusCode: Number,
    statusMessage: {
      type: String,
      trim: true,
    },
    method: {
      type: String,
      trim: true,
    },
    md5sig: {
      type: String,
      trim: true,
    },
    rawBodyHash: {
      type: String,
      trim: true,
    },
    lastNotifiedAt: Date,
  },
  {
    _id: false,
  },
);

const bookingSchema = new Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [bookingItemSchema],
      default: [],
    },
    itemCount: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    customer: {
      type: bookingCustomerSchema,
      required: true,
    },
    status: {
      type: String,
      enum: bookingStatuses,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: paymentMethods,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: paymentStatuses,
      required: true,
    },
    cancelBy: {
      type: Date,
      required: true,
    },
    confirmedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    failedAt: Date,
    payhere: {
      type: payHereMetadataSchema,
      required: false,
    },
    auditLog: {
      type: [auditLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export type BookingDocument = HydratedDocument<InferSchemaType<typeof bookingSchema>>;

export const BookingModel = model("Booking", bookingSchema);
