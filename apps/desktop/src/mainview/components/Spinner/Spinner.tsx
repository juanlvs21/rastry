import "./Spinner.css";

export function Spinner({ label = "Working" }: { label?: string }) {
  return <span className="rastry-spinner" role="status" aria-label={label} />;
}
