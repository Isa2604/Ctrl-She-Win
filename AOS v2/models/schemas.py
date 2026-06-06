from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime


# ─── ENTRENA ──────────────────────────────────────────────────────────────────

class TrainRequest(BaseModel):
    nombre: str = Field(..., description="Nombre único del modelo/agente")
    descripcion: str = Field(..., description="Descripción del proceso que automatiza")
    playwright_actions: list[dict[str, Any]] = Field(
        ...,
        description="Acciones grabadas por Playwright en formato JSON",
        example=[
            {"type": "navigate", "url": "https://saucedemo.com"},
            {"type": "click", "selector": "#user-name"},
            {"type": "fill", "selector": "#user-name", "value": "standard_user"},
            {"type": "read", "selector": ".inventory_item_name", "value": "Sauce Labs Backpack"},
            {"type": "navigate", "url": "http://localhost:3000/registro"},
            {"type": "fill", "selector": "#product_name", "value": "Sauce Labs Backpack"},
        ]
    )

class TrainResponse(BaseModel):
    success: bool
    modelo_id: str
    nombre: str
    mapeo_inferido: dict[str, Any]
    mensaje: str


# ─── EJECUTA ──────────────────────────────────────────────────────────────────

class ExecuteRequest(BaseModel):
    nombre_modelo: str = Field(..., description="Nombre del modelo pre-entrenado a usar")
    paginas: list[str] = Field(
        ...,
        description="Lista de URLs o contenido HTML de las páginas a extraer",
        example=["https://saucedemo.com/inventory", "<html>...</html>"]
    )

class ExecuteResponse(BaseModel):
    success: bool
    nombre_modelo: str
    datos_extraidos: list[dict[str, Any]]
    mensaje: str


# ─── MONGO DOCUMENT ───────────────────────────────────────────────────────────

class ModeloDocument(BaseModel):
    nombre: str
    descripcion: str
    playwright_actions: list[dict[str, Any]]
    mapeo_inferido: dict[str, Any]   # Lo que devuelve Claude tras la observación
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1
