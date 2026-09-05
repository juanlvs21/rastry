import type { ChangeEvent, DragEvent } from "react";

import type {
  ExecutionProgress,
  ExecutionSummary,
  PipelineConfig,
  PipelineOperation,
} from "@rastry/contracts";

import type { DesktopPreview, DesktopRpcError } from "../../../rpc";
import { OperationCard } from "../OperationCard";
import { Summary } from "../Summary";
import { Button } from "../Button";
import { Card } from "../Card";
import { Input } from "../Input";
import { Select } from "../Select";
import { Spinner } from "../Spinner";
import "./WorkflowSteps.css";

export type WorkflowStatus =
  | "idle"
  | "previewing"
  | "ready"
  | "running"
  | "cancelling"
  | "completed"
  | "cancelled";

export function ImportStep({
  inputs,
  dropActive,
  canEdit,
  onDrop,
  onDragActive,
  onSelectInputs,
  onSelectFolder,
  onRemoveInput,
  onClear,
  onContinue,
}: {
  inputs: string[];
  dropActive: boolean;
  canEdit: boolean;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragActive: (active: boolean) => void;
  onSelectInputs: () => void;
  onSelectFolder: () => void;
  onRemoveInput: (input: string) => void;
  onClear: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="rastry-workflow__screen rastry-workflow__screen--import">
      <Card className="rastry-workflow__card rastry-import">
        <div className="rastry-workflow__card-heading">
          <div>
            <p className="rastry-eyebrow">01 · Import</p>
            <h1>Bring in your images</h1>
            <p>
              Start with files or folders. Nothing is uploaded and your originals stay untouched.
            </p>
          </div>
          <span className="rastry-workflow__step-count">1 / 3</span>
        </div>

        <div
          className={`rastry-dropzone ${dropActive ? "rastry-dropzone--active" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Drop image files or folders here"
          onDragEnter={(event) => {
            event.preventDefault();
            onDragActive(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => onDragActive(false)}
          onDrop={onDrop}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && canEdit) onSelectInputs();
          }}
        >
          <span className="rastry-dropzone__icon" aria-hidden="true">
            ↘
          </span>
          <div>
            <strong>Drop supported paths here</strong>
            <small>PNG, JPEG, and WebP files or folders</small>
          </div>
        </div>

        <div className="rastry-import__actions">
          <Button variant="primary" type="button" onClick={onSelectInputs} disabled={!canEdit}>
            Select image files
          </Button>
          <Button variant="ghost" type="button" onClick={onSelectFolder} disabled={!canEdit}>
            Select a folder
          </Button>
        </div>

        {inputs.length > 0 ? (
          <div className="rastry-path-list" aria-label="Selected inputs">
            <div className="rastry-path-list__heading">
              <span>{inputs.length} path(s) selected</span>
              <Button variant="ghost" type="button" onClick={onClear} disabled={!canEdit}>
                Clear all
              </Button>
            </div>
            {inputs.map((input) => (
              <div className="rastry-path-row" key={input}>
                <span className="rastry-path-row__marker" aria-hidden="true">
                  ↳
                </span>
                <span className="rastry-path-row__value">{input}</span>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => onRemoveInput(input)}
                  disabled={!canEdit}
                  aria-label={`Remove ${input}`}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rastry-empty-state">
            <span>◎</span>
            <p>No inputs selected yet.</p>
            <small>Choose at least one image to continue.</small>
          </div>
        )}

        <div className="rastry-workflow__footer">
          <span className="rastry-workflow__footer-hint">Local-first workflow</span>
          <Button
            variant="primary"
            type="button"
            onClick={onContinue}
            disabled={!canEdit || inputs.length === 0}
          >
            Continue to setup <span aria-hidden="true">→</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function ConfigureStep({
  outputDirectory,
  pipeline,
  canEdit,
  onOutputDirectoryChange,
  onBrowseOutput,
  onAddOperation,
  onUpdateOperation,
  onRemoveOperation,
  onMoveOperation,
  onBack,
  onContinue,
}: {
  outputDirectory: string;
  pipeline: PipelineConfig;
  canEdit: boolean;
  onOutputDirectoryChange: (value: string) => void;
  onBrowseOutput: () => void;
  onAddOperation: (event: ChangeEvent<HTMLSelectElement>) => void;
  onUpdateOperation: (index: number, operation: PipelineOperation) => void;
  onRemoveOperation: (index: number) => void;
  onMoveOperation: (index: number, direction: -1 | 1) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="rastry-workflow__screen rastry-workflow__screen--configure">
      <Card className="rastry-workflow__card rastry-configure">
        <div className="rastry-workflow__card-heading">
          <div>
            <p className="rastry-eyebrow">02 · Setup</p>
            <h1>Shape the output</h1>
            <p>Choose where results should land and compose the transformations in order.</p>
          </div>
          <span className="rastry-workflow__step-count">2 / 3</span>
        </div>

        <div className="rastry-configure__destination">
          <div className="rastry-subsection-heading">
            <div>
              <span className="rastry-subsection-heading__number">A</span>
              <div>
                <h2>Safe destination</h2>
                <p>Defaults beside the first input.</p>
              </div>
            </div>
          </div>
          <div className="rastry-input-group">
            <Input
              label="Output directory"
              value={outputDirectory}
              onChange={(event) => onOutputDirectoryChange(event.target.value)}
              placeholder="Default: same folder as {name}-rastry.{format}"
              disabled={!canEdit}
            />
            <Button variant="secondary" type="button" onClick={onBrowseOutput} disabled={!canEdit}>
              Browse
            </Button>
          </div>
          <p className="rastry-safety-copy">
            <span aria-hidden="true">✓</span> Originals are never overwritten. Existing output
            conflicts will appear in the review.
          </p>
        </div>

        <div className="rastry-configure__pipeline">
          <div className="rastry-subsection-heading">
            <div>
              <span className="rastry-subsection-heading__number">B</span>
              <div>
                <h2>Transformations</h2>
                <p>Applied from top to bottom.</p>
              </div>
            </div>
            <Select
              aria-label="Add operation"
              value=""
              onChange={onAddOperation}
              disabled={!canEdit}
              className="rastry-workflow__add-select"
            >
              <option value="">+ Add operation</option>
              <option value="resize">Resize</option>
              <option value="crop">Crop</option>
              <option value="trim">Transparent trim</option>
              <option value="padding">Padding</option>
              <option value="convert">Convert</option>
              <option value="strip-metadata">Remove metadata</option>
            </Select>
          </div>
          <div className="rastry-operation-list">
            {pipeline.operations.map((operation, index) => (
              <OperationCard
                key={`${index}-${operation.type}`}
                operation={operation}
                index={index}
                total={pipeline.operations.length}
                onChange={(next) => onUpdateOperation(index, next)}
                onRemove={() => onRemoveOperation(index)}
                onMove={(direction) => onMoveOperation(index, direction)}
              />
            ))}
          </div>
        </div>

        <div className="rastry-workflow__footer">
          <Button variant="ghost" type="button" onClick={onBack} disabled={!canEdit}>
            ← Back to import
          </Button>
          <Button variant="primary" type="button" onClick={onContinue} disabled={!canEdit}>
            Review processing <span aria-hidden="true">→</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ErrorNotice({ error }: { error: DesktopRpcError }) {
  return (
    <div className="rastry-workflow__error" role="alert">
      <strong>{error.code}</strong>
      <span>{error.message}</span>
    </div>
  );
}

function ProgressNotice({ progress }: { progress: ExecutionProgress }) {
  const percentage =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const file = progress.file?.input ?? progress.result?.input;
  return (
    <div className="rastry-progress-panel" role="status" aria-live="polite">
      <div className="rastry-progress-panel__meta">
        <strong>{progress.phase}</strong>
        <span>
          {progress.completed} / {progress.total}
        </span>
      </div>
      <div
        className="rastry-progress-bar"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
      {file ? <small>{file}</small> : null}
    </div>
  );
}

export function ProcessStep({
  preview,
  progress,
  summary,
  status,
  error,
  message,
  onEdit,
  onExecute,
  onCancel,
  onReset,
}: {
  preview: DesktopPreview | null;
  progress: ExecutionProgress | null;
  summary: ExecutionSummary | null;
  status: WorkflowStatus;
  error: DesktopRpcError | null;
  message: string;
  onEdit: () => void;
  onExecute: () => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  const isRunning = status === "running" || status === "cancelling";
  const title = isRunning
    ? "Processing locally"
    : status === "completed"
      ? "Processing complete"
      : status === "cancelled"
        ? "Run cancelled"
        : "Ready to process";
  const detail = isRunning
    ? "Rastry is working through your files. Keep this window open."
    : status === "completed"
      ? "Your outputs are ready in the selected destination."
      : status === "cancelled"
        ? "No new files will be started."
        : "Review the dry-run plan, then confirm the local run.";

  return (
    <div className="rastry-workflow__screen rastry-workflow__screen--process">
      <Card
        className={`rastry-workflow__card rastry-process rastry-process--${isRunning ? "running" : status}`}
      >
        <div className="rastry-workflow__card-heading">
          <div>
            <p className="rastry-eyebrow">03 · Process</p>
            <h1>{title}</h1>
            <p>{detail}</p>
          </div>
          <span className="rastry-workflow__step-count">3 / 3</span>
        </div>
        <div className="rastry-process__hero">
          <div className={`rastry-process__orb ${isRunning ? "rastry-process__orb--running" : ""}`}>
            {isRunning ? (
              <Spinner label="Processing" />
            ) : status === "completed" ? (
              "✓"
            ) : status === "cancelled" ? (
              "!"
            ) : (
              "→"
            )}
          </div>
          <div>
            <strong>
              {isRunning && progress
                ? `${progress.completed} of ${progress.total} files`
                : preview
                  ? `${preview.plan.files.length} output(s) planned`
                  : "No plan yet"}
            </strong>
            <span>{message || "Dry-run verified · no writes yet"}</span>
          </div>
        </div>
        {isRunning && progress ? <ProgressNotice progress={progress} /> : null}

        {preview ? (
          <div className="rastry-plan-panel">
            <div className="rastry-plan-panel__heading">
              <div>
                <span className="rastry-eyebrow">Dry-run review</span>
                <h2>Nothing writes until you confirm</h2>
              </div>
              <span className="rastry-plan-badge rastry-plan-badge--dry-run">NO WRITES</span>
            </div>
            <p className="rastry-plan-panel__destination">
              Destination: {preview.plan.outputDirectory}
            </p>
            {preview.plan.warnings.map((warning) => (
              <div className="rastry-plan-panel__warning" key={warning}>
                {warning}
              </div>
            ))}
            <div className="rastry-plan-panel__list">
              {preview.plan.files.map((file) => (
                <div
                  className={`rastry-plan-panel__row ${file.preflightError ? "rastry-plan-panel__row--conflict" : ""}`}
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
                    <span className="rastry-plan-badge rastry-plan-badge--planned">Ready</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <ErrorNotice error={error} /> : null}
        <div className="rastry-process__actions">
          {status === "ready" ? (
            <>
              <Button variant="ghost" type="button" onClick={onEdit}>
                ← Edit setup
              </Button>
              <Button variant="primary" type="button" onClick={onExecute}>
                Execute confirmed plan <span aria-hidden="true">→</span>
              </Button>
            </>
          ) : null}
          {isRunning ? (
            <Button
              variant="danger"
              type="button"
              onClick={onCancel}
              disabled={status === "cancelling"}
            >
              {status === "cancelling" ? "Cancelling…" : "Cancel run"}
            </Button>
          ) : null}
          {status === "completed" || status === "cancelled" ? (
            <Button variant="primary" type="button" onClick={onReset}>
              Start another batch <span aria-hidden="true">→</span>
            </Button>
          ) : null}
        </div>
      </Card>
      {summary ? <Summary summary={summary} /> : null}
    </div>
  );
}
