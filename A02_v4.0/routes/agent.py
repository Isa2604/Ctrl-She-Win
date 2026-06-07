from fastapi import APIRouter, HTTPException
from datetime import datetime

from models.schemas import TrainRequest, TrainResponse, ExecuteRequest, ExecuteResponse
from services.claude_service import inferir_mapeo, transcribir, generar_componente_react
from services.database import guardar_modelo, buscar_modelo, listar_modelos

router = APIRouter()


@router.post("/entrena", response_model=TrainResponse)
async def entrena(request: TrainRequest):
    """
    Entrena un nuevo agente a partir de una sesión grabada por Playwright.
    Body:
    - nombre: identificador único del agente
    - descripcion: qué proceso automatiza
    - formato_visualizacion: cómo deben visualizarse los datos al ejecutar
    - playwright_actions: objeto con { sessionId, createdAt, totalEvents, pageSnapshots[], siteMap[] }
      exactamente como lo genera el recorder de MapOnce
    """
    try:
        session = request.playwright_actions[0]   # ← el recorder siempre manda un array con un objeto
        events = session.events if session.events else session.pageSnapshots or session.siteMap

        mapeo = inferir_mapeo(
            nombre=request.nombre,
            descripcion=request.descripcion,
            events=events
        )

        documento = {
            "nombre": request.nombre,
            "descripcion": request.descripcion,
            "formato_visualizacion": request.formato_visualizacion,
            "playwright_session": session.model_dump(),
            "mapeo_inferido": mapeo,
            "creado_en": datetime.utcnow().isoformat(),
            "version": 1
        }

        guardar_modelo(documento)

        return TrainResponse(
            success=True,
            modelo_id=request.nombre,
            nombre=request.nombre,
            mapeo_inferido=mapeo,
            mensaje=f"Modelo '{request.nombre}' entrenado y guardado exitosamente"
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error durante el entrenamiento: {str(e)}"
        )


@router.post("/ejecuta", response_model=ExecuteResponse)
async def ejecuta(request: ExecuteRequest):
    """
    Ejecuta un agente pre-entrenado sobre nuevas páginas y genera
    un componente React para visualizar los resultados.

    Body:
    - nombre_modelo: nombre del agente a usar (debe existir en MongoDB)
    - playwright_actions: array de sesiones grabadas por el recorder de MapOnce

    El formato de visualización se toma del modelo guardado en el entrenamiento.
    """
    modelo = buscar_modelo(request.nombre_modelo)

    if not modelo:
        raise HTTPException(
            status_code=404,
            detail=f"Modelo '{request.nombre_modelo}' no encontrado. ¿Ya fue entrenado?"
        )

    try:
        session = request.playwright_actions[0]
        paginas = [str(snapshot) for snapshot in session.pageSnapshots] if session.pageSnapshots else \
                  [str(snapshot) for snapshot in session.siteMap]

        datos = transcribir(
            paginas=paginas,
            mapeo_guardado=modelo["mapeo_inferido"],
            descripcion=modelo["descripcion"]
        )

        componente = generar_componente_react(
            datos_extraidos=datos,
            formato_visualizacion=modelo["formato_visualizacion"]
        )

        return ExecuteResponse(
            success=True,
            nombre_modelo=request.nombre_modelo,
            datos_extraidos=datos,
            componente_react=componente,
            mensaje=f"Extracción completada: {len(datos)} registro(s) procesado(s)"
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error durante la ejecución: {str(e)}"
        )


@router.get("/modelos")
async def get_modelos():
    """Devuelve todos los modelos entrenados guardados en MongoDB."""
    modelos = listar_modelos()
    return {"total": len(modelos), "modelos": modelos}


@router.get("/modelos/{nombre}")
async def get_modelo(nombre: str):
    """Consulta el mapeo aprendido de un modelo."""
    modelo = buscar_modelo(nombre)
    if not modelo:
        raise HTTPException(status_code=404, detail=f"Modelo '{nombre}' no encontrado")
    return modelo
