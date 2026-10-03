"""
FastAPI Microservice for SPIL-GAME DRL Inference (Bot Omega)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from agent import agent

app = FastAPI(
    title="SPIL-GAME DRL AI Service",
    description="Inference API providing DRL Policy outputs for container stowage planning",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StowageStateRequest(BaseModel):
    currentPort: str
    activePorts: List[str]
    cargoPool: Optional[List[Dict[str, Any]]] = []
    grid: Optional[Dict[str, Any]] = {}
    pendingContainers: Optional[List[Dict[str, Any]]] = []

class DRLDecisionResponse(BaseModel):
    status: str
    model: str
    acceptedOrderIds: List[str]
    policy: str

@app.get("/")
def read_root():
    return {
        "service": "SPIL-GAME DRL AI Service",
        "status": "online",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/drl/decide", response_model=DRLDecisionResponse)
def decide_action(payload: StowageStateRequest):
    try:
        decision = agent.select_action(payload.model_dump())
        return decision
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
