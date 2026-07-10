"""
routes_websocket.py

WS /ws/alerts?token=<jwt> : real-time stream of fraud alerts.

Auth note: browsers can't set custom headers on a WebSocket handshake,
so the JWT is passed as a query parameter here instead of an
Authorization header. This is a common, accepted pattern for WS auth --
just make sure this only ever runs over WSS (TLS) in production so the
token isn't exposed in plaintext.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.core.security import decode_token
from app.core.logging_config import get_logger
from app.services.websocket_manager import manager

router = APIRouter(tags=["Real-time Alerts"])
logger = get_logger(__name__)


@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4401)
            return
    except JWTError:
        await websocket.close(code=4401)
        return

    await manager.connect(websocket)
    try:
        while True:
            # We don't expect incoming messages from the client on this
            # channel, but we must keep the receive loop alive to detect
            # disconnects promptly.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
