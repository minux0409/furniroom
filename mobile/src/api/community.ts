import { api } from "@/lib/api";
import type { House, Furniture, PaginatedResult } from "@/types";

export const communityApi = {
  // 공개된 집 목록
  getHouses: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ data: PaginatedResult<House> }> =>
    api.get("/community/houses", { params }),

  // 공개된 집 상세
  getHouseById: (houseId: string): Promise<{ data: House }> =>
    api.get(`/community/houses/${houseId}`),

  // 내 집으로 복사 (import)
  importHouse: (houseId: string): Promise<{ data: House }> =>
    api.post(`/community/houses/${houseId}/import`),

  // 공개된 가구 목록
  getFurniture: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    tag?: string;
  }): Promise<{ data: PaginatedResult<Furniture> }> =>
    api.get("/community/furniture", { params }),

  // 커뮤니티 가구 → 내 가구로 복사 (import)
  importFurniture: (furnitureId: string): Promise<{ data: Furniture }> =>
    api.post(`/furniture/${furnitureId}/import`),

  // 신고
  report: (body: {
    targetType: "house" | "furniture";
    targetId: string;
    reason: string;
  }): Promise<void> => api.post("/reports", body),
};
