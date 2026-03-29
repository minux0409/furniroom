// 공통 API 응답/도메인 타입 정의

export interface User {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  authProvider: "google" | "apple";
  createdAt: string;
}

export interface SlotStatus {
  houses: { used: number; max: number };
  furniture: { used: number; max: number };
}

export interface House {
  id: string;
  userId: string;
  name: string;
  thumbnailUrl: string | null;
  isPublic: boolean;
  blueprintData: unknown;
  originalHouseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Furniture {
  id: string;
  ownerId: string;
  name: string;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  shapeType: "box" | "cylinder" | "l_shape" | "custom";
  imageUrl: string | null;
  modelUrl: string | null;
  isPublic: boolean;
  originalFurnitureId: string | null;
  tags: { tag: string }[];
  createdAt: string;
}

export interface Placement {
  id: string;
  houseId: string;
  furnitureId: string;
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
  furniture?: Pick<
    Furniture,
    "id" | "name" | "imageUrl" | "modelUrl" | "shapeType"
  >;
}

export interface Purchase {
  id: string;
  userId: string;
  extraHouseSlots: number;
  extraFurnitureSlots: number;
  amountUsd: number;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
