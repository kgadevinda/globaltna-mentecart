import type { Request, Response } from "express";

import { cancelBooking, checkout, completeBookingAsAdmin, getBooking, getBookings } from "../services/booking.service";

export async function checkoutController(req: Request, res: Response) {
  const result = await checkout(req.auth!.sub, req.body, resolvePublicBaseUrl(req));
  res.status(201).json(result);
}

export async function listBookingsController(req: Request, res: Response) {
  const bookings = await getBookings(req.auth!.sub);
  res.status(200).json({ bookings });
}

export async function getBookingController(req: Request, res: Response) {
  const booking = await getBooking(req.auth!.sub, String(req.params.id));
  res.status(200).json({ booking });
}

export async function cancelBookingController(req: Request, res: Response) {
  const booking = await cancelBooking(req.auth!.sub, String(req.params.id));
  res.status(200).json({ booking });
}

export async function completeBookingController(req: Request, res: Response) {
  const booking = await completeBookingAsAdmin(String(req.params.id), req.body);
  res.status(200).json({ booking });
}

function resolvePublicBaseUrl(req: Request): string {
  if (process.env.PUBLIC_SERVER_URL?.trim()) {
    return process.env.PUBLIC_SERVER_URL.trim().replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}
