import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Pattern,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HomeStackParamList } from "@/navigation/types";
import { housesApi } from "@/api/houses";

// ─── Blueprint 타입 ───────────────────────────────────────────────────────────

export interface BlueprintPoint {
  x: number; // 0~1 정규화 좌표
  y: number;
}

export interface BlueprintRoom {
  id: string;
  label: string;
  color: string;
  points: BlueprintPoint[];
}

export interface BlueprintData {
  rooms: BlueprintRoom[];
  gridSize: number; // cm / 그리드 셀
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const ROOM_COLORS = [
  "#4A90E2",
  "#7ED321",
  "#F5A623",
  "#BD10E0",
  "#E85B5B",
  "#50E3C2",
  "#9B59B6",
  "#E67E22",
];

const CLOSE_THRESHOLD = 20; // px — 첫 점 근처 클릭 시 닫기
const GRID_PX = 40; // 편집기 격자 크기 (SVG Pattern과 일치)
const AXIS_SNAP_PX = 14; // 수평/수직 스냅 임계값 (px)

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function norm(val: number, size: number): number {
  return val / size;
}

function denorm(val: number, size: number): number {
  return val * size;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function newRoomId(): string {
  return `room_${Date.now()}`;
}

// 간격 스냅
function snapGrid(val: number): number {
  return Math.round(val / GRID_PX) * GRID_PX;
}

// 수평/수직 축 스냅 (직선 보조)
function snapAxis(
  px: number,
  py: number,
  lx: number,
  ly: number,
): { px: number; py: number } {
  const dx = Math.abs(px - lx);
  const dy = Math.abs(py - ly);
  return {
    px: dx < AXIS_SNAP_PX ? lx : px,
    py: dy < AXIS_SNAP_PX ? ly : py,
  };
}

// ─── Props ─────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<HomeStackParamList, "HouseEditor">;

// ─── Component ──────────────────────────────────────────────────────────────

export function HouseEditorScreen({ route, navigation }: Props) {
  const { houseId } = route.params;
  const queryClient = useQueryClient();

  // 캔버스 크기
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // 완성된 방 목록
  const [rooms, setRooms] = useState<BlueprintRoom[]>([]);

  // 현재 그리는 중인 방의 점
  const [draft, setDraft] = useState<BlueprintPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // 방 이름 모달
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [pendingRoomName, setPendingRoomName] = useState("");
  // 실시간 터치 위치 (선 미리보기용)
  const [currentTouch, setCurrentTouch] = useState<BlueprintPoint | null>(null);

  // 화면 이동(팬) 상태
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panLastRef = useRef<{ x: number; y: number } | null>(null);
  const grantPosRef = useRef<{ x: number; y: number } | null>(null);

  const colorRef = useRef(0);

  // ─── 집 데이터 로드 ───────────────────────────────────────────────────────

  const { data: house } = useQuery({
    queryKey: ["houses", houseId],
    queryFn: () => housesApi.getById(houseId).then((r) => r.data),
  });

  // 기존 blueprintData가 있으면 로드 (초기 1회)
  const loadedRef = useRef(false);
  if (!loadedRef.current && house?.blueprintData) {
    const bp = house.blueprintData as BlueprintData;
    if (Array.isArray(bp.rooms)) {
      setRooms(bp.rooms);
      colorRef.current = bp.rooms.length % ROOM_COLORS.length;
      loadedRef.current = true;
    }
  }

  // ─── 저장 mutation ────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (blueprintData: BlueprintData) =>
      housesApi.update(houseId, { blueprintData }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["houses"] });
      Alert.alert("저장 완료", "설계도가 저장되었습니다.", [
        { text: "확인", onPress: () => navigation.goBack() },
      ]);
    },
    onError: () => Alert.alert("오류", "저장 중 오류가 발생했습니다."),
  });

  // ─── 저장 ────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    if (rooms.length === 0) {
      Alert.alert("알림", "방을 하나 이상 그려주세요.");
      return;
    }
    saveMutation.mutate({ rooms, gridSize: 50 });
  }, [rooms, saveMutation]);

  // ─── 캔버스 터치 핸들러 ───────────────────────────────────────────────────

  // Grant: 팬 추적 시작만 담당
  const handleCanvasGrant = useCallback((e: GestureResponderEvent) => {
    const pos = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    grantPosRef.current = pos;
    panLastRef.current = pos;
  }, []);

  // Move: 멀티터치=팬, 비그리기 1터치=팬, 그리기 1터치=미리보기
  const handleCanvasMove = useCallback(
    (e: GestureResponderEvent) => {
      const touches = e.nativeEvent.touches;

      if (touches && touches.length >= 2) {
        // 2손가락 팬 (그리기 모드에서도 동작)
        const midX = (touches[0].pageX + touches[1].pageX) / 2;
        const midY = (touches[0].pageY + touches[1].pageY) / 2;
        if (panLastRef.current) {
          const dx = midX - panLastRef.current.x;
          const dy = midY - panLastRef.current.y;
          setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        }
        panLastRef.current = { x: midX, y: midY };
        setCurrentTouch(null);
        return;
      }

      if (!isDrawing) {
        // 뷰 모드: 1손가락 팬
        if (panLastRef.current) {
          const dx = e.nativeEvent.pageX - panLastRef.current.x;
          const dy = e.nativeEvent.pageY - panLastRef.current.y;
          setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        }
        panLastRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        return;
      }

      // 그리기 모드 + 1손가락: 실시간 선 미리보기
      const { locationX: rawX, locationY: rawY } = e.nativeEvent;
      const { w, h } = canvasSize;
      if (w === 0 || h === 0) return;

      const canvasX = rawX - panOffset.x;
      const canvasY = rawY - panOffset.y;
      let px = snapGrid(canvasX);
      let py = snapGrid(canvasY);

      if (draft.length > 0) {
        const last = draft[draft.length - 1];
        const snapped = snapAxis(px, py, denorm(last.x, w), denorm(last.y, h));
        px = snapped.px;
        py = snapped.py;
      }
      setCurrentTouch({ x: norm(px, w), y: norm(py, h) });
    },
    [isDrawing, draft, canvasSize, panOffset],
  );

  // Release: 탭이면 점 추가 (이동이 없을 때만)
  const handleCanvasRelease = useCallback(
    (e: GestureResponderEvent) => {
      setCurrentTouch(null);

      if (isDrawing && grantPosRef.current) {
        const dx = e.nativeEvent.pageX - grantPosRef.current.x;
        const dy = e.nativeEvent.pageY - grantPosRef.current.y;
        const isTap = Math.sqrt(dx * dx + dy * dy) < 10;

        if (isTap) {
          const { locationX: rawX, locationY: rawY } = e.nativeEvent;
          const { w, h } = canvasSize;
          if (w > 0 && h > 0) {
            const canvasX = rawX - panOffset.x;
            const canvasY = rawY - panOffset.y;

            if (draft.length >= 3) {
              const first = draft[0];
              const fx = denorm(first.x, w);
              const fy = denorm(first.y, h);
              if (dist(canvasX, canvasY, fx, fy) < CLOSE_THRESHOLD) {
                setPendingRoomName(`방 ${rooms.length + 1}`);
                setNameModalVisible(true);
                panLastRef.current = null;
                grantPosRef.current = null;
                return;
              }
            }

            let px = snapGrid(canvasX);
            let py = snapGrid(canvasY);

            if (draft.length > 0) {
              const last = draft[draft.length - 1];
              const snapped = snapAxis(
                px,
                py,
                denorm(last.x, w),
                denorm(last.y, h),
              );
              px = snapped.px;
              py = snapped.py;
            }
            setDraft((prev) => [...prev, { x: norm(px, w), y: norm(py, h) }]);
          }
        }
      }

      panLastRef.current = null;
      grantPosRef.current = null;
    },
    [isDrawing, draft, canvasSize, rooms.length, panOffset],
  );

  // ─── 방 이름 확정 ─────────────────────────────────────────────────────────

  const handleConfirmRoomName = useCallback(() => {
    const label = pendingRoomName.trim() || `방 ${rooms.length + 1}`;
    const color = ROOM_COLORS[colorRef.current % ROOM_COLORS.length];
    colorRef.current += 1;

    setRooms((prev) => [
      ...prev,
      { id: newRoomId(), label, color, points: [...draft] },
    ]);
    setDraft([]);
    setIsDrawing(false);
    setNameModalVisible(false);
    setPendingRoomName("");
  }, [pendingRoomName, rooms.length, draft]);

  // ─── Undo ────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    if (draft.length > 0) {
      setDraft((prev) => prev.slice(0, -1));
    } else if (rooms.length > 0) {
      setRooms((prev) => prev.slice(0, -1));
    }
  }, [draft.length, rooms.length]);

  // ─── 초기화 ──────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    Alert.alert("초기화", "모든 방을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          setRooms([]);
          setDraft([]);
          setIsDrawing(false);
          colorRef.current = 0;
        },
      },
    ]);
  }, []);

  // ─── 방 추가 시작 ─────────────────────────────────────────────────────────

  const handleStartDrawing = useCallback(() => {
    if (isDrawing) {
      setDraft([]);
      setIsDrawing(false);
      setCurrentTouch(null);
    } else {
      setIsDrawing(true);
    }
  }, [isDrawing]);

  // ─── 뷰 초기화 ────────────────────────────────────────────────────────────

  const handleResetView = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // ─── 캔버스 레이아웃 ──────────────────────────────────────────────────────

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ w: width, h: height });
  }, []);

  // ─── SVG 렌더 ─────────────────────────────────────────────────────────────

  const { w, h } = canvasSize;

  return (
    <View style={styles.root}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{house?.name ?? "설계도 편집"}</Text>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            saveMutation.isPending && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {saveMutation.isPending ? "저장 중…" : "저장"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 캔버스 */}
      <View
        style={styles.canvas}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleCanvasGrant}
        onResponderMove={handleCanvasMove}
        onResponderRelease={handleCanvasRelease}
      >
        {w > 0 && h > 0 && (
          <Svg width={w} height={h}>
            {/* 격자 */}
            <Defs>
              <Pattern
                id="grid"
                x={panOffset.x % 40}
                y={panOffset.y % 40}
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <Rect
                  width="40"
                  height="40"
                  fill="none"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
              </Pattern>
            </Defs>
            <Rect width={w} height={h} fill="url(#grid)" />

            {/* 팬 오프셋 적용된 콘텐츠 */}
            <G x={panOffset.x} y={panOffset.y}>
              {/* 완성된 방 */}
              {rooms.map((room) => {
                const pts = room.points
                  .map((p) => `${denorm(p.x, w)},${denorm(p.y, h)}`)
                  .join(" ");
                const cx =
                  room.points.reduce((s, p) => s + denorm(p.x, w), 0) /
                  room.points.length;
                const cy =
                  room.points.reduce((s, p) => s + denorm(p.y, h), 0) /
                  room.points.length;
                return (
                  <React.Fragment key={room.id}>
                    <Polygon
                      points={pts}
                      fill={room.color + "55"}
                      stroke={room.color}
                      strokeWidth="2"
                    />
                    <SvgText
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fontSize="13"
                      fontWeight="600"
                      fill={room.color}
                    >
                      {room.label}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* 드래프트 선분 */}
              {draft.map((p, i) => {
                if (i === 0) return null;
                const prev = draft[i - 1];
                return (
                  <Line
                    key={`dl_${i}`}
                    x1={denorm(prev.x, w)}
                    y1={denorm(prev.y, h)}
                    x2={denorm(p.x, w)}
                    y2={denorm(p.y, h)}
                    stroke="#FF6B6B"
                    strokeWidth="2"
                    strokeDasharray="6,3"
                  />
                );
              })}

              {/* 실시간 미리보기 선 (마지막 점 → 현재 손가락 위치) */}
              {isDrawing && draft.length > 0 && currentTouch && (
                <Line
                  x1={denorm(draft[draft.length - 1].x, w)}
                  y1={denorm(draft[draft.length - 1].y, h)}
                  x2={denorm(currentTouch.x, w)}
                  y2={denorm(currentTouch.y, h)}
                  stroke="#FF6B6B"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  opacity={0.6}
                />
              )}

              {/* 드래프트 점 */}
              {draft.map((p, i) => (
                <Circle
                  key={`dp_${i}`}
                  cx={denorm(p.x, w)}
                  cy={denorm(p.y, h)}
                  r={i === 0 ? 8 : 5}
                  fill={i === 0 ? "#FF6B6B" : "#FFF"}
                  stroke="#FF6B6B"
                  strokeWidth="2"
                />
              ))}

              {/* 현재 스냅 위치 표시 */}
              {isDrawing && currentTouch && (
                <Circle
                  cx={denorm(currentTouch.x, w)}
                  cy={denorm(currentTouch.y, h)}
                  r={4}
                  fill="#FF6B6B"
                  opacity={0.8}
                />
              )}

              {/* 닫기 힌트 (점 3개 이상이면 첫 점 강조) */}
              {isDrawing && draft.length >= 3 && (
                <Circle
                  cx={denorm(draft[0].x, w)}
                  cy={denorm(draft[0].y, h)}
                  r={14}
                  fill="none"
                  stroke="#FF6B6B"
                  strokeWidth="1.5"
                  opacity={0.5}
                />
              )}
            </G>
          </Svg>
        )}

        {/* 안내 텍스트 */}
        {isDrawing && (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>
              {draft.length === 0
                ? "격자에 맞춰 첫 점을 탭하세요 · 두 손가락으로 이동"
                : draft.length < 3
                  ? `점 ${draft.length}개 · 더 찍으세요 (수평/수직 자동 보정)`
                  : "첫 번째 점(빨간 원)을 탭해 닫으세요"}
            </Text>
          </View>
        )}
        {!isDrawing && (
          <View style={styles.hint} pointerEvents="none">
            <Text style={styles.hintText}>한 손가락으로 드래그해 이동</Text>
          </View>
        )}
      </View>

      {/* 하단 툴바 */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, isDrawing && styles.toolBtnActive]}
          onPress={handleStartDrawing}
        >
          <Text
            style={[styles.toolBtnText, isDrawing && styles.toolBtnTextActive]}
          >
            {isDrawing ? "취소" : "방 추가"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={handleUndo}
          disabled={rooms.length === 0 && draft.length === 0}
        >
          <Text style={styles.toolBtnText}>실행 취소</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolBtn} onPress={handleResetView}>
          <Text style={styles.toolBtnText}>뷰 초기화</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolBtn}
          onPress={handleReset}
          disabled={rooms.length === 0 && draft.length === 0}
        >
          <Text style={[styles.toolBtnText, styles.toolBtnDanger]}>초기화</Text>
        </TouchableOpacity>
      </View>

      {/* 방 이름 입력 모달 */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>방 이름</Text>
            <TextInput
              style={styles.modalInput}
              value={pendingRoomName}
              onChangeText={setPendingRoomName}
              placeholder="예: 거실, 침실, 주방"
              autoFocus
              onSubmitEditing={handleConfirmRoomName}
              returnKeyType="done"
              maxLength={20}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setNameModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmRoomName}
              >
                <Text style={styles.modalConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  saveBtn: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnDisabled: {
    backgroundColor: "#AAC9EF",
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  canvas: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  hint: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  hintText: {
    color: "#FFF",
    fontSize: 13,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  toolBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
  },
  toolBtnActive: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  toolBtnText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  toolBtnTextActive: {
    color: "#FFF",
  },
  toolBtnDanger: {
    color: "#E74C3C",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: 300,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
    color: "#111",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
    color: "#111",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  modalCancelText: {
    color: "#666",
    fontSize: 14,
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#4A90E2",
  },
  modalConfirmText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
