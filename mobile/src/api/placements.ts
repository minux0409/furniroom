import { api } from "@/lib/api";
import type { Placement } from "@/types";

export const placementsApi = {
  getByHouse: (houseId: string): Promise<{ data: Placement[] }> =>
    api.get(`/houses/${houseId}/placements`),

  create: (
    houseId: string,
    body: {
      furnitureId: string;
      posX: number;
      posY: number;
      posZ: number;
      rotY: number;
    },
  ): Promise<{ data: Placement }> =>
    api.post(`/houses/${houseId}/placements`, body),

  updateBulk: (
    houseId: string,
    placements: { id: string; posX: number; posY: number; posZ: number; rotY: number }[],
  ): Promise<{ data: Placement[] }> =>
    api.patch(`/houses/${houseId}/placements`, { placements }),

  update: (
    houseId: string,
    placementId: string,
    body: Partial<{ posX: number; posY: number; posZ: number; rotY: number }>,
  ): Promise<{ data: Placement }> =>
    api.patch(`/houses/${houseId}/placements/${placementId}`, body),

  remove: (houseId: string, placementId: string): Promise<void> =>
    api.delete(`/houses/${houseId}/placements/${placementId}`),
};
