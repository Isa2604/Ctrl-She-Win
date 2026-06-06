import anthropic
import json
import os
from typing import Any

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-5"


def _limpiar_json(raw: str) -> str:
    """Elimina backticks y prefijo json si Claude los incluye."""
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


# ─── FASE 1: INFERIR INTENCIÓN ────────────────────────────────────────────────

def inferir_mapeo(
    nombre: str,
    descripcion: str,
    playwright_actions: list[dict[str, Any]]
) -> dict[str, Any]:
    """
    Analiza las acciones grabadas e infiere la INTENCIÓN del proceso:
    qué tipo de dato se busca, qué significa cada campo y cómo se relacionan.
    NO guarda selectores ni URLs — guarda semántica pura para que funcione
    en cualquier página con la misma intención.
    """

    prompt = f"""
Eres un agente experto en entender procesos de negocio a partir de acciones web grabadas.

Se te dan acciones que un usuario realizó para transferir datos entre dos sistemas.
Tu objetivo NO es memorizar el camino exacto (selectores, URLs) sino entender 
la INTENCIÓN detrás de cada acción: qué tipo de dato se estaba leyendo, 
qué significaba ese dato en el contexto del negocio, y cómo se relaciona 
con el campo donde se escribió.

NOMBRE DEL PROCESO: {nombre}
DESCRIPCIÓN: {descripcion}

ACCIONES GRABADAS:
{json.dumps(playwright_actions, indent=2, ensure_ascii=False)}

Analiza las acciones y extrae:

1. INTENCIÓN GLOBAL: ¿Qué proceso de negocio representa esto? 
   (ej: "transferir datos de una orden de compra de un portal externo al sistema interno")

2. DATOS QUE SE TRANSFIEREN: Para cada dato que el usuario leyó del origen y escribió en el destino,
   describe su significado semántico — no su selector.
   (ej: "nombre del producto" no ".inventory_item_name")

3. REGLAS DE TRANSFORMACIÓN: ¿Hubo algún cambio de formato, unidad o estructura entre origen y destino?

4. CRITERIOS DE IDENTIFICACIÓN: ¿Cómo reconocer visualmente ese dato en una página nueva?
   (ej: "es el texto principal de cada producto listado", "es el precio con símbolo de moneda")

Responde ÚNICAMENTE con un JSON válido, sin texto adicional:

{{
  "intencion_global": "descripción del proceso de negocio en lenguaje natural",
  "sistema_origen": {{
    "proposito": "para qué sirve el sistema origen (sin mencionar URL específica)",
    "tipo": "portal de compras | catálogo | ERP | formulario | otro"
  }},
  "sistema_destino": {{
    "proposito": "para qué sirve el sistema destino (sin mencionar URL específica)",
    "tipo": "sistema interno | base de datos | formulario de registro | otro"
  }},
  "campos": [
    {{
      "nombre_semantico": "nombre del dato en lenguaje de negocio (ej: 'nombre del producto')",
      "descripcion": "qué representa este dato y por qué es importante",
      "como_identificarlo_en_origen": "descripción visual/contextual de cómo encontrar este dato en cualquier página con el mismo propósito",
      "nombre_en_destino": "cómo se llama este campo en el sistema destino",
      "tipo_dato": "texto | numero | precio | fecha | cantidad | identificador | otro",
      "transformacion": "ninguna | quitar_simbolo_moneda | redondear | formato_fecha | uppercase | otro",
      "es_obligatorio": true
    }}
  ],
  "flujo_general": [
    "paso 1 en lenguaje natural sin mencionar selectores",
    "paso 2 en lenguaje natural",
    "paso 3 en lenguaje natural"
  ],
  "confianza": 0.95,
  "notas": "observaciones sobre el proceso que ayuden a replicarlo en otros contextos"
}}
"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = _limpiar_json(response.content[0].text)
    return json.loads(raw)


# ─── FASE 2: EJECUTAR CON INTENCIÓN ──────────────────────────────────────────

def transcribir(
    paginas: list[str],
    mapeo_guardado: dict[str, Any],
    descripcion: str
) -> list[dict[str, Any]]:
    """
    Dado el contenido de páginas nuevas y la intención aprendida,
    Claude extrae los datos correctos aunque la página sea diferente
    a la usada durante la observación.
    """

    prompt = f"""
Eres un agente de extracción de datos que opera por INTENCIÓN, no por posición.

Tienes aprendida la intención de un proceso de negocio. Debes aplicarla 
a páginas nuevas que pueden verse distintas a las originales pero tienen 
el mismo propósito. Busca los datos por su SIGNIFICADO, no por su ubicación exacta.

DESCRIPCIÓN DEL PROCESO: {descripcion}

INTENCIÓN APRENDIDA DEL PROCESO:
{json.dumps(mapeo_guardado, indent=2, ensure_ascii=False)}

CONTENIDO DE LAS PÁGINAS A PROCESAR:
{json.dumps(paginas, indent=2, ensure_ascii=False)}

Para cada página:
1. Identifica si es el sistema ORIGEN o DESTINO según su propósito
2. Busca cada campo definido en la intención aprendida usando su descripción semántica,
   no asumas que estará en la misma posición o con el mismo nombre que antes
3. Aplica las transformaciones definidas
4. Si un dato no se encuentra, explica por qué en términos de negocio

REGLA CLAVE: Si el campo se llama diferente pero representa lo mismo 
(ej: "product_title" vs "item_name" vs "nombre del artículo"), 
igual extráelo — estás buscando la INTENCIÓN, no la etiqueta exacta.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional:

{{
  "registros": [
    {{
      "pagina_origen": "URL o índice de la página",
      "datos_extraidos": {{
        "nombre_semantico_del_campo": "valor extraído y transformado"
      }},
      "razonamiento": "breve explicación de cómo identificaste cada campo en esta página específica",
      "campos_no_encontrados": [
        {{
          "campo": "nombre semántico del campo",
          "razon": "por qué no se pudo encontrar en términos de negocio"
        }}
      ],
      "confianza": 0.98
    }}
  ],
  "resumen": {{
    "total_registros": 1,
    "registros_completos": 1,
    "registros_con_faltantes": 0
  }}
}}
"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = _limpiar_json(response.content[0].text)
    resultado = json.loads(raw)
    return resultado.get("registros", [])
