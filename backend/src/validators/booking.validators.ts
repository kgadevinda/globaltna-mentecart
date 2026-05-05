import { z } from "zod";

import { paymentMethods } from "../constants/booking";

const billingDetailsSchema = z.object({
  fullName: z.string().trim().min(4).max(120),
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().min(4).max(160),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
});

export const checkoutSchema = z.object({
  paymentMethod: z.enum(paymentMethods).default("cash"),
  simulatePaymentSuccess: z.boolean().optional(),
  billingDetails: billingDetailsSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.paymentMethod === "payhere" && !value.billingDetails) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["billingDetails"],
      message: "Billing details are required for PayHere payments",
    });
  }
});

export const completeBookingSchema = z.object({
  note: z.string().trim().min(4).max(240).optional(),
});
