import type { Request, Response } from "express";

import { getPayHereCheckoutPageHtml, handlePayHereNotification } from "../services/booking.service";
import { rawBodyFromRequest, renderPayHereStatusPage } from "../services/payhere.service";

export async function payHereCheckoutPageController(req: Request, res: Response) {
  const html = await getPayHereCheckoutPageHtml(
    String(req.params.token),
    resolvePublicBaseUrl(req),
  );

  res.status(200).type("html").send(html);
}

export async function payHereNotifyController(req: Request, res: Response) {
  const result = await handlePayHereNotification(rawBodyFromRequest(req));

  res.status(200).json({
    received: true,
    duplicate: result.duplicate,
    bookingId: result.booking.id,
    status: result.booking.status,
    paymentStatus: result.booking.paymentStatus,
  });
}

export async function payHereReturnController(req: Request, res: Response) {
  const bookingNumber = String(req.query.booking ?? "");

  res.status(200).type("html").send(
    renderPayHereStatusPage({
      title: "Payment submitted",
      message:
        "Your PayHere payment was submitted. MenteCart will confirm the final status as soon as the gateway callback is verified.",
      bookingNumber: bookingNumber || undefined,
    }),
  );
}

export async function payHereCancelController(req: Request, res: Response) {
  const bookingNumber = String(req.query.booking ?? "");

  res.status(200).type("html").send(
    renderPayHereStatusPage({
      title: "Payment cancelled",
      message:
        "The PayHere payment window was closed or cancelled. If no payment confirmation arrives, reserved capacity will be released automatically.",
      bookingNumber: bookingNumber || undefined,
    }),
  );
}

function resolvePublicBaseUrl(req: Request): string {
  if (process.env.PUBLIC_SERVER_URL?.trim()) {
    return process.env.PUBLIC_SERVER_URL.trim().replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}
