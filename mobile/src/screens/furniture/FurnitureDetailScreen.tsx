import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { furnitureApi } from "@/api/furniture";
import type { Furniture } from "@/types";
import type { FurnitureStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<FurnitureStackParamList, "FurnitureDetail">;

const SHAPE_LABEL = {
  box: "직육면체",
  cylinder: "원기둥",
  l_shape: "L자형",
  custom: "커스텀",
} as const;

const SHAPE_COLOR = {
  box: "#A0C4FF",
  cylinder: "#BDB2FF",
  l_shape: "#CAFFBF",
  custom: "#FFD6A5",
} as const;

export function FurnitureDetailScreen({ route, navigation }: Props) {
  const { furnitureId } = route.params;
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [depthCm, setDepthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const { data: furniture, isLoading } = useQuery<Furniture>({
    queryKey: ["furniture", furnitureId],
    queryFn: () => furnitureApi.getById(furnitureId).then((r) => r.data),
  });

  useEffect(() => {
    if (!furniture) return;
    setName(furniture.name);
    setWidthCm(String(furniture.widthCm));
    setDepthCm(String(furniture.depthCm));
    setHeightCm(String(furniture.heightCm));
    setIsPublic(furniture.isPublic);
    setTags(furniture.tags.map((t) => t.tag));
  }, [furniture?.id]);

  const updateMutation = useMutation({
    mutationFn: () =>
      furnitureApi.update(furnitureId, {
        name: name.trim(),
        widthCm: Number(widthCm),
        depthCm: Number(depthCm),
        heightCm: Number(heightCm),
        isPublic,
        tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["furniture"] });
      setEditing(false);
    },
    onError: () => Alert.alert("오류", "저장에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => furnitureApi.remove(furnitureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["furniture"] });
      navigation.goBack();
    },
    onError: () => Alert.alert("오류", "삭제에 실패했습니다."),
  });

  const handleDelete = () => {
    Alert.alert("가구 삭제", "이 가구를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  if (isLoading || !furniture) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* 모양 미리보기 */}
      <View style={styles.previewWrap}>
        <View
          style={[
            styles.preview3D,
            { backgroundColor: SHAPE_COLOR[furniture.shapeType] },
          ]}
        >
          <Text style={styles.preview3DText}>
            {furniture.shapeType === "cylinder" ? "○" : "□"}
          </Text>
        </View>
        <View
          style={[
            styles.shapeBadge,
            { backgroundColor: SHAPE_COLOR[furniture.shapeType] + "88" },
          ]}
        >
          <Text style={styles.shapeBadgeText}>
            {SHAPE_LABEL[furniture.shapeType]}
          </Text>
        </View>
      </View>

      {/* 이름 */}
      <View style={styles.field}>
        <Text style={styles.label}>이름</Text>
        {editing ? (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="가구 이름"
            maxLength={30}
          />
        ) : (
          <Text style={styles.value}>{furniture.name}</Text>
        )}
      </View>

      {/* 크기 */}
      <View style={styles.field}>
        <Text style={styles.label}>크기 (cm)</Text>
        {editing ? (
          <View style={styles.sizeRow}>
            {[
              { label: "너비", value: widthCm, set: setWidthCm },
              { label: "깊이", value: depthCm, set: setDepthCm },
              { label: "높이", value: heightCm, set: setHeightCm },
            ].map(({ label, value, set }) => (
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
        ) : (
          <Text style={styles.value}>
            {furniture.widthCm} × {furniture.depthCm} × {furniture.heightCm} cm
          </Text>
        )}
      </View>

      {/* 커뮤니티 공개 */}
      <View style={[styles.field, styles.fieldRow]}>
        <Text style={styles.label}>커뮤니티 공개</Text>
        {editing ? (
          <Switch value={isPublic} onValueChange={setIsPublic} />
        ) : (
          <Text
            style={[
              styles.badge,
              isPublic ? styles.badgePublic : styles.badgePrivate,
            ]}
          >
            {isPublic ? "공개" : "비공개"}
          </Text>
        )}
      </View>

      {/* 태그 */}
      <View style={styles.field}>
        <Text style={styles.label}>태그</Text>
        {editing && (
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="태그 입력 후 추가"
              returnKeyType="done"
              onSubmitEditing={handleAddTag}
              maxLength={15}
            />
            <TouchableOpacity style={styles.tagAddBtn} onPress={handleAddTag}>
              <Text style={styles.tagAddBtnText}>추가</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.tagRow}>
          {(editing ? tags : furniture.tags.map((t) => t.tag)).map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.tag}
              onPress={editing ? () => handleRemoveTag(t) : undefined}
              disabled={!editing}
            >
              <Text style={styles.tagText}>
                {t}
                {editing ? " ✕" : ""}
              </Text>
            </TouchableOpacity>
          ))}
          {furniture.tags.length === 0 && !editing && (
            <Text style={styles.noTagText}>태그 없음</Text>
          )}
        </View>
      </View>

      {/* 액션 버튼 */}
      {editing ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setEditing(false)}
          >
            <Text style={styles.cancelBtnText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              updateMutation.isPending && styles.saveBtnDisabled,
            ]}
            onPress={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            <Text style={styles.saveBtnText}>
              {updateMutation.isPending ? "저장 중…" : "저장"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditing(true)}
          >
            <Text style={styles.editBtnText}>편집</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={handleDelete}>
            <Text style={styles.delBtnText}>삭제</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  previewWrap: { alignItems: "center", paddingVertical: 20, gap: 10 },
  preview3D: {
    width: 100,
    height: 100,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  preview3DText: { fontSize: 52 },
  shapeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  shapeBadgeText: { fontSize: 13, fontWeight: "600", color: "#333" },
  field: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, color: "#888", fontWeight: "600" },
  value: { fontSize: 16, color: "#111" },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: "#111",
  },
  sizeRow: { flexDirection: "row", gap: 10 },
  sizeField: { flex: 1, gap: 4 },
  sizeLabel: { fontSize: 11, color: "#AAA", textAlign: "center" },
  sizeInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: "center",
    color: "#111",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: "600",
    overflow: "hidden",
  },
  badgePublic: { backgroundColor: "#D4EDDA", color: "#155724" },
  badgePrivate: { backgroundColor: "#EEE", color: "#666" },
  tagInputRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  noTagText: { fontSize: 13, color: "#BBB" },
  actionRow: { flexDirection: "row", gap: 10 },
  editBtn: {
    flex: 1,
    backgroundColor: "#4A90E2",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  editBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  delBtn: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E74C3C",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  delBtnText: { color: "#E74C3C", fontWeight: "700", fontSize: 15 },
  saveBtn: {
    flex: 1,
    backgroundColor: "#4A90E2",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnDisabled: { backgroundColor: "#AAC9EF" },
  saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#DDD",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: { color: "#666", fontWeight: "700", fontSize: 15 },
});
