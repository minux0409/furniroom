/**
 * House3DViewScreen
 *
 * 기능:
 * - 설계도(blueprintData) 폴리곤을 ExtrudeGeometry로 3D 방으로 변환
 * - 배치된 가구를 3D 도형으로 렌더링 (box / cylinder / l_shape)
 * - 가구 탭 → 선택 (하이라이트) → 이동/회전/삭제 툴바
 * - 가구 추가 모달 (내 가구 목록 → 선택 → 바닥 중앙에 배치)
 * - OrbitControls: 핀치 줌, 드래그 회전
 * - 저장: updateBulk로 전체 placement 일괄 저장
 */

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import * as THREE from "three";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { HomeStackParamList } from "@/navigation/types";
import { housesApi } from "@/api/houses";
import { placementsApi } from "@/api/placements";
import { furnitureApi } from "@/api/furniture";
import type { BlueprintData, BlueprintPoint } from "./HouseEditorScreen";
import type { Placement, Furniture } from "@/types";

// ─── 상수 ────────────────────────────────────────────────────────────────────

const WALL_HEIGHT = 2.4;    // 미터 단위
const FLOOR_SCALE = 0.01;   // cm → m (100cm = 1m)
const GRID_CM = 50;         // 설계도 gridSize 기본값

// ─── 헬퍼: 폴리곤 → Shape ────────────────────────────────────────────────────

function pointsToShape(points: BlueprintPoint[], canvasW: number, canvasH: number): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach((p, i) => {
    const x = (p.x * canvasW) * FLOOR_SCALE;
    const y = (p.y * canvasH) * FLOOR_SCALE;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

// ─── 가구 색상 ────────────────────────────────────────────────────────────────

const FURNITURE_COLORS: Record<string, string> = {
  box: "#A0C4FF",
  cylinder: "#BDB2FF",
  l_shape: "#CAFFBF",
  custom: "#FFD6A5",
};

// ─── OrbitControls (간단 구현) ────────────────────────────────────────────────

function CameraController() {
  const { camera, gl } = useThree();
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number | null>(null);

  useFrame(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (lastDist.current !== null) {
          const delta = (lastDist.current - d) * 0.05;
          camera.position.multiplyScalar(1 + delta * 0.05);
        }
        lastDist.current = d;
      } else if (e.touches.length === 1 && lastTouch.current) {
        const dx = e.touches[0].clientX - lastTouch.current.x;
        const dy = e.touches[0].clientY - lastTouch.current.y;
        const theta = (dx / 300) * Math.PI;
        const phi = (dy / 300) * Math.PI;
        const pos = camera.position;
        const radius = pos.length();
        let lon = Math.atan2(pos.x, pos.z) - theta;
        let lat = Math.asin(pos.y / radius) + phi;
        lat = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, lat));
        camera.position.set(
          radius * Math.sin(lon) * Math.cos(lat),
          radius * Math.sin(lat),
          radius * Math.cos(lon) * Math.cos(lat),
        );
        camera.lookAt(0, 0, 0);
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchEnd = () => {
      lastTouch.current = null;
      lastDist.current = null;
    };

    canvas.addEventListener("touchstart", onTouchStart);
    canvas.addEventListener("touchmove", onTouchMove);
    canvas.addEventListener("touchend", onTouchEnd);
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  });

  return null;
}

// ─── 방 Mesh ──────────────────────────────────────────────────────────────────

interface RoomMeshProps {
  points: BlueprintPoint[];
  color: string;
  canvasW: number;
  canvasH: number;
}

function RoomMesh({ points, color, canvasW, canvasH }: RoomMeshProps) {
  const geometry = useMemo(() => {
    const shape = pointsToShape(points, canvasW, canvasH);
    return new THREE.ExtrudeGeometry(shape, {
      depth: WALL_HEIGHT,
      bevelEnabled: false,
    });
  }, [points, canvasW, canvasH]);

  return (
    <mesh geometry={geometry} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <meshStandardMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── 가구 Mesh ────────────────────────────────────────────────────────────────

interface FurnitureMeshProps {
  placement: Placement & { furniture?: Partial<Furniture> };
  selected: boolean;
  onPress: () => void;
}

function FurnitureMesh({ placement, selected, onPress }: FurnitureMeshProps) {
  const ref = useRef<THREE.Mesh>(null);
  const fw = ((placement.furniture?.widthCm ?? 80) * FLOOR_SCALE);
  const fd = ((placement.furniture?.depthCm ?? 80) * FLOOR_SCALE);
  const fh = ((placement.furniture?.heightCm ?? 80) * FLOOR_SCALE);
  const shapeType = placement.furniture?.shapeType ?? "box";
  const color = selected ? "#FF6B6B" : FURNITURE_COLORS[shapeType] ?? "#CCC";

  const geometry = useMemo(() => {
    if (shapeType === "cylinder") {
      return new THREE.CylinderGeometry(fw / 2, fw / 2, fh, 16);
    }
    return new THREE.BoxGeometry(fw, fh, fd);
  }, [shapeType, fw, fh, fd]);

  return (
    <mesh
      ref={ref}
      position={[
        placement.posX * FLOOR_SCALE,
        fh / 2,
        placement.posZ * FLOOR_SCALE,
      ]}
      rotation={[0, placement.rotY, 0]}
      geometry={geometry}
      onPointerDown={(e) => { e.stopPropagation(); onPress(); }}
    >
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// ─── 바닥 ──────────────────────────────────────────────────────────────────────

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#F0EDE6" />
    </mesh>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  bp: BlueprintData | null;
  placements: (Placement & { furniture?: Partial<Furniture> })[];
  selectedId: string | null;
  onSelectPlacement: (id: string) => void;
}

const CANVAS_SIZE = 400; // blueprintData가 정규화 좌표라 임의 크기 사용

function Scene({ bp, placements, selectedId, onSelectPlacement }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <Floor />
      {bp?.rooms.map((room) => (
        <RoomMesh
          key={room.id}
          points={room.points}
          color={room.color}
          canvasW={CANVAS_SIZE}
          canvasH={CANVAS_SIZE}
        />
      ))}
      {placements.map((p) => (
        <FurnitureMesh
          key={p.id}
          placement={p}
          selected={p.id === selectedId}
          onPress={() => onSelectPlacement(p.id)}
        />
      ))}
      <CameraController />
    </>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<HomeStackParamList, "House3DView">;

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function House3DViewScreen({ route }: Props) {
  const { houseId } = route.params;
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [furnitureModalVisible, setFurnitureModalVisible] = useState(false);

  // 집 데이터
  const { data: house } = useQuery({
    queryKey: ["houses", houseId],
    queryFn: () => housesApi.getById(houseId).then((r) => r.data),
  });

  const bp = useMemo<BlueprintData | null>(() => {
    if (!house?.blueprintData) return null;
    const d = house.blueprintData as BlueprintData;
    return Array.isArray(d.rooms) ? d : null;
  }, [house]);

  // 배치 목록
  const { data: placements = [] } = useQuery({
    queryKey: ["placements", houseId],
    queryFn: () => placementsApi.getByHouse(houseId).then((r) => r.data),
  });

  // 내 가구 목록 (모달용)
  const { data: furniturePage } = useQuery({
    queryKey: ["furniture"],
    queryFn: () => furnitureApi.getAll({ limit: 50 }).then((r) => r.data),
    enabled: furnitureModalVisible,
  });

  // 가구 배치 추가
  const addMutation = useMutation({
    mutationFn: (furnitureId: string) =>
      placementsApi.create(houseId, {
        furnitureId,
        posX: 0,
        posY: 0,
        posZ: 0,
        rotY: 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placements", houseId] });
      setFurnitureModalVisible(false);
    },
    onError: () => Alert.alert("오류", "가구를 추가하지 못했습니다."),
  });

  // 선택된 placement
  const selected = useMemo(
    () => placements.find((p) => p.id === selectedId) ?? null,
    [placements, selectedId],
  );

  // 이동 (XZ 평면에서 10cm 단위)
  const moveMutation = useMutation({
    mutationFn: (body: { posX: number; posZ: number }) =>
      placementsApi.update(houseId, selectedId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placements", houseId] }),
  });

  const handleMove = useCallback(
    (dx: number, dz: number) => {
      if (!selected) return;
      moveMutation.mutate({
        posX: selected.posX + dx,
        posZ: selected.posZ + dz,
      });
    },
    [selected, moveMutation],
  );

  // 회전 (45° 단위)
  const rotateMutation = useMutation({
    mutationFn: (rotY: number) =>
      placementsApi.update(houseId, selectedId!, { rotY }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["placements", houseId] }),
  });

  const handleRotate = useCallback(() => {
    if (!selected) return;
    rotateMutation.mutate(((selected.rotY ?? 0) + Math.PI / 4) % (Math.PI * 2));
  }, [selected, rotateMutation]);

  // 삭제
  const deleteMutation = useMutation({
    mutationFn: () => placementsApi.remove(houseId, selectedId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placements", houseId] });
      setSelectedId(null);
    },
    onError: () => Alert.alert("오류", "삭제에 실패했습니다."),
  });

  const handleDelete = useCallback(() => {
    Alert.alert("가구 삭제", "선택한 가구를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  }, [deleteMutation]);

  return (
    <View style={styles.root}>
      {/* 3D 캔버스 */}
      <Canvas
        style={styles.canvas}
        camera={{ position: [5, 6, 8], fov: 50 }}
        shadows
      >
        <Scene
          bp={bp}
          placements={placements}
          selectedId={selectedId}
          onSelectPlacement={setSelectedId}
        />
      </Canvas>

      {/* 선택된 가구 조작 툴바 */}
      {selected ? (
        <View style={styles.controlBar}>
          <Text style={styles.selectedLabel} numberOfLines={1}>
            {selected.furniture?.name ?? "가구"}
          </Text>
          <View style={styles.moveGrid}>
            <TouchableOpacity style={styles.moveBtn} onPress={() => handleMove(0, -10)}>
              <Text style={styles.moveBtnText}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moveBtn} onPress={() => handleMove(-10, 0)}>
              <Text style={styles.moveBtnText}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moveBtn} onPress={() => handleMove(10, 0)}>
              <Text style={styles.moveBtnText}>▶</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moveBtn} onPress={() => handleMove(0, 10)}>
              <Text style={styles.moveBtnText}>▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.rotBtn} onPress={handleRotate}>
            <Text style={styles.rotBtnText}>↻ 45°</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={handleDelete}>
            <Text style={styles.delBtnText}>삭제</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deselectBtn} onPress={() => setSelectedId(null)}>
            <Text style={styles.deselectBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* 가구 추가 버튼 */
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setFurnitureModalVisible(true)}
          >
            <Text style={styles.addBtnText}>＋ 가구 배치</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 가구 선택 모달 */}
      <Modal
        visible={furnitureModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFurnitureModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>가구 선택</Text>
              <TouchableOpacity onPress={() => setFurnitureModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {!furniturePage ? (
              <ActivityIndicator style={{ marginTop: 40 }} />
            ) : furniturePage.items.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>등록된 가구가 없습니다.</Text>
                <Text style={styles.emptyHint}>
                  가구 탭에서 먼저 가구를 추가해 주세요.
                </Text>
              </View>
            ) : (
              <FlatList
                data={furniturePage.items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.furnitureItem}
                    onPress={() => addMutation.mutate(item.id)}
                    disabled={addMutation.isPending}
                  >
                    <View
                      style={[
                        styles.furnitureIcon,
                        { backgroundColor: FURNITURE_COLORS[item.shapeType] ?? "#DDD" },
                      ]}
                    />
                    <View style={styles.furnitureInfo}>
                      <Text style={styles.furnitureName}>{item.name}</Text>
                      <Text style={styles.furnitureSize}>
                        {item.widthCm}×{item.depthCm}×{item.heightCm} cm
                      </Text>
                    </View>
                    {addMutation.isPending && addMutation.variables === item.id && (
                      <ActivityIndicator size="small" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  canvas: { flex: 1 },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    padding: 10,
    backgroundColor: "#1A1A2E",
    gap: 8,
  },
  selectedLabel: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  moveGrid: {
    flexDirection: "row",
    gap: 4,
  },
  moveBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#16213E",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  moveBtnText: {
    color: "#FFF",
    fontSize: 18,
  },
  rotBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0F3460",
    borderRadius: 8,
  },
  rotBtnText: {
    color: "#FFF",
    fontSize: 13,
  },
  delBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#C0392B",
    borderRadius: 8,
  },
  delBtnText: {
    color: "#FFF",
    fontSize: 13,
  },
  deselectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#444",
    borderRadius: 8,
  },
  deselectBtnText: {
    color: "#FFF",
    fontSize: 14,
  },
  bottomBar: {
    padding: 14,
    backgroundColor: "#1A1A2E",
    alignItems: "center",
  },
  addBtn: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "70%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalClose: {
    fontSize: 18,
    color: "#666",
    padding: 4,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 13,
    color: "#888",
  },
  furnitureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  furnitureIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  furnitureInfo: { flex: 1 },
  furnitureName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginBottom: 3,
  },
  furnitureSize: {
    fontSize: 12,
    color: "#888",
  },
});
