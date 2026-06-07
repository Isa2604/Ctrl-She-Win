import React, { useState } from "react";

// ── FormNewModel embebido ──────────────────────────────────────────────────────
const FormNewModel = ({ onClose }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");

  const styles = {
    title: {
      marginBottom: "22px",
      fontSize: "1.4rem",
      letterSpacing: "0.02em",
      color: "#5b4bff",
      margin: "0 0 22px 0",
    },
    form: { display: "grid", gap: "18px" },
    label: { display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.95rem" },
    input: {
      padding: "12px 14px",
      borderRadius: "12px",
      border: "1px solid #d0c9f2",
      outline: "none",
      background: "#faf7ff",
      fontSize: "1rem",
      color: "#333",
    },
    btnRow: { display: "flex", gap: "10px", marginTop: "6px" },
    btnPrimary: {
      flex: 1,
      padding: "12px 16px",
      borderRadius: "999px",
      border: "none",
      background: "#5b4bff",
      color: "#fff",
      fontSize: "1rem",
      cursor: "pointer",
    },
    btnSecondary: {
      flex: 1,
      padding: "12px 16px",
      borderRadius: "999px",
      border: "1px solid #d0c9f2",
      background: "#fff",
      color: "#5b4bff",
      fontSize: "1rem",
      cursor: "pointer",
    },
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ name, description, url });
    onClose();
  };

  const handleReset = () => {
    setName("");
    setDescription("");
    setUrl("");
  };

  return (
    <>
      <h2 style={styles.title}>Nuevo Modelo</h2>
      <form style={styles.form} onSubmit={handleSubmit}>
        <label style={styles.label}>
          Nombre:
          <input
            style={styles.input}
            type="text"
            placeholder="Nombre del modelo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label style={styles.label}>
          Descripción:
          <input
            style={styles.input}
            type="text"
            placeholder="Descripción breve"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label style={styles.label}>
          URL:
          <input
            style={styles.input}
            type="text"
            placeholder="URL de la pagina"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} type="submit">
            Grabar
          </button>
          <button style={styles.btnSecondary} type="button" onClick={handleReset}>
            Limpiar
          </button>
        </div>
      </form>
    </>
  );
};

// ── Modal genérico ─────────────────────────────────────────────────────────────
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // evita cerrar al hacer click adentro
        style={{
          background: "linear-gradient(180deg, #f8f4ff 0%, #ffffff 100%)",
          borderRadius: "18px",
          boxShadow: "0 16px 32px rgba(0,0,0,0.12)",
          padding: "28px",
          width: "100%",
          maxWidth: "420px",
          position: "relative",
          fontFamily: "Arial, sans-serif",
          color: "#333",
        }}
      >
        {/* Botón X para cerrar */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: "#aaa",
            lineHeight: 1,
          }}
          aria-label="Cerrar"
        >
          ×
        </button>

        {children}
      </div>
    </div>
  );
};

// ── Datos mock ─────────────────────────────────────────────────────────────────
const mockDashboards = [
  { id: 1, title: "Ventas", description: "Resumen de ventas por producto y período", createdAt: "2026-01-15" },
  { id: 2, title: "Inventario", description: "Estado del stock y alertas", createdAt: "2026-02-03" },
  { id: 3, title: "Clientes", description: "Actividad y segmentación de clientes", createdAt: "2026-03-10" },
  { id: 4, title: "Finanzas", description: "Flujos, gastos e ingresos", createdAt: "2025-11-20" },
];

const formatDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ── Home ───────────────────────────────────────────────────────────────────────
const Home = ({ user }) => {
  const [selected, setSelected] = useState({});
  const [modalOpen, setModalOpen] = useState(false); // ← estado del modal

  const allSelected = mockDashboards.length > 0 && mockDashboards.every((r) => selected[r.id]);
  const anySelected = Object.values(selected).some(Boolean);

  const toggleAll = (checked) => {
    setSelected(checked ? Object.fromEntries(mockDashboards.map((r) => [r.id, true])) : {});
  };

  const toggleRow = (id, checked) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const handleDelete = () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    alert(`Eliminar modelos: ${ids.join(", ")}`);
  };

  const handleExecute = (row) => alert(`Ejecutar: ${row.title}`);

  const tdBase = { padding: "13px 16px", verticalAlign: "middle" };

  return (
    <div style={{ padding: "2rem 1.5rem", fontFamily: "Arial, sans-serif", background: "#f8f9fb", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>Modelos</h1>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        <button
          onClick={() => setModalOpen(true)} // ← abre el modal
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#185FA5", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}
        >
          + Crear modelo
        </button>
        <button
          onClick={handleDelete}
          disabled={!anySelected}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: anySelected ? "#fff2f2" : "#fafafa",
            color: anySelected ? "#c0392b" : "#bbb",
            border: `0.5px solid ${anySelected ? "#e5b4b4" : "#e5e5e5"}`,
            borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 500,
            cursor: anySelected ? "pointer" : "not-allowed", transition: "all 0.15s",
          }}
        >
          🗑 Eliminar modelo
        </button>
      </div>

      {/* Tabla */}
      <div style={{ border: "0.5px solid #e5e5e5", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <colgroup>
            <col style={{ width: 48 }} />
            <col style={{ width: "25%" }} />
            <col />
            <col style={{ width: 160 }} />
            <col style={{ width: 120 }} />
          </colgroup>
          <thead style={{ background: "#f8f9fb" }}>
            <tr>
              <th style={{ padding: "11px 16px", borderBottom: "0.5px solid #e5e5e5", textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  style={{ accentColor: "#185FA5", cursor: "pointer" }}
                />
              </th>
              {[["Nombre", "left"], ["Descripción", "left"], ["Fecha de creación", "left"], ["", "center"]].map(
                ([label, align], i) => (
                  <th key={i} style={{ padding: "11px 16px", textAlign: align, fontWeight: 500, fontSize: 13, color: "#888", borderBottom: "0.5px solid #e5e5e5" }}>
                    {label}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {mockDashboards.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#bbb", fontSize: 14 }}>
                  No hay modelos aún. Crea el primero.
                </td>
              </tr>
            ) : (
              mockDashboards.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: "0.5px solid #f0f0f0", background: selected[row.id] ? "#f0f6ff" : "transparent", transition: "background 0.1s" }}
                  onMouseEnter={(e) => { if (!selected[row.id]) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={(e) => { if (!selected[row.id]) e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ ...tdBase, textAlign: "center" }}>
                    <input type="checkbox" checked={!!selected[row.id]} onChange={(e) => toggleRow(row.id, e.target.checked)} style={{ accentColor: "#185FA5", cursor: "pointer" }} />
                  </td>
                  <td style={{ ...tdBase }}><span style={{ fontWeight: 500, color: "#1a1a1a" }}>{row.title}</span></td>
                  <td style={{ ...tdBase, color: "#666" }}>{row.description}</td>
                  <td style={{ ...tdBase, color: "#888", fontSize: 13, whiteSpace: "nowrap" }}>{formatDate(row.createdAt)}</td>
                  <td style={{ ...tdBase, textAlign: "center" }}>
                    <button
                      onClick={() => handleExecute(row)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eaf3de", color: "#3B6D11", border: "0.5px solid #c0dd97", borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#d4ebbb"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#eaf3de"; }}
                    >
                      ▶ Ejecutar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal con formulario */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <FormNewModel onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Home;
