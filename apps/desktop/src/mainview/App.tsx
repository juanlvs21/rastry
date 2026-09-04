import { useEffect, useState, type ChangeEvent, type DragEvent } from "react";

import type {
  Anchor,
  ConvertOperation,
  CropOperation,
  ExecutionProgress,
  ExecutionSummary,
  ImageFormat,
  PaddingOperation,
  PipelineConfig,
  PipelineOperation,
  ResizeOperation,
} from "@rastry/contracts";

import type { DesktopPreview, DesktopProgressEvent, DesktopRpcError } from "../rpc";
import { desktopRpc } from "./bridge";

type OperationType = PipelineOperation["type"];
type RunStatus =
  | "idle"
  | "previewing"
  | "ready"
  | "running"
  | "cancelling"
  | "completed"
  | "cancelled";

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

const defaultPipeline: PipelineConfig = {
  version: 1,
  operations: [{ type: "convert", format: "webp", quality: 82 }, { type: "strip-metadata" }],
};

function optionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function operationFor(type: OperationType): PipelineOperation {
  if (type === "resize") return { type, width: 1600, fit: "contain" };
  if (type === "crop") return { type, width: 100, height: 100, anchor: "center" };
  if (type === "trim") return { type };
  if (type === "padding") {
    return {
      type,
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
      background: { transparent: true },
    };
  }
  if (type === "convert") return { type, format: "webp", quality: 82 };
  return { type: "strip-metadata" };
}

function rpcFailure(error: unknown): DesktopRpcError {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    const code = error.code;
    const message = error.message;
    if (typeof code === "string" && typeof message === "string") return { code, message };
  }
  return {
    code: "RPC_UNAVAILABLE",
    message: error instanceof Error ? error.message : "The desktop bridge is unavailable.",
  };
}

function pathFromDroppedFile(file: File): string | undefined {
  const candidate = (file as File & { path?: unknown }).path;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : undefined;
}

function pathFromFileUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== "file:") return undefined;
    const path = decodeURIComponent(url.pathname);
    if (/^\/[A-Za-z]:\//.test(path)) return path.slice(1);
    return url.host.length > 0 ? `//${url.host}${path}` : path;
  } catch {
    return undefined;
  }
}

function droppedPaths(event: DragEvent<HTMLElement>): string[] {
  const paths = Array.from(event.dataTransfer.files)
    .map(pathFromDroppedFile)
    .filter((path): path is string => path !== undefined);
  const uriPaths = event.dataTransfer
    .getData("text/uri-list")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && !value.startsWith("#"))
    .map(pathFromFileUrl)
    .filter((path): path is string => path !== undefined);
  return [...new Set([...paths, ...uriPaths])];
}

function OperationEditor({
  operation,
  onChange,
}: {
  operation: PipelineOperation;
  onChange: (operation: PipelineOperation) => void;
}) {
  if (operation.type === "resize") {
    return (
      <div className="operationFields">
        <div className="fieldRow">
          <label>
            Width
            <input
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
          </label>
          <label>
            Height
            <input
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
          </label>
        </div>
        <div className="fieldRow">
          <label>
            Fit
            <select
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
            </select>
          </label>
          {operation.fit === "cover" ? (
            <label>
              Anchor
              <select
                value={operation.anchor ?? "center"}
                onChange={(event) =>
                  onChange({ ...operation, anchor: event.target.value as Anchor })
                }
              >
                {anchors.map((anchor) => (
                  <option key={anchor} value={anchor}>
                    {anchor}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>
    );
  }

  if (operation.type === "crop") {
    const usesArea = "area" in operation;
    return (
      <div className="operationFields">
        <label>
          Crop mode
          <select
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
          </select>
        </label>
        {usesArea ? (
          <div className="fieldRow">
            {(["x", "y", "width", "height"] as const).map((field) => (
              <label key={field}>
                {field}
                <input
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
              </label>
            ))}
          </div>
        ) : (
          <div className="fieldRow">
            <label>
              Width
              <input
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
            </label>
            <label>
              Height
              <input
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
            </label>
            <label>
              Anchor
              <select
                value={operation.anchor}
                onChange={(event) =>
                  onChange({ ...operation, anchor: event.target.value as Anchor })
                }
              >
                {anchors.map((anchor) => (
                  <option key={anchor} value={anchor}>
                    {anchor}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    );
  }

  if (operation.type === "trim") {
    return (
      <div className="fieldRow">
        <label>
          Alpha threshold
          <input
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
        </label>
        <p className="fieldHint">Keeps pixels with alpha above this threshold.</p>
      </div>
    );
  }

  if (operation.type === "padding") {
    const colorBackground =
      "transparent" in operation.background ? undefined : operation.background;
    return (
      <div className="operationFields">
        <div className="fieldRow">
          {(["top", "right", "bottom", "left"] as const).map((field) => (
            <label key={field}>
              {field}
              <input
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
            </label>
          ))}
        </div>
        <div className="fieldRow">
          <label>
            Background
            <select
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
            </select>
          </label>
          {colorBackground !== undefined ? (
            <label>
              Color
              <input
                type="color"
                value={colorBackground.color}
                onChange={(event) =>
                  onChange({
                    ...operation,
                    background: { ...colorBackground, color: event.target.value as `#${string}` },
                  })
                }
              />
            </label>
          ) : null}
          {colorBackground !== undefined ? (
            <label>
              Alpha
              <input
                type="number"
                min="0"
                max="255"
                value={numberValue(colorBackground.alpha)}
                onChange={(event) =>
                  onChange({
                    ...operation,
                    background: {
                      ...colorBackground,
                      alpha: optionalNumber(event.target.value),
                    },
                  } as PaddingOperation)
                }
              />
            </label>
          ) : null}
        </div>
      </div>
    );
  }

  if (operation.type === "convert") {
    return (
      <div className="fieldRow">
        <label>
          Format
          <select
            value={operation.format}
            onChange={(event) =>
              onChange({ ...operation, format: event.target.value as ImageFormat })
            }
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
        <label>
          Quality
          <input
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
        </label>
      </div>
    );
  }

  return <p className="fieldHint">Removes metadata from the generated image.</p>;
}

function OperationCard({
  operation,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  operation: PipelineOperation;
  index: number;
  total: number;
  onChange: (operation: PipelineOperation) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <article className="operationCard">
      <div className="operationHeader">
        <div>
          <span className="operationIndex">0{index + 1}</span>
          <strong>{operation.type}</strong>
        </div>
        <div className="operationActions">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move operation up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move operation down"
          >
            ↓
          </button>
          <button type="button" className="quietButton" onClick={onRemove} disabled={total === 1}>
            Remove
          </button>
        </div>
      </div>
      <OperationEditor operation={operation} onChange={onChange} />
    </article>
  );
}

function ErrorNotice({ error }: { error: DesktopRpcError }) {
  return (
    <div className="notice error" role="alert">
      <strong>{error.code}</strong>
      <span>{error.message}</span>
    </div>
  );
}

function ProgressNotice({ progress }: { progress: ExecutionProgress }) {
  const file = progress.file?.input ?? progress.result?.input;
  return (
    <div className="progressNotice" role="status" aria-live="polite">
      <div className="progressLine">
        <strong>{progress.phase}</strong>
        <span>
          {progress.completed} / {progress.total}
        </span>
      </div>
      {file ? <small>{file}</small> : null}
    </div>
  );
}

function Summary({ summary }: { summary: ExecutionSummary }) {
  return (
    <section className="summary" aria-labelledby="summary-heading">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Run complete</p>
          <h2 id="summary-heading">Your files are ready</h2>
        </div>
        <span className="summaryBytes">
          {summary.bytesBefore.toLocaleString()} → {summary.bytesAfter.toLocaleString()} bytes
        </span>
      </div>
      <div className="summaryStats">
        <span>
          <strong>{summary.processed}</strong> processed
        </span>
        <span>
          <strong>{summary.failed}</strong> failed
        </span>
        <span>
          <strong>{summary.skipped}</strong> skipped
        </span>
        <span>
          <strong>{summary.cancelled}</strong> cancelled
        </span>
      </div>
      <div className="resultList">
        {summary.files.map((file) => (
          <div className="resultRow" key={`${file.input}-${file.output}`}>
            <span className={`resultStatus ${file.status}`}>{file.status}</span>
            <span className="resultPath">{file.input}</span>
            <span className="resultArrow">→</span>
            <span className="resultPath">{file.output}</span>
            {file.error ? (
              <small>
                {file.error.code}: {file.error.message}
              </small>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function App() {
  const [inputs, setInputs] = useState<string[]>([]);
  const [outputDirectory, setOutputDirectory] = useState("");
  const [pipeline, setPipeline] = useState<PipelineConfig>(defaultPipeline);
  const [preview, setPreview] = useState<DesktopPreview | null>(null);
  const [progress, setProgress] = useState<ExecutionProgress | null>(null);
  const [summary, setSummary] = useState<ExecutionSummary | null>(null);
  const [error, setError] = useState<DesktopRpcError | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [dropActive, setDropActive] = useState(false);

  useEffect(() => {
    const handleProgress = (event: DesktopProgressEvent) => {
      setProgress(event.progress);
      if (event.progress.phase === "cancelled") setStatus("cancelled");
      else if (event.progress.phase === "completed") setStatus("completed");
      else setStatus("running");
    };
    desktopRpc.addMessageListener("executionProgress", handleProgress);
    return () => desktopRpc.removeMessageListener("executionProgress", handleProgress);
  }, []);

  function clearFeedback() {
    setError(null);
    setMessage("");
    setSummary(null);
    setProgress(null);
  }

  async function chooseInputs() {
    clearFeedback();
    try {
      const response = await desktopRpc.request.selectInputs({});
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if (response.value.cancelled) {
        setMessage("Selection cancelled.");
        return;
      }
      setInputs((current) => [...new Set([...current, ...response.value.paths])]);
      setStatus("idle");
    } catch (caught) {
      setError(rpcFailure(caught));
    }
  }

  async function chooseOutputDirectory() {
    clearFeedback();
    try {
      const response = await desktopRpc.request.selectOutputDirectory({});
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if (response.value.paths[0] !== undefined) setOutputDirectory(response.value.paths[0]);
      else setMessage("Output selection cancelled.");
    } catch (caught) {
      setError(rpcFailure(caught));
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDropActive(false);
    if (!canEdit) return;
    const paths = droppedPaths(event);
    if (paths.length === 0) {
      setError({
        code: "DROP_PATHS_UNAVAILABLE",
        message: "This platform did not expose dropped paths. Use Select files or folders.",
      });
      return;
    }
    clearFeedback();
    setInputs((current) => [...new Set([...current, ...paths])]);
    setMessage(`${paths.length} dropped path(s) added.`);
  }

  async function previewPlan() {
    clearFeedback();
    if (inputs.length === 0) {
      setError({ code: "NO_INPUT", message: "Select at least one image or folder first." });
      return;
    }
    setStatus("previewing");
    try {
      const response = await desktopRpc.request.preview({
        inputs,
        outputDirectory: outputDirectory.trim() === "" ? null : outputDirectory,
        pipeline,
      });
      if (!response.ok) {
        setStatus("idle");
        setError(response.error);
        return;
      }
      setPreview(response.value);
      setStatus("ready");
      setMessage("Preview generated. Review conflicts before executing.");
    } catch (caught) {
      setStatus("idle");
      setError(rpcFailure(caught));
    }
  }

  async function executePlan() {
    if (preview === null) return;
    clearFeedback();
    setStatus("running");
    try {
      const response = await desktopRpc.request.execute({ runId: preview.runId });
      if (!response.ok) {
        setStatus("ready");
        setError(response.error);
        return;
      }
      setSummary(response.value);
      setStatus(response.value.cancelled === response.value.total ? "cancelled" : "completed");
    } catch (caught) {
      setStatus("ready");
      setError(rpcFailure(caught));
    }
  }

  async function cancelPlan() {
    if (preview === null) return;
    setStatus("cancelling");
    try {
      const response = await desktopRpc.request.cancel({ runId: preview.runId });
      if (!response.ok) {
        setStatus("ready");
        setError(response.error);
        return;
      }
      setStatus("cancelled");
      setMessage("Cancellation requested. No new files will be started.");
    } catch (caught) {
      setStatus("ready");
      setError(rpcFailure(caught));
    }
  }

  function editPlan() {
    setPreview(null);
    setSummary(null);
    setProgress(null);
    setError(null);
    setMessage("Update the request, then generate a new preview.");
    setStatus("idle");
  }

  function updateOperation(index: number, operation: PipelineOperation) {
    setPipeline((current) => ({
      ...current,
      operations: current.operations.map((item, itemIndex) =>
        itemIndex === index ? operation : item,
      ),
    }));
  }

  function moveOperation(index: number, direction: -1 | 1) {
    setPipeline((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.operations.length) return current;
      const operations = [...current.operations];
      [operations[index], operations[target]] = [operations[target]!, operations[index]!];
      return { ...current, operations };
    });
  }

  function addOperation(event: ChangeEvent<HTMLSelectElement>) {
    if (event.target.value === "") return;
    setPipeline((current) => ({
      ...current,
      operations: [...current.operations, operationFor(event.target.value as OperationType)],
    }));
    event.target.value = "";
  }

  const canEdit =
    preview === null && status !== "previewing" && status !== "running" && status !== "cancelling";

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="https://rastry.dev">
          <span className="brandMark" aria-hidden="true">
            R
          </span>
          Rastry
        </a>
        <span className="status">
          <i /> Local-first · v0.2
        </span>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">Desktop workflow · dry-run first</p>
          <h1>
            Lighter images.
            <br />
            Your files stay with you.
          </h1>
          <p className="lede">
            Build a repeatable image pipeline, inspect every output path, then explicitly start a
            safe local run.
          </p>
        </div>
        <div className="privacyNote">
          <span aria-hidden="true">◎</span>
          <span>
            Paths and results stay in the Bun main process. Image bytes never cross the webview.
          </span>
        </div>
      </section>

      <div className="workspace">
        <section className="panel inputsPanel" aria-labelledby="inputs-heading">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">01 · Sources</p>
              <h2 id="inputs-heading">Choose your images</h2>
            </div>
            <button
              type="button"
              onClick={() => setInputs([])}
              disabled={inputs.length === 0 || !canEdit}
              className="quietButton"
            >
              Clear
            </button>
          </div>
          <div
            className={`dropzone ${dropActive ? "dropzoneActive" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="Drop image files or folders here"
            onDragEnter={(event) => {
              event.preventDefault();
              setDropActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDropActive(false)}
            onDrop={handleDrop}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") void chooseInputs();
            }}
          >
            <span className="dropIcon">↘</span>
            <strong>Drop supported paths here</strong>
            <small>PNG, JPEG, and WebP files or folders</small>
          </div>
          <button
            type="button"
            className="primaryButton fullButton"
            onClick={() => void chooseInputs()}
            disabled={!canEdit}
          >
            Select files or folders
          </button>
          {inputs.length > 0 ? (
            <div className="pathList" aria-label="Selected inputs">
              {inputs.map((input) => (
                <div className="pathRow" key={input}>
                  <span>↳</span>
                  <span>{input}</span>
                  <button
                    type="button"
                    onClick={() => setInputs((current) => current.filter((item) => item !== input))}
                    disabled={!canEdit}
                    aria-label={`Remove ${input}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="emptyState">No inputs selected yet.</p>
          )}
        </section>

        <section className="panel outputPanel" aria-labelledby="output-heading">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">02 · Destination</p>
              <h2 id="output-heading">Safe output directory</h2>
            </div>
          </div>
          <div className="inlineField">
            <label htmlFor="output-directory">Output directory</label>
            <div className="inputWithButton">
              <input
                id="output-directory"
                value={outputDirectory}
                onChange={(event) => setOutputDirectory(event.target.value)}
                placeholder="Default: rastry-output beside the first input"
                disabled={!canEdit}
              />
              <button
                type="button"
                onClick={() => void chooseOutputDirectory()}
                disabled={!canEdit}
              >
                Browse
              </button>
            </div>
          </div>
          <p className="safetyCopy">
            Rastry never overwrites originals or existing outputs. Conflicts stay visible in the
            preview.
          </p>
        </section>

        <section className="panel pipelinePanel" aria-labelledby="pipeline-heading">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">03 · Pipeline</p>
              <h2 id="pipeline-heading">Configure transformations</h2>
            </div>
            <label className="addOperation">
              <span className="srOnly">Add operation</span>
              <select defaultValue="" onChange={addOperation} disabled={!canEdit}>
                <option value="">+ Add operation</option>
                <option value="resize">Resize</option>
                <option value="crop">Crop</option>
                <option value="trim">Transparent trim</option>
                <option value="padding">Padding</option>
                <option value="convert">Convert</option>
                <option value="strip-metadata">Remove metadata</option>
              </select>
            </label>
          </div>
          <div className="operationsList">
            {pipeline.operations.map((operation, index) => (
              <OperationCard
                key={`${index}-${operation.type}`}
                operation={operation}
                index={index}
                total={pipeline.operations.length}
                onChange={(next) => updateOperation(index, next)}
                onRemove={() =>
                  setPipeline((current) => ({
                    ...current,
                    operations: current.operations.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
                onMove={(direction) => moveOperation(index, direction)}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="actionBar" aria-label="Run actions">
        <div>
          <p className="eyebrow">04 · Review and run</p>
          <strong>
            {status === "previewing"
              ? "Building deterministic preview…"
              : status === "running" || status === "cancelling"
                ? "Processing locally…"
                : status === "cancelled"
                  ? "Run cancelled"
                  : "Preview before any write"}
          </strong>
          {message ? <small>{message}</small> : null}
        </div>
        <div className="actionButtons">
          <button
            type="button"
            className="secondaryButton"
            onClick={() => void previewPlan()}
            disabled={!canEdit || inputs.length === 0}
          >
            Preview plan
          </button>
          {preview !== null ? (
            <>
              <button
                type="button"
                className="quietButton"
                onClick={editPlan}
                disabled={status === "running" || status === "cancelling"}
              >
                Edit plan
              </button>
              <button
                type="button"
                className="primaryButton"
                onClick={() => void (status === "ready" ? executePlan() : cancelPlan())}
                disabled={
                  status === "completed" ||
                  status === "cancelled" ||
                  status === "cancelling" ||
                  (status !== "ready" && status !== "running")
                }
              >
                {status === "ready"
                  ? "Execute confirmed plan"
                  : status === "running"
                    ? "Cancel run"
                    : "Plan reviewed"}
              </button>
            </>
          ) : null}
        </div>
      </section>

      {error ? <ErrorNotice error={error} /> : null}
      {progress ? <ProgressNotice progress={progress} /> : null}

      {preview !== null ? (
        <section className="planPreview panel" aria-labelledby="preview-heading">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Plan preview · {preview.runId}</p>
              <h2 id="preview-heading">{preview.plan.files.length} output(s) planned</h2>
            </div>
            <span className="dryRunBadge">DRY RUN · NO WRITES</span>
          </div>
          <p className="planDestination">Destination: {preview.plan.outputDirectory}</p>
          {preview.plan.warnings.map((warning) => (
            <div className="notice warning" key={warning}>
              {warning}
            </div>
          ))}
          <div className="planList">
            {preview.plan.files.map((file) => (
              <div
                className={`planRow ${file.preflightError ? "planConflict" : ""}`}
                key={`${file.input}-${file.output}`}
              >
                <div>
                  <strong>{file.input}</strong>
                  <span>→ {file.output}</span>
                </div>
                {file.preflightError ? (
                  <small>
                    {file.preflightError.code}: {file.preflightError.message}
                  </small>
                ) : (
                  <span className="plannedBadge">Ready</span>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {summary ? <Summary summary={summary} /> : null}

      <footer className="footerCopy">
        Local-first by default · originals are never overwritten · no uploads
      </footer>
    </main>
  );
}
