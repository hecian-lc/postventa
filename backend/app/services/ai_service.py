from typing import Optional
from ..config import settings


def _build_report_prompt(ot_data: dict, kb_entries: list) -> str:
    kb_text = ""
    if kb_entries:
        kb_text = "\n\nCasos similares en bitácora:\n"
        for e in kb_entries[:3]:
            kb_text += f"- Equipo: {e['equipment_type']} {e.get('brand','')} {e.get('model','')}\n"
            kb_text += f"  Síntoma: {e['symptoms']}\n"
            kb_text += f"  Diagnóstico: {e['diagnosis']}\n"
            kb_text += f"  Solución: {e['solution']}\n"

    return f"""Eres un técnico experto en electrónica industrial y sistemas SCADA.
Redacta un informe técnico profesional en español basado en los siguientes datos:

Orden de Trabajo: {ot_data.get('ot_number')}
Cliente: {ot_data.get('client')}
Equipo: {ot_data.get('equipment_type')} - {ot_data.get('brand','')} {ot_data.get('model','')}
N° Serie: {ot_data.get('serial_number','')}
Problema reportado: {ot_data.get('reported_problem')}
Diagnóstico realizado: {ot_data.get('diagnosis','')}
Trabajos realizados: {ot_data.get('solution','')}
Componentes reemplazados: {ot_data.get('components_replaced','')}
{kb_text}

El informe debe incluir:
1. Descripción del equipo recibido
2. Diagnóstico técnico detallado
3. Trabajos realizados y componentes reemplazados
4. Resultado de las pruebas
5. Recomendaciones

Redacta en tono técnico y profesional, en español."""


def _build_diagnosis_prompt(symptoms: str, equipment_type: str, model: str, kb_entries: list) -> str:
    kb_text = ""
    if kb_entries:
        kb_text = "\n\nCasos similares encontrados en la bitácora de jurisprudencia:\n"
        for e in kb_entries[:5]:
            kb_text += f"- {e['equipment_type']} {e.get('brand','')} {e.get('model','')}: {e['symptoms']} → {e['diagnosis']}\n"

    return f"""Eres un técnico experto en electrónica industrial y SCADA.
Un equipo {equipment_type} modelo {model} presenta los siguientes síntomas: {symptoms}
{kb_text}

Basándote en tu experiencia y en los casos similares, sugiere:
1. Los posibles diagnósticos (del más al menos probable)
2. Los pasos de verificación recomendados
3. Los componentes que probablemente estén fallando

Responde de forma concisa y práctica."""


async def generate_technical_report(ot_data: dict, kb_entries: list, provider: Optional[str] = None) -> str:
    provider = provider or settings.ai_provider
    prompt = _build_report_prompt(ot_data, kb_entries)
    if provider == "claude":
        return await _call_claude(prompt)
    return await _call_gemini(prompt)


async def suggest_diagnosis(symptoms: str, equipment_type: str, model: str, kb_entries: list, provider: Optional[str] = None) -> str:
    provider = provider or settings.ai_provider
    prompt = _build_diagnosis_prompt(symptoms, equipment_type, model, kb_entries)
    if provider == "claude":
        return await _call_claude(prompt)
    return await _call_gemini(prompt)


async def _call_claude(prompt: str) -> str:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def _call_gemini(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=settings.google_api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(prompt)
    return response.text
