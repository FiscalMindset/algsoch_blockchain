"""NVIDIA NIM API client for AI-powered task decomposition and execution."""

import json
import os
import re
import warnings

import requests

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"


def _call_nvidia(
    messages: list[dict],
    model: str | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.7,
) -> str:
    """Call NVIDIA NIM API in OpenAI-compatible format. Returns generated text."""
    api_key = os.environ.get("NVIDIA_API_KEY", "")
    model_name = model or os.environ.get(
        "MODEL", "nvidia/nemotron-3-ultra-550b-a55b"
    )

    if not api_key:
        warnings.warn("NVIDIA_API_KEY not set; skipping NVIDIA API call.")
        return ""

    try:
        resp = requests.post(
            f"{NVIDIA_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_name,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
            timeout=90,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as exc:
        warnings.warn(f"NVIDIA API request failed: {exc}")
        return ""
    except (KeyError, IndexError) as exc:
        warnings.warn(f"NVIDIA API response malformed: {exc}")
        return ""


def _strip_markdown_json(raw: str) -> str:
    """Strip markdown fences and extract JSON from a string."""
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    return raw.strip()


def _parse_json_array(raw: str) -> list[dict]:
    """Robustly parse a JSON array from a string, handling markdown fences and partial JSON."""
    raw = _strip_markdown_json(raw)

    # Try direct parsing first
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Try extracting the first [...] block
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Try line-by-line reconstruction: look for {..} objects
    objects = []
    for obj_match in re.finditer(r"\{[^{}]*\}", raw):
        try:
            obj = json.loads(obj_match.group(0))
            if isinstance(obj, dict):
                objects.append(obj)
        except json.JSONDecodeError:
            continue

    return objects


def decompose_goal_nvidia(goal: str, model: str | None = None) -> list[dict]:
    """
    Use NVIDIA LLM to decompose a goal into sub-tasks.

    Returns:
        List of dicts: [{"task": "...", "bounty_eth": 0.05}, ...]
    """
    prompt = (
        "You are a project manager AI. Decompose the following goal into 2-4 concrete sub-tasks.\n"
        "Each sub-task should be a single sentence describing a specific deliverable.\n"
        "Return ONLY a JSON array of objects with keys 'task' and 'bounty_eth' (float).\n"
        "Set bounty_eth to 0.05 for each.\n"
        f"Goal: {goal}"
    )

    result = _call_nvidia(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        max_tokens=1024,
        temperature=0.3,
    )

    if not result:
        return []

    tasks = _parse_json_array(result)
    validated = []
    for t in tasks:
        if isinstance(t, dict) and "task" in t:
            validated.append(
                {
                    "task": str(t["task"]),
                    "bounty_eth": float(t.get("bounty_eth", 0.05)),
                }
            )
    return validated


def execute_task_nvidia(task_description: str, model: str | None = None) -> str:
    """
    Use NVIDIA LLM to execute a task and generate a result.

    Returns:
        A result string (max ~2000 chars) describing the work done.
    """
    prompt = (
        "You are an expert agent. Complete the following task to the best of your ability.\n"
        "Provide a concise but thorough result (max 2000 characters).\n"
        f"Task: {task_description}"
    )

    result = _call_nvidia(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        max_tokens=2048,
        temperature=0.7,
    )

    return result.strip() if result else ""
