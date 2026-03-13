import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "@/store/authStore";
import { tokenStorage } from "@/lib/storage";
import { profileApi } from "@/api/profile";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isLoggedIn, setAuth, logout } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const accessToken = tokenStorage.getAccessToken();
      if (!accessToken) {
        setBootstrapping(false);
        return;
      }
      try {
        const { data: user } = await profileApi.getMe();
        // 토큰은 이미 storage에 있으므로 setTokens는 생략하고 user만 store에 주입
        useAuthStore.setState({ user, isLoggedIn: true });
      } catch {
        // 토큰 만료 등 — 로그아웃 처리
        logout();
      } finally {
        setBootstrapping(false);
      }
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
