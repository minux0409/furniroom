import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { uploadImage } from "@/api/upload";
import { toast } from "@/lib/toast";

interface UseImagePickerOptions {
  onSuccess?: (url: string) => void;
}

export function useImagePicker({ onSuccess }: UseImagePickerOptions = {}) {
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const url = await uploadImage(asset.uri, asset.mimeType ?? "image/jpeg");
      onSuccess?.(url);
    } catch {
      toast.error("업로드 실패", "이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return { pick, uploading };
}
