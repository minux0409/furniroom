import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type {
  MainTabParamList,
  HomeStackParamList,
  FurnitureStackParamList,
  CommunityStackParamList,
  ProfileStackParamList,
} from "./types";
import { HouseListScreen } from "@/screens/home/HouseListScreen";
import { HouseEditorScreen } from "@/screens/home/HouseEditorScreen";
import { House3DViewScreen } from "@/screens/home/House3DViewScreen";
import { FurnitureListScreen } from "@/screens/furniture/FurnitureListScreen";
import { FurnitureDetailScreen } from "@/screens/furniture/FurnitureDetailScreen";
import { FurnitureCreateScreen } from "@/screens/furniture/FurnitureCreateScreen";
import { CommunityFeedScreen } from "@/screens/community/CommunityFeedScreen";
import { CommunityHouseDetailScreen } from "@/screens/community/CommunityHouseDetailScreen";
import { CommunityFurnitureDetailScreen } from "@/screens/community/CommunityFurnitureDetailScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { SlotShopScreen } from "@/screens/profile/SlotShopScreen";
import { PurchaseHistoryScreen } from "@/screens/profile/PurchaseHistoryScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const FurnitureStack = createNativeStackNavigator<FurnitureStackParamList>();
const CommunityStack = createNativeStackNavigator<CommunityStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HouseList"
        component={HouseListScreen}
        options={{ title: "내 집" }}
      />
      <HomeStack.Screen
        name="HouseEditor"
        component={HouseEditorScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="House3DView"
        component={House3DViewScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

function FurnitureNavigator() {
  return (
    <FurnitureStack.Navigator>
      <FurnitureStack.Screen
        name="FurnitureList"
        component={FurnitureListScreen}
        options={{ title: "내 가구" }}
      />
      <FurnitureStack.Screen
        name="FurnitureDetail"
        component={FurnitureDetailScreen}
        options={{ title: "가구 상세" }}
      />
      <FurnitureStack.Screen
        name="FurnitureCreate"
        component={FurnitureCreateScreen}
        options={{ title: "가구 등록" }}
      />
    </FurnitureStack.Navigator>
  );
}

function CommunityNavigator() {
  return (
    <CommunityStack.Navigator>
      <CommunityStack.Screen
        name="CommunityFeed"
        component={CommunityFeedScreen}
        options={{ title: "커뮤니티" }}
      />
      <CommunityStack.Screen
        name="CommunityHouseDetail"
        component={CommunityHouseDetailScreen}
        options={{ title: "집 상세" }}
      />
      <CommunityStack.Screen
        name="CommunityFurnitureDetail"
        component={CommunityFurnitureDetailScreen}
        options={{ title: "가구 상세" }}
      />
    </CommunityStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "내 프로필" }}
      />
      <ProfileStack.Screen
        name="SlotShop"
        component={SlotShopScreen}
        options={{ title: "슬롯 상점" }}
      />
      <ProfileStack.Screen
        name="PurchaseHistory"
        component={PurchaseHistoryScreen}
        options={{ title: "구매 내역" }}
      />
    </ProfileStack.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{ title: "홈", headerShown: false }}
      />
      <Tab.Screen
        name="FurnitureTab"
        component={FurnitureNavigator}
        options={{ title: "가구", headerShown: false }}
      />
      <Tab.Screen
        name="CommunityTab"
        component={CommunityNavigator}
        options={{ title: "커뮤니티", headerShown: false }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{ title: "프로필", headerShown: false }}
      />
    </Tab.Navigator>
  );
}
