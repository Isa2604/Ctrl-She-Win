# -*- coding: utf-8 -*-
import anthropic
import json
import os
import re
from typing import Any

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-5"


def _limpiar_json(raw: str) -> str:
    """
    Extrae y limpia el JSON de la respuesta de Claude.
    Maneja: bloques ```json...```, backticks sueltos,
    texto antes/despues del JSON, y trailing commas invalidas.
    """
    raw = raw.strip()

    # Caso 1: viene envuelto en ```json ... ``` o ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if match:
        raw = match.group(1).strip()
    else:
        # Caso 2: sin backticks pero con posible texto antes del JSON
        start = re.search(r"[{\[]", raw)
        if start:
            raw = raw[start.start():]

    # Limpiar trailing commas antes de } o ] (invalido en JSON, comun en LLMs)
    raw = re.sub(r",\s*([}\]])", r"\1", raw)

    return raw.strip()


# --- PARSER DE SESION PLAYWRIGHT ---------------------------------------------

def parsear_sesion_playwright(events: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Convierte los eventos crudos de Playwright en un resumen estructurado
    y semanticamente rico para que Claude entienda la intencion del proceso.

    Extrae:
    - Paginas visitadas con su texto visible y sus inputs
    - Acciones significativas (clicks, fills, copies)
    - Datos que el usuario copio o escribio (senales claras de transferencia)
    - Ignora eventos de ruido (snapshots duplicados, navigations intermedias)
    """
    paginas_vistas: dict[str, dict] = {}
    acciones: list[dict] = []

    TIPOS_IGNORAR = {"navigation", "manual_open_url"}

    for event in events:
        tipo = event.get("type", "")

        if tipo == "page_snapshot":
            url = event.get("url", "")
            snapshot = event.get("snapshot", {})
            visible_text = snapshot.get("visibleText", "")
            existente = paginas_vistas.get(url, {})
            if len(visible_text) > len(existente.get("visibleText", "")):
                paginas_vistas[url] = {
                    "url": url,
                    "title": snapshot.get("title", ""),
                    "visibleText": visible_text[:1500],
                    "inputs": [
                        {
                            "label": inp.get("label") or inp.get("placeholder") or inp.get("name"),
                            "type": inp.get("type"),
                            "selector": inp.get("selector"),
                            "value": inp.get("value", "")
                        }
                        for inp in snapshot.get("inputs", [])
                    ]
                }
            continue

        if tipo in TIPOS_IGNORAR:
            continue

        element = event.get("element", {})
        accion = {
            "tipo": tipo,
            "url": event.get("url", ""),
            "pagina_titulo": event.get("title", ""),
        }

        if tipo == "click":
            accion["elemento_label"] = element.get("label") or element.get("text") or element.get("name")
            accion["elemento_tag"] = element.get("tag")
            accion["selector"] = element.get("selector")
            accion["contexto_pagina"] = event.get("pageTextAroundAction", "")[:500]

        elif tipo in ("fill", "input", "change"):
            accion["campo_label"] = element.get("label") or element.get("placeholder") or element.get("name")
            accion["campo_selector"] = element.get("selector")
            accion["valor_escrito"] = event.get("value") or element.get("value", "")

        elif tipo in ("copy", "keyboard_copy"):
            accion["texto_copiado"] = event.get("copiedText") or event.get("selectedText", "")

        elif tipo == "select_option":
            accion["campo_label"] = element.get("label") or element.get("name")
            accion["valor_seleccionado"] = event.get("value", "")

        acciones.append(accion)

    return {
        "paginas_visitadas": list(paginas_vistas.values()),
        "acciones": acciones,
        "total_acciones": len(acciones)
    }


# --- FASE 1: INFERIR INTENCION -----------------------------------------------

def inferir_mapeo(
    nombre: str,
    descripcion: str,
    events: list[dict[str, Any]]
) -> dict[str, Any]:
    """
    Fusiona la descripcion (instrucciones de negocio) con la sesion de Playwright
    (ejemplo concreto) para inferir la intencion del proceso de forma robusta.

    La descripcion actua como la fuente de verdad sobre QUE debe hacerse.
    Playwright actua como el ejemplo concreto de COMO se hizo una vez.
    El resultado debe ser portable: funcionar en un front diferente al del ejemplo.
    """

    resumen = parsear_sesion_playwright(events)

    prompt = (
        "Eres un agente experto en entender y generalizar procesos de negocio.\n\n"
        "Se te proporcionan DOS fuentes de informacion sobre el mismo proceso:\n\n"
        "1. DESCRIPCION (instrucciones de negocio): Lo que el usuario quiere lograr, "
        "expresado en sus propias palabras. Esta es la fuente de verdad sobre la INTENCION.\n\n"
        "2. SESION DE EJEMPLO (grabacion Playwright): Una demostracion concreta de como "
        "se ejecuto el proceso una vez, en un front especifico. Es un EJEMPLO, no una regla fija. "
        "El front donde se ejecutara en el futuro puede ser completamente diferente.\n\n"
        "Tu tarea es combinar ambas fuentes para extraer un modelo de intencion portable:\n"
        "- De la DESCRIPCION: extrae las reglas de negocio, restricciones y objetivos explicitos.\n"
        "- Del EJEMPLO: extrae los datos involucrados, las transformaciones aplicadas y el flujo real.\n"
        "- Descarta todo lo que sea especifico del front del ejemplo (selectores, URLs, layouts).\n"
        "- Conserva solo lo que seguiria siendo valido si el mismo proceso ocurriera en un sistema diferente.\n\n"
        f"NOMBRE DEL PROCESO: {nombre}\n\n"
        f"DESCRIPCION (instrucciones de negocio):\n{descripcion}\n\n"
        f"PAGINAS VISITADAS EN EL EJEMPLO:\n{json.dumps(resumen['paginas_visitadas'], indent=2, ensure_ascii=False)}\n\n"
        f"ACCIONES REALIZADAS EN EL EJEMPLO:\n{json.dumps(resumen['acciones'], indent=2, ensure_ascii=False)}\n\n"
        "Responde UNICAMENTE con un JSON valido, sin texto adicional:\n\n"
        "{\n"
        '  "intencion_global": "que proceso de negocio se esta automatizando, en lenguaje claro",\n\n'
        '  "reglas_de_negocio": [\n'
        '    "regla o restriccion extraida de la descripcion que debe respetarse siempre",\n'
        '    "ejemplo: el precio debe guardarse sin simbolo de moneda",\n'
        '    "ejemplo: solo transferir productos con stock mayor a cero"\n'
        "  ],\n\n"
        '  "sistema_origen": {\n'
        '    "proposito": "para que sirve el sistema del que se leen datos",\n'
        '    "tipo": "portal de compras | catalogo | ERP | formulario | otro",\n'
        '    "senales_identificacion": "como reconocer este tipo de sistema en cualquier front nuevo"\n'
        "  },\n\n"
        '  "sistema_destino": {\n'
        '    "proposito": "para que sirve el sistema donde se escriben los datos",\n'
        '    "tipo": "sistema interno | base de datos | formulario de registro | otro",\n'
        '    "senales_identificacion": "como reconocer este tipo de sistema en cualquier front nuevo"\n'
        "  },\n\n"
        '  "campos": [\n'
        "    {\n"
        '      "nombre_semantico": "nombre del dato en lenguaje de negocio (ej: precio unitario)",\n'
        '      "descripcion": "que representa este dato y por que importa en el proceso",\n'
        '      "como_identificarlo_en_origen": "descripcion semantica para encontrarlo en cualquier front con el mismo proposito",\n'
        '      "nombre_en_destino": "como suele llamarse este campo en el sistema destino",\n'
        '      "tipo_dato": "texto | numero | precio | fecha | cantidad | identificador | otro",\n'
        '      "transformacion": "ninguna | quitar_simbolo_moneda | redondear | formato_fecha | uppercase | otro",\n'
        '      "origen": "descripcion | ejemplo | ambos",\n'
        '      "es_obligatorio": true\n'
        "    }\n"
        "  ],\n\n"
        '  "flujo_general": [\n'
        '    "paso 1 del proceso en lenguaje natural, sin mencionar selectores ni URLs",\n'
        '    "paso 2 del proceso en lenguaje natural"\n'
        "  ],\n\n"
        '  "advertencias": [\n'
        '    "algo que el ejemplo hace de una manera pero la descripcion indica que podria variar"\n'
        "  ],\n\n"
        '  "confianza": 0.95,\n'
        '  "notas": "observaciones que ayuden a replicar el proceso en un front diferente"\n'
        "}"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = _limpiar_json(response.content[0].text)
    return json.loads(raw)


# --- FASE 2: EJECUTAR CON INTENCION ------------------------------------------

def transcribir(
    paginas: list[str],
    mapeo_guardado: dict[str, Any],
    descripcion: str
) -> list[dict[str, Any]]:
    """
    Dado el contenido de paginas nuevas y la intencion aprendida,
    Claude extrae los datos correctos aunque el front sea diferente
    al usado durante la grabacion de ejemplo.
    """

    prompt = (
        "Eres un agente de extraccion de datos que opera por INTENCION, no por posicion.\n\n"
        "Tienes aprendida la intencion de un proceso de negocio, incluyendo sus reglas de negocio "
        "y los campos que debe transferir. Debes aplicarla a paginas nuevas que pueden verse "
        "completamente distintas al ejemplo original: el front puede haber cambiado.\n\n"
        f"DESCRIPCION ORIGINAL DEL PROCESO: {descripcion}\n\n"
        f"INTENCION APRENDIDA (incluye reglas de negocio y campos a extraer):\n"
        f"{json.dumps(mapeo_guardado, indent=2, ensure_ascii=False)}\n\n"
        f"CONTENIDO DE LAS PAGINAS A PROCESAR:\n"
        f"{json.dumps(paginas, indent=2, ensure_ascii=False)}\n\n"
        "Para cada pagina:\n"
        "1. Identifica si es el sistema ORIGEN o DESTINO por su proposito, no por su URL o layout.\n"
        "2. Busca cada campo usando su descripcion semantica, no su posicion ni su etiqueta exacta.\n"
        "3. Aplica las transformaciones definidas en el mapeo.\n"
        "4. Respeta las reglas de negocio: si una regla dice que un campo debe cumplir cierta condicion, verificala.\n"
        "5. Si un dato no se encuentra, explica por que en terminos de negocio.\n\n"
        'REGLA CLAVE: "product_title", "item_name" y "nombre del articulo" son el mismo dato. '
        "Busca la INTENCION detras del campo, no su etiqueta literal.\n\n"
        "Responde UNICAMENTE con un JSON valido, sin texto adicional:\n\n"
        "{\n"
        '  "registros": [\n'
        "    {\n"
        '      "pagina_origen": "URL o indice de la pagina",\n'
        '      "datos_extraidos": {\n'
        '        "nombre_semantico_del_campo": "valor extraido y transformado"\n'
        "      },\n"
        '      "razonamiento": "breve explicacion de como identificaste cada campo en este front",\n'
        '      "reglas_aplicadas": [\n'
        '        "descripcion de cada regla de negocio que se verifico o aplico"\n'
        "      ],\n"
        '      "campos_no_encontrados": [\n'
        "        {\n"
        '          "campo": "nombre semantico del campo",\n'
        '          "razon": "por que no se pudo encontrar en terminos de negocio"\n'
        "        }\n"
        "      ],\n"
        '      "confianza": 0.98\n'
        "    }\n"
        "  ],\n"
        '  "resumen": {\n'
        '    "total_registros": 1,\n'
        '    "registros_completos": 1,\n'
        '    "registros_con_faltantes": 0\n'
        "  }\n"
        "}"
    )

    response = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = _limpiar_json(response.content[0].text)
    resultado = json.loads(raw)
    return resultado.get("registros", [])
