import { Router } from "express";

import { authRouter } from "./auth.routes";
import { bookingRouter } from "./booking.routes";
import { cartRouter } from "./cart.routes";
import { paymentRouter } from "./payment.routes";
import { serviceRouter } from "./service.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/services", serviceRouter);
apiRouter.use("/cart", cartRouter);
apiRouter.use("/bookings", bookingRouter);
apiRouter.use("/payments", paymentRouter);
