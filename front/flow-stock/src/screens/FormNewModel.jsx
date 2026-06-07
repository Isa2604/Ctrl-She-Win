import React, { useState } from "react";

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

export default FormNewModel;