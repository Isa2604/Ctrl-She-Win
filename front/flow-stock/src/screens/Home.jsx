import React, { useState } from "react";

const mockDashboards = [
  {
    id: 1,
    title: "Ventas",
    description: "Resumen de ventas por producto y período",
    createdAt: "2026-01-15",
  },
  {
    id: 2,
    title: "Inventario",
    description: "Estado del stock y alertas",
    createdAt: "2026-02-03",
  },
  {
    id: 3,
    title: "Clientes",
    description: "Actividad y segmentación de clientes",
    createdAt: "2026-03-10",
  },
  {
    id: 4,
    title: "Finanzas",
    description: "Flujos, gastos e ingresos",
    createdAt: "2025-11-20",
  },
];

const formatDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const Home = ({ user }) => {
  const [selected, setSelected] = useState({});

  const allSelected =
    mockDashboards.length > 0 && mockDashboards.every((r) => selected[r.id]);
  const anySelected = Object.values(selected).some(Boolean);

  const toggleAll = (checked) => {
    setSelected(
      checked
        ? Object.fromEntries(mockDashboards.map((r) => [r.id, true]))
        : {},
    );
  };

  const toggleRow = (id, checked) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };

  const handleCreate = () => alert("Crear modelo");

  const handleDelete = () => {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    alert(`Eliminar modelos: ${ids.join(", ")}`);
  };

  const handleExecute = (row) => {
    alert(`Ejecutar: ${row.title}`);
  };

  const tdBase = { padding: "13px 16px", verticalAlign: "middle" };

  return (
    <div
      style={{
        padding: "2rem 1.5rem",
        fontFamily: "Arial, sans-serif",
        background: "#f8f9fb",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1
          style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a", margin: 0 }}
        >
          Modelos
        </h1>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
        <button
          onClick={handleCreate}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#185FA5",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          + Crear modelo
        </button>
        <button
          onClick={handleDelete}
          disabled={!anySelected}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: anySelected ? "#fff2f2" : "#fafafa",
            color: anySelected ? "#c0392b" : "#bbb",
            border: `0.5px solid ${anySelected ? "#e5b4b4" : "#e5e5e5"}`,
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 500,
            cursor: anySelected ? "pointer" : "not-allowed",
            transition: "all 0.15s",
          }}
        >
          🗑 Eliminar modelo
        </button>
      </div>

      {/* Tabla */}
      <div
        style={{
          border: "0.5px solid #e5e5e5",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
        >
          <colgroup>
            <col style={{ width: 48 }} />
            <col style={{ width: "25%" }} />
            <col />
            <col style={{ width: 160 }} />
            <col style={{ width: 120 }} />
          </colgroup>

          <thead style={{ background: "#f8f9fb" }}>
            <tr>
              <th
                style={{
                  padding: "11px 16px",
                  borderBottom: "0.5px solid #e5e5e5",
                  textAlign: "center",
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  style={{ accentColor: "#185FA5", cursor: "pointer" }}
                />
              </th>
              {[
                ["Nombre", "left"],
                ["Descripción", "left"],
                ["Fecha de creación", "left"],
                ["", "center"],
              ].map(([label, align], i) => (
                <th
                  key={i}
                  style={{
                    padding: "11px 16px",
                    textAlign: align,
                    fontWeight: 500,
                    fontSize: 13,
                    color: "#888",
                    borderBottom: "0.5px solid #e5e5e5",
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {mockDashboards.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "3rem",
                    textAlign: "center",
                    color: "#bbb",
                    fontSize: 14,
                  }}
                >
                  No hay modelos aún. Crea el primero.
                </td>
              </tr>
            ) : (
              mockDashboards.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "0.5px solid #f0f0f0",
                    background: selected[row.id] ? "#f0f6ff" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!selected[row.id])
                      e.currentTarget.style.background = "#fafafa";
                  }}
                  onMouseLeave={(e) => {
                    if (!selected[row.id])
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Checkbox */}
                  <td style={{ ...tdBase, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!selected[row.id]}
                      onChange={(e) => toggleRow(row.id, e.target.checked)}
                      style={{ accentColor: "#185FA5", cursor: "pointer" }}
                    />
                  </td>

                  {/* Nombre */}
                  <td style={{ ...tdBase }}>
                    <span style={{ fontWeight: 500, color: "#1a1a1a" }}>
                      {row.title}
                    </span>
                  </td>

                  {/* Descripción */}
                  <td style={{ ...tdBase, color: "#666" }}>
                    {row.description}
                  </td>

                  {/* Fecha */}
                  <td
                    style={{
                      ...tdBase,
                      color: "#888",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(row.createdAt)}
                  </td>

                  {/* Ejecutar */}
                  <td style={{ ...tdBase, textAlign: "center" }}>
                    <button
                      onClick={() => handleExecute(row)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        background: "#eaf3de",
                        color: "#3B6D11",
                        border: "0.5px solid #c0dd97",
                        borderRadius: 6,
                        padding: "5px 12px",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#d4ebbb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#eaf3de";
                      }}
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
    </div>
  );
};

export default Home;
