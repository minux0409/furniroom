/**
 * CommunityFeedScreen
 * - 상단 탭: 집 | 가구
 * - 집 탭: 공개된 집 카드 목록 (이름, 방 수, 가구 수)
 * - 가구 탭: 공개된 가구 카드 목록 (이름, 크기, 태그)
 * - 카드 탭 → 각 상세 화면
 * - 검색바
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { communityApi } from "@/api/community";
import type { House, Furniture } from "@/types";
import type { CommunityStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<CommunityStackParamList, "CommunityFeed">;

const SHAPE_COLOR: Record<string, string> = {
  box: "#A0C4FF",
  cylinder: "#BDB2FF",
  l_shape: "#CAFFBF",
  custom: "#FFD6A5",
};

// ─── 집 카드 ──────────────────────────────────────────────────

function HouseCard({ item, onPress }: { item: House; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.houseThumb}>
        <Text style={styles.houseThumbText}>🏠</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardMeta}>
          {new Date(item.createdAt).toLocaleDateString("ko-KR")}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── 가구 카드 ────────────────────────────────────────────────

function FurnitureCard({
  item,
  onPress,
}: {
  item: Furniture;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.furnitureThumb,
          { backgroundColor: SHAPE_COLOR[item.shapeType] ?? "#DDD" },
        ]}
      >
        <Text style={styles.furnitureThumbText}>
          {item.shapeType === "cylinder" ? "○" : "□"}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardMeta}>
          {item.widthCm} × {item.depthCm} × {item.heightCm} cm
        </Text>
        {item.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((t) => (
              <View key={t.tag} style={styles.tag}>
                <Text style={styles.tagText}>{t.tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Main ──────────────────────────────────────────────────────

export function CommunityFeedScreen() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<"house" | "furniture">("house");
  const [search, setSearch] = useState("");

  const housesQuery = useQuery({
    queryKey: ["community-houses", search],
    queryFn: () =>
      communityApi
        .getHouses({ search: search.trim() || undefined, limit: 50 })
        .then((r) => r.data),
    enabled: activeTab === "house",
  });

  const furnitureQuery = useQuery({
    queryKey: ["community-furniture", search],
    queryFn: () =>
      communityApi
        .getFurniture({ search: search.trim() || undefined, limit: 50 })
        .then((r) => r.data),
    enabled: activeTab === "furniture",
  });

  const isLoading =
    activeTab === "house" ? housesQuery.isLoading : furnitureQuery.isLoading;
  const isError =
    activeTab === "house" ? housesQuery.isError : furnitureQuery.isError;
  const refetch =
    activeTab === "house" ? housesQuery.refetch : furnitureQuery.refetch;

  return (
    <View style={styles.root}>
      {/* 탭 */}
      <View style={styles.tabBar}>
        {(["house", "furniture"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => {
              setActiveTab(tab);
              setSearch("");
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === "house" ? "집" : "가구"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 검색바 */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={
            activeTab === "house" ? "집 이름 검색…" : "가구 이름 검색…"
          }
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* 콘텐츠 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>불러오기에 실패했습니다.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === "house" ? (
        <FlatList
          data={housesQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>공개된 집이 없습니다.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <HouseCard
              item={item}
              onPress={() =>
                navigation.navigate("CommunityHouseDetail", {
                  houseId: item.id,
                })
              }
            />
          )}
        />
      ) : (
        <FlatList
          data={furnitureQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>공개된 가구가 없습니다.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <FurnitureCard
              item={item}
              onPress={() =>
                navigation.navigate("CommunityFurnitureDetail", {
                  furnitureId: item.id,
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#4A90E2" },
  tabText: { fontSize: 15, color: "#999", fontWeight: "500" },
  tabTextActive: { color: "#4A90E2", fontWeight: "700" },
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
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  houseThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
  },
  houseThumbText: { fontSize: 26 },
  furnitureThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  furnitureThumbText: { fontSize: 26 },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#111" },
  cardMeta: { fontSize: 12, color: "#999" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 },
  tag: {
    backgroundColor: "#EEE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: { fontSize: 11, color: "#555" },
  chevron: { fontSize: 22, color: "#CCC" },
  errorText: { fontSize: 15, color: "#888" },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#4A90E2",
    borderRadius: 8,
  },
  retryBtnText: { color: "#FFF", fontWeight: "600" },
  emptyText: { fontSize: 15, color: "#AAA" },
});
