import React from "react";

const mockDashboards = [
  { id: 1, title: "Ventas", description: "Resumen de ventas por producto y período" },
  { id: 2, title: "Inventario", description: "Estado del stock y alertas" },
  { id: 3, title: "Clientes", description: "Actividad y segmentación de clientes" },
  { id: 4, title: "Finanzas", description: "Flujos, gastos e ingresos" },
];

const cardStyle = {
  background: "#fff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const Home = ({ user }) => {
  const openDashboard = (dash) => {
    // placeholder: replace with navigation logic (react-router, etc.)
    // por ahora mostramos en consola
    console.log(`Abriendo dashboard: ${dash.title}`);
    alert(`Abriendo dashboard: ${dash.title}`);
  };

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", background: "#f5f7fb", minHeight: "100vh" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 2, color: "#333" }}>Purchase Orders</h1>
        <p style={{ margin: "6px 0 0", color: "#666" }}>Gestiona tus órdenes de compra</p>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {mockDashboards.map((d) => (
          <div key={d.id} style={cardStyle} onClick={() => openDashboard(d)} role="button" tabIndex={0} onKeyPress={() => openDashboard(d)}>
            <div>
              <h3 style={{ margin: "0 0 8px" }}>{d.title}</h3>
              <p style={{ margin: 0, color: "#555", fontSize: 14 }}>{d.description}</p>
            </div>
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <small style={{ color: "#999" }}>Ver</small>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Home;
