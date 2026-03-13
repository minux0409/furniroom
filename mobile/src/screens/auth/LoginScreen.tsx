import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { APP_CONFIG } from "@/config/app.config";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: APP_CONFIG.GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();

      // SDK v13+ : idToken은 data.idToken에 위치
      const idToken =
        "idToken" in signInResult
          ? (signInResult as { idToken: string }).idToken
          : (signInResult as { data: { idToken: string } }).data?.idToken;

      if (!idToken) throw new Error("ID 토큰을 가져올 수 없습니다.");

      const { data } = await authApi.googleLogin(idToken);
      setAuth(data.user, data.accessToken, data.refreshToken);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (err.code === statusCodes.IN_PROGRESS) return;
      Alert.alert("로그인 실패", err.message ?? "잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 로고 영역 */}
      <View style={styles.logoArea}>
        <Text style={styles.logoText}>Furniroom</Text>
        <Text style={styles.tagline}>내 공간을 내 마음대로</Text>
      </View>

      {/* 로그인 버튼 */}
      <View style={styles.buttonArea}>
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.googleButtonText}>Google로 계속하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    justifyContent: "space-between",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  logoArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 8,
    fontSize: 16,
    color: "#888",
  },
  buttonArea: {
    gap: 12,
  },
  googleButton: {
    backgroundColor: "#4285F4",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
