from fastapi import APIRouter, HTTPException
from datetime import datetime

from models.schemas import TrainRequest, TrainResponse, ExecuteRequest, ExecuteResponse
from services.claude_service import inferir_mapeo, transcribir
from services.database import guardar_modelo, buscar_modelo, listar_modelos

router = APIRouter()


@router.post("/entrena", response_model=TrainResponse)
async def entrena(request: TrainRequest):
    """
    Entrena un nuevo agente:
    1. Manda las acciones grabadas a Claude para inferir el mapeo
    2. Guarda el mapeo aprendido en MongoDB

    Body:
    - nombre: identificador único del agente (ej. "walmart-ordenes")
    - descripcion: qué proceso automatiza
    - playwright_actions: lista de acciones grabadas en JSON
    """
    try:
        # 1. Claude infiere el mapeo desde las acciones grabadas
        mapeo = inferir_mapeo(
            nombre=request.nombre,
            descripcion=request.descripcion,
            playwright_actions=request.playwright_actions
        )

        # 2. Armar el documento a guardar en MongoDB
        documento = {
            "nombre": request.nombre,
            "descripcion": request.descripcion,
            "playwright_actions": request.playwright_actions,
            "mapeo_inferido": mapeo,
            "creado_en": datetime.utcnow().isoformat(),
            "version": 1
        }

        # 3. Persistir en MongoDB (upsert por nombre)
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
        traceback.print_exc()  # Esto imprime el error completo en la terminal
        raise HTTPException(
            status_code=500,
            detail=f"Error durante el entrenamiento: {str(e)}"
        )


@router.post("/ejecuta", response_model=ExecuteResponse)
async def ejecuta(request: ExecuteRequest):
    """
    Ejecuta un agente pre-entrenado sobre nuevas páginas:
    1. Busca el mapeo guardado en MongoDB
    2. Manda las páginas + mapeo a Claude para extraer datos
    3. Devuelve los datos estructurados

    Body:
    - nombre_modelo: nombre del agente a usar (debe existir en MongoDB)
    - paginas: lista de URLs o contenido HTML a procesar
    """
    # 1. Buscar el modelo en MongoDB
    modelo = buscar_modelo(request.nombre_modelo)

    if not modelo:
        raise HTTPException(
            status_code=404,
            detail=f"Modelo '{request.nombre_modelo}' no encontrado. ¿Ya fue entrenado?"
        )

    try:
        # 2. Claude extrae y transcribe los datos con el mapeo aprendido
        datos = transcribir(
            paginas=request.paginas,
            mapeo_guardado=modelo["mapeo_inferido"],
            descripcion=modelo["descripcion"]
        )

        return ExecuteResponse(
            success=True,
            nombre_modelo=request.nombre_modelo,
            datos_extraidos=datos,
            mensaje=f"Extracción completada: {len(datos)} registro(s) procesado(s)"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error durante la ejecución: {str(e)}"
        )


@router.get("/modelos")
async def get_modelos():
    """
    Devuelve todos los modelos entrenados guardados en MongoDB.
    Excluye las acciones de Playwright para mantener la respuesta ligera.
    """
    modelos = listar_modelos()
    return {"total": len(modelos), "modelos": modelos}


@router.get("/modelos/{nombre}")
async def get_modelo(nombre: str):
    """
    Consulta el mapeo aprendido de un modelo.
    Útil para el front para mostrar qué aprendió el agente.
    """
    modelo = buscar_modelo(nombre)
    if not modelo:
        raise HTTPException(status_code=404, detail=f"Modelo '{nombre}' no encontrado")
    return modelo
