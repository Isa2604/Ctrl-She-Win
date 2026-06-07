import React, { useState, useEffect } from "react";
import { entrenar, getModelos } from "../api/api";
import logoArca from "../assets/arca-logo.png";

// ── FormNewModel embebido ──────────────────────────────────────────────────────
const FormNewModel = ({ onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formato, setFormato] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const styles = {
    title: {
      fontSize: "1.45rem",
      letterSpacing: "0.01em",
      color: "#C8102E",
      margin: "0 0 22px 0",
      fontWeight: 700,
    },
    form: {
      display: "grid",
      gap: "18px",
    },
    label: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      fontSize: "0.95rem",
      color: "#344054",
      fontWeight: 600,
    },
    input: {
      padding: "12px 14px",
      borderRadius: "10px",
      border: "1px solid #D0D5DD",
      outline: "none",
      background: "#F9FAFB",
      fontSize: "1rem",
      color: "#1F2933",
    },

    btnRow: {
      display: "flex",
      gap: "10px",
      marginTop: "6px",
    },
    btnPrimary: {
      flex: 1,
      padding: "12px 16px",
      borderRadius: "10px",
      border: "none",
      background: loading ? "#E57373" : "#C8102E",
      color: "#fff",
      fontSize: "1rem",
      fontWeight: 700,
      cursor: loading ? "not-allowed" : "pointer",
      boxShadow: "0 8px 18px rgba(200, 16, 46, 0.25)",
    },
    btnSecondary: {
      flex: 1,
      padding: "12px 16px",
      borderRadius: "10px",
      border: "1px solid #D0D5DD",
      background: "#fff",
      color: "#344054",
      fontSize: "1rem",
      fontWeight: 600,
      cursor: "pointer",
    },
    error: {
      color: "#991B1B",
      background: "#FEE2E2",
      border: "1px solid #FECACA",
      borderRadius: "10px",
      padding: "10px 14px",
      fontSize: "0.88rem",
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
      setError(
        err?.response?.data?.detail ||
          "Error al crear el modelo. Intenta de nuevo."
      );
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
      <h2 style={styles.title}>Nuevo modelo</h2>

      <form style={styles.form} onSubmit={handleSubmit}>
        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>
          Nombre:
          <input
            style={styles.input}
            type="text"
            placeholder="Nombre del modelo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
            required
          />
        </label>

        <label style={styles.label}>
          Formato de visualización:
          <input
            style={styles.input}
            type="text"
            placeholder="Ej: tabla con columnas de producto y precio"
            value={formato}
            onChange={(e) => setFormato(e.target.value)}
            required
          />
        </label>

        <label style={styles.label}>
          URL:
          <input
            style={styles.input}
            type="text"
            placeholder="URL de la página"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>

        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Grabar"}
          </button>

          <button
            style={styles.btnSecondary}
            type="button"
            onClick={handleReset}
            disabled={loading}
          >
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
        background: "rgba(17, 24, 39, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
          padding: "30px",
          width: "100%",
          maxWidth: "450px",
          position: "relative",
          fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
          color: "#1F2933",
          borderTop: "6px solid #C8102E",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "#98A2B3",
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

const formatDate = (d) => {
  if (!d) return "—";

  const date = new Date(d);
  if (isNaN(date)) return d;

  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ── Home ───────────────────────────────────────────────────────────────────────
const Home = ({ user, onLogout = () => {} }) => {
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

  const allSelected =
    modelos.length > 0 && modelos.every((r) => selected[r.nombre]);

  const anySelected = Object.values(selected).some(Boolean);

  const toggleAll = (checked) => {
    setSelected(
      checked
        ? Object.fromEntries(modelos.map((r) => [r.nombre, true]))
        : {}
    );
  };

  const toggleRow = (nombre, checked) => {
    setSelected((prev) => ({ ...prev, [nombre]: checked }));
  };

  const handleDelete = () => {
    const nombres = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    alert(`Eliminar modelos: ${nombres.join(", ")}`);
  };

  const handleExecute = (row) => {
    alert(`Ejecutar: ${row.nombre}`);
  };

  const tdBase = {
    padding: "15px 18px",
    verticalAlign: "middle",
  };

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.logoBox}>
            <img src={logoArca} alt="Arca Continental" style={styles.logo} />
          </div>

          <div style={styles.sidebarMenu}>
            <div style={styles.menuItemActive}>Modelos</div>
            {/* <div style={styles.menuItem}>Automatizaciones</div> */}
            <div style={styles.menuItem}>Reportes</div>
            {/* <div style={styles.menuItem}>Configuración</div> */}
            <div style={styles.menuItem}>
              <button
                type="button"
                onClick={() => {
                  console.log("Home.jsx: click en cerrar sesión");
                  console.log("onLogout recibido:", onLogout);

                  if (typeof onLogout === "function") {
                    onLogout();
                  } else {
                    console.error("onLogout no llegó como función");
                  }
                }}
                style={styles.logoutButton}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Panel de administración</p>
            <h1 style={styles.title}>Modelos inteligentes</h1>
            <p style={styles.subtitle}>
              Crea, administra y ejecuta modelos para automatización comercial.
            </p>
          </div>

          <div style={styles.userCard}>
            <span style={styles.userAvatar}>
              {user?.email?.charAt(0)?.toUpperCase() || "A"}
            </span>
            <div>
              <p style={styles.userName}>Usuario</p>
              <p style={styles.userEmail}>{user?.email || "arca@continental.com"}</p>
            </div>
          </div>
        </header>

        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Modelos activos</p>
            <h3 style={styles.statValue}>{modelos.length}</h3>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statLabel}>Seleccionados</p>
            <h3 style={styles.statValue}>
              {Object.values(selected).filter(Boolean).length}
            </h3>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statLabel}>Estado</p>
            <h3 style={styles.statValueSmall}>
              {loading ? "Cargando" : "Operativo"}
            </h3>
          </div>
        </section>

        <section style={styles.contentCard}>
          <div style={styles.toolbar}>
            <div>
              <h2 style={styles.sectionTitle}>Listado de modelos</h2>
              <p style={styles.sectionSubtitle}>
                Administra los flujos de extracción y entrenamiento.
              </p>
            </div>

            <div style={styles.actions}>
              <button
                onClick={() => setModalOpen(true)}
                style={styles.primaryButton}
              >
                + Crear modelo
              </button>

              <button
                onClick={handleDelete}
                disabled={!anySelected}
                style={{
                  ...styles.deleteButton,
                  background: anySelected ? "#FEE2E2" : "#F9FAFB",
                  color: anySelected ? "#B42318" : "#98A2B3",
                  cursor: anySelected ? "pointer" : "not-allowed",
                }}
              >
                🗑 Eliminar modelo
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <colgroup>
                <col style={{ width: 48 }} />
                <col style={{ width: "25%" }} />
                <col />
                <col style={{ width: 170 }} />
                <col style={{ width: 130 }} />
              </colgroup>

              <thead style={styles.thead}>
                <tr>
                  <th style={styles.thCenter}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAll(e.target.checked)}
                      style={styles.checkbox}
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
                        ...styles.th,
                        textAlign: align,
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={styles.emptyCell}>
                      Cargando modelos...
                    </td>
                  </tr>
                ) : modelos.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={styles.emptyCell}>
                      No hay modelos aún. Crea el primero.
                    </td>
                  </tr>
                ) : (
                  modelos.map((row) => (
                    <tr
                      key={row.nombre}
                      style={{
                        ...styles.tr,
                        background: selected[row.nombre]
                          ? "#FFF1F3"
                          : "#ffffff",
                      }}
                      onMouseEnter={(e) => {
                        if (!selected[row.nombre]) {
                          e.currentTarget.style.background = "#F9FAFB";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selected[row.nombre]) {
                          e.currentTarget.style.background = "#ffffff";
                        }
                      }}
                    >
                      <td style={{ ...tdBase, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!selected[row.nombre]}
                          onChange={(e) =>
                            toggleRow(row.nombre, e.target.checked)
                          }
                          style={styles.checkbox}
                        />
                      </td>

                      <td style={tdBase}>
                        <span style={styles.modelName}>{row.nombre}</span>
                      </td>

                      <td style={{ ...tdBase, color: "#667085" }}>
                        {row.descripcion}
                      </td>

                      <td style={styles.dateCell}>
                        {formatDate(row.creado_en)}
                      </td>

                      <td style={{ ...tdBase, textAlign: "center" }}>
                        <button
                          onClick={() => handleExecute(row)}
                          style={styles.executeButton}
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
        </section>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <FormNewModel
            onClose={() => setModalOpen(false)}
            onSuccess={cargarModelos}
          />
        </Modal>
      </main>
    </div>
  );
};

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#F3F4F6",
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    color: "#1F2933",
  },

  sidebar: {
    width: 250,
    background:
      "linear-gradient(180deg, #8B0000 0%, #C8102E 55%, #A0001C 100%)",
    color: "#ffffff",
    padding: "26px 20px",
    boxSizing: "border-box",
    boxShadow: "8px 0 28px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  logoBox: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },

  logo: {
    width: 165,
    maxWidth: "100%",
    objectFit: "contain",
  },

  sidebarMenu: {
    display: "grid",
    gap: 10,
  },

  menuItemActive: {
    padding: "13px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.18)",
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.22)",
  },

  menuItem: {
    padding: "13px 14px",
    borderRadius: 12,
    color: "rgba(255,255,255,0.78)",
    fontWeight: 500,
  },

  main: {
    flex: 1,
    padding: "32px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 24,
  },

  eyebrow: {
    margin: 0,
    color: "#C8102E",
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  title: {
    margin: "6px 0 6px",
    fontSize: 30,
    fontWeight: 800,
    color: "#111827",
  },

  subtitle: {
    margin: 0,
    color: "#667085",
    fontSize: 15,
  },

  userCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#ffffff",
    padding: "12px 16px",
    borderRadius: 16,
    boxShadow: "0 8px 22px rgba(16, 24, 40, 0.08)",
    border: "1px solid #EAECF0",
  },

  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#C8102E",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  userName: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: "#344054",
  },

  userEmail: {
    margin: 0,
    fontSize: 12,
    color: "#98A2B3",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 24,
  },

  statCard: {
    background: "#ffffff",
    borderRadius: 18,
    padding: "20px 22px",
    border: "1px solid #EAECF0",
    boxShadow: "0 8px 22px rgba(16, 24, 40, 0.06)",
  },

  statLabel: {
    margin: 0,
    color: "#667085",
    fontSize: 13,
    fontWeight: 600,
  },

  statValue: {
    margin: "8px 0 0",
    color: "#C8102E",
    fontSize: 30,
    fontWeight: 800,
  },

  statValueSmall: {
    margin: "12px 0 0",
    color: "#027A48",
    fontSize: 22,
    fontWeight: 800,
  },

  contentCard: {
    background: "#ffffff",
    borderRadius: 20,
    padding: 22,
    border: "1px solid #EAECF0",
    boxShadow: "0 10px 28px rgba(16, 24, 40, 0.08)",
  },

  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },

  sectionTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
    fontWeight: 800,
  },

  sectionSubtitle: {
    margin: "4px 0 0",
    color: "#667085",
    fontSize: 14,
  },

  actions: {
    display: "flex",
    gap: 10,
  },

  primaryButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#C8102E",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(200, 16, 46, 0.28)",
  },

  deleteButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #FECACA",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    transition: "all 0.15s",
  },

  error: {
    background: "#FEE2E2",
    border: "1px solid #FECACA",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: "1rem",
    color: "#991B1B",
    fontSize: 14,
  },

  tableWrapper: {
    border: "1px solid #EAECF0",
    borderRadius: 14,
    overflow: "hidden",
    background: "#ffffff",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },

  thead: {
    background: "#F9FAFB",
  },

  thCenter: {
    padding: "12px 18px",
    borderBottom: "1px solid #EAECF0",
    textAlign: "center",
  },

  th: {
    padding: "12px 18px",
    fontWeight: 700,
    fontSize: 13,
    color: "#667085",
    borderBottom: "1px solid #EAECF0",
  },

  checkbox: {
    accentColor: "#C8102E",
    cursor: "pointer",
  },

  tr: {
    borderBottom: "1px solid #F2F4F7",
    transition: "background 0.15s",
  },

  modelName: {
    fontWeight: 700,
    color: "#111827",
  },

  dateCell: {
    padding: "15px 18px",
    color: "#98A2B3",
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  executeButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "#ECFDF3",
    color: "#027A48",
    border: "1px solid #ABEFC6",
    borderRadius: 8,
    padding: "7px 13px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  emptyCell: {
    padding: "3.5rem",
    textAlign: "center",
    color: "#98A2B3",
    fontSize: 14,
  },

  logoutButton: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.28)",
    background: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "Center",
    transition: "all 0.15s",
  },
};

export default Home;