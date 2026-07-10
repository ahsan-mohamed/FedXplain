"""
websocket_manager.py

Manages all active WebSocket connections and broadcasts fraud alerts to
every connected client in real time. Used so a Fraud Analyst's dashboard
lights up the instant a high-risk transaction is scored, anywhere in the
system -- no polling needed.
"""

from typing import List

from fastapi import WebSocket

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total active: {len(self.active_connections)}")

    async def broadcast_json(self, data: dict):
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                dead_connections.append(connection)

        # clean up any connections that errored out (client closed without
        # a clean disconnect)
        for conn in dead_connections:
            self.disconnect(conn)


manager = ConnectionManager()
