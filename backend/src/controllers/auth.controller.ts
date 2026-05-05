import type { Request, Response } from "express";

import { getCurrentUser, login, signup } from "../services/auth.service";

export async function signupController(req: Request, res: Response) {
  const result = await signup(req.body);
  res.status(201).json(result);
}

export async function loginController(req: Request, res: Response) {
  const result = await login(req.body);
  res.status(200).json(result);
}

export async function meController(req: Request, res: Response) {
  const user = await getCurrentUser(req.auth!.sub);
  res.status(200).json({ user });
}
