import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Furniroom",
  slug: "furniroom",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",

  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF",
  },

  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.furniroom.app",
    buildNumber: "1",
  },

  android: {
    package: "com.furniroom.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF",
    },
    permissions: ["READ_MEDIA_IMAGES", "READ_EXTERNAL_STORAGE"],
  },

  plugins: [
    [
      "expo-image-picker",
      {
        photosPermission:
          "가구 이미지와 프로필 사진을 업로드하기 위해 사진 라이브러리에 접근합니다.",
      },
    ],
  ],

  extra: {
    // EXPO_PUBLIC_ 변수는 클라이언트에 자동 노출됨
    // 여기서는 eas projectId를 추가 (EAS Build 시 필요)
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? "",
    },
  },
});
