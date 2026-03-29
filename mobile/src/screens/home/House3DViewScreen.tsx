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

import React, { useCallback, useMemo, useRef, useState } from "react";
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

const WALL_HEIGHT = 2.4; // 미터 단위
const FLOOR_SCALE = 0.01; // cm → m (100cm = 1m)
const GRID_CM = 50; // 설계도 gridSize 기본값

// ─── 헬퍼: 폴리곤 → Shape ────────────────────────────────────────────────────

function pointsToShape(
  points: BlueprintPoint[],
  canvasW: number,
  canvasH: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  points.forEach((p, i) => {
    const x = p.x * canvasW * FLOOR_SCALE;
    const y = p.y * canvasH * FLOOR_SCALE;
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

// ─── 카메라 터치 상태 ─────────────────────────────────────────────────────────
// React Native 터치 핸들러(Canvas 밖)와 useFrame(Canvas 안)을 연결하는 브릿지

const _ct = {
  prevX: 0,
  prevY: 0,
  prevMidX: 0,
  prevMidY: 0,
  prevDist: 0,
  // 한 프레임에서 소비해야 할 누적 델타
  dRotX: 0,
  dRotY: 0,
  dZoom: 0,
  dPanX: 0,
  dPanY: 0,
};

function onCameraStart(e: any): void {
  const t: any[] = e?.nativeEvent?.touches ?? [];
  if (t.length >= 1) {
    _ct.prevX = t[0].pageX;
    _ct.prevY = t[0].pageY;
  }
  if (t.length >= 2) {
    const dx = t[0].pageX - t[1].pageX;
    const dy = t[0].pageY - t[1].pageY;
    _ct.prevDist = Math.sqrt(dx * dx + dy * dy);
    _ct.prevMidX = (t[0].pageX + t[1].pageX) / 2;
    _ct.prevMidY = (t[0].pageY + t[1].pageY) / 2;
  }
}

function onCameraMove(e: any): void {
  const t: any[] = e?.nativeEvent?.touches ?? [];
  if (t.length === 1) {
    // 1손가락 드래그 → 궤도 회전
    _ct.dRotX += (t[0].pageX - _ct.prevX) / 250;
    _ct.dRotY += (t[0].pageY - _ct.prevY) / 250;
    _ct.prevX = t[0].pageX;
    _ct.prevY = t[0].pageY;
  } else if (t.length === 2) {
    // 2손가락 → 핀치 줌 + 드래그 팬
    const dx = t[0].pageX - t[1].pageX;
    const dy = t[0].pageY - t[1].pageY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const midX = (t[0].pageX + t[1].pageX) / 2;
    const midY = (t[0].pageY + t[1].pageY) / 2;
    if (_ct.prevDist > 0) _ct.dZoom += (_ct.prevDist - dist) * 0.006;
    _ct.dPanX += midX - _ct.prevMidX;
    _ct.dPanY += midY - _ct.prevMidY;
    _ct.prevDist = dist;
    _ct.prevMidX = midX;
    _ct.prevMidY = midY;
  }
}

function onCameraEnd(e: any): void {
  const t: any[] = e?.nativeEvent?.touches ?? [];
  if (t.length === 0) {
    _ct.prevDist = 0;
  } else if (t.length === 1) {
    _ct.prevX = t[0].pageX;
    _ct.prevY = t[0].pageY;
    _ct.prevDist = 0;
  }
}

// ─── OrbitControls ───────────────────────────────────────────────────────────

function CameraController() {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    let dirty = false;

    // 1손가락: 궤도 회전
    if (_ct.dRotX !== 0 || _ct.dRotY !== 0) {
      const pos = camera.position.clone().sub(target.current);
      const r = Math.max(0.5, pos.length());
      let lon = Math.atan2(pos.x, pos.z) - _ct.dRotX * Math.PI;
      let lat =
        Math.asin(Math.max(-1, Math.min(1, pos.y / r))) + _ct.dRotY * Math.PI;
      lat = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, lat));
      camera.position.set(
        target.current.x + r * Math.sin(lon) * Math.cos(lat),
        target.current.y + r * Math.sin(lat),
        target.current.z + r * Math.cos(lon) * Math.cos(lat),
      );
      _ct.dRotX = 0;
      _ct.dRotY = 0;
      dirty = true;
    }

    // 핀치: 줌
    if (_ct.dZoom !== 0) {
      const dir = camera.position.clone().sub(target.current);
      const newLen = Math.max(0.5, dir.length() - _ct.dZoom);
      camera.position
        .copy(target.current)
        .addScaledVector(dir.normalize(), newLen);
      _ct.dZoom = 0;
      dirty = true;
    }

    // 2손가락 드래그: 팬
    if (_ct.dPanX !== 0 || _ct.dPanY !== 0) {
      const PAN = 0.015;
      const dir = camera.position.clone().sub(target.current).normalize();
      const right = new THREE.Vector3()
        .crossVectors(dir, new THREE.Vector3(0, 1, 0))
        .normalize();
      const up = new THREE.Vector3().crossVectors(right, dir).normalize();
      const panVec = right
        .clone()
        .multiplyScalar(-_ct.dPanX * PAN)
        .addScaledVector(up, _ct.dPanY * PAN);
      target.current.add(panVec);
      camera.position.add(panVec);
      _ct.dPanX = 0;
      _ct.dPanY = 0;
      dirty = true;
    }

    if (dirty) camera.lookAt(target.current);
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
  const { floorGeo, wallGeo } = useMemo(() => {
    if (!points || points.length < 3) return { floorGeo: null, wallGeo: null };
    const shape = pointsToShape(points, canvasW, canvasH);
    // 바닥 — 두께 없는 평면
    const floorGeo = new THREE.ShapeGeometry(shape);
    // 벽 — ExtrudeGeometry로 높이 생성
    const wallGeo = new THREE.ExtrudeGeometry(shape, {
      depth: WALL_HEIGHT,
      bevelEnabled: false,
    });
    return { floorGeo, wallGeo };
  }, [points, canvasW, canvasH]);

  if (!floorGeo || !wallGeo) return null;

  return (
    <group>
      {/* 바닥 */}
      <mesh
        geometry={floorGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      >
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 벽 */}
      <mesh
        geometry={wallGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>
    </group>
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
  const fw = (placement.furniture?.widthCm ?? 80) * FLOOR_SCALE;
  const fd = (placement.furniture?.depthCm ?? 80) * FLOOR_SCALE;
  const fh = (placement.furniture?.heightCm ?? 80) * FLOOR_SCALE;
  const shapeType = placement.furniture?.shapeType ?? "box";
  const color = selected ? "#FF6B6B" : (FURNITURE_COLORS[shapeType] ?? "#CCC");

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
      onPointerDown={(e) => {
        e.stopPropagation();
        onPress();
      }}
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["placements", houseId] }),
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["placements", houseId] }),
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
      {
        text: "삭제",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  }, [deleteMutation]);

  return (
    <View style={styles.root}>
      {/* 3D 캔버스 */}
      <Canvas
        style={styles.canvas}
        camera={{ position: [3, 5, 6], fov: 55 }}
        shadows
        onTouchStart={onCameraStart}
        onTouchMove={onCameraMove}
        onTouchEnd={onCameraEnd}
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
            <TouchableOpacity
              style={styles.moveBtn}
              onPress={() => handleMove(0, -10)}
            >
              <Text style={styles.moveBtnText}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moveBtn}
              onPress={() => handleMove(-10, 0)}
            >
              <Text style={styles.moveBtnText}>◀</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moveBtn}
              onPress={() => handleMove(10, 0)}
            >
              <Text style={styles.moveBtnText}>▶</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moveBtn}
              onPress={() => handleMove(0, 10)}
            >
              <Text style={styles.moveBtnText}>▼</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.rotBtn} onPress={handleRotate}>
            <Text style={styles.rotBtnText}>↻ 45°</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={handleDelete}>
            <Text style={styles.delBtnText}>삭제</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deselectBtn}
            onPress={() => setSelectedId(null)}
          >
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
            ) : (furniturePage.items ?? []).length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>등록된 가구가 없습니다.</Text>
                <Text style={styles.emptyHint}>
                  하단 가구 탭에서 먼저 가구를 등록해 주세요.
                </Text>
              </View>
            ) : (
              <FlatList
                data={furniturePage.items ?? []}
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
                        {
                          backgroundColor:
                            FURNITURE_COLORS[item.shapeType] ?? "#DDD",
                        },
                      ]}
                    />
                    <View style={styles.furnitureInfo}>
                      <Text style={styles.furnitureName}>{item.name}</Text>
                      <Text style={styles.furnitureSize}>
                        {item.widthCm}×{item.depthCm}×{item.heightCm} cm
                      </Text>
                    </View>
                    {addMutation.isPending &&
                      addMutation.variables === item.id && (
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
