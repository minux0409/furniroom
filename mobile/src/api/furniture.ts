import { api } from "@/lib/api";
import type { Furniture, PaginatedResult } from "@/types";

export const furnitureApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    tag?: string;
    search?: string;
  }): Promise<{ data: PaginatedResult<Furniture> }> =>
    api.get("/furniture", { params }),

  getById: (id: string): Promise<{ data: Furniture }> =>
    api.get(`/furniture/${id}`),

  create: (body: {
    name: string;
    widthCm: number;
    depthCm: number;
    heightCm: number;
    shapeType: "box" | "cylinder" | "l_shape" | "custom";
    imageUrl?: string;
    modelUrl?: string;
    tags?: string[];
  }): Promise<{ data: Furniture }> => api.post("/furniture", body),

  update: (
    id: string,
    body: Partial<{
      name: string;
      widthCm: number;
      depthCm: number;
      heightCm: number;
      imageUrl: string;
      modelUrl: string;
      isPublic: boolean;
      tags: string[];
    }>,
  ): Promise<{ data: Furniture }> => api.patch(`/furniture/${id}`, body),

  remove: (id: string): Promise<void> => api.delete(`/furniture/${id}`),
};
