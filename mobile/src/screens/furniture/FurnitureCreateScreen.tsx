import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { furnitureApi } from "@/api/furniture";
import { useImagePicker } from "@/hooks/useImagePicker";
import type { Furniture } from "@/types";
import type { FurnitureStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<FurnitureStackParamList, "FurnitureCreate">;

type ShapeType = Furniture["shapeType"];

const SHAPES: {
  type: ShapeType;
  label: string;
  icon: string;
  color: string;
}[] = [
  { type: "box", label: "직육면체", icon: "□", color: "#A0C4FF" },
  { type: "cylinder", label: "원기둥", icon: "○", color: "#BDB2FF" },
  { type: "l_shape", label: "L자형", icon: "⌐", color: "#CAFFBF" },
  { type: "custom", label: "커스텀", icon: "✦", color: "#FFD6A5" },
];

export function FurnitureCreateScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [shapeType, setShapeType] = useState<ShapeType>("box");
  const [widthCm, setWidthCm] = useState("80");
  const [depthCm, setDepthCm] = useState("80");
  const [heightCm, setHeightCm] = useState("80");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const { pick: pickImage, uploading: imageUploading } = useImagePicker({
    onSuccess: (url) => setImageUrl(url),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      furnitureApi.create({
        name: name.trim(),
        shapeType,
        widthCm: Number(widthCm),
        depthCm: Number(depthCm),
        heightCm: Number(heightCm),
        tags,
        ...(imageUrl ? { imageUrl } : {}),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["furniture"] });
      navigation.replace("FurnitureDetail", { furnitureId: res.data.id });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "등록 실패",
        e.response?.data?.message ?? "잠시 후 다시 시도해 주세요.",
      );
    },
  });

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("알림", "가구 이름을 입력해 주세요.");
      return;
    }
    if (
      isNaN(Number(widthCm)) ||
      Number(widthCm) <= 0 ||
      isNaN(Number(depthCm)) ||
      Number(depthCm) <= 0 ||
      isNaN(Number(heightCm)) ||
      Number(heightCm) <= 0
    ) {
      Alert.alert("알림", "크기는 0보다 큰 숫자로 입력해 주세요.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* 이름 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>이름 *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="예: 소파, 식탁, 침대"
          maxLength={30}
          autoFocus
        />
      </View>

      {/* 모양 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>모양 *</Text>
        <View style={styles.shapeGrid}>
          {SHAPES.map((s) => (
            <TouchableOpacity
              key={s.type}
              style={[
                styles.shapeCard,
                shapeType === s.type && styles.shapeCardSelected,
                { borderColor: shapeType === s.type ? s.color : "#DDD" },
              ]}
              onPress={() => setShapeType(s.type)}
            >
              <View
                style={[
                  styles.shapeIconWrap,
                  {
                    backgroundColor:
                      s.color + (shapeType === s.type ? "FF" : "66"),
                  },
                ]}
              >
                <Text style={styles.shapeIcon}>{s.icon}</Text>
              </View>
              <Text
                style={[
                  styles.shapeLabel,
                  shapeType === s.type && { color: "#111", fontWeight: "700" },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 크기 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>크기 (cm) *</Text>
        <View style={styles.sizeRow}>
          {(
            [
              { label: "너비", value: widthCm, set: setWidthCm },
              { label: "깊이", value: depthCm, set: setDepthCm },
              { label: "높이", value: heightCm, set: setHeightCm },
            ] as const
          ).map(({ label, value, set }) => (
            <View key={label} style={styles.sizeField}>
              <Text style={styles.sizeLabel}>{label}</Text>
              <TextInput
                style={styles.sizeInput}
                value={value}
                onChangeText={set}
                keyboardType="decimal-pad"
                maxLength={6}
              />
            </View>
          ))}
        </View>
        <View style={styles.sizePreview}>
          <View
            style={[
              styles.sizeBox,
              {
                width: Math.min(Math.max(Number(widthCm) / 5, 20), 120),
                height: Math.min(Math.max(Number(heightCm) / 5, 20), 80),
                backgroundColor:
                  SHAPES.find((s) => s.type === shapeType)?.color ?? "#CCC",
                borderRadius: shapeType === "cylinder" ? 999 : 4,
              },
            ]}
          />
          <Text style={styles.sizePreviewText}>
            {widthCm} × {depthCm} × {heightCm} cm (너비 × 깊이 × 높이)
          </Text>
        </View>
      </View>

      {/* 태그 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>태그 (선택)</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="예: 북유럽, 모던, 원목"
            returnKeyType="done"
            onSubmitEditing={handleAddTag}
            maxLength={15}
          />
          <TouchableOpacity style={styles.tagAddBtn} onPress={handleAddTag}>
            <Text style={styles.tagAddBtnText}>추가</Text>
          </TouchableOpacity>
        </View>
        {tags.length > 0 && (
          <View style={styles.tagRow}>
            {tags.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.tag}
                onPress={() => setTags((prev) => prev.filter((x) => x !== t))}
              >
                <Text style={styles.tagText}>{t} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 이미지 (선택) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>이미지 (선택)</Text>
        <TouchableOpacity
          style={styles.imagePicker}
          onPress={pickImage}
          disabled={imageUploading}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
          ) : imageUploading ? (
            <ActivityIndicator color="#4A90E2" />
          ) : (
            <>
              <Text style={styles.imagePickerIcon}>📷</Text>
              <Text style={styles.imagePickerText}>사진 선택</Text>
            </>
          )}
        </TouchableOpacity>
        {imageUrl && (
          <TouchableOpacity onPress={() => setImageUrl(null)}>
            <Text style={styles.imageRemoveText}>✕ 이미지 제거</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 등록 버튼 */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          createMutation.isPending && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit}
        disabled={createMutation.isPending}
      >
        <Text style={styles.submitBtnText}>
          {createMutation.isPending ? "등록 중…" : "가구 등록"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sectionTitle: { fontSize: 13, color: "#888", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111",
  },
  shapeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  shapeCard: {
    width: "47%",
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderColor: "#DDD",
  },
  shapeCardSelected: {
    backgroundColor: "#F7F9FF",
  },
  shapeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  shapeIcon: { fontSize: 26 },
  shapeLabel: { fontSize: 13, color: "#888" },
  sizeRow: { flexDirection: "row", gap: 10 },
  sizeField: { flex: 1, gap: 4 },
  sizeLabel: { fontSize: 11, color: "#AAA", textAlign: "center" },
  sizeInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 9,
    fontSize: 14,
    textAlign: "center",
    color: "#111",
  },
  sizePreview: { alignItems: "center", gap: 8, paddingTop: 4 },
  sizeBox: { opacity: 0.8 },
  sizePreviewText: { fontSize: 12, color: "#999" },
  tagInputRow: { flexDirection: "row", gap: 8 },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#111",
  },
  tagAddBtn: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: "center",
  },
  tagAddBtnText: { color: "#FFF", fontWeight: "600", fontSize: 13 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "#EEE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { fontSize: 12, color: "#444" },
  submitBtn: {
    backgroundColor: "#4A90E2",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#4A90E2",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: "#AAC9EF" },
  submitBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  imagePicker: {
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderStyle: "dashed",
    borderRadius: 12,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FAFAFA",
  },
  imagePreview: { width: "100%", height: 120, borderRadius: 10 },
  imagePickerIcon: { fontSize: 30 },
  imagePickerText: { fontSize: 13, color: "#AAA" },
  imageRemoveText: { fontSize: 13, color: "#E74C3C", textAlign: "center" },
});
