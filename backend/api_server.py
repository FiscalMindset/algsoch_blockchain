"""AI API Server — wraps ai_client.py with aiohttp + CORS."""

from aiohttp import web
import asyncio
import base64
import os
import re
import urllib.parse

from dotenv import load_dotenv

# Load backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from ai_client import decompose_goal_nvidia, execute_task_nvidia

ALLOWED_ORIGIN = "http://localhost:5173"

# ---------------------------------------------------------------------------
# URI resolution helpers
# ---------------------------------------------------------------------------

def resolve_uri_content(uri: str) -> tuple[str, str]:
    """Parse a URI and return (content, mime_type)."""
    if not uri:
        return "", "text/plain"

    # data:text/plain;base64,SGVsbG8=
    if uri.startswith("data:"):
        match = re.match(r"data:([^;]+);base64,(.+)", uri)
        if match:
            mime, b64 = match.groups()
            try:
                decoded = base64.b64decode(b64).decode("utf-8", errors="replace")
                return decoded, mime
            except Exception:
                return uri, mime
        return uri, "text/plain"

    # mock://task/Desc  or  mock://result/Desc
    if uri.startswith("mock://task/") or uri.startswith("mock://result/"):
        # Extract everything after mock://(task|result)/
        slash_pos = uri.find("/", 7)  # find first / after "mock://"
        rest = uri[slash_pos + 1:] if slash_pos != -1 else ""
        return urllib.parse.unquote(rest), "text/plain"

    # ipfs://task-meta/base64payload
    if uri.startswith("ipfs://task-meta/"):
        b64 = uri.replace("ipfs://task-meta/", "")
        try:
            decoded = base64.b64decode(b64).decode("utf-8", errors="replace")
            return decoded, "text/plain"
        except Exception:
            return "Task from IPFS", "text/plain"

    return uri, "text/plain"


# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------

@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        response = web.Response()
    else:
        response = await handler(request)

    origin = request.headers.get("Origin", "")
    if origin == ALLOWED_ORIGIN or origin.startswith("http://localhost"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------

async def handle_decompose(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid JSON"}, status=400)

    goal = body.get("goal", "")
    if not goal:
        return web.json_response({"error": "goal is required"}, status=400)

    # Run blocking NVIDIA call in thread pool to avoid blocking the event loop
    loop = asyncio.get_running_loop()
    tasks = await loop.run_in_executor(None, decompose_goal_nvidia, goal)
    result = [
        {"id": i, "description": t["task"], "bounty_eth": t.get("bounty_eth", 0.05)}
        for i, t in enumerate(tasks)
    ]
    return web.json_response({"tasks": result})


async def handle_execute(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "invalid JSON"}, status=400)

    task_description = body.get("task_description", "")
    # Run blocking NVIDIA call in thread pool to avoid blocking the event loop
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, execute_task_nvidia, task_description)
    return web.json_response({"result": result})


async def handle_resolve_uri(request: web.Request) -> web.Response:
    uri = request.query.get("uri", "")
    content, mime = resolve_uri_content(uri)
    return web.json_response({"content": content, "type": mime})


async def handle_health(request: web.Request) -> web.Response:
    return web.json_response({"status": "ok"})


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

def create_app() -> web.Application:
    app = web.Application(middlewares=[cors_middleware])
    app.router.add_post("/api/decompose", handle_decompose)
    app.router.add_post("/api/execute", handle_execute)
    app.router.add_get("/api/resolve-uri", handle_resolve_uri)
    app.router.add_get("/api/health", handle_health)
    return app


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app = create_app()
    host = "127.0.0.1"
    port = 8000
    print(f"AI API server listening on http://{host}:{port}")
    web.run_app(app, host=host, port=port)