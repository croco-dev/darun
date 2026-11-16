import { Button } from '@darun/ui';
import { AdminField, AdminInput } from '@darun/ui-admin';
import { useEffect, useId, useRef, useState, type Dispatch, type PointerEvent } from 'react';
import {
  createRedactedScreenshot,
  decodeScreenshotForRedaction,
  isRedactionRegionInside,
  MAX_REDACTION_REGIONS,
  type RedactionRegion,
} from './screenshotRedaction';

interface Point {
  x: number;
  y: number;
}

interface Selection {
  id: number;
  coordinates: Record<keyof RedactionRegion, string>;
}

interface PositionedRegion extends RedactionRegion {
  id: number;
}

function readRegion({ left, top, right, bottom }: Selection['coordinates']): RedactionRegion {
  return {
    left: Number(left || NaN),
    top: Number(top || NaN),
    right: Number(right || NaN),
    bottom: Number(bottom || NaN),
  };
}

interface ScreenshotRedactionEditorProps {
  file: File;
  disabled: boolean;
  onUploadFileChange: Dispatch<File | undefined>;
}

const REGION_EDGES = [
  ['left', '왼쪽'],
  ['top', '위'],
  ['right', '오른쪽'],
  ['bottom', '아래'],
] as const;

export function LocalScreenshotPreview({
  file,
  className,
  alt,
  onLoad,
  onError,
}: {
  file: File;
  className: string;
  alt: string;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const url = URL.createObjectURL(file);
    image.src = url;
    return () => {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return <img ref={imageRef} className={className} alt={alt} onLoad={onLoad} onError={onError} />;
}

function ScreenshotRedactionPreview({
  bitmap,
  regions,
  disabled,
  onDragChange,
  onAdd,
}: {
  bitmap: ImageBitmap;
  regions: readonly PositionedRegion[];
  disabled: boolean;
  onDragChange: Dispatch<boolean>;
  onAdd: Dispatch<RedactionRegion>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const start = useRef<{ pointerId: number; point: Point } | null>(null);
  const [draft, setDraft] = useState<RedactionRegion>();
  const { width, height } = bitmap;
  const scale = Math.min(1, 960 / Math.max(width, height));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }, [bitmap]);

  const pointAt = (event: PointerEvent<HTMLDivElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(width, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * width)),
      y: Math.min(height, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * height)),
    };
  };

  const regionTo = (from: Point, to: Point): RedactionRegion | undefined => {
    if (from.x === to.x || from.y === to.y) return;
    return {
      left: Math.floor(Math.min(from.x, to.x)),
      top: Math.floor(Math.min(from.y, to.y)),
      right: Math.ceil(Math.max(from.x, to.x)),
      bottom: Math.ceil(Math.max(from.y, to.y)),
    };
  };

  const clearDrag = (pointerId: number) => {
    if (start.current?.pointerId !== pointerId) return;
    start.current = null;
    setDraft(undefined);
    onDragChange(false);
  };

  const position = ({ left, top, right, bottom }: RedactionRegion) => ({
    left: `${(left / width) * 100}%`,
    top: `${(top / height) * 100}%`,
    width: `${((right - left) / width) * 100}%`,
    height: `${((bottom - top) / height) * 100}%`,
  });

  return (
    <div
      role="img"
      aria-label="가림 영역 미리보기"
      className={`relative overflow-hidden rounded-lg bg-white ${disabled ? '' : 'touch-none cursor-crosshair'}`}
      style={{ maxWidth: width * scale }}
      onPointerDown={event => {
        if (disabled || event.button !== 0 || start.current) return;
        start.current = { pointerId: event.pointerId, point: pointAt(event) };
        event.currentTarget.setPointerCapture(event.pointerId);
        onDragChange(true);
      }}
      onPointerMove={event => {
        if (start.current?.pointerId !== event.pointerId) return;
        setDraft(regionTo(start.current.point, pointAt(event)));
      }}
      onPointerUp={event => {
        if (start.current?.pointerId !== event.pointerId) return;
        const region = regionTo(start.current.point, pointAt(event));
        clearDrag(event.pointerId);
        if (!disabled && region) onAdd(region);
      }}
      onLostPointerCapture={event => clearDrag(event.pointerId)}
    >
      <canvas
        ref={canvasRef}
        width={Math.max(1, Math.round(width * scale))}
        height={Math.max(1, Math.round(height * scale))}
        className="block w-full"
        aria-hidden="true"
      />
      {regions.map(region => (
        <span
          key={region.id}
          className="pointer-events-none absolute bg-black ring-1 ring-white/80 ring-inset"
          style={position(region)}
        />
      ))}
      {draft && <span className="pointer-events-none absolute bg-black ring-1 ring-white" style={position(draft)} />}
    </div>
  );
}

export function ScreenshotRedactionEditor({ file, disabled, onUploadFileChange }: ScreenshotRedactionEditorProps) {
  const [bitmap, setBitmap] = useState<ImageBitmap>();
  const [regions, setRegions] = useState<Selection[]>([]);
  const [result, setResult] = useState<File>();
  const [previewed, setPreviewed] = useState<File>();
  const [confirmed, setConfirmed] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [decodeError, setDecodeError] = useState<string>();
  const [composeError, setComposeError] = useState<string>();
  const nextId = useRef(0);
  const addButtonId = useId();
  const renderController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let image: ImageBitmap | undefined;
    void decodeScreenshotForRedaction(file).then(
      decoded => {
        if (controller.signal.aborted) {
          decoded.close();
          return;
        }
        image = decoded;
        setBitmap(decoded);
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setDecodeError(error instanceof Error ? error.message : '이미지를 읽을 수 없습니다.');
        }
      }
    );

    return () => {
      controller.abort();
      renderController.current?.abort();
      image?.close();
    };
  }, [file, attempt]);

  const clearResult = () => {
    setResult(undefined);
    setPreviewed(undefined);
    setConfirmed(false);
    setComposeError(undefined);
    onUploadFileChange(undefined);
  };

  const addRegion = (region: RedactionRegion) => {
    if (regions.length >= MAX_REDACTION_REGIONS) return;
    clearResult();
    const id = nextId.current++;
    setRegions(current => [
      ...current,
      {
        id,
        coordinates: {
          left: String(region.left),
          top: String(region.top),
          right: String(region.right),
          bottom: String(region.bottom),
        },
      },
    ]);
  };

  const validRegions = bitmap
    ? regions.flatMap(({ id, coordinates }) => {
        const bounds = readRegion(coordinates);
        return isRedactionRegionInside(bounds, bitmap) ? [{ ...bounds, id }] : [];
      })
    : [];
  const canCompose = !dragging && validRegions.length > 0 && validRegions.length === regions.length;

  const previewResult = async () => {
    if (!bitmap || !canCompose || renderController.current) return;
    clearResult();
    setPreparing(true);
    const controller = new AbortController();
    renderController.current = controller;
    try {
      const redacted = await createRedactedScreenshot(bitmap, validRegions);
      if (!controller.signal.aborted) setResult(redacted);
    } catch (error) {
      if (!controller.signal.aborted) {
        setComposeError(error instanceof Error ? error.message : '가림 결과를 만들 수 없습니다.');
      }
    } finally {
      if (!controller.signal.aborted) setPreparing(false);
      renderController.current = null;
    }
  };

  const busy = disabled || preparing;
  const atRegionLimit = regions.length >= MAX_REDACTION_REGIONS;

  return (
    <div className="flex min-w-0 flex-col items-start gap-3 rounded-lg border border-dark-200 p-3">
      <p className="text-sm">이미지에서 드래그하거나 가림 영역을 추가한 뒤 픽셀 좌표를 조정하세요.</p>
      {decodeError && (
        <>
          <p role="alert" className="text-sm text-cherry-700">
            {decodeError}
          </p>
          <Button
            type="button"
            variant="contained"
            color="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setDecodeError(undefined);
              setAttempt(current => current + 1);
            }}
          >
            이미지 다시 읽기
          </Button>
        </>
      )}
      {!bitmap && !decodeError && <p role="status">이미지를 읽는 중입니다…</p>}
      {bitmap && (
        <>
          <ScreenshotRedactionPreview
            bitmap={bitmap}
            regions={validRegions}
            disabled={busy || atRegionLimit}
            onDragChange={active => {
              if (active) clearResult();
              setDragging(active);
            }}
            onAdd={addRegion}
          />
          <Button
            id={addButtonId}
            type="button"
            variant="contained"
            color="secondary"
            size="sm"
            disabled={busy || dragging || atRegionLimit}
            onClick={() => {
              addRegion({
                left: Math.floor(bitmap.width / 4),
                top: Math.floor(bitmap.height / 4),
                right: Math.ceil(bitmap.width / 2),
                bottom: Math.ceil(bitmap.height / 2),
              });
            }}
          >
            가림 영역 추가
          </Button>
          {atRegionLimit && <p role="status">가림 영역은 최대 20개까지 추가할 수 있습니다.</p>}
          {regions.map(({ id, coordinates }, index) => {
            const invalid = !validRegions.some(region => region.id === id);
            const errorId = `${addButtonId}-region-${id}-error`;
            return (
              <fieldset key={id} className="w-full min-w-0 space-y-2" disabled={busy || dragging}>
                <legend className="text-sm font-medium">가림 영역 {index + 1} (px)</legend>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))] gap-2">
                  {REGION_EDGES.map(([edge, label]) => (
                    <AdminField key={edge} label={label} className="min-w-0">
                      <AdminInput
                        type="number"
                        min={0}
                        max={edge === 'left' || edge === 'right' ? bitmap.width : bitmap.height}
                        aria-invalid={invalid || undefined}
                        aria-describedby={invalid ? errorId : undefined}
                        value={coordinates[edge]}
                        onKeyDown={event => {
                          if (event.key === 'Enter') event.preventDefault();
                        }}
                        onChange={event => {
                          const value = event.currentTarget.value;
                          clearResult();
                          setRegions(current =>
                            current.map(item =>
                              item.id === id ? { id, coordinates: { ...item.coordinates, [edge]: value } } : item
                            )
                          );
                        }}
                      />
                    </AdminField>
                  ))}
                </div>
                {invalid && (
                  <p id={errorId} className="text-sm text-cherry-700">
                    이미지 범위 안의 정수로 입력하세요. 왼쪽은 오른쪽보다, 위는 아래보다 작아야 합니다.
                  </p>
                )}
                <button
                  type="button"
                  className="rounded text-sm text-cherry-700 underline focus-visible:outline-2"
                  onClick={() => {
                    clearResult();
                    setRegions(current => current.filter(item => item.id !== id));
                    requestAnimationFrame(() => document.getElementById(addButtonId)?.focus());
                  }}
                >
                  가림 영역 {index + 1} 제거
                </button>
              </fieldset>
            );
          })}
          <Button
            type="button"
            variant="contained"
            color="secondary"
            size="sm"
            disabled={busy || !canCompose}
            onClick={() => void previewResult()}
          >
            가림 결과 만들기
          </Button>
          <p role="status" className="text-sm">
            {preparing ? '가림 결과를 만드는 중입니다…' : confirmed ? '가림 결과를 등록할 이미지로 선택했습니다.' : ''}
          </p>
          {composeError && (
            <p role="alert" className="text-sm text-cherry-700">
              {composeError}
            </p>
          )}
          {result && (
            <>
              <p className="text-sm">가린 부분을 확인한 뒤 아래 결과를 등록 이미지로 선택하세요.</p>
              <LocalScreenshotPreview
                file={result}
                alt="등록할 가림 결과"
                className="max-h-[32rem] max-w-full rounded-lg"
                onLoad={() => setPreviewed(result)}
                onError={() => {
                  clearResult();
                  setComposeError('가림 결과를 표시할 수 없습니다. 다시 만들어주세요.');
                }}
              />
              <Button
                type="button"
                variant="contained"
                color="primary"
                size="sm"
                disabled={busy || previewed !== result}
                aria-pressed={confirmed}
                onClick={() => {
                  onUploadFileChange(result);
                  setConfirmed(true);
                }}
              >
                이 결과 사용
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
