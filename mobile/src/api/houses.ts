import { api } from "@/lib/api";
import type { House } from "@/types";

export const housesApi = {
  getAll: (): Promise<{ data: House[] }> => api.get("/houses"),

  getById: (id: string): Promise<{ data: House }> => api.get(`/houses/${id}`),

  create: (name: string): Promise<{ data: House }> =>
    api.post("/houses", { name }),

  update: (
    id: string,
    body: Partial<Pick<House, "name" | "isPublic" | "blueprintData">>,
  ): Promise<{ data: House }> => api.patch(`/houses/${id}`, body),

  remove: (id: string): Promise<void> => api.delete(`/houses/${id}`),
};
