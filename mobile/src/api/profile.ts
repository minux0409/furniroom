import { api } from "@/lib/axios";
import type { User, SlotStatus, Purchase } from "@/types";

export const profileApi = {
  /** GET /users/me */
  getMe: (): Promise<{ data: User }> => api.get("/users/me"),

  /** PATCH /users/me */
  updateMe: (dto: { nickname: string }): Promise<{ data: User }> =>
    api.patch("/users/me", dto),

  /** GET /users/me/slots */
  getSlots: (): Promise<{ data: SlotStatus }> => api.get("/users/me/slots"),

  /** DELETE /users/me */
  deleteMe: (): Promise<void> => api.delete("/users/me"),

  /** POST /purchases/slots */
  buySlots: (dto: {
    slotType: "house" | "furniture";
    units: number;
  }): Promise<{ data: { purchase: Purchase; message: string } }> =>
    api.post("/purchases/slots", dto),

  /** GET /purchases */
  getPurchases: (): Promise<{ data: Purchase[] }> => api.get("/purchases"),
};
