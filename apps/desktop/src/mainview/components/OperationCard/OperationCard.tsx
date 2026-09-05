import type { PipelineOperation } from "@rastry/contracts";

import { Button } from "../Button";
import { OperationEditor } from "../OperationEditor";
import "./OperationCard.css";

const labels: Record<PipelineOperation["type"], string> = {
  resize: "Resize",
  crop: "Crop",
  trim: "Transparent trim",
  padding: "Padding",
  convert: "Convert",
  "strip-metadata": "Remove metadata",
};

export function OperationCard({
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
    <article className="rastry-operation-card">
      <header className="rastry-operation-card__header">
        <div className="rastry-operation-card__title">
          <span className="rastry-operation-card__index">0{index + 1}</span>
          <strong>{labels[operation.type]}</strong>
        </div>
        <div className="rastry-operation-card__actions">
          <Button
            variant="ghost"
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move operation up"
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move operation down"
          >
            ↓
          </Button>
          <Button variant="ghost" type="button" onClick={onRemove} disabled={total === 1}>
            Remove
          </Button>
        </div>
      </header>
      <OperationEditor operation={operation} onChange={onChange} />
    </article>
  );
}
