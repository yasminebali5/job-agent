import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import get_current_user
from ..models import User

router = APIRouter(tags=["generate"])

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
HUGGINGFACE_URL = "https://router.huggingface.co/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def _anthropic_messages_to_openai(body: dict) -> list[dict]:
    """Convert an Anthropic Messages API body into OpenAI-style chat messages."""
    messages = []
    system = body.get("system")
    if system:
        messages.append({"role": "system", "content": system})
    for m in body.get("messages", []):
        content = m.get("content")
        if isinstance(content, list):
            content = "".join(block.get("text", "") for block in content if isinstance(block, dict))
        messages.append({"role": m["role"], "content": content})
    return messages


def _openai_completion_to_anthropic(data: dict) -> dict:
    """Wrap an OpenAI-style chat completion so it matches the Anthropic response shape
    the frontend already parses (data.content[0].text)."""
    text = data["choices"][0]["message"]["content"]
    return {"content": [{"type": "text", "text": text}]}


async def _call_anthropic(client: httpx.AsyncClient, body: dict) -> dict:
    api_key = os.getenv("ANTHROPIC_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_KEY not configured")

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }
    resp = await client.post(ANTHROPIC_URL, headers=headers, json=body, timeout=60.0)
    if resp.status_code >= 400:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
    return resp.json()


async def _call_openrouter(client: httpx.AsyncClient, body: dict) -> dict:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not configured")

    model = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")
    payload = {
        "model": model,
        "max_tokens": body.get("max_tokens", 2000),
        "messages": _anthropic_messages_to_openai(body),
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    resp = await client.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60.0)
    if resp.status_code >= 400:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
    return _openai_completion_to_anthropic(resp.json())


async def _call_huggingface(client: httpx.AsyncClient, body: dict) -> dict:
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key:
        raise RuntimeError("HUGGINGFACE_API_KEY not configured")

    model = os.getenv("HUGGINGFACE_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
    payload = {
        "model": model,
        "max_tokens": body.get("max_tokens", 2000),
        "messages": _anthropic_messages_to_openai(body),
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    resp = await client.post(HUGGINGFACE_URL, headers=headers, json=payload, timeout=60.0)
    if resp.status_code >= 400:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
    return _openai_completion_to_anthropic(resp.json())


async def _call_groq(client: httpx.AsyncClient, body: dict) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not configured")

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    payload = {
        "model": model,
        "max_tokens": body.get("max_tokens", 2000),
        "messages": _anthropic_messages_to_openai(body),
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    resp = await client.post(GROQ_URL, headers=headers, json=payload, timeout=60.0)
    if resp.status_code >= 400:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
    return _openai_completion_to_anthropic(resp.json())


async def _call_ollama(client: httpx.AsyncClient, body: dict) -> dict:
    base_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "llama3.1")
    payload = {
        "model": model,
        "max_tokens": body.get("max_tokens", 2000),
        "messages": _anthropic_messages_to_openai(body),
    }
    resp = await client.post(f"{base_url}/v1/chat/completions", json=payload, timeout=120.0)
    if resp.status_code >= 400:
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
    return _openai_completion_to_anthropic(resp.json())


# Tried in order; each is skipped (not failed loudly) if its credentials/host aren't configured.
PROVIDERS = [
    ("anthropic", _call_anthropic),
    ("openrouter", _call_openrouter),
    ("huggingface", _call_huggingface),
    ("groq", _call_groq),
    ("ollama", _call_ollama),
]


@router.post("/generate")
async def generate(request: Request, current_user: User = Depends(get_current_user)) -> Any:
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    errors = []
    async with httpx.AsyncClient() as client:
        for name, call in PROVIDERS:
            try:
                return await call(client, body)
            except Exception as e:
                errors.append(f"{name}: {e}")

    raise HTTPException(status_code=502, detail="All providers failed — " + "; ".join(errors))
