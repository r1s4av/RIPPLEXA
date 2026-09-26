from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.pipeline import run_ripplexa


router = APIRouter()


class SimulationRequest(BaseModel):
    failed_node: str
    required_capacity: float = Field(default=100.0, ge=0)
    disruption_threshold: float = Field(default=0.45, ge=0, le=1)


@router.post("/simulate")
def simulate(request: SimulationRequest):

    result = run_ripplexa(
        request.failed_node,
        required_capacity=request.required_capacity,
        disruption_threshold=request.disruption_threshold
    )

    return result