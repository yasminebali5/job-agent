import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..auth import get_current_user
from ..models import User

router = APIRouter(tags=["generate"])

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


@router.post("/generate")
async def generate(request: Request, current_user: User = Depends(get_current_user)) -> Any:
    api_key = os.getenv("ANTHROPIC_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_KEY not configured on server")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(ANTHROPIC_URL, headers=headers, json=body)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Anthropic request failed: {e}")

    if resp.status_code >= 400:
        try:
            err = resp.json()
            message = err.get("error", {}).get("message") or resp.text
        except Exception:
            message = resp.text
        raise HTTPException(status_code=resp.status_code, detail=message)

    return resp.json()
