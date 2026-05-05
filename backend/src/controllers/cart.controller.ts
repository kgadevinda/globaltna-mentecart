import type { Request, Response } from "express";

import { addCartItem, getCart, removeCartItem, updateCartItem } from "../services/cart.service";

export async function getCartController(req: Request, res: Response) {
  const cart = await getCart(req.auth!.sub);
  res.status(200).json({ cart });
}

export async function addCartItemController(req: Request, res: Response) {
  const cart = await addCartItem(req.auth!.sub, req.body);
  res.status(201).json({ cart });
}

export async function updateCartItemController(req: Request, res: Response) {
  const cart = await updateCartItem(req.auth!.sub, String(req.params.itemId), req.body);
  res.status(200).json({ cart });
}

export async function removeCartItemController(req: Request, res: Response) {
  const cart = await removeCartItem(req.auth!.sub, String(req.params.itemId));
  res.status(200).json({ cart });
}
