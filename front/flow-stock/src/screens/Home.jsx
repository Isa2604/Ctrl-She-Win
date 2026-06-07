import React, { useState, useEffect } from "react";
import { entrenar, getModelos } from "../api/api";
import logoArca from "../assets/arca-logo.png";
import styles from "../styles/home_styles";

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
        setError("No se pudieron cargar los modelos. Intenta de nuevo.");
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

export default Home;