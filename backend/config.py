import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from root directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
    
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "root")
    DB_NAME: str = os.getenv("DB_NAME", "innowell_hrms")
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "innowell_hrms_jwt_secret_2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "Shanthi@innowell.com")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Shanthi@123")
    HR_EMAIL: str = os.getenv("HR_EMAIL", "Leninkumar@innowell.com")
    HR_PASSWORD: str = os.getenv("HR_PASSWORD", "Lenin@123")
    MANAGER_EMAIL: str = os.getenv("MANAGER_EMAIL", "Kannan@innowell.com")
    MANAGER_PASSWORD: str = os.getenv("MANAGER_PASSWORD", "Kannan@123")
    
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Microsoft Entra ID / Graph API settings
    MICROSOFT_CLIENT_ID: str = os.getenv("MICROSOFT_CLIENT_ID", "")
    MICROSOFT_CLIENT_SECRET: str = os.getenv("MICROSOFT_CLIENT_SECRET", "")
    MICROSOFT_TENANT_ID: str = os.getenv("MICROSOFT_TENANT_ID", "common")
    MICROSOFT_REDIRECT_URI: str = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:8000/api/auth/microsoft/callback")

    @property
    def DATABASE_URL(self) -> str:
        # PyMySQL connection string for MySQL
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()
