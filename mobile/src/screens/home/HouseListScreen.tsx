import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { housesApi } from "@/api/houses";
import { APP_CONFIG } from "@/config/app.config";
import type { House } from "@/types";
import type { HomeStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<HomeStackParamList, "HouseList">;

export function HouseListScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");

  // 집 목록 조회
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["houses"],
    queryFn: () => housesApi.getAll().then((r) => r.data),
  });

  // 집 생성
  const createMutation = useMutation({
    mutationFn: () => housesApi.create(newName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      setModalVisible(false);
      setNewName("");
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "생성 실패",
        e.response?.data?.message ?? "잠시 후 다시 시도해 주세요.",
      );
    },
  });

  // 집 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: string) => housesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["houses"] }),
    onError: () => Alert.alert("오류", "삭제에 실패했습니다."),
  });

  const handleDelete = (house: House) => {
    Alert.alert(`"${house.name}" 삭제`, "정말 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => deleteMutation.mutate(house.id),
      },
    ]);
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      Alert.alert("이름을 입력해 주세요.");
      return;
    }
    createMutation.mutate();
  };

  const houses = data ?? [];
  const maxHouses = APP_CONFIG.FREE_HOUSE_LIMIT;

  // 로딩
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 에러
  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>불러오기 실패</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 슬롯 현황 */}
      <View style={styles.slotBanner}>
        <Text style={styles.slotText}>
          내 집 {houses.length} / {maxHouses}
        </Text>
      </View>

      {/* 집 목록 */}
      <FlatList
        data={houses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 집이 없습니다.</Text>
            <Text style={styles.emptySubText}>
              아래 + 버튼으로 추가해보세요!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate("HouseEditor", { houseId: item.id })
            }
            onLongPress={() => handleDelete(item)}
          >
            {/* 썸네일 자리 */}
            <View style={styles.thumbnail}>
              <Text style={styles.thumbnailIcon}>🏠</Text>
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardSub}>
                {item.isPublic ? "공개" : "비공개"} ·{" "}
                {new Date(item.createdAt).toLocaleDateString("ko-KR")}
              </Text>
            </View>

            {/* 3D 뷰 바로가기 */}
            <TouchableOpacity
              style={styles.view3dBtn}
              onPress={() =>
                navigation.navigate("House3DView", { houseId: item.id })
              }
            >
              <Text style={styles.view3dText}>3D</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      {/* 추가 버튼 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 집 이름 입력 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>새 집 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 우리집, 원룸..."
              value={newName}
              onChangeText={setNewName}
              maxLength={30}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setModalVisible(false);
                  setNewName("");
                }}
              >
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>만들기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, color: "#888", marginBottom: 8 },
  retryText: { fontSize: 14, color: "#4285F4" },
  slotBanner: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  slotText: { fontSize: 13, color: "#555" },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 16, color: "#888" },
  emptySubText: { marginTop: 6, fontSize: 13, color: "#bbb" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailIcon: { fontSize: 28 },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1A1A1A" },
  cardSub: { marginTop: 4, fontSize: 12, color: "#999" },
  view3dBtn: {
    backgroundColor: "#F0F4FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  view3dText: { fontSize: 13, fontWeight: "600", color: "#4285F4" },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4285F4",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { fontSize: 28, color: "#fff", lineHeight: 32 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, color: "#555" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#4285F4",
    alignItems: "center",
  },
  confirmBtnText: { fontSize: 15, color: "#fff", fontWeight: "600" },
});
