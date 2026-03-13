/**
 * CommunityHouseDetailScreen
 * - 집 이름, 방 목록 (blueprintData rooms)
 * - "내 집으로 가져오기" 버튼
 * - 신고 버튼
 */

import React, { useMemo, useState } from "react";
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
import { toast } from "@/lib/toast";
import type { CommunityStackParamList } from "@/navigation/types";
import type { BlueprintData } from "@/screens/home/HouseEditorScreen";

type Props = NativeStackScreenProps<
  CommunityStackParamList,
  "CommunityHouseDetail"
>;

const REPORT_REASONS = [
  "스팸 / 광고",
  "부적절한 콘텐츠",
  "저작권 침해",
  "기타",
];

export function CommunityHouseDetailScreen({ route }: Props) {
  const { houseId } = route.params;
  const queryClient = useQueryClient();
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const { data: house, isLoading } = useQuery({
    queryKey: ["community-house", houseId],
    queryFn: () => communityApi.getHouseById(houseId).then((r) => r.data),
  });

  const bp = useMemo<BlueprintData | null>(() => {
    if (!house?.blueprintData) return null;
    const d = house.blueprintData as BlueprintData;
    return Array.isArray(d.rooms) ? d : null;
  }, [house]);

  const importMutation = useMutation({
    mutationFn: () => communityApi.importHouse(houseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      toast.success("완료", "내 집 목록에 추가되었습니다.");
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
      communityApi.report({ targetType: "house", targetId: houseId, reason }),
    onSuccess: () => {
      setReportModal(false);
      toast.success("신고 완료", "신고가 접수되었습니다.");
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

  if (isLoading || !house) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.heroCard}>
        <Text style={styles.houseEmoji}>🏠</Text>
        <Text style={styles.houseName}>{house.name}</Text>
        <Text style={styles.houseMeta}>
          {new Date(house.createdAt).toLocaleDateString("ko-KR")} 등록
        </Text>
      </View>

      {/* 설계도 방 목록 */}
      {bp && bp.rooms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            설계도 방 ({bp.rooms.length}개)
          </Text>
          <View style={styles.roomGrid}>
            {bp.rooms.map((room) => (
              <View
                key={room.id}
                style={[
                  styles.roomChip,
                  {
                    backgroundColor: room.color + "44",
                    borderColor: room.color,
                  },
                ]}
              >
                <Text style={[styles.roomChipText, { color: room.color }]}>
                  {room.label}
                </Text>
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
          {importMutation.isPending ? "가져오는 중…" : "📥  내 집으로 가져오기"}
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
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  houseEmoji: { fontSize: 52 },
  houseName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  houseMeta: { fontSize: 12, color: "#AAA" },
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
  roomGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roomChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  roomChipText: { fontSize: 13, fontWeight: "700" },
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
