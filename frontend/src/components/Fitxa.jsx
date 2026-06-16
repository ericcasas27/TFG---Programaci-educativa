function Fitxa({
  imatge,
  nom,
  valor,
  editable,
  mostrarValor = false,
  mostrarNom = false,
  arrossegable = false,
  enComencarArrossegament,
  enCanviarValor,
  enClic,
  enPointerDown,
}) {
  const gestionarCanvi = (event) => {
    const text = event.target.value;

    if (text === "") {
      enCanviarValor?.(1);
      return;
    }

    const nouValor = Math.max(1, Number(text));
    enCanviarValor?.(nouValor);
  };

  return (
    <div
      className={`fitxa ${arrossegable ? "fitxa-arrossegable" : ""}`}
      draggable={arrossegable}
      onDragStart={arrossegable ? enComencarArrossegament : undefined}
      onPointerDown={enPointerDown}
      onClick={enClic}
      title={nom}
    >
      <img
        src={imatge}
        alt={nom}
        className="fitxaImatge"
        onError={() => console.error("No s'ha pogut carregar la imatge:", nom, imatge)}
      />

      {mostrarValor &&
        (editable ? (
          <input
            className="fitxaNumero"
            type="number"
            min="1"
            value={valor ?? 1}
            onChange={gestionarCanvi}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="fitxaNumero fitxaNumero-fix">{valor}</div>
        ))}

      {mostrarNom && <div className="fitxaNom">{nom}</div>}
    </div>
  );
}

export default Fitxa;