import os
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import engine, Base, SessionLocal
from routers import (
    auth_router,
    employees_router,
    leaves_router,
    meetings_router,
    tickets_router,
    payroll_attendance_router,
    chatbot_router,
    microsoft_auth_router
)

# Initialize Database tables
Base.metadata.create_all(bind=engine)

def ensure_schema_updated():
    """Ensure newly added columns like attachment_url and attachment_name exist in database tables."""
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check tickets table columns
            try:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN attachment_url LONGTEXT;"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN attachment_name VARCHAR(255);"))
            except Exception:
                pass
            conn.commit()
    except Exception as e:
        print(f"[Schema Migration Note] {e}")

ensure_schema_updated()

# Auto seed database if empty on startup
def auto_seed_if_needed():
    try:
        db = SessionLocal()
        import models
        user_count = db.query(models.User).count()
        db.close()
        if user_count == 0:
            print("[Startup] Database is empty. Running initial auto-seed...")
            from seed import seed_database
            seed_database(drop_existing=False)
    except Exception as e:
        print(f"[Startup Warning] Auto-seed check failed: {e}")

auto_seed_if_needed()

app = FastAPI(
    title="Innowell Technologies Agentic AI HRMS API",
    description="Backend API powering the Innowell Technologies Agentic Human Resource Management System with Gemini AI Integration",
    version="1.0.0"
)

# CORS configuration - Allow all origins for seamless Cloud API consumption
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router.router)
app.include_router(employees_router.router)
app.include_router(leaves_router.router)
app.include_router(meetings_router.router)
app.include_router(tickets_router.router)
app.include_router(payroll_attendance_router.router)
app.include_router(chatbot_router.router)
app.include_router(microsoft_auth_router.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Innowell Technologies Agentic AI HRMS Portal",
        "version": "1.0.0",
        "ai_engine": "Google Gemini Flash 3.7"
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "innowell-hrms-backend"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
