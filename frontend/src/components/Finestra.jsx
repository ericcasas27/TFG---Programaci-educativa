export default function Finestra({ titol, oberta, enTancar, children }) {
  if (!oberta) return null;

  return (
    <div className="modalFons" onClick={enTancar}>
      <div
        className="modalPanell"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalCapcalera">
          <h3>{titol}</h3>
          <button className="modalTancar" onClick={enTancar} type="button">
            ×
          </button>
        </div>

        <div className="modalContingut">{children}</div>
      </div>
    </div>
  );
}