from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Float, Date, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum

class RoleEnum(str, enum.Enum):
    EMPLOYEE = "Employee"
    HR = "HR"
    MANAGER = "Manager"
    ADMIN = "Admin"
    DIRECTOR = "Director"

class EmploymentTypeEnum(str, enum.Enum):
    FULL_TIME = "full-time"
    INTERNSHIP = "internship"

class LeaveStatusEnum(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class TicketStatusEnum(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in-progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketSeverityEnum(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.EMPLOYEE, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    is_profile_completed = Column(Boolean, default=False, server_default="0", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profile = relationship("EmployeeProfile", back_populates="user", uselist=False, foreign_keys="EmployeeProfile.user_id")
    leave_requests = relationship("LeaveRequest", back_populates="user", foreign_keys="LeaveRequest.user_id")
    leave_balances = relationship("LeaveBalance", back_populates="user")
    tickets_raised = relationship("Ticket", back_populates="author", foreign_keys="Ticket.raised_by")
    payroll_records = relationship("Payroll", back_populates="user")
    attendance_records = relationship("Attendance", back_populates="user")


class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    assigned_project = Column(String(255), default="Unassigned")
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    tenure_start_date = Column(Date, nullable=True)
    previous_experience = Column(Text, nullable=True)
    education = Column(String(255), nullable=True)
    domain = Column(String(255), nullable=True)
    employment_type = Column(SQLEnum(EmploymentTypeEnum), default=EmploymentTypeEnum.FULL_TIME)

    user = relationship("User", back_populates="profile", foreign_keys=[user_id])
    manager = relationship("User", foreign_keys=[manager_id])


class LeaveType(Base):
    __tablename__ = "leave_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    default_annual_quota = Column(Integer, default=12)


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=False, index=True)
    remaining_days = Column(Float, default=0.0)
    month_year = Column(String(20), nullable=False)  # e.g., "2026-08"

    user = relationship("User", back_populates="leave_balances")
    leave_type = relationship("LeaveType")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=False, index=True)
    days_requested = Column(Float, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(SQLEnum(LeaveStatusEnum), default=LeaveStatusEnum.PENDING, index=True)
    ai_drafted_reason = Column(Text, nullable=True)
    hr_reason = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="leave_requests", foreign_keys=[user_id])
    leave_type = relationship("LeaveType")
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=True)
    raw_input_text = Column(Text, nullable=True)
    parsed_datetime = Column(DateTime, nullable=False)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    attendee_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    attendee_email = Column(String(255), nullable=True)
    date = Column(Date, nullable=True)
    start_time = Column(String(20), nullable=True)
    end_time = Column(String(20), nullable=True)
    duration_minutes = Column(Integer, default=30)
    timezone = Column(String(50), default="Asia/Kolkata")
    status = Column(String(50), default="scheduled")  # scheduled, cancelled, completed
    meeting_provider = Column(String(50), default="Microsoft Teams")
    teams_join_url = Column(Text, nullable=True)
    graph_event_id = Column(String(255), nullable=True)
    graph_online_meeting_id = Column(String(255), nullable=True)
    participants_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organizer = relationship("User", foreign_keys=[organizer_id])
    attendee = relationship("User", foreign_keys=[attendee_id])


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    raised_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    severity = Column(SQLEnum(TicketSeverityEnum), default=TicketSeverityEnum.MEDIUM, index=True)
    description = Column(Text, nullable=False)
    attachment_url = Column(Text, nullable=True)
    attachment_name = Column(String(255), nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    resolution_remarks = Column(Text, nullable=True)
    status = Column(SQLEnum(TicketStatusEnum), default=TicketStatusEnum.OPEN, index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    author = relationship("User", back_populates="tickets_raised", foreign_keys=[raised_by])
    assignee = relationship("User", foreign_keys=[assigned_to])


class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    base_salary = Column(Float, nullable=False)
    allowances = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    net_pay = Column(Float, nullable=False)
    pay_period = Column(String(50), nullable=False) # e.g. "August 2026"
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="payroll_records")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    login_time = Column(DateTime, nullable=True)
    logout_time = Column(DateTime, nullable=True)
    date = Column(Date, nullable=False, index=True)

    user = relationship("User", back_populates="attendance_records")


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    date = Column(Date, nullable=False, index=True)
    holiday_type = Column(String(50), default="Public Holiday")

