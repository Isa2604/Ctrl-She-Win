from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError
import os

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI")
        if not uri:
            raise RuntimeError("MONGODB_URI no definida en variables de entorno")
        _client = MongoClient(uri)
    return _client


def get_collection() -> Collection:
    client = get_client()
    db_name = os.getenv("MONGODB_DB", "always_on_shelf")
    return client[db_name]["modelos"]


def guardar_modelo(documento: dict) -> str:
    """
    Guarda o actualiza un modelo por nombre (upsert).
    Devuelve el nombre del modelo.
    """
    col = get_collection()
    col.update_one(
        {"nombre": documento["nombre"]},
        {"$set": documento},
        upsert=True
    )
    return documento["nombre"]


def buscar_modelo(nombre: str) -> dict | None:
    """
    Busca un modelo por nombre. Devuelve None si no existe.
    """
    col = get_collection()
    return col.find_one({"nombre": nombre}, {"_id": 0})


def listar_modelos() -> list[dict]:
    """
    Devuelve todos los modelos guardados, solo campos de resumen (sin playwright_actions).
    """
    col = get_collection()
    return list(col.find({}, {"_id": 0, "playwright_actions": 0}))


def asegurar_indice():
    """
    Crea índice único en 'nombre' si no existe.
    Llamar al arrancar la app.
    """
    col = get_collection()
    col.create_index("nombre", unique=True)
