/**
 * SlotShopScreen
 * - 집 슬롯 / 가구 슬롯 구매 (5개 단위, $1.99)
 * - 현재 슬롯 현황 표시
 * - 구매 후 slots 캐시 무효화
 *
 * 실제 결제 연동 전 단계이므로 "테스트 구매" 버튼으로 동작
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "@/api/profile";

const SLOT_UNIT = 5;
const SLOT_PRICE_USD = 1.99;

interface SlotPackage {
  label: string;
  units: number;
  type: "house" | "furniture";
  emoji: string;
  color: string;
}

const PACKAGES: SlotPackage[] = [
  {
    label: "집 슬롯 5개",
    units: 1,
    type: "house",
    emoji: "🏠",
    color: "#4A90E2",
  },
  {
    label: "집 슬롯 10개",
    units: 2,
    type: "house",
    emoji: "🏠",
    color: "#4A90E2",
  },
  {
    label: "집 슬롯 25개",
    units: 5,
    type: "house",
    emoji: "🏠",
    color: "#4A90E2",
  },
  {
    label: "가구 슬롯 5개",
    units: 1,
    type: "furniture",
    emoji: "🛋️",
    color: "#7C5CBF",
  },
  {
    label: "가구 슬롯 10개",
    units: 2,
    type: "furniture",
    emoji: "🛋️",
    color: "#7C5CBF",
  },
  {
    label: "가구 슬롯 25개",
    units: 5,
    type: "furniture",
    emoji: "🛋️",
    color: "#7C5CBF",
  },
];

export function SlotShopScreen() {
  const queryClient = useQueryClient();
  const [buyingIdx, setBuyingIdx] = useState<number | null>(null);

  const { data: slots, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const { data } = await profileApi.getSlots();
      return data;
    },
  });

  const buyMutation = useMutation({
    mutationFn: (pkg: SlotPackage) =>
      profileApi.buySlots({ slotType: pkg.type, units: pkg.units }),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      setBuyingIdx(null);
      Alert.alert("구매 완료 🎉", data.message);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setBuyingIdx(null);
      Alert.alert("오류", e.response?.data?.message ?? "구매에 실패했습니다.");
    },
  });

  const handleBuy = (pkg: SlotPackage, idx: number) => {
    Alert.alert(
      "구매 확인",
      `${pkg.label}를\n$${(pkg.units * SLOT_PRICE_USD).toFixed(2)}에 구매하시겠습니까?\n\n(현재는 테스트 구매입니다)`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "구매",
          onPress: () => {
            setBuyingIdx(idx);
            buyMutation.mutate(pkg);
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* 현재 슬롯 현황 */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>현재 슬롯 현황</Text>
        {slotsLoading ? (
          <ActivityIndicator color="#4A90E2" />
        ) : (
          <View style={styles.statusRow}>
            <StatusChip
              emoji="🏠"
              label="집"
              used={slots?.houses.used ?? 0}
              max={slots?.houses.max ?? 1}
              color="#4A90E2"
            />
            <StatusChip
              emoji="🛋️"
              label="가구"
              used={slots?.furniture.used ?? 0}
              max={slots?.furniture.max ?? 12}
              color="#7C5CBF"
            />
          </View>
        )}
      </View>

      {/* 집 슬롯 */}
      <SectionHeader emoji="🏠" title="집 슬롯" color="#4A90E2" />
      {PACKAGES.filter((p) => p.type === "house").map((pkg, i) => {
        const absIdx = i;
        return (
          <PackageCard
            key={pkg.label}
            pkg={pkg}
            onBuy={() => handleBuy(pkg, absIdx)}
            loading={buyingIdx === absIdx && buyMutation.isPending}
          />
        );
      })}

      {/* 가구 슬롯 */}
      <SectionHeader emoji="🛋️" title="가구 슬롯" color="#7C5CBF" />
      {PACKAGES.filter((p) => p.type === "furniture").map((pkg, i) => {
        const absIdx = i + 3;
        return (
          <PackageCard
            key={pkg.label}
            pkg={pkg}
            onBuy={() => handleBuy(pkg, absIdx)}
            loading={buyingIdx === absIdx && buyMutation.isPending}
          />
        );
      })}

      <Text style={styles.disclaimer}>
        * 현재는 테스트 구매 단계입니다. 실결제가 이루어지지 않습니다.
      </Text>
    </ScrollView>
  );
}

function StatusChip({
  emoji,
  label,
  used,
  max,
  color,
}: {
  emoji: string;
  label: string;
  used: number;
  max: number;
  color: string;
}) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.emoji}>{emoji}</Text>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.count, { color }]}>
        {used} / {max}
      </Text>
    </View>
  );
}

function SectionHeader({
  emoji,
  title,
  color,
}: {
  emoji: string;
  title: string;
  color: string;
}) {
  return (
    <View style={secStyles.row}>
      <Text style={secStyles.emoji}>{emoji}</Text>
      <Text style={[secStyles.title, { color }]}>{title}</Text>
    </View>
  );
}

function PackageCard({
  pkg,
  onBuy,
  loading,
}: {
  pkg: SlotPackage;
  onBuy: () => void;
  loading: boolean;
}) {
  const total = pkg.units * SLOT_UNIT;
  const price = (pkg.units * SLOT_PRICE_USD).toFixed(2);
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.left}>
        <Text style={cardStyles.label}>{pkg.label}</Text>
        <Text style={cardStyles.sub}>슬롯 {total}개 추가</Text>
      </View>
      <View style={cardStyles.right}>
        <Text style={[cardStyles.price, { color: pkg.color }]}>${price}</Text>
        <TouchableOpacity
          style={[
            cardStyles.btn,
            { backgroundColor: pkg.color },
            loading && { opacity: 0.5 },
          ]}
          onPress={onBuy}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={cardStyles.btnText}>구매</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  statusCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 4,
  },
  statusTitle: { fontSize: 13, color: "#888", fontWeight: "700" },
  statusRow: { flexDirection: "row", gap: 10 },
  disclaimer: {
    textAlign: "center",
    fontSize: 12,
    color: "#BBB",
    marginTop: 6,
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  emoji: { fontSize: 20 },
  label: { fontSize: 12, color: "#888" },
  count: { fontSize: 16, fontWeight: "800" },
});

const secStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  emoji: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: "700" },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  left: { gap: 2 },
  label: { fontSize: 15, fontWeight: "600", color: "#111" },
  sub: { fontSize: 12, color: "#888" },
  right: { flexDirection: "row", alignItems: "center", gap: 12 },
  price: { fontSize: 16, fontWeight: "800" },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  btnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
});
