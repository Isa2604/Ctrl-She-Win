import React, { useState } from "react";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email) return "El email es requerido.";
    // simple email regex
    const re = /\S+@\S+\.\S+/;
    if (!re.test(email)) return "Email no válido.";
    if (!password) return "La contraseña es requerida.";
    if (password.length < 6)
      return "La contraseña debe tener al menos 6 caracteres.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);
    setLoading(true);
    try {
      // placeholder: simulate login request
      await new Promise((res) => setTimeout(res, 800));
      // call parent onLogin if provided
      if (onLogin) onLogin({ email });
    } catch (err) {
      setError("Error al iniciar sesión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.card} aria-label="login-form">
        <h2 style={styles.title}>Iniciar sesión</h2>
        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label} htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          placeholder="tu@ejemplo.com"
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

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#f5f7fb",
    padding: 16,
  },
  card: {
    width: 360,
    maxWidth: "100%",
    background: "#fff",
    padding: 24,
    borderRadius: 8,
    boxShadow: "0 6px 18px rgba(20,30,50,0.08)",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    margin: 0,
    marginBottom: 12,
    textAlign: "center",
    color: "#102a43",
  },
  label: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 6,
    color: "#334e68",
  },
  input: {
    padding: "10px 12px",
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid #d9e2ec",
    outline: "none",
  },
  button: {
    marginTop: 18,
    padding: "10px 12px",
    background: "#0b69ff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  error: {
    background: "#ffe8e8",
    color: "#9b2c2c",
    padding: "8px 10px",
    borderRadius: 6,
    marginBottom: 10,
    fontSize: 13,
  },
};

export default Login;
