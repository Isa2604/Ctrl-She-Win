import React, { useState } from "react";
import logoArca from "../assets/arca-logo.png";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email) return "El email es requerido.";

    const re = /\S+@\S+\.\S+/;
    if (!re.test(email)) return "Email no válido.";

    if (!password) return "La contraseña es requerida.";

    if (password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const v = validate();
    if (v) return setError(v);

    setLoading(true);

    try {
      await new Promise((res) => setTimeout(res, 800));

      if (onLogin) {
        onLogin({ email });
      }
    } catch (err) {
      setError("Error al iniciar sesión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />

      <form onSubmit={handleSubmit} style={styles.card} aria-label="login-form">
        <div style={styles.logoContainer}>
          <img src={logoArca} alt="Arca Continental" style={styles.logo} />
        </div>

        <h2 style={styles.title}>Bienvenido</h2>
        <p style={styles.subtitle}>Inicia sesión para continuar</p>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label} htmlFor="email">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          placeholder="usuario@arcacontal.com"
        />

        <label style={styles.label} htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          placeholder="••••••••"
        />

        <button
          type="submit"
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          disabled={loading}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <p style={styles.footerText}>
          Automatización inteligente para procesos comerciales
        </p>
      </form>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
    background:
      "linear-gradient(135deg, #8B0000 0%, #C8102E 45%, #E32636 100%)",
    fontFamily:
      "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 35%), radial-gradient(circle at bottom right, rgba(0,0,0,0.18), transparent 35%)",
  },

  card: {
    width: 390,
    maxWidth: "100%",
    background: "#ffffff",
    padding: "34px 30px",
    borderRadius: 18,
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.25)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    zIndex: 1,
    borderTop: "6px solid #C8102E",
  },

  logoContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 18,
  },

  logo: {
    width: 190,
    maxWidth: "80%",
    objectFit: "contain",
  },

  title: {
    margin: 0,
    textAlign: "center",
    color: "#1F2933",
    fontSize: 26,
    fontWeight: 700,
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 22,
    textAlign: "center",
    color: "#667085",
    fontSize: 14,
  },

  label: {
    fontSize: 13,
    marginTop: 10,
    marginBottom: 7,
    color: "#344054",
    fontWeight: 600,
  },

  input: {
    padding: "12px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid #D0D5DD",
    outline: "none",
    background: "#F9FAFB",
    color: "#1F2933",
  },

  button: {
    marginTop: 22,
    padding: "13px 14px",
    background: "#C8102E",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    transition: "all 0.2s ease",
    boxShadow: "0 8px 18px rgba(200, 16, 46, 0.35)",
  },

  error: {
    background: "#FEE2E2",
    color: "#991B1B",
    padding: "10px 12px",
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 13,
    border: "1px solid #FECACA",
  },

  footerText: {
    marginTop: 20,
    marginBottom: 0,
    textAlign: "center",
    color: "#98A2B3",
    fontSize: 12,
  },
};

export default Login;