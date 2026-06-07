import React, { useState } from "react";

const FormNewModel = () => {
    const styles = {
        container: {
            maxWidth: "420px",
            margin: "40px auto",
            padding: "28px",
            borderRadius: "18px",
            background: "linear-gradient(180deg, #f8f4ff 0%, #ffffff 100%)",
            boxShadow: "0 16px 32px rgba(0,0,0,0.08)",
            fontFamily: "Arial, sans-serif",
            color: "#333"
        },
        title: {
            marginBottom: "22px",
            fontSize: "1.8rem",
            letterSpacing: "0.02em",
            textAlign: "center",
            color: "#5b4bff"
        },
        form: {
            display: "grid",
            gap: "18px"
        },
        label: {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "0.95rem"
        },
        input: {
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid #d0c9f2",
            outline: "none",
            background: "#faf7ff",
            fontSize: "1rem",
            color: "#333",
        },
        button: {
            marginTop: "6px",
            padding: "12px 16px",
            borderRadius: "999px",
            border: "none",
            background: "#5b4bff",
            color: "#fff",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "background 0.24s ease"
        }
    };

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        // manejar envío: por ahora solo mostrar en consola
        console.log({ name, description });
    };

    const handleReset = () => {
        setName("");
        setDescription("");
    };

    return (
        <div style={styles.container}>
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
                    Atributos:
                    <input
                        style={styles.input}
                        type="text"
                        placeholder="Atributos del modelo"
                        value={attributes}
                        onChange={(e) => setAttributes(e.target.value)}
                    />
                </label>
                <button style={styles.button} type="submit">Grabar</button>
                <button style={styles.button} type="button" onClick={handleReset}>Crear</button>
            </form>
        </div>
    )
}

export default FormNewModel;