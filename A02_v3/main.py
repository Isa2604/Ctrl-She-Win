from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.agent import router as agent_router
from services.database import asegurar_indice

app = FastAPI(
    title="Always on Shelf - AI Agent API",
    description="Backend para entrenar y ejecutar agentes de automatización web con IA",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Ajustar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router, prefix="/api/v1", tags=["agent"])

@app.on_event("startup")
def startup():
    asegurar_indice()

@app.get("/health")
def health():
    return {"status": "ok"}
