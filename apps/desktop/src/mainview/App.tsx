const foundations = [
  ["Core", "Planes deterministas y salidas seguras"],
  ["CLI", "Ejecución local y automatizable"],
  ["Desktop", "Electrobun, Bun y React"],
] as const;

export function App() {
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="https://rastry.dev">
          <span className="brandMark" aria-hidden="true">R</span>
          Rastry
        </a>
        <span className="status"><i /> Local-first</span>
      </header>

      <section className="hero">
        <p className="eyebrow">Fundaciones · v0.0.0</p>
        <h1>Imágenes más ligeras.<br />Tus archivos se quedan contigo.</h1>
        <p className="lede">
          La estructura base está lista para convertir, redimensionar y optimizar lotes desde una interfaz nativa o la terminal.
        </p>
        <div className="dropzone" role="group" aria-label="Área de archivos aún no habilitada">
          <span className="dropIcon">↘</span>
          <strong>Motor preparado para conectar</strong>
          <small>El procesamiento de imágenes llega en el siguiente incremento.</small>
        </div>
      </section>

      <section className="foundations" aria-label="Capas disponibles">
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

