# Always on Shelf — Backend API

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # Llenar con tus keys
uvicorn main:app --reload --port 8000
```

Docs interactivos: http://localhost:8000/docs

---

## Endpoints

### POST `/api/v1/entrena`
Entrena un agente con acciones grabadas por Playwright.

**Request:**
```json
{
  "nombre": "walmart-ordenes",
  "descripcion": "Copia órdenes de compra del portal Walmart al sistema interno",
  "playwright_actions": [
    { "type": "navigate", "url": "https://portal.walmart.com" },
    { "type": "click",    "selector": "#orders-tab" },
    { "type": "read",     "selector": ".order-id",    "value": "ORD-1234" },
    { "type": "read",     "selector": ".product-name","value": "Coca-Cola 600ml" },
    { "type": "navigate", "url": "http://interno.arcacontinental.com/registro" },
    { "type": "fill",     "selector": "#numero_orden", "value": "ORD-1234" },
    { "type": "fill",     "selector": "#producto",     "value": "Coca-Cola 600ml" },
    { "type": "click",    "selector": "#guardar" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "modelo_id": "walmart-ordenes",
  "nombre": "walmart-ordenes",
  "mapeo_inferido": {
    "sistema_origen": { "url_base": "...", "descripcion": "..." },
    "sistema_destino": { "url_base": "...", "descripcion": "..." },
    "mapeo_campos": [ ... ],
    "pasos_navegacion": [ ... ],
    "confianza": 0.97,
    "notas": "..."
  },
  "mensaje": "Modelo 'walmart-ordenes' entrenado y guardado exitosamente"
}
```

---

### POST `/api/v1/ejecuta`
Extrae datos de nuevas páginas usando un modelo pre-entrenado.

**Request:**
```json
{
  "nombre_modelo": "walmart-ordenes",
  "paginas": [
    "https://portal.walmart.com/orders/5678",
    "<html>... contenido HTML directo ...</html>"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "nombre_modelo": "walmart-ordenes",
  "datos_extraidos": [
    {
      "pagina_origen": "https://portal.walmart.com/orders/5678",
      "datos_extraidos": {
        "numero_orden": "ORD-5678",
        "producto": "Pepsi 1L"
      },
      "campos_no_encontrados": [],
      "confianza": 0.99
    }
  ],
  "mensaje": "Extracción completada: 1 registro(s) procesado(s)"
}
```

---

### GET `/api/v1/modelos/{nombre}`
Consulta el mapeo aprendido de un modelo (útil para el front).

---

## Estructura del proyecto

```
always_on_shelf/
├── main.py                  # Entry point FastAPI
├── requirements.txt
├── .env.example
├── routes/
│   └── agent.py             # Endpoints: /entrena y /ejecuta
├── services/
│   ├── claude_service.py    # inferir_mapeo() y transcribir()
│   └── database.py          # Conexión MongoDB, guardar/buscar modelos
└── models/
    └── schemas.py           # Modelos Pydantic (request/response)
```

## Lo que se guarda en MongoDB (colección `modelos`)

```json
{
  "nombre": "walmart-ordenes",
  "descripcion": "...",
  "playwright_actions": [ ... ],
  "mapeo_inferido": { ... },
  "creado_en": "2025-01-01T00:00:00",
  "version": 1
}
```
