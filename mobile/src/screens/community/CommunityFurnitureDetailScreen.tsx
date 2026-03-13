/**
 * CommunityFurnitureDetailScreen
 * - 가구 상세 (이름, 크기, 모양, 태그)
 * - "내 가구로 가져오기" 버튼
 * - 신고 버튼
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { communityApi } from "@/api/community";
import type { Furniture } from "@/types";
import type { CommunityStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<
  CommunityStackParamList,
  "CommunityFurnitureDetail"
>;

const SHAPE_LABEL: Record<string, string> = {
  box: "직육면체",
  cylinder: "원기둥",
  l_shape: "L자형",
  custom: "커스텀",
};

const SHAPE_COLOR: Record<string, string> = {
  box: "#A0C4FF",
  cylinder: "#BDB2FF",
  l_shape: "#CAFFBF",
  custom: "#FFD6A5",
};

const REPORT_REASONS = [
  "스팸 / 광고",
  "부적절한 콘텐츠",
  "저작권 침해",
  "기타",
];

export function CommunityFurnitureDetailScreen({ route }: Props) {
  const { furnitureId } = route.params;
  const queryClient = useQueryClient();
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // 커뮤니티 가구 목록에서 가져올 수 없으니 furnitureApi getById로 조회
  // (백엔드 GET /furniture/:id 는 공개 가구도 조회 가능)
  const { data: furniture, isLoading } = useQuery<Furniture>({
    queryKey: ["community-furniture-detail", furnitureId],
    queryFn: async () => {
      const { data } = await import("@/api/furniture").then((m) =>
        m.furnitureApi.getById(furnitureId),
      );
      return data;
    },
  });

  const importMutation = useMutation({
    mutationFn: () => communityApi.importFurniture(furnitureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["furniture"] });
      Alert.alert("완료", "내 가구 목록에 추가되었습니다.");
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "실패",
        e.response?.data?.message ?? "잠시 후 다시 시도해 주세요.",
      );
    },
  });

  const reportMutation = useMutation({
    mutationFn: (reason: string) =>
      communityApi.report({
        targetType: "furniture",
        targetId: furnitureId,
        reason,
      }),
    onSuccess: () => {
      setReportModal(false);
      Alert.alert("신고 완료", "신고가 접수되었습니다.");
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "오류",
        e.response?.data?.message ?? "이미 신고한 항목입니다.",
      );
    },
  });

  const handleReport = () => {
    const reason = reportReason === "기타" ? customReason.trim() : reportReason;
    if (!reason) {
      Alert.alert("알림", "신고 사유를 선택해 주세요.");
      return;
    }
    reportMutation.mutate(reason);
  };

  if (isLoading || !furniture) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  const shapeColor = SHAPE_COLOR[furniture.shapeType] ?? "#DDD";

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.heroCard}>
        <View style={[styles.heroIcon, { backgroundColor: shapeColor }]}>
          <Text style={styles.heroIconText}>
            {furniture.shapeType === "cylinder" ? "○" : "□"}
          </Text>
        </View>
        <Text style={styles.furnitureName}>{furniture.name}</Text>
        <View
          style={[styles.shapeBadge, { backgroundColor: shapeColor + "88" }]}
        >
          <Text style={styles.shapeBadgeText}>
            {SHAPE_LABEL[furniture.shapeType]}
          </Text>
        </View>
      </View>

      {/* 크기 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>크기</Text>
        <View style={styles.sizeRow}>
          {[
            { label: "너비", value: furniture.widthCm },
            { label: "깊이", value: furniture.depthCm },
            { label: "높이", value: furniture.heightCm },
          ].map(({ label, value }) => (
            <View key={label} style={styles.sizeBox}>
              <Text style={styles.sizeValue}>{value}</Text>
              <Text style={styles.sizeUnit}>{label} (cm)</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 태그 */}
      {furniture.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>태그</Text>
          <View style={styles.tagRow}>
            {furniture.tags.map((t) => (
              <View key={t.tag} style={styles.tag}>
                <Text style={styles.tagText}>{t.tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 액션 버튼 */}
      <TouchableOpacity
        style={[
          styles.importBtn,
          importMutation.isPending && styles.importBtnDisabled,
        ]}
        onPress={() => importMutation.mutate()}
        disabled={importMutation.isPending}
      >
        <Text style={styles.importBtnText}>
          {importMutation.isPending ? "가져오는 중…" : "📥  내 가구로 가져오기"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.reportBtn}
        onPress={() => setReportModal(true)}
      >
        <Text style={styles.reportBtnText}>🚨 신고하기</Text>
      </TouchableOpacity>

      {/* 신고 모달 */}
      <Modal
        visible={reportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>신고 사유 선택</Text>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.reasonRow,
                  reportReason === r && styles.reasonRowActive,
                ]}
                onPress={() => setReportReason(r)}
              >
                <View
                  style={[
                    styles.radio,
                    reportReason === r && styles.radioActive,
                  ]}
                />
                <Text style={styles.reasonText}>{r}</Text>
              </TouchableOpacity>
            ))}
            {reportReason === "기타" && (
              <TextInput
                style={styles.reasonInput}
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="직접 입력해 주세요"
                maxLength={100}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReportModal(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  reportMutation.isPending && { opacity: 0.6 },
                ]}
                onPress={handleReport}
                disabled={reportMutation.isPending}
              >
                <Text style={styles.modalSubmitText}>
                  {reportMutation.isPending ? "처리 중…" : "신고"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heroIcon: {
    width: 90,
    height: 90,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  heroIconText: { fontSize: 50 },
  furnitureName: { fontSize: 20, fontWeight: "800", color: "#111" },
  shapeBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  shapeBadgeText: { fontSize: 13, fontWeight: "600", color: "#333" },
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
  sizeRow: { flexDirection: "row", gap: 8 },
  sizeBox: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  sizeValue: { fontSize: 20, fontWeight: "800", color: "#111" },
  sizeUnit: { fontSize: 11, color: "#AAA" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "#EEE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { fontSize: 12, color: "#444" },
  importBtn: {
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
  importBtnDisabled: { backgroundColor: "#AAC9EF" },
  importBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  reportBtn: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#E74C3C",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  reportBtnText: { color: "#E74C3C", fontWeight: "600", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
    gap: 2,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111",
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
    borderRadius: 8,
  },
  reasonRowActive: { backgroundColor: "#F0F5FF" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CCC",
  },
  radioActive: { borderColor: "#4A90E2", backgroundColor: "#4A90E2" },
  reasonText: { fontSize: 15, color: "#333" },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    marginTop: 4,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#DDD",
    alignItems: "center",
  },
  modalCancelText: { color: "#666", fontWeight: "600" },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: "#E74C3C",
    alignItems: "center",
  },
  modalSubmitText: { color: "#FFF", fontWeight: "700" },
});
