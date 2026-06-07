from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime


# ─── ENTRENA ──────────────────────────────────────────────────────────────────

class PlaywrightSession(BaseModel):
    sessionId: str | None = None
    app: str | None = None
    version: str | None = None
    createdAt: str | None = None
    totalEvents: int | None = None
    totalSnapshots: int | None = None
    siteMap: list[dict[str, Any]] = []
    pageSnapshots: list[dict[str, Any]] = []   # snapshots completos con visibleText
    events: list[dict[str, Any]] = []          # ya no es obligatorio

class TrainRequest(BaseModel):
    nombre: str = Field(..., description="Nombre único del modelo/agente")
    descripcion: str = Field(..., description="Descripción del proceso que automatiza")
    playwright_actions: list[PlaywrightSession] = Field(   # ← list, no objeto suelto
        ...,
        description="Array de sesiones grabadas por el recorder de MapOnce"
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
    playwright_actions: list[PlaywrightSession] = Field(
        ...,
        description="Array de sesiones grabadas por el recorder de MapOnce"
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
    playwright_session: dict[str, Any]
    mapeo_inferido: dict[str, Any]
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1
