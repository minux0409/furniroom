/**
 * PurchaseHistoryScreen
 * - 구매 내역 목록
 * - 집/가구 슬롯 구분, 결제 금액, 날짜
 */

import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/profile";
import type { Purchase } from "@/types";

export function PurchaseHistoryScreen() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data } = await profileApi.getPurchases();
      return data;
    },
  });

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
        <Text style={styles.errorText}>불러오는 중 오류가 발생했습니다.</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyText}>구매 내역이 없습니다.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={data}
      keyExtractor={(item) => item.id}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      renderItem={({ item }) => <PurchaseItem item={item} />}
    />
  );
}

function PurchaseItem({ item }: { item: Purchase }) {
  const hasHouse = item.extraHouseSlots > 0;
  const hasFurniture = item.extraFurnitureSlots > 0;
  const date = new Date(item.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = new Date(item.createdAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={itemStyles.card}>
      <View style={itemStyles.iconCol}>
        <Text style={itemStyles.icon}>{hasHouse ? "🏠" : "🛋️"}</Text>
      </View>
      <View style={itemStyles.info}>
        <Text style={itemStyles.slotText}>
          {hasHouse
            ? `집 슬롯 +${item.extraHouseSlots}개`
            : `가구 슬롯 +${item.extraFurnitureSlots}개`}
          {hasHouse && hasFurniture && " / 가구 슬롯 포함"}
        </Text>
        <Text style={itemStyles.date}>
          {date} {time}
        </Text>
      </View>
      <Text style={itemStyles.amount}>${item.amountUsd.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  errorText: { fontSize: 14, color: "#888" },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, color: "#888" },
  sep: { height: 8 },
});

const itemStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconCol: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  icon: { fontSize: 22 },
  info: { flex: 1, gap: 3 },
  slotText: { fontSize: 15, fontWeight: "600", color: "#111" },
  date: { fontSize: 12, color: "#AAA" },
  amount: { fontSize: 16, fontWeight: "800", color: "#4A90E2" },
});
