const foundations = [
  ["Core", "Deterministic plans and safe outputs"],
  ["CLI", "Local and automatable execution"],
  ["Desktop", "Electrobun, Bun, and React"],
] as const;

export function App() {
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
          <i /> Local-first
        </span>
      </header>

      <section className="hero">
        <p className="eyebrow">Foundations · v0.0.0</p>
        <h1>
          Lighter images.
          <br />
          Your files stay with you.
        </h1>
        <p className="lede">
          The foundation is ready to convert, resize, and optimize batches from a native interface
          or the terminal.
        </p>
        <div className="dropzone" role="group" aria-label="File area not yet enabled">
          <span className="dropIcon">↘</span>
          <strong>Engine ready to connect</strong>
          <small>Image processing is coming in the next increment.</small>
        </div>
      </section>

      <section className="foundations" aria-label="Available layers">
        {foundations.map(([title, description], index) => (
          <article key={title}>
            <span>0{index + 1}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
