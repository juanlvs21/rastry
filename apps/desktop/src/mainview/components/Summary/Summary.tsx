import type { ExecutionSummary } from "@rastry/contracts";

import { Card } from "../Card";
import "./Summary.css";

export function Summary({ summary }: { summary: ExecutionSummary }) {
  return (
    <Card className="rastry-summary" aria-labelledby="summary-heading">
      <div className="rastry-summary__heading">
        <div>
          <p className="rastry-eyebrow">Run complete</p>
          <h2 id="summary-heading">Your files are ready</h2>
        </div>
        <span className="rastry-summary__bytes">
          {summary.bytesBefore.toLocaleString()} → {summary.bytesAfter.toLocaleString()} bytes
        </span>
      </div>
      <div className="rastry-summary__stats">
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
      <div className="rastry-summary__results">
        {summary.files.map((file) => (
          <div className="rastry-summary__row" key={`${file.input}-${file.output}`}>
            <span className={`rastry-summary__status rastry-summary__status--${file.status}`}>
              {file.status}
            </span>
            <span className="rastry-summary__path">{file.input}</span>
            <span className="rastry-summary__arrow">→</span>
            <span className="rastry-summary__path">{file.output}</span>
            {file.error ? (
              <small>
                {file.error.code}: {file.error.message}
              </small>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
