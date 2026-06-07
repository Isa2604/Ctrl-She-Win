import React, { useState, useEffect } from "react";
import { entrenar, getModelos } from "../api/api";

// ── FormNewModel embebido ──────────────────────────────────────────────────────
const FormNewModel = ({ onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formato, setFormato] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const styles = {
    title: { fontSize: "1.4rem", letterSpacing: "0.02em", color: "#5b4bff", margin: "0 0 22px 0" },
    form: { display: "grid", gap: "18px" },
    label: { display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.95rem" },
    input: {
      padding: "12px 14px", borderRadius: "12px", border: "1px solid #d0c9f2",
      outline: "none", background: "#faf7ff", fontSize: "1rem", color: "#333",
    },
    btnRow: { display: "flex", gap: "10px", marginTop: "6px" },
    btnPrimary: {
      flex: 1, padding: "12px 16px", borderRadius: "999px", border: "none",
      background: loading ? "#a09bdd" : "#5b4bff", color: "#fff",
      fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer",
    },
    btnSecondary: {
      flex: 1, padding: "12px 16px", borderRadius: "999px",
      border: "1px solid #d0c9f2", background: "#fff", color: "#5b4bff",
      fontSize: "1rem", cursor: "pointer",
    },
    error: {
      color: "#c0392b", background: "#fff2f2", border: "1px solid #e5b4b4",
      borderRadius: "8px", padding: "10px 14px", fontSize: "0.88rem",
    },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await entrenar(name, description, formato, url);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error entrenando modelo:", err);
      setError(err?.response?.data?.detail || "Error al crear el modelo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName("");
    setDescription("");
    setFormato("");
    setUrl("");
    setError(null);
  };

  return (
    <>
      <h2 style={styles.title}>Nuevo Modelo</h2>
      <form style={styles.form} onSubmit={handleSubmit}>
        {error && <div style={styles.error}>{error}</div>}
        <label style={styles.label}>
          Nombre:
          <input style={styles.input} type="text" placeholder="Nombre del modelo"
            value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label style={styles.label}>
          Descripción:
          <input style={styles.input} type="text" placeholder="Descripción breve"
            value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>
        <label style={styles.label}>
          Formato de visualización:
          <input style={styles.input} type="text" placeholder='Ej: tabla con columnas de producto y precio'
            value={formato} onChange={(e) => setFormato(e.target.value)} required />
        </label>
        <label style={styles.label}>
          URL:
          <input style={styles.input} type="text" placeholder="URL de la pagina"
            value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Grabar"}
          </button>
          <button style={styles.btnSecondary} type="button" onClick={handleReset} disabled={loading}>
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
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "linear-gradient(180deg, #f8f4ff 0%, #ffffff 100%)",
        borderRadius: "18px", boxShadow: "0 16px 32px rgba(0,0,0,0.12)",
        padding: "28px", width: "100%", maxWidth: "420px",
        position: "relative", fontFamily: "Arial, sans-serif", color: "#333",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "14px", right: "16px", background: "none",
          border: "none", fontSize: "20px", cursor: "pointer", color: "#aaa", lineHeight: 1,
        }} aria-label="Cerrar">×</button>
        {children}
      </div>
    </div>
  );
};

const formatDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
};

// ── Home ───────────────────────────────────────────────────────────────────────
const Home = ({ user }) => {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [modalOpen, setModalOpen] = useState(false);

  const cargarModelos = () => {
    setLoading(true);
    setError(null);
    getModelos()
      .then((res) => setModelos(res.data.modelos || []))
      .catch((err) => {
        console.error("Error cargando modelos:", err);
        setError("No se pudieron cargar los modelos. ¿Está corriendo el backend?");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarModelos();
  }, []);

  const allSelected = modelos.length > 0 && modelos.every((r) => selected[r.nombre]);
  const anySelected = Object.values(selected).some(Boolean);

  const toggleAll = (checked) => {
    setSelected(checked ? Object.fromEntries(modelos.map((r) => [r.nombre, true])) : {});
  };

  const toggleRow = (nombre, checked) => {
    setSelected((prev) => ({ ...prev, [nombre]: checked }));
  };

  const handleDelete = () => {
    const nombres = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    alert(`Eliminar modelos: ${nombres.join(", ")}`);
  };

  const handleExecute = (row) => alert(`Ejecutar: ${row.nombre}`);

  const tdBase = { padding: "13px 16px", verticalAlign: "middle" };

  return (
    <div style={{ padding: "2rem 1.5rem", fontFamily: "Arial, sans-serif", background: "#f8f9fb", minHeight: "100vh" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>Modelos</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        <button onClick={() => setModalOpen(true)} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "#185FA5", color: "#fff", border: "none",
          borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 500, cursor: "pointer",
        }}>
          + Crear modelo
        </button>
        <button onClick={handleDelete} disabled={!anySelected} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: anySelected ? "#fff2f2" : "#fafafa",
          color: anySelected ? "#c0392b" : "#bbb",
          border: `0.5px solid ${anySelected ? "#e5b4b4" : "#e5e5e5"}`,
          borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 500,
          cursor: anySelected ? "pointer" : "not-allowed", transition: "all 0.15s",
        }}>
          🗑 Eliminar modelo
        </button>
      </div>

      {error && (
        <div style={{
          background: "#fff2f2", border: "1px solid #e5b4b4", borderRadius: 8,
          padding: "12px 16px", marginBottom: "1rem", color: "#c0392b", fontSize: 14,
        }}>
          {error}
        </div>
      )}

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
                <input type="checkbox" checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  style={{ accentColor: "#185FA5", cursor: "pointer" }} />
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
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#bbb", fontSize: 14 }}>
                  Cargando modelos...
                </td>
              </tr>
            ) : modelos.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#bbb", fontSize: 14 }}>
                  No hay modelos aún. Crea el primero.
                </td>
              </tr>
            ) : (
              modelos.map((row) => (
                <tr key={row.nombre}
                  style={{ borderBottom: "0.5px solid #f0f0f0", background: selected[row.nombre] ? "#f0f6ff" : "transparent", transition: "background 0.1s" }}
                  onMouseEnter={(e) => { if (!selected[row.nombre]) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={(e) => { if (!selected[row.nombre]) e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ ...tdBase, textAlign: "center" }}>
                    <input type="checkbox" checked={!!selected[row.nombre]}
                      onChange={(e) => toggleRow(row.nombre, e.target.checked)}
                      style={{ accentColor: "#185FA5", cursor: "pointer" }} />
                  </td>
                  <td style={{ ...tdBase }}><span style={{ fontWeight: 500, color: "#1a1a1a" }}>{row.nombre}</span></td>
                  <td style={{ ...tdBase, color: "#666" }}>{row.descripcion}</td>
                  <td style={{ ...tdBase, color: "#888", fontSize: 13, whiteSpace: "nowrap" }}>{formatDate(row.creado_en)}</td>
                  <td style={{ ...tdBase, textAlign: "center" }}>
                    <button onClick={() => handleExecute(row)} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: "#eaf3de", color: "#3B6D11", border: "0.5px solid #c0dd97",
                      borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 500,
                      cursor: "pointer", transition: "background 0.15s",
                    }}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <FormNewModel
          onClose={() => setModalOpen(false)}
          onSuccess={cargarModelos}
        />
      </Modal>
    </div>
  );
};

export default Home;
