/**
 * ProfileScreen
 * - 내 프로필 (닉네임, 이메일, 가입일)
 * - 닉네임 편집
 * - 슬롯 현황
 * - 슬롯 상점 / 구매 내역 이동
 * - 로그아웃 / 회원 탈퇴
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { profileApi } from "@/api/profile";
import { useAuthStore } from "@/store/authStore";
import { useImagePicker } from "@/hooks/useImagePicker";
import { toast } from "@/lib/toast";
import type { ProfileStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const { user: cachedUser, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const [nicknameModal, setNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");

  const avatarMutation = useMutation({
    mutationFn: (imageUrl: string) =>
      profileApi.updateMe({ profileImageUrl: imageUrl }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
    onError: () => Alert.alert("오류", "프로필 사진 업데이트에 실패했습니다."),
  });

  const { pick: pickAvatar, uploading: avatarUploading } = useImagePicker({
    onSuccess: (url) => avatarMutation.mutate(url),
  });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await profileApi.getMe();
      return data;
    },
    initialData: cachedUser ?? undefined,
  });

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const { data } = await profileApi.getSlots();
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (nickname: string) => profileApi.updateMe({ nickname }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setNicknameModal(false);
      toast.success("닉네임 변경 완료");
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert("오류", e.response?.data?.message ?? "변경에 실패했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: profileApi.deleteMe,
    onSuccess: () => {
      logout();
    },
    onError: () => {
      Alert.alert("오류", "탈퇴 처리 중 오류가 발생했습니다.");
    },
  });

  const handleLogout = () => {
    Alert.alert("로그아웃", "로그아웃하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: logout },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      "회원 탈퇴",
      "탈퇴하면 모든 데이터가 삭제됩니다.\n정말 탈퇴하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

  const handleEditNickname = () => {
    setNicknameInput(user?.nickname ?? "");
    setNicknameModal(true);
  };

  if (userLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  const houseSlot = slots?.houses;
  const furnitureSlot = slots?.furniture;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={pickAvatar}
          disabled={avatarUploading}
        >
          {avatarUploading ? (
            <View style={styles.avatar}>
              <ActivityIndicator color="#FFF" />
            </View>
          ) : user?.profileImageUrl ? (
            <Image
              source={{ uri: user.profileImageUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.nickname?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditBadgeText}>📷</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.nickname}>{user?.nickname}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.since}>
            가입일{" "}
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString("ko-KR")
              : ""}
          </Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={handleEditNickname}>
          <Text style={styles.editBtnText}>편집</Text>
        </TouchableOpacity>
      </View>

      {/* 슬롯 현황 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>슬롯 현황</Text>
        {slotsLoading ? (
          <ActivityIndicator color="#4A90E2" />
        ) : (
          <View style={styles.slotRow}>
            <SlotCard
              label="집 슬롯"
              used={houseSlot?.used ?? 0}
              max={houseSlot?.max ?? 1}
              color="#4A90E2"
            />
            <SlotCard
              label="가구 슬롯"
              used={furnitureSlot?.used ?? 0}
              max={furnitureSlot?.max ?? 12}
              color="#7C5CBF"
            />
          </View>
        )}
      </View>

      {/* 메뉴 */}
      <View style={styles.section}>
        <MenuRow
          icon="🛍️"
          label="슬롯 상점"
          onPress={() => navigation.navigate("SlotShop")}
        />
        <View style={styles.divider} />
        <MenuRow
          icon="📋"
          label="구매 내역"
          onPress={() => navigation.navigate("PurchaseHistory")}
        />
      </View>

      {/* 계정 */}
      <View style={styles.section}>
        <MenuRow icon="🚪" label="로그아웃" onPress={handleLogout} danger />
        <View style={styles.divider} />
        <MenuRow
          icon="⚠️"
          label="회원 탈퇴"
          onPress={handleDelete}
          danger
          loading={deleteMutation.isPending}
        />
      </View>

      {/* 닉네임 편집 모달 */}
      <Modal
        visible={nicknameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setNicknameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>닉네임 변경</Text>
            <TextInput
              style={styles.modalInput}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder="새 닉네임을 입력하세요"
              maxLength={16}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setNicknameModal(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalOkBtn,
                  updateMutation.isPending && { opacity: 0.6 },
                ]}
                onPress={() => {
                  const trimmed = nicknameInput.trim();
                  if (!trimmed) {
                    Alert.alert("알림", "닉네임을 입력해 주세요.");
                    return;
                  }
                  updateMutation.mutate(trimmed);
                }}
                disabled={updateMutation.isPending}
              >
                <Text style={styles.modalOkText}>
                  {updateMutation.isPending ? "저장 중…" : "저장"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SlotCard({
  label,
  used,
  max,
  color,
}: {
  label: string;
  used: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(used / max, 1) : 0;
  return (
    <View style={slotStyles.card}>
      <Text style={slotStyles.label}>{label}</Text>
      <Text style={[slotStyles.count, { color }]}>
        {used} / {max}
      </Text>
      <View style={slotStyles.track}>
        <View
          style={[
            slotStyles.fill,
            { width: `${pct * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger = false,
  loading = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={menuStyles.row}
      onPress={onPress}
      disabled={loading}
    >
      <Text style={menuStyles.icon}>{icon}</Text>
      <Text style={[menuStyles.label, danger && menuStyles.labelDanger]}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color="#E74C3C" />
      ) : (
        <Text style={menuStyles.arrow}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarWrap: { position: "relative" },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarEditBadgeText: { fontSize: 10 },
  avatarText: { fontSize: 26, color: "#FFF", fontWeight: "700" },
  profileInfo: { flex: 1, gap: 2 },
  nickname: { fontSize: 17, fontWeight: "700", color: "#111" },
  email: { fontSize: 13, color: "#888" },
  since: { fontSize: 12, color: "#BBB" },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#4A90E2",
  },
  editBtnText: { color: "#4A90E2", fontSize: 13, fontWeight: "600" },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    gap: 10,
  },
  sectionTitle: { fontSize: 13, color: "#888", fontWeight: "700" },
  slotRow: { flexDirection: "row", gap: 10 },
  divider: { height: 1, backgroundColor: "#F0F0F0" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#DDD",
    alignItems: "center",
  },
  modalCancelText: { color: "#666", fontWeight: "600" },
  modalOkBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#4A90E2",
    alignItems: "center",
  },
  modalOkText: { color: "#FFF", fontWeight: "700" },
});

const slotStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  label: { fontSize: 12, color: "#888", fontWeight: "600" },
  count: { fontSize: 20, fontWeight: "800" },
  track: {
    height: 6,
    backgroundColor: "#E8E8E8",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3 },
});

const menuStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  icon: { fontSize: 20 },
  label: { flex: 1, fontSize: 15, color: "#333" },
  labelDanger: { color: "#E74C3C" },
  arrow: { fontSize: 20, color: "#CCC" },
});
