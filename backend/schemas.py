from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime, date as PyDate
from models import RoleEnum, EmploymentTypeEnum, LeaveStatusEnum, TicketStatusEnum, TicketSeverityEnum

# Auth Schemas
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: RoleEnum = RoleEnum.EMPLOYEE
    phone: Optional[str] = None
    address: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)

# User & Profile Schemas
class EmployeeProfileUpdateSelf(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    education: Optional[str] = None
    previous_experience: Optional[str] = None
    domain: Optional[str] = None
    is_profile_completed: Optional[bool] = True

class EmployeeProfileUpdateHR(BaseModel):
    assigned_project: Optional[str] = None
    manager_id: Optional[int] = None
    tenure_start_date: Optional[PyDate] = None
    previous_experience: Optional[str] = None
    education: Optional[str] = None
    domain: Optional[str] = None
    employment_type: Optional[EmploymentTypeEnum] = None
    role: Optional[RoleEnum] = None

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: RoleEnum
    phone: Optional[str] = None
    address: Optional[str] = None
    is_profile_completed: bool = False
    created_at: datetime
    
    assigned_project: Optional[str] = "Unassigned"
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    tenure_start_date: Optional[PyDate] = None
    previous_experience: Optional[str] = None
    education: Optional[str] = None
    domain: Optional[str] = None
    employment_type: Optional[EmploymentTypeEnum] = EmploymentTypeEnum.FULL_TIME

    class Config:
        from_attributes = True

# Leave Schemas
class LeaveTypeOut(BaseModel):
    id: int
    name: str
    code: str
    default_annual_quota: int

    class Config:
        from_attributes = True

class LeaveBalanceOut(BaseModel):
    leave_type_id: int
    leave_type_name: str
    leave_type_code: str
    remaining_days: float
    month_year: str

class LeaveDraftRequest(BaseModel):
    leave_type_id: int
    days_requested: float
    start_date: Optional[PyDate] = None
    end_date: Optional[PyDate] = None
    user_notes: Optional[str] = ""

class LeaveRequestCreate(BaseModel):
    leave_type_id: int
    days_requested: float
    start_date: Optional[PyDate] = None
    end_date: Optional[PyDate] = None
    ai_drafted_reason: str

class LeaveStatusUpdate(BaseModel):
    status: LeaveStatusEnum
    hr_reason: Optional[str] = None

class LeaveRequestOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    leave_type_id: int
    leave_type_name: str
    days_requested: float
    start_date: Optional[PyDate] = None
    end_date: Optional[PyDate] = None
    status: LeaveStatusEnum
    ai_drafted_reason: Optional[str] = None
    hr_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class HolidayOut(BaseModel):
    id: int
    name: str
    date: PyDate
    holiday_type: str
    day_name: Optional[str] = None
    is_upcoming: Optional[bool] = None

    class Config:
        from_attributes = True

# Meeting Schemas
class MeetingParseRequest(BaseModel):
    raw_input_text: str

class MeetingParseOut(BaseModel):
    employee_name: Optional[str] = None
    matched_employee: Optional[dict] = None
    date: Optional[str] = None
    preferred_period: Optional[str] = "afternoon"
    duration_minutes: int = 30
    subject: Optional[str] = "AI Project Discussion"
    purpose: Optional[str] = None
    raw_input_text: str

class AvailabilitySlot(BaseModel):
    slot_id: str
    start_time: str
    end_time: str
    is_available: bool
    reason: Optional[str] = None

class MeetingCreate(BaseModel):
    subject: str
    attendee_id: Optional[int] = None
    attendee_email: Optional[str] = None
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM AM/PM or HH:MM
    end_time: str
    duration_minutes: int = 30
    timezone: str = "Asia/Kolkata"
    meeting_provider: str = "Microsoft Teams"
    raw_input_text: Optional[str] = None

class MeetingOut(BaseModel):
    id: int
    title: str
    subject: Optional[str] = None
    organizer_id: int
    organizer_name: Optional[str] = None
    attendee_id: Optional[int] = None
    attendee_name: Optional[str] = None
    attendee_email: Optional[str] = None
    date: Optional[PyDate] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration_minutes: int = 30
    timezone: str = "Asia/Kolkata"
    status: str = "scheduled"
    meeting_provider: str = "Microsoft Teams"
    teams_join_url: Optional[str] = None
    meeting_id_code: Optional[str] = None
    passcode: Optional[str] = None
    graph_event_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Ticket Schemas
class TicketCreate(BaseModel):
    description: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None

class TicketStatusUpdate(BaseModel):
    status: TicketStatusEnum
    assigned_to: Optional[int] = None
    resolution_remarks: Optional[str] = None

class TicketOut(BaseModel):
    id: int
    raised_by: int
    raised_by_name: str
    category: str
    severity: TicketSeverityEnum
    description: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_explanation: Optional[str] = None
    resolution_remarks: Optional[str] = None
    status: TicketStatusEnum
    assigned_to: Optional[int] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Payroll & Attendance Schemas
class PayrollOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    base_salary: float
    allowances: float
    deductions: float
    net_pay: float
    pay_period: str
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    login_time: Optional[datetime] = None
    logout_time: Optional[datetime] = None
    date: PyDate

    class Config:
        from_attributes = True

# Chatbot Schema
class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []
    state: Optional[dict] = None
    action_confirmed: Optional[bool] = False
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
