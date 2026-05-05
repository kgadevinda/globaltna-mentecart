import { model, Schema, type HydratedDocument, type InferSchemaType, Types } from "mongoose";

const slotInventorySchema = new Schema(
  {
    serviceId: {
      type: Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    reservedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

slotInventorySchema.index({ serviceId: 1, startsAt: 1 }, { unique: true });

export type SlotInventoryDocument = HydratedDocument<InferSchemaType<typeof slotInventorySchema>>;

export const SlotInventoryModel = model("SlotInventory", slotInventorySchema);
