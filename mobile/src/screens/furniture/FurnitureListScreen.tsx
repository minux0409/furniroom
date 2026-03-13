import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { furnitureApi } from "@/api/furniture";
import type { Furniture } from "@/types";
import type { FurnitureStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<FurnitureStackParamList, "FurnitureList">;

const SHAPE_LABEL: Record<Furniture["shapeType"], string> = {
  box: "직육면체",
  cylinder: "원기둥",
  l_shape: "L자형",
  custom: "커스텀",
};

const SHAPE_COLOR: Record<Furniture["shapeType"], string> = {
  box: "#A0C4FF",
  cylinder: "#BDB2FF",
  l_shape: "#CAFFBF",
  custom: "#FFD6A5",
};

export function FurnitureListScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["furniture", search],
    queryFn: () =>
      furnitureApi
        .getAll({ search: search.trim() || undefined, limit: 50 })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => furnitureApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["furniture"] }),
    onError: () => Alert.alert("오류", "삭제에 실패했습니다."),
  });

  const handleLongPress = (item: Furniture) => {
    Alert.alert(item.name, "이 가구를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>불러오기에 실패했습니다.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items = data?.items ?? [];

  return (
    <View style={styles.root}>
      {/* 검색바 */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="가구 이름 검색…"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>등록된 가구가 없어요</Text>
          <Text style={styles.emptyHint}>
            아래 ＋ 버튼으로 가구를 추가해 보세요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("FurnitureDetail", { furnitureId: item.id })
              }
              onLongPress={() => handleLongPress(item)}
              activeOpacity={0.7}
            >
              {/* 모양 아이콘 */}
              <View
                style={[
                  styles.shapeIcon,
                  { backgroundColor: SHAPE_COLOR[item.shapeType] },
                ]}
              >
                <Text style={styles.shapeIconText}>
                  {item.shapeType === "cylinder" ? "○" : "□"}
                </Text>
              </View>

              {/* 정보 */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSize}>
                  {item.widthCm} × {item.depthCm} × {item.heightCm} cm
                </Text>
                <View style={styles.tagRow}>
                  <View
                    style={[
                      styles.shapeBadge,
                      { backgroundColor: SHAPE_COLOR[item.shapeType] + "88" },
                    ]}
                  >
                    <Text style={styles.shapeBadgeText}>
                      {SHAPE_LABEL[item.shapeType]}
                    </Text>
                  </View>
                  {item.tags.slice(0, 2).map((t) => (
                    <View key={t.tag} style={styles.tag}>
                      <Text style={styles.tagText}>{t.tag}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("FurnitureCreate")}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 16, color: "#888" },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#4A90E2",
    borderRadius: 8,
  },
  retryBtnText: { color: "#FFF", fontWeight: "600" },
  searchRow: {
    padding: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  searchInput: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: "#111",
  },
  list: { padding: 12, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  shapeIcon: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  shapeIconText: { fontSize: 26 },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#111" },
  cardSize: { fontSize: 12, color: "#888" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  shapeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  shapeBadgeText: { fontSize: 11, color: "#333", fontWeight: "600" },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#EEE",
    borderRadius: 10,
  },
  tagText: { fontSize: 11, color: "#555" },
  chevron: { fontSize: 22, color: "#CCC" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#333" },
  emptyHint: { fontSize: 13, color: "#999" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4A90E2",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: "#FFF", fontSize: 28, lineHeight: 32 },
});
