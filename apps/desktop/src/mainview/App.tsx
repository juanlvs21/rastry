import { useEffect, useState, type DragEvent } from "react";

import type {
  ExecutionProgress,
  ExecutionSummary,
  PipelineConfig,
  PipelineOperation,
} from "@rastry/contracts";

import type { DesktopPreview, DesktopProgressEvent, DesktopRpcError } from "../rpc";
import {
  ConfigureStep,
  ImportStep,
  ProcessStep,
  operationFor,
  type WorkflowStatus,
} from "./components";
import { desktopRpc } from "./bridge";
import "./styles.css";

const defaultPipeline: PipelineConfig = {
  version: 1,
  operations: [{ type: "convert", format: "webp", quality: 82 }, { type: "strip-metadata" }],
};

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

export function App() {
  const [step, setStep] = useState<"import" | "configure" | "process">("import");
  const [inputs, setInputs] = useState<string[]>([]);
  const [outputDirectory, setOutputDirectory] = useState("");
  const [pipeline, setPipeline] = useState<PipelineConfig>(defaultPipeline);
  const [preview, setPreview] = useState<DesktopPreview | null>(null);
  const [progress, setProgress] = useState<ExecutionProgress | null>(null);
  const [summary, setSummary] = useState<ExecutionSummary | null>(null);
  const [error, setError] = useState<DesktopRpcError | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<WorkflowStatus>("idle");
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

  const canEdit =
    preview === null && status !== "previewing" && status !== "running" && status !== "cancelling";

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

  async function chooseInputFolder() {
    clearFeedback();
    try {
      const response = await desktopRpc.request.selectInputFolder({});
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if (response.value.cancelled) {
        setMessage("Folder selection cancelled.");
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

  function continueFromImport() {
    if (inputs.length === 0) {
      setError({ code: "NO_INPUT", message: "Select at least one image or folder first." });
      return;
    }
    clearFeedback();
    setStep("configure");
  }

  async function previewPlan(): Promise<boolean> {
    clearFeedback();
    if (inputs.length === 0) {
      setError({ code: "NO_INPUT", message: "Select at least one image or folder first." });
      return false;
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
        return false;
      }
      setPreview(response.value);
      setStatus("ready");
      setMessage("Preview generated. Review conflicts before executing.");
      return true;
    } catch (caught) {
      setStatus("idle");
      setError(rpcFailure(caught));
      return false;
    }
  }

  async function reviewConfiguration() {
    if (await previewPlan()) setStep("process");
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
    setStep("configure");
  }

  function resetWorkflow() {
    setStep("import");
    setInputs([]);
    setOutputDirectory("");
    setPipeline(defaultPipeline);
    setPreview(null);
    setProgress(null);
    setSummary(null);
    setError(null);
    setMessage("");
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

  function removeOperation(index: number) {
    setPipeline((current) => ({
      ...current,
      operations: current.operations.filter((_, itemIndex) => itemIndex !== index),
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

  return (
    <main className="rastry-app">
      <header className="rastry-app__topbar">
        <a className="rastry-app__brand" href="https://rastry.dev">
          <span className="rastry-app__brand-mark" aria-hidden="true">
            R
          </span>
          <span>Rastry</span>
        </a>
        <span className="rastry-app__status">
          <i className="rastry-app__status-indicator" /> Local-first · v0.2
        </span>
      </header>

      <section className="rastry-app__intro">
        <div className="rastry-app__intro-copy">
          <p className="rastry-eyebrow">Image workflow · private by default</p>
          <h1 className="rastry-app__title">Make every image feel intentional.</h1>
          <p className="rastry-app__lede">
            A calm, guided workspace for importing, shaping, and processing image batches without
            leaving your machine.
          </p>
        </div>
        <div className="rastry-app__privacy-note">
          <span className="rastry-app__privacy-icon" aria-hidden="true">
            ◎
          </span>
          <span className="rastry-app__privacy-copy">
            Paths and results stay in the Bun main process. Image bytes never cross the webview.
          </span>
        </div>
      </section>

      <nav className="rastry-stepper" aria-label="Workflow progress">
        {(["import", "configure", "process"] as const).map((item, index) => {
          const labels = { import: "Import", configure: "Configure", process: "Process" };
          const active = step === item;
          const complete = (["import", "configure", "process"] as const).indexOf(step) > index;
          return (
            <div
              className={`rastry-stepper__step ${active ? "rastry-stepper__step--active" : ""} ${complete ? "rastry-stepper__step--complete" : ""}`}
              key={item}
            >
              <span className="rastry-stepper__number">{complete ? "✓" : `0${index + 1}`}</span>
              <strong className="rastry-stepper__label">{labels[item]}</strong>
              {index < 2 ? <i className="rastry-stepper__connector" aria-hidden="true" /> : null}
            </div>
          );
        })}
      </nav>

      {step === "import" ? (
        <ImportStep
          inputs={inputs}
          dropActive={dropActive}
          canEdit={canEdit}
          onDrop={handleDrop}
          onDragActive={setDropActive}
          onSelectInputs={() => void chooseInputs()}
          onSelectFolder={() => void chooseInputFolder()}
          onRemoveInput={(input) =>
            setInputs((current) => current.filter((item) => item !== input))
          }
          onClear={() => setInputs([])}
          onContinue={continueFromImport}
        />
      ) : null}
      {step === "configure" ? (
        <ConfigureStep
          outputDirectory={outputDirectory}
          pipeline={pipeline}
          canEdit={canEdit}
          onOutputDirectoryChange={setOutputDirectory}
          onBrowseOutput={() => void chooseOutputDirectory()}
          onAddOperation={(event) => {
            if (event.target.value !== "") {
              setPipeline((current) => ({
                ...current,
                operations: [
                  ...current.operations,
                  operationFor(event.target.value as PipelineOperation["type"]),
                ],
              }));
              event.target.value = "";
            }
          }}
          onUpdateOperation={updateOperation}
          onRemoveOperation={removeOperation}
          onMoveOperation={moveOperation}
          onBack={() => setStep("import")}
          onContinue={() => void reviewConfiguration()}
        />
      ) : null}
      {step !== "process" && (error || message) ? (
        <div
          className={`rastry-app__feedback ${error ? "rastry-app__feedback--error" : ""}`}
          role={error ? "alert" : "status"}
        >
          {error ? <strong>{error.code}</strong> : null}
          <span>{error?.message ?? message}</span>
        </div>
      ) : null}
      {step === "process" ? (
        <ProcessStep
          preview={preview}
          progress={progress}
          summary={summary}
          status={status}
          error={error}
          message={message}
          onEdit={editPlan}
          onExecute={() => void executePlan()}
          onCancel={() => void cancelPlan()}
          onReset={resetWorkflow}
        />
      ) : null}

      <footer className="rastry-app__footer">
        Local-first by default · originals are never overwritten · no uploads
      </footer>
    </main>
  );
}
