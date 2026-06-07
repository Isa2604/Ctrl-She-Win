import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
});

// Listar modelos
export const getModelos = () => api.get("/modelos");

// Obtener un modelo por nombre
export const getModelo = (nombre) => api.get(`/modelos/${nombre}`);

// Entrenar un agente
export const entrenar = (nombre, descripcion, formato_visualizacion, url) =>
  api.post("/entrena", {
    nombre,
    descripcion,
    formato_visualizacion,
    playwright_actions: [
      {
        sessionId: "session-1",
        createdAt: new Date().toISOString(),
        totalEvents: 0,
        pageSnapshots: [{ url, visibleText: "" }],
        siteMap: [],
        events: []
      }
    ]
  });
  
// Ejecutar un agente
export const ejecutar = (data) => api.post("/ejecuta", data);