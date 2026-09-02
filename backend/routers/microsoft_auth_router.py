from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from typing import Dict, Any
from config import settings
from services import microsoft_graph_service

router = APIRouter(prefix="/api/auth/microsoft", tags=["Microsoft OAuth"])

# Global session token store for current server instance
ms_token_store: Dict[str, Any] = {}

@router.get("/login")
def microsoft_login():
    """Redirect to Microsoft OAuth 2.0 Login Screen."""
    if not microsoft_graph_service.is_microsoft_configured():
        return {
            "status": "unconfigured",
            "message": "Microsoft Entra ID is unconfigured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env.",
            "auth_url": None
        }
    auth_url = microsoft_graph_service.get_microsoft_auth_url()
    return RedirectResponse(url=auth_url)

@router.get("/callback")
def microsoft_callback(code: str = None, error: str = None):
    """Callback endpoint handling authorization code from Microsoft OAuth."""
    if error:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/meetings?ms_auth_error={error}")
    
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
        
    tokens = microsoft_graph_service.exchange_code_for_tokens(code)
    if "access_token" in tokens:
        ms_token_store["access_token"] = tokens["access_token"]
        ms_token_store["refresh_token"] = tokens.get("refresh_token")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/meetings?ms_auth_success=true")
    else:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/meetings?ms_auth_error=token_failed")

@router.get("/status")
def get_microsoft_auth_status():
    """Check whether Microsoft Teams OAuth is configured & authenticated."""
    is_configured = microsoft_graph_service.is_microsoft_configured()
    is_connected = "access_token" in ms_token_store
    auth_url = microsoft_graph_service.get_microsoft_auth_url() if is_configured else None
    
    return {
        "is_configured": is_configured,
        "is_connected": is_connected,
        "auth_url": auth_url,
        "provider": "Microsoft Teams (Microsoft Graph API)"
    }
