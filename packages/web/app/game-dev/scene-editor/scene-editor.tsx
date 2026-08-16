"use client";

import { type ChangeEvent, type PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import type {
  SceneRectangleShape,
  SceneRegion,
  SceneRegionDocument,
} from "@/components/game-scene/game/scene-region";
import styles from "./scene-editor.module.css";
import {
  INITIAL_SCENE_EDITOR_SCENE_KEY,
  SCENE_EDITOR_SCENES,
  SCENE_REGION_STYLE,
  type SceneEditorSceneKey,
} from "./scene-editor-constant";

interface ScenePoint {
  x: number;
  y: number;
}

interface DrawOperation {
  type: "draw";
  start: ScenePoint;
  current: ScenePoint;
}

interface MoveOperation {
  type: "move";
  regionId: string;
  start: ScenePoint;
  initialShape: SceneRectangleShape;
}

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

interface ResizeOperation {
  type: "resize";
  regionId: string;
  handle: ResizeHandle;
  initialShape: SceneRectangleShape;
}

type PointerOperation = DrawOperation | MoveOperation | ResizeOperation;
type SceneEditorRegionDocument = SceneRegionDocument & { sceneKey: SceneEditorSceneKey };
type SceneDocuments = Map<SceneEditorSceneKey, SceneEditorRegionDocument>;
type RectangleField = "x" | "y" | "width" | "height";

const RESIZE_HANDLE_SIZE = 12;

const initialSceneDocuments: SceneDocuments = new Map(
  SCENE_EDITOR_SCENES.map((scene): [SceneEditorSceneKey, SceneEditorRegionDocument] => [
    scene.sceneKey,
    {
      version: 1,
      sceneKey: scene.sceneKey,
      width: scene.width,
      height: scene.height,
      regions: [],
    },
  ]),
);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSceneRegionDocument(json: string): SceneEditorRegionDocument {
  const value: unknown = JSON.parse(json);
  if (!isJsonObject(value)) {
    throw new Error("JSON 根节点必须是对象。");
  }
  if (value.version !== 1) {
    throw new Error(`不支持 JSON 版本 ${String(value.version)}。`);
  }

  const scene = SCENE_EDITOR_SCENES.find((option) => option.sceneKey === value.sceneKey);
  if (!scene) {
    throw new Error(`未知场景 ${String(value.sceneKey)}。`);
  }
  if (value.width !== scene.width || value.height !== scene.height) {
    throw new Error("JSON 场景尺寸与登记的场景尺寸不一致。");
  }
  if (!Array.isArray(value.regions)) {
    throw new Error("JSON regions 必须是数组。");
  }

  const regions = value.regions.map((regionValue, regionIndex): SceneRegion => {
    if (!isJsonObject(regionValue)) {
      throw new Error(`第 ${regionIndex + 1} 个区域必须是对象。`);
    }
    if (typeof regionValue.id !== "string" || regionValue.id.trim().length === 0) {
      throw new Error(`第 ${regionIndex + 1} 个区域缺少 id。`);
    }
    if (regionValue.kind !== "solid") {
      throw new Error(`区域 ${regionValue.id} 的 kind 必须是 solid。`);
    }
    if (!isJsonObject(regionValue.shape) || regionValue.shape.type !== "rectangle") {
      throw new Error(`区域 ${regionValue.id} 只支持 rectangle 形状。`);
    }

    const shape = regionValue.shape;
    if (
      typeof shape.x !== "number" ||
      !Number.isInteger(shape.x) ||
      shape.x < 0 ||
      typeof shape.y !== "number" ||
      !Number.isInteger(shape.y) ||
      shape.y < 0 ||
      typeof shape.width !== "number" ||
      !Number.isInteger(shape.width) ||
      shape.width < 1 ||
      typeof shape.height !== "number" ||
      !Number.isInteger(shape.height) ||
      shape.height < 1
    ) {
      throw new Error(`区域 ${regionValue.id} 的矩形坐标和尺寸必须是有效整数。`);
    }
    if (shape.x + shape.width > scene.width || shape.y + shape.height > scene.height) {
      throw new Error(`区域 ${regionValue.id} 超出场景范围。`);
    }

    return {
      id: regionValue.id,
      kind: "solid",
      shape: {
        type: "rectangle",
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      },
    };
  });

  if (new Set(regions.map((region) => region.id)).size !== regions.length) {
    throw new Error("区域 id 不能重复。");
  }

  return {
    version: 1,
    sceneKey: scene.sceneKey,
    width: scene.width,
    height: scene.height,
    regions,
  };
}

function resizeRectangle(
  shape: SceneRectangleShape,
  handle: ResizeHandle,
  point: ScenePoint,
): SceneRectangleShape {
  let left = shape.x;
  let top = shape.y;
  let right = shape.x + shape.width;
  let bottom = shape.y + shape.height;

  if (handle.includes("w")) {
    left = Math.min(point.x, right - 1);
  }
  if (handle.includes("e")) {
    right = Math.max(point.x, left + 1);
  }
  if (handle.includes("n")) {
    top = Math.min(point.y, bottom - 1);
  }
  if (handle.includes("s")) {
    bottom = Math.max(point.y, top + 1);
  }

  return {
    type: "rectangle",
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function updateRectangleField(
  shape: SceneRectangleShape,
  field: RectangleField,
  value: number,
  sceneWidth: number,
  sceneHeight: number,
): SceneRectangleShape {
  if (field === "x") {
    return { ...shape, x: clamp(value, 0, sceneWidth - shape.width) };
  }
  if (field === "y") {
    return { ...shape, y: clamp(value, 0, sceneHeight - shape.height) };
  }
  if (field === "width") {
    return { ...shape, width: clamp(value, 1, sceneWidth - shape.x) };
  }
  return { ...shape, height: clamp(value, 1, sceneHeight - shape.y) };
}

function getResizeHandles(shape: SceneRectangleShape) {
  const left = shape.x;
  const centerX = shape.x + shape.width / 2;
  const right = shape.x + shape.width;
  const top = shape.y;
  const centerY = shape.y + shape.height / 2;
  const bottom = shape.y + shape.height;

  return [
    { handle: "nw", x: left, y: top, cursor: "nwse-resize" },
    { handle: "n", x: centerX, y: top, cursor: "ns-resize" },
    { handle: "ne", x: right, y: top, cursor: "nesw-resize" },
    { handle: "e", x: right, y: centerY, cursor: "ew-resize" },
    { handle: "se", x: right, y: bottom, cursor: "nwse-resize" },
    { handle: "s", x: centerX, y: bottom, cursor: "ns-resize" },
    { handle: "sw", x: left, y: bottom, cursor: "nesw-resize" },
    { handle: "w", x: left, y: centerY, cursor: "ew-resize" },
  ] as const satisfies readonly {
    handle: ResizeHandle;
    x: number;
    y: number;
    cursor: string;
  }[];
}

export function SceneEditor() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const regionLayerRef = useRef<SVGSVGElement>(null);
  const [selectedSceneKey, setSelectedSceneKey] = useState<SceneEditorSceneKey>(
    INITIAL_SCENE_EDITOR_SCENE_KEY,
  );
  const [sceneDocuments, setSceneDocuments] = useState<SceneDocuments>(initialSceneDocuments);
  const [selectedRegionId, setSelectedRegionId] = useState<string>();
  const [pointerOperation, setPointerOperation] = useState<PointerOperation>();
  const [importError, setImportError] = useState<string>();

  const selectedScene = SCENE_EDITOR_SCENES.find((scene) => scene.sceneKey === selectedSceneKey)!;
  const sceneDocument = sceneDocuments.get(selectedSceneKey)!;
  const selectedRegion = sceneDocument.regions.find((region) => region.id === selectedRegionId);

  const updateCurrentRegions = (update: (regions: SceneRegion[]) => SceneRegion[]) => {
    setSceneDocuments((currentDocuments) => {
      const nextDocuments = new Map(currentDocuments);
      const currentDocument = currentDocuments.get(selectedSceneKey)!;
      nextDocuments.set(selectedSceneKey, {
        ...currentDocument,
        regions: update(currentDocument.regions),
      });
      return nextDocuments;
    });
  };

  const updateRegion = (regionId: string, update: (region: SceneRegion) => SceneRegion) => {
    updateCurrentRegions((regions) =>
      regions.map((region) => (region.id === regionId ? update(region) : region)),
    );
  };

  const getScenePoint = (clientX: number, clientY: number) => {
    const bounds = regionLayerRef.current!.getBoundingClientRect();
    return {
      x: clamp(
        Math.round(((clientX - bounds.left) / bounds.width) * selectedScene.width),
        0,
        selectedScene.width,
      ),
      y: clamp(
        Math.round(((clientY - bounds.top) / bounds.height) * selectedScene.height),
        0,
        selectedScene.height,
      ),
    };
  };

  const applyPointerOperation = (operation: MoveOperation | ResizeOperation, point: ScenePoint) => {
    if (operation.type === "move") {
      const x = clamp(
        operation.initialShape.x + point.x - operation.start.x,
        0,
        selectedScene.width - operation.initialShape.width,
      );
      const y = clamp(
        operation.initialShape.y + point.y - operation.start.y,
        0,
        selectedScene.height - operation.initialShape.height,
      );
      updateRegion(operation.regionId, (region) => ({
        ...region,
        shape: { ...operation.initialShape, x, y },
      }));
      return;
    }

    updateRegion(operation.regionId, (region) => ({
      ...region,
      shape: resizeRectangle(operation.initialShape, operation.handle, point),
    }));
  };

  const startDrawing = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    const point = getScenePoint(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedRegionId(undefined);
    setPointerOperation({ type: "draw", start: point, current: point });
  };

  const startMovingRegion = (event: ReactPointerEvent<SVGRectElement>, region: SceneRegion) => {
    event.preventDefault();
    event.stopPropagation();
    regionLayerRef.current!.setPointerCapture(event.pointerId);
    setSelectedRegionId(region.id);
    setPointerOperation({
      type: "move",
      regionId: region.id,
      start: getScenePoint(event.clientX, event.clientY),
      initialShape: region.shape,
    });
  };

  const startResizingRegion = (
    event: ReactPointerEvent<SVGRectElement>,
    region: SceneRegion,
    handle: ResizeHandle,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    regionLayerRef.current!.setPointerCapture(event.pointerId);
    setSelectedRegionId(region.id);
    setPointerOperation({
      type: "resize",
      regionId: region.id,
      handle,
      initialShape: region.shape,
    });
  };

  const continuePointerOperation = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointerOperation) {
      return;
    }

    const point = getScenePoint(event.clientX, event.clientY);
    if (pointerOperation.type === "draw") {
      setPointerOperation({ ...pointerOperation, current: point });
      return;
    }

    applyPointerOperation(pointerOperation, point);
  };

  const finishPointerOperation = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointerOperation) {
      return;
    }

    const point = getScenePoint(event.clientX, event.clientY);
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (pointerOperation.type === "draw") {
      const shape: SceneRectangleShape = {
        type: "rectangle",
        x: Math.min(pointerOperation.start.x, point.x),
        y: Math.min(pointerOperation.start.y, point.y),
        width: Math.abs(point.x - pointerOperation.start.x),
        height: Math.abs(point.y - pointerOperation.start.y),
      };
      setPointerOperation(undefined);

      if (shape.width === 0 || shape.height === 0) {
        return;
      }

      let regionNumber = 1;
      while (sceneDocument.regions.some((region) => region.id === `solid-${regionNumber}`)) {
        regionNumber += 1;
      }
      const region: SceneRegion = {
        id: `solid-${regionNumber}`,
        kind: "solid",
        shape,
      };
      updateCurrentRegions((regions) => [...regions, region]);
      setSelectedRegionId(region.id);
      return;
    }

    applyPointerOperation(pointerOperation, point);
    setPointerOperation(undefined);
  };

  const cancelPointerOperation = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPointerOperation(undefined);
  };

  const importSceneDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedDocument = parseSceneRegionDocument(await file.text());
      setSceneDocuments((currentDocuments) => {
        const nextDocuments = new Map(currentDocuments);
        nextDocuments.set(importedDocument.sceneKey, importedDocument);
        return nextDocuments;
      });
      setSelectedSceneKey(importedDocument.sceneKey);
      setSelectedRegionId(undefined);
      setPointerOperation(undefined);
      setImportError(undefined);
    } catch (error) {
      setImportError((error as Error).message);
    }

    event.currentTarget.value = "";
  };

  const exportSceneDocument = () => {
    const documentBlob = new Blob([JSON.stringify(sceneDocument, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(documentBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = `${sceneDocument.sceneKey}-regions.json`;
    downloadLink.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const drawingShape =
    pointerOperation?.type === "draw"
      ? {
          x: Math.min(pointerOperation.start.x, pointerOperation.current.x),
          y: Math.min(pointerOperation.start.y, pointerOperation.current.y),
          width: Math.abs(pointerOperation.current.x - pointerOperation.start.x),
          height: Math.abs(pointerOperation.current.y - pointerOperation.start.y),
        }
      : undefined;

  return (
    <div className={styles.editor}>
      <section className={styles.toolbar}>
        <label>
          <span>编辑场景</span>
          <select
            value={selectedSceneKey}
            onChange={(event) => {
              setSelectedSceneKey(event.target.value as SceneEditorSceneKey);
              setSelectedRegionId(undefined);
              setPointerOperation(undefined);
            }}
          >
            {SCENE_EDITOR_SCENES.map((scene) => (
              <option key={scene.sceneKey} value={scene.sceneKey}>
                {scene.name}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.toolbarActions}>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className={styles.hiddenInput}
            onChange={importSceneDocument}
          />
          <button type="button" onClick={() => importInputRef.current!.click()}>
            导入 JSON
          </button>
          <button type="button" className={styles.primaryButton} onClick={exportSceneDocument}>
            导出 JSON
          </button>
        </div>
      </section>

      {importError ? <p className={styles.error}>{importError}</p> : null}

      <div className={styles.workspace}>
        <section className={styles.scenePanel}>
          <div className={styles.sceneHeader}>
            <div>
              <h2>{selectedScene.name}</h2>
              <p>
                {selectedScene.width} × {selectedScene.height} 逻辑像素
              </p>
            </div>
            <div className={styles.legend}>
              <span>
                <i style={{ backgroundColor: SCENE_REGION_STYLE.solid.fillColor }} />
                {SCENE_REGION_STYLE.solid.name}
              </span>
            </div>
          </div>

          <div className={styles.sceneViewport}>
            <div
              className={styles.sceneCanvas}
              style={{ width: selectedScene.width, height: selectedScene.height }}
            >
              <img
                src={selectedScene.imageSource}
                width={selectedScene.width}
                height={selectedScene.height}
                alt={selectedScene.name}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
              />
              <svg
                ref={regionLayerRef}
                className={styles.regionLayer}
                viewBox={`0 0 ${selectedScene.width} ${selectedScene.height}`}
                aria-label={`${selectedScene.name}区域标注层`}
                onPointerDown={startDrawing}
                onPointerMove={continuePointerOperation}
                onPointerUp={finishPointerOperation}
                onPointerCancel={cancelPointerOperation}
                onLostPointerCapture={() => setPointerOperation(undefined)}
              >
                <title>{selectedScene.name}区域标注层</title>
                {sceneDocument.regions.map((region) => {
                  const isSelected = region.id === selectedRegionId;

                  return (
                    <g key={region.id}>
                      <rect
                        x={region.shape.x}
                        y={region.shape.y}
                        width={region.shape.width}
                        height={region.shape.height}
                        fill={SCENE_REGION_STYLE.solid.fillColor}
                        fillOpacity={isSelected ? 0.42 : 0.25}
                        stroke={isSelected ? "#fff9ea" : SCENE_REGION_STYLE.solid.strokeColor}
                        strokeWidth={isSelected ? 3 : 2}
                        vectorEffect="non-scaling-stroke"
                        cursor="move"
                        onPointerDown={(event) => startMovingRegion(event, region)}
                      />
                      <text
                        x={region.shape.x + 5}
                        y={region.shape.y + 15}
                        fill="#fff9ea"
                        stroke="#493247"
                        strokeWidth={2}
                        paintOrder="stroke"
                        className={styles.regionLabel}
                      >
                        {region.id}
                      </text>
                    </g>
                  );
                })}

                {selectedRegion
                  ? getResizeHandles(selectedRegion.shape).map((resizeHandle) => (
                      <rect
                        key={resizeHandle.handle}
                        x={resizeHandle.x - RESIZE_HANDLE_SIZE / 2}
                        y={resizeHandle.y - RESIZE_HANDLE_SIZE / 2}
                        width={RESIZE_HANDLE_SIZE}
                        height={RESIZE_HANDLE_SIZE}
                        fill="#fff9ea"
                        stroke={SCENE_REGION_STYLE.solid.strokeColor}
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        cursor={resizeHandle.cursor}
                        className={styles.resizeHandle}
                        onPointerDown={(event) =>
                          startResizingRegion(event, selectedRegion, resizeHandle.handle)
                        }
                      />
                    ))
                  : null}

                {drawingShape ? (
                  <rect
                    {...drawingShape}
                    fill="none"
                    stroke="#fff9ea"
                    strokeWidth={3}
                    strokeDasharray="8 5"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                ) : null}
              </svg>
            </div>
          </div>
        </section>

        <aside className={styles.sidebar}>
          <section className={styles.panel}>
            <h2>场景区域</h2>
            {sceneDocument.regions.length === 0 ? (
              <p className={styles.empty}>在场景图片上拖拽以创建实体障碍。</p>
            ) : (
              <div className={styles.regionList}>
                {sceneDocument.regions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    className={region.id === selectedRegionId ? styles.selectedRegion : undefined}
                    onClick={() => setSelectedRegionId(region.id)}
                  >
                    <i style={{ backgroundColor: SCENE_REGION_STYLE.solid.fillColor }} />
                    <span>{region.id}</span>
                    <small>{SCENE_REGION_STYLE.solid.name}</small>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedRegion ? (
            <section className={styles.panel}>
              <h2>区域属性</h2>
              <label className={styles.fullField}>
                <span>ID</span>
                <input value={selectedRegion.id} readOnly />
              </label>

              <div className={styles.coordinateFields}>
                {(["x", "y", "width", "height"] as const).map((field) => (
                  <label key={field}>
                    <span>{field}</span>
                    <input
                      type="number"
                      min={field === "width" || field === "height" ? 1 : 0}
                      value={selectedRegion.shape[field]}
                      onChange={(event) =>
                        updateRegion(selectedRegion.id, (region) => ({
                          ...region,
                          shape: updateRectangleField(
                            region.shape,
                            field,
                            Number(event.target.value),
                            selectedScene.width,
                            selectedScene.height,
                          ),
                        }))
                      }
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => {
                  updateCurrentRegions((regions) =>
                    regions.filter((region) => region.id !== selectedRegion.id),
                  );
                  setSelectedRegionId(undefined);
                }}
              >
                删除区域
              </button>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
