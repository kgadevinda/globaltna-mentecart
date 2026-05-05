import { model, Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const serviceSlotSchema = new Schema(
  {
    startsAt: {
      type: Date,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

const serviceSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
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
    slotCapacity: {
      type: Number,
      required: true,
      min: 1,
    },
    slots: {
      type: [serviceSlotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

serviceSchema.index({ category: 1, title: 1 });

export type ServiceDocument = HydratedDocument<InferSchemaType<typeof serviceSchema>>;

export const ServiceModel = model("Service", serviceSchema);
