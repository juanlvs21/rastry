import type {
  Anchor,
  ConvertOperation,
  CropOperation,
  ImageFormat,
  PaddingOperation,
  PipelineOperation,
  ResizeOperation,
} from "@rastry/contracts";

import { Input } from "../Input";
import { Select } from "../Select";
import "./OperationEditor.css";

const anchors: Anchor[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

function numberValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function optionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function operationFor(type: PipelineOperation["type"]): PipelineOperation {
  if (type === "resize") return { type, width: 1600, fit: "contain" };
  if (type === "crop") return { type, width: 100, height: 100, anchor: "center" };
  if (type === "trim") return { type };
  if (type === "padding") {
    return { type, top: 16, right: 16, bottom: 16, left: 16, background: { transparent: true } };
  }
  if (type === "convert") return { type, format: "webp", quality: 82 };
  return { type: "strip-metadata" };
}

export function OperationEditor({
  operation,
  onChange,
}: {
  operation: PipelineOperation;
  onChange: (operation: PipelineOperation) => void;
}) {
  if (operation.type === "resize") {
    return (
      <div className="rastry-operation-editor__fields">
        <div className="rastry-operation-editor__row">
          <Input
            label="Width"
            type="number"
            min="1"
            value={numberValue(operation.width)}
            onChange={(event) =>
              onChange({
                ...operation,
                width: optionalNumber(event.target.value),
              } as ResizeOperation)
            }
          />
          <Input
            label="Height"
            type="number"
            min="1"
            value={numberValue(operation.height)}
            onChange={(event) =>
              onChange({
                ...operation,
                height: optionalNumber(event.target.value),
              } as ResizeOperation)
            }
          />
        </div>
        <div className="rastry-operation-editor__row">
          <Select
            label="Fit"
            value={operation.fit ?? ""}
            onChange={(event) =>
              onChange({
                ...operation,
                fit:
                  event.target.value === ""
                    ? undefined
                    : (event.target.value as ResizeOperation["fit"]),
              } as ResizeOperation)
            }
          >
            <option value="">Proportional</option>
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
            <option value="fill">Fill</option>
          </Select>
          {operation.fit === "cover" ? (
            <Select
              label="Anchor"
              value={operation.anchor ?? "center"}
              onChange={(event) =>
                onChange({ ...operation, anchor: event.target.value as Anchor } as ResizeOperation)
              }
            >
              {anchors.map((anchor) => (
                <option key={anchor} value={anchor}>
                  {anchor}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>
    );
  }

  if (operation.type === "crop") {
    const usesArea = "area" in operation;
    return (
      <div className="rastry-operation-editor__fields">
        <Select
          label="Crop mode"
          value={usesArea ? "area" : "anchor"}
          onChange={(event) =>
            onChange(
              event.target.value === "area"
                ? { type: "crop", area: { x: 0, y: 0, width: 100, height: 100 } }
                : { type: "crop", width: 100, height: 100, anchor: "center" },
            )
          }
        >
          <option value="area">Source area</option>
          <option value="anchor">Dimensions + anchor</option>
        </Select>
        {usesArea ? (
          <div className="rastry-operation-editor__row">
            {(["x", "y", "width", "height"] as const).map((field) => (
              <Input
                key={field}
                label={field}
                type="number"
                min={field === "x" || field === "y" ? "0" : "1"}
                value={numberValue(operation.area[field])}
                onChange={(event) =>
                  onChange({
                    ...operation,
                    area: { ...operation.area, [field]: optionalNumber(event.target.value) ?? 0 },
                  } as CropOperation)
                }
              />
            ))}
          </div>
        ) : (
          <div className="rastry-operation-editor__row">
            <Input
              label="Width"
              type="number"
              min="1"
              value={numberValue(operation.width)}
              onChange={(event) =>
                onChange({
                  ...operation,
                  width: optionalNumber(event.target.value),
                } as CropOperation)
              }
            />
            <Input
              label="Height"
              type="number"
              min="1"
              value={numberValue(operation.height)}
              onChange={(event) =>
                onChange({
                  ...operation,
                  height: optionalNumber(event.target.value),
                } as CropOperation)
              }
            />
            <Select
              label="Anchor"
              value={operation.anchor}
              onChange={(event) => onChange({ ...operation, anchor: event.target.value as Anchor })}
            >
              {anchors.map((anchor) => (
                <option key={anchor} value={anchor}>
                  {anchor}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
    );
  }

  if (operation.type === "trim") {
    return (
      <div className="rastry-operation-editor__row">
        <Input
          label="Alpha threshold"
          type="number"
          min="0"
          max="255"
          value={numberValue(operation.alphaThreshold)}
          onChange={(event) =>
            onChange({
              ...operation,
              alphaThreshold: optionalNumber(event.target.value),
            } as PipelineOperation)
          }
        />
        <p className="rastry-operation-editor__hint">
          Keeps pixels with alpha above this threshold.
        </p>
      </div>
    );
  }

  if (operation.type === "padding") {
    const colorBackground =
      "transparent" in operation.background ? undefined : operation.background;
    return (
      <div className="rastry-operation-editor__fields">
        <div className="rastry-operation-editor__row">
          {(["top", "right", "bottom", "left"] as const).map((field) => (
            <Input
              key={field}
              label={field}
              type="number"
              min="0"
              value={String(operation[field])}
              onChange={(event) =>
                onChange({
                  ...operation,
                  [field]: optionalNumber(event.target.value) ?? 0,
                } as PaddingOperation)
              }
            />
          ))}
        </div>
        <div className="rastry-operation-editor__row">
          <Select
            label="Background"
            value={colorBackground === undefined ? "transparent" : "color"}
            onChange={(event) =>
              onChange({
                ...operation,
                background:
                  event.target.value === "transparent"
                    ? { transparent: true }
                    : { color: "#ffffff" },
              })
            }
          >
            <option value="transparent">Transparent</option>
            <option value="color">Color</option>
          </Select>
          {colorBackground !== undefined ? (
            <Input
              label="Color"
              type="color"
              value={colorBackground.color}
              onChange={(event) =>
                onChange({
                  ...operation,
                  background: { ...colorBackground, color: event.target.value as `#${string}` },
                })
              }
            />
          ) : null}
          {colorBackground !== undefined ? (
            <Input
              label="Alpha"
              type="number"
              min="0"
              max="255"
              value={numberValue(colorBackground.alpha)}
              onChange={(event) =>
                onChange({
                  ...operation,
                  background: { ...colorBackground, alpha: optionalNumber(event.target.value) },
                } as PaddingOperation)
              }
            />
          ) : null}
        </div>
      </div>
    );
  }

  if (operation.type === "convert") {
    return (
      <div className="rastry-operation-editor__row">
        <Select
          label="Format"
          value={operation.format}
          onChange={(event) =>
            onChange({ ...operation, format: event.target.value as ImageFormat })
          }
        >
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </Select>
        <Input
          label="Quality"
          type="number"
          min="1"
          max="100"
          value={numberValue(operation.quality)}
          onChange={(event) =>
            onChange({
              ...operation,
              quality: optionalNumber(event.target.value),
            } as ConvertOperation)
          }
        />
      </div>
    );
  }

  return (
    <p className="rastry-operation-editor__hint">Removes metadata from the generated image.</p>
  );
}
