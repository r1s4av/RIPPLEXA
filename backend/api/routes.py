from fastapi import APIRouter
from pydantic import BaseModel

from backend.pipeline import run_ripplexa


router = APIRouter()


class SimulationRequest(BaseModel):
    failed_node: str


@router.post("/simulate")
def simulate(request: SimulationRequest):

    result = run_ripplexa(request.failed_node)

    return result