from fastapi import FastAPI

from backend.api.routes import router


app = FastAPI(title="Ripplexa")

app.include_router(router)


@app.get("/")
def home():
    return {"message": "Ripplexa is running"}