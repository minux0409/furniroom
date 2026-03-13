import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "./types";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {() => <PlaceholderScreen name="로그인 화면" />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
