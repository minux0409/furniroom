import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

// ============================================================
// Root — 로그인 여부에 따라 분기
// ============================================================
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// ============================================================
// Auth Stack
// ============================================================
export type AuthStackParamList = {
  Login: undefined;
};

// ============================================================
// Main Bottom Tabs
// ============================================================
export type MainTabParamList = {
  HomeTab: undefined;
  FurnitureTab: undefined;
  CommunityTab: undefined;
  ProfileTab: undefined;
};

// ============================================================
// Home Stack (집 목록 → 설계도 편집 → 3D 뷰)
// ============================================================
export type HomeStackParamList = {
  HouseList: undefined;
  HouseEditor: { houseId: string };
  House3DView: { houseId: string };
};

// ============================================================
// Furniture Stack
// ============================================================
export type FurnitureStackParamList = {
  FurnitureList: undefined;
  FurnitureDetail: { furnitureId: string };
  FurnitureCreate: undefined;
};

// ============================================================
// Community Stack
// ============================================================
export type CommunityStackParamList = {
  CommunityFeed: undefined;
  CommunityHouseDetail: { houseId: string };
  CommunityFurnitureDetail: { furnitureId: string };
};

// ============================================================
// Profile Stack
// ============================================================
export type ProfileStackParamList = {
  Profile: undefined;
  SlotShop: undefined;
  PurchaseHistory: undefined;
};

// 편의 타입 헬퍼
export type RootStackProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type HomeStackProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

export type FurnitureStackProps<T extends keyof FurnitureStackParamList> =
  NativeStackScreenProps<FurnitureStackParamList, T>;

export type CommunityStackProps<T extends keyof CommunityStackParamList> =
  NativeStackScreenProps<CommunityStackParamList, T>;

export type ProfileStackProps<T extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, T>;

export type MainTabProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;
