import os
import pymysql
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

def get_working_engine():
    """Try explicitly configured DATABASE_URL, or primary MySQL with fast timeout, then SQLite fallback for instant startup."""
    # Check explicitly defined DATABASE_URL (e.g. from Render or Cloud environment)
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        if "sqlite" in db_url:
            return create_engine(db_url, connect_args={"check_same_thread": False}, echo=False)
        return create_engine(db_url, pool_pre_ping=True, pool_recycle=3600, echo=False)

    # Attempt 1: Configured MySQL (with fast 2s timeout)
    try:
        connection = pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            autocommit=True,
            connect_timeout=2
        )
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{settings.DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        connection.close()
        print(f"[Database] Successfully connected to MySQL database '{settings.DB_NAME}'")
        return create_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_recycle=3600, echo=False)
    except Exception as e1:
        print(f"[Database Note] Primary MySQL connection ({settings.DB_USER}) failed/timed out: {e1}")

    # Attempt 2: Try empty password for MySQL root (with fast 2s timeout)
    try:
        connection = pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password="",
            autocommit=True,
            connect_timeout=2
        )
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{settings.DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        connection.close()
        print(f"[Database] Successfully connected to MySQL database '{settings.DB_NAME}' using empty password.")
        alt_url = f"mysql+pymysql://{settings.DB_USER}:@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
        return create_engine(alt_url, pool_pre_ping=True, pool_recycle=3600, echo=False)
    except Exception as e2:
        print(f"[Database Note] Secondary MySQL connection failed: {e2}")

    # Attempt 3: SQLite fallback
    print("[Database Info] Falling back to SQLite database './innowell_hrms.db' for instant cloud/local preview.")
    sqlite_url = "sqlite:///./innowell_hrms.db"
    return create_engine(sqlite_url, connect_args={"check_same_thread": False}, echo=False)

engine = get_working_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

