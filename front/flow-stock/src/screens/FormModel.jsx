import React, { useState, useEffect } from "react";

const FormModel = () => {
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
        card: {
            padding: "18px",
            borderRadius: "16px",
            background: "#ffffff",
            border: "1px solid #e7e1ff",
            boxShadow: "0 10px 20px rgba(91, 75, 255, 0.08)"
        },
        itemTitle: {
            margin: "0 0 8px",
            fontSize: "1.1rem",
            color: "#2d1d90"
        },
        itemDescription: {
            margin: 0,
            color: "#5f5b7f"
        }
    };

    // const [models, setModels] = useState([]);
    // const [loading, setLoading] = useState(true);
    // const [error, setError] = useState(null);

    // useEffect(() => {
    //     const fetchModels = async () => {
    //         try {
    //             const response = await fetch("/api/models");
    //             if (!response.ok) {
    //                 throw new Error("Error al cargar datos");
    //             }
    //             const data = await response.json();
    //             setModels(data);
    //         } catch (err) {
    //             setError(err.message || "Error en la carga");
    //         } finally {
    //             setLoading(false);
    //         }
    //     };

    //     fetchModels();
    // }, []);

    return (
        // <div style={styles.container}>
        //     <h2 style={styles.title}>Modelos</h2>
        //     {loading ? (
        //         <p>Cargando datos...</p>
        //     ) : error ? (
        //         <p>Error: {error}</p>
        //     ) : models.length === 0 ? (
        //         <p>No hay datos disponibles.</p>
        //     ) : (
        //         models.map((model) => (
        //             <div key={model.id ?? model._id ?? model.name} style={styles.card}>
        //                 <h3 style={styles.itemTitle}>{model.name}</h3>
        //                 <p style={styles.itemDescription}>{model.description}</p>
        //             </div>
        //         ))
        //     )}
        // </div>
        <div style={styles.container}>
            <h2 style={styles.title}>Nombre del modelo</h2>
            <div style={styles.card}>
                <h3 style={styles.itemTitle}>Descripcion</h3>
                <p style={styles.itemDescription}>Descripción de prueba</p>
                <h3 style={styles.itemAttributes}>Atributos</h3>
                <p style={styles.itemAttributes}>Nombre, precio, SKU</p>
            </div>
        </div>
    );
};

export default FormModel;