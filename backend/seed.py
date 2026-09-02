import sys
from pathlib import Path
from datetime import datetime, date, timedelta

from config import settings
from database import engine, Base, SessionLocal
import models, auth

def seed_database(drop_existing=False):
    print("[Seed] Initializing Innowell HRMS database tables...")
    if drop_existing:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("[Seed] Checking existing seed data...")
        
        # 1. Seed Leave Types (Retaining only General Leave: 12, Sick Leave: 12, Maternity Leave: 90, Leave Without Pay: 0)
        leave_types_data = [
            {"name": "General Leave", "code": "GL", "default_annual_quota": 12},
            {"name": "Sick Leave", "code": "SL", "default_annual_quota": 12},
            {"name": "Maternity Leave", "code": "ML", "default_annual_quota": 90},
            {"name": "Leave Without Pay", "code": "LWP", "default_annual_quota": 0},
        ]

        # Clean up obsolete leave types if present
        obsolete_codes = ["EL", "FL", "PH", "MYS", "PL"]
        for obs_code in obsolete_codes:
            obs_lt = db.query(models.LeaveType).filter(models.LeaveType.code == obs_code).first()
            if obs_lt:
                db.query(models.LeaveBalance).filter(models.LeaveBalance.leave_type_id == obs_lt.id).delete()
                db.query(models.LeaveRequest).filter(models.LeaveRequest.leave_type_id == obs_lt.id).delete()
                db.delete(obs_lt)
        db.commit()

        for lt_data in leave_types_data:
            existing = db.query(models.LeaveType).filter(models.LeaveType.code == lt_data["code"]).first()
            if not existing:
                lt = models.LeaveType(**lt_data)
                db.add(lt)
            else:
                existing.default_annual_quota = lt_data["default_annual_quota"]
                # Update existing leave balances for this leave type to new quota
                db.query(models.LeaveBalance).filter(models.LeaveBalance.leave_type_id == existing.id).update(
                    {models.LeaveBalance.remaining_days: float(lt_data["default_annual_quota"])}
                )
        db.commit()

        # 2. Seed Innowell Leadership & Employee Accounts
        # Designated Approvers (Authorized to grant Midfit credentials & all approvals):
        # 1. Kannan@innowell.com (Manager)
        # 2. Leninkumar@innowell.com (HR)
        # 3. Shanthi@innowell.com (Admin)
        # Employees: Ravi, Teja, Priya, Suchi
        users_data = [
            {
                "name": "Shanthireddaiah Nimmakayala",
                "email": "Shanthi@innowell.com",
                "password": "Shanthi@123",
                "role": models.RoleEnum.ADMIN,
                "phone": "+91 80 6657 1001",
                "address": "Innowell Global HQ, Bangalore, India",
                "project": "Innowell Core Infrastructure",
                "domain": "Administration & Security",
                "type": models.EmploymentTypeEnum.FULL_TIME
            },
            {
                "name": "Leninkumar",
                "email": "Leninkumar@innowell.com",
                "password": "Lenin@123",
                "role": models.RoleEnum.DIRECTOR,
                "phone": "+91 80 6657 1000",
                "address": "Innowell Global HQ, Bengaluru, India",
                "project": "Executive Strategy & Leadership",
                "domain": "Executive Management / Director",
                "type": models.EmploymentTypeEnum.FULL_TIME
            },
            {
                "name": "Janani",
                "email": "Janani@innowell.com",
                "password": "Janani@123",
                "role": models.RoleEnum.HR,
                "phone": "+91 80 6657 1005",
                "address": "Innowell Tech Park, Bengaluru, India",
                "project": "Global Human Resources",
                "domain": "People Operations",
                "type": models.EmploymentTypeEnum.FULL_TIME
            },
            {
                "name": "Kannan",
                "email": "Kannan@innowell.com",
                "password": "Kannan@123",
                "role": models.RoleEnum.MANAGER,
                "phone": "+91 80 6657 1002",
                "address": "Innowell Innovation Campus, Bengaluru",
                "project": "Innowell Mobility & AI Platform",
                "domain": "Software Engineering",
                "type": models.EmploymentTypeEnum.FULL_TIME
            },
            {
                "name": "Ravi Kumar",
                "email": "ravi@innowell.com",
                "password": "Employee123!",
                "role": models.RoleEnum.EMPLOYEE,
                "phone": "+91 98765 11001",
                "address": "Indiranagar, Bengaluru",
                "project": "Innowell Mobility Cloud Platform",
                "domain": "Software Engineering",
                "type": models.EmploymentTypeEnum.FULL_TIME
            },
            {
                "name": "Teja Reddy",
                "email": "teja@innowell.com",
                "password": "Employee123!",
                "role": models.RoleEnum.EMPLOYEE,
                "phone": "+91 98765 11002",
                "address": "Whitefield, Bengaluru",
                "project": "Innowell Mobility Cloud Platform",
                "domain": "Software Engineering",
                "type": models.EmploymentTypeEnum.FULL_TIME
            },
            {
                "name": "Priya Sharma",
                "email": "priya@innowell.com",
                "password": "Employee123!",
                "role": models.RoleEnum.EMPLOYEE,
                "phone": "+91 98765 11003",
                "address": "Koramangala, Bengaluru",
                "project": "Innowell Autonomous AI",
                "domain": "Artificial Intelligence",
                "type": models.EmploymentTypeEnum.FULL_TIME
            },
            {
                "name": "Suchitra Suchi",
                "email": "suchi@innowell.com",
                "password": "Employee123!",
                "role": models.RoleEnum.EMPLOYEE,
                "phone": "+91 98765 11004",
                "address": "HSR Layout, Bengaluru",
                "project": "Innowell Cloud DevOps",
                "domain": "DevSecOps & Platform",
                "type": models.EmploymentTypeEnum.FULL_TIME
            }
        ]

        created_users = {}
        for udata in users_data:
            u = db.query(models.User).filter(models.User.email.ilike(udata["email"])).first()
            if not u:
                u = models.User(
                    name=udata["name"],
                    email=udata["email"],
                    password_hash=auth.get_password_hash(udata["password"]),
                    role=udata["role"],
                    phone=udata["phone"],
                    address=udata["address"]
                )
                db.add(u)
                db.commit()
                db.refresh(u)

                prof = models.EmployeeProfile(
                    user_id=u.id,
                    assigned_project=udata["project"],
                    tenure_start_date=date(2023, 1, 15),
                    previous_experience="5+ years in Enterprise Software & Cloud",
                    education="B.Tech in Computer Science / AI",
                    domain=udata["domain"],
                    employment_type=udata["type"]
                )
                db.add(prof)
                db.commit()
            else:
                u.name = udata["name"]
                u.email = udata["email"]
                u.password_hash = auth.get_password_hash(udata["password"])
                u.role = udata["role"]
                db.commit()
                db.refresh(u)
                
                prof = db.query(models.EmployeeProfile).filter(models.EmployeeProfile.user_id == u.id).first()
                if prof:
                    prof.assigned_project = udata["project"]
                    prof.domain = udata["domain"]
                    prof.employment_type = udata["type"]
                    db.commit()
            created_users[udata["email"].lower()] = u

        # Link Manager (Kannan) to Employees
        mgr = created_users.get("kannan@innowell.com")
        if mgr:
            for emp_email in ["ravi@innowell.com", "teja@innowell.com", "priya@innowell.com", "suchi@innowell.com"]:
                emp_u = created_users.get(emp_email)
                if emp_u:
                    p = db.query(models.EmployeeProfile).filter(models.EmployeeProfile.user_id == emp_u.id).first()
                    if p:
                        p.manager_id = mgr.id
                        db.commit()

        # 3. Seed Leave Balances for all users
        ltypes = db.query(models.LeaveType).all()
        curr_month = datetime.utcnow().strftime("%Y-%m")
        for u in created_users.values():
            for lt in ltypes:
                existing_lb = db.query(models.LeaveBalance).filter(
                    models.LeaveBalance.user_id == u.id,
                    models.LeaveBalance.leave_type_id == lt.id
                ).first()
                if not existing_lb:
                    lb = models.LeaveBalance(
                        user_id=u.id,
                        leave_type_id=lt.id,
                        remaining_days=float(lt.default_annual_quota),
                        month_year=curr_month
                    )
                    db.add(lb)
        db.commit()

        # 4. Seed Sample Leave Requests
        emp_u = created_users.get("ravi@innowell.com")
        el_type = db.query(models.LeaveType).filter(models.LeaveType.code == "EL").first()
        gl_type = db.query(models.LeaveType).filter(models.LeaveType.code == "GL").first()
        hr_u = created_users.get("leninkumar@innowell.com")

        if emp_u and el_type:
            req1 = db.query(models.LeaveRequest).filter(models.LeaveRequest.user_id == emp_u.id).first()
            if not req1:
                r1 = models.LeaveRequest(
                    user_id=emp_u.id,
                    leave_type_id=el_type.id,
                    days_requested=2.0,
                    start_date=date.today() + timedelta(days=5),
                    end_date=date.today() + timedelta(days=6),
                    status=models.LeaveStatusEnum.APPROVED,
                    ai_drafted_reason="Hi Leninkumar, Requesting 2 day(s) for Earned Leave. Project deliverables and handovers synchronized with team.",
                    hr_reason="Approved. Ensure code reviews are completed prior to proceeding.",
                    reviewed_by=hr_u.id if hr_u else None
                )
                r2 = models.LeaveRequest(
                    user_id=emp_u.id,
                    leave_type_id=gl_type.id if gl_type else el_type.id,
                    days_requested=1.0,
                    start_date=date.today() + timedelta(days=12),
                    end_date=date.today() + timedelta(days=12),
                    status=models.LeaveStatusEnum.PENDING,
                    ai_drafted_reason="Hi Leninkumar, Requesting 1 day(s) for General Leave for personal wellness. Sprint coverage arranged with Teja.",
                    hr_reason=None
                )
                db.add_all([r1, r2])
                db.commit()

        # 5. Seed Meetings
        if emp_u:
            m1 = db.query(models.Meeting).first()
            if not m1:
                target_d = date.today() + timedelta(days=2)
                mtg1 = models.Meeting(
                    title="Innowell Architecture & AI Platform Sync",
                    subject="Innowell Architecture & AI Platform Sync",
                    raw_input_text="Meet with Kannan on Tuesday 2 PM for 30 mins",
                    parsed_datetime=datetime.combine(target_d, datetime.strptime("14:00", "%H:%M").time()),
                    organizer_id=emp_u.id,
                    attendee_id=mgr.id if mgr else emp_u.id,
                    attendee_email="Kannan@innowell.com",
                    date=target_d,
                    start_time="02:00 PM",
                    end_time="02:30 PM",
                    duration_minutes=30,
                    timezone="Asia/Kolkata",
                    status="scheduled",
                    meeting_provider="Microsoft Teams",
                    teams_join_url="https://teams.microsoft.com/l/meetup-join/19%3ameeting_demo_architecture%40thread.v2/0?context=%7b%22Tid%22%3a%22innowell-hrms-tenant%22%7d",
                    graph_event_id="graph-event-innowell-001"
                )
                mtg2 = models.Meeting(
                    title="Q3 Mobility Platform Sprint Review",
                    subject="Q3 Mobility Platform Sprint Review",
                    raw_input_text="Sprint review on Friday 10 AM",
                    parsed_datetime=datetime.combine(target_d + timedelta(days=3), datetime.strptime("10:00", "%H:%M").time()),
                    organizer_id=emp_u.id,
                    attendee_id=hr_u.id if hr_u else emp_u.id,
                    attendee_email="Leninkumar@innowell.com",
                    date=target_d + timedelta(days=3),
                    start_time="10:00 AM",
                    end_time="11:00 AM",
                    duration_minutes=60,
                    timezone="Asia/Kolkata",
                    status="scheduled",
                    meeting_provider="Microsoft Teams",
                    teams_join_url="https://teams.microsoft.com/l/meetup-join/19%3ameeting_demo_sprint%40thread.v2/0?context=%7b%22Tid%22%3a%22innowell-hrms-tenant%22%7d",
                    graph_event_id="graph-event-innowell-002"
                )
                db.add_all([mtg1, mtg2])
                db.commit()

        # 6. Seed Intelligent Tickets (including Midfit credential request)
        if emp_u:
            t1 = db.query(models.Ticket).first()
            if not t1:
                tk1 = models.Ticket(
                    raised_by=emp_u.id,
                    category="Software & Tools",
                    severity=models.TicketSeverityEnum.HIGH,
                    description="Requesting Midfit platform access credentials and enterprise environment tokens for automated testing.",
                    ai_summary="Midfit tool access and credentials provisioning request.",
                    ai_explanation="AI Diagnosis: Midfit credentials authorization request. Authorized Approvers: Kannan (Manager), Leninkumar (HR), or Shanthi (Admin). Recommended Action: 1. Verify user role & project assignment. 2. Issue Midfit developer credentials token.",
                    resolution_remarks="Midfit developer credentials provisioned and sent securely to user by Kannan.",
                    status=models.TicketStatusEnum.RESOLVED,
                    assigned_to=mgr.id if mgr else None
                )
                tk2 = models.Ticket(
                    raised_by=emp_u.id,
                    category="IT Support",
                    severity=models.TicketSeverityEnum.MEDIUM,
                    description="Innowell GlobalProtect VPN connection drops when connecting to internal build server cluster.",
                    ai_summary="Medium severity VPN network stability issue impacting build server connectivity.",
                    ai_explanation="AI Diagnosis: Frequent VPN dropouts occur due to idle session timeout mismatch. Recommended Fix: 1. Verify user credentials. 2. Update MTU size. 3. Re-install Innowell SSL certificate bundle.",
                    resolution_remarks=None,
                    status=models.TicketStatusEnum.OPEN,
                    assigned_to=hr_u.id if hr_u else None
                )
                db.add_all([tk1, tk2])
                db.commit()

        # 7. Seed Payroll Records
        for u in created_users.values():
            p_rec = db.query(models.Payroll).filter(models.Payroll.user_id == u.id).first()
            if not p_rec:
                base = 95000.0 if u.role == models.RoleEnum.EMPLOYEE else 145000.0
                pr = models.Payroll(
                    user_id=u.id,
                    base_salary=base,
                    allowances=12500.0,
                    deductions=8200.0,
                    net_pay=base + 12500.0 - 8200.0,
                    pay_period="August 2026"
                )
                db.add(pr)
        db.commit()

        # 8. Seed Attendance Records
        today = date.today()
        for u in created_users.values():
            for i in range(5):
                att_date = today - timedelta(days=i)
                att_rec = db.query(models.Attendance).filter(
                    models.Attendance.user_id == u.id,
                    models.Attendance.date == att_date
                ).first()
                if not att_rec:
                    login_t = datetime.combine(att_date, datetime.min.time()) + timedelta(hours=9, minutes=15)
                    logout_t = datetime.combine(att_date, datetime.min.time()) + timedelta(hours=18, minutes=30)
                    ar = models.Attendance(
                        user_id=u.id,
                        login_time=login_t,
                        logout_time=logout_t,
                        date=att_date
                    )
                    db.add(ar)
        db.commit()

        # 9. Seed Official Holidays (2026 Calendar)
        holidays_data = [
            {"name": "New Year's Day", "date": date(2026, 1, 1), "holiday_type": "Public Holiday"},
            {"name": "Republic Day", "date": date(2026, 1, 26), "holiday_type": "National Gazetted Holiday"},
            {"name": "Independence Day", "date": date(2026, 8, 15), "holiday_type": "National Gazetted Holiday"},
            {"name": "Ganesh Chaturthi", "date": date(2026, 9, 14), "holiday_type": "Festival Holiday"},
            {"name": "Gandhi Jayanti", "date": date(2026, 10, 2), "holiday_type": "National Gazetted Holiday"},
            {"name": "Ayudha Pooja / Durga Pooja", "date": date(2026, 10, 19), "holiday_type": "Festival Holiday"},
            {"name": "Dussehra (Vijayadashami)", "date": date(2026, 10, 20), "holiday_type": "Gazetted Festival Holiday"},
            {"name": "Kannada Rajyotsava", "date": date(2026, 11, 1), "holiday_type": "State / Public Holiday"},
            {"name": "Diwali (Deepavali)", "date": date(2026, 11, 8), "holiday_type": "Gazetted Festival Holiday"},
            {"name": "Guru Nanak Jayanti", "date": date(2026, 11, 24), "holiday_type": "Gazetted Holiday"},
            {"name": "Christmas Day", "date": date(2026, 12, 25), "holiday_type": "Gazetted Holiday"},
        ]
        
        # Clear existing holidays to ensure clean sync
        db.query(models.Holiday).delete()
        for h_data in holidays_data:
            h_obj = models.Holiday(**h_data)
            db.add(h_obj)
        db.commit()

        print("\n" + "="*75)
        print(" [SEED COMPLETE] Successfully seeded Innowell Technologies Agentic HRMS database!")
        print(" Authorized Approvers (Can grant Midfit & tool credentials):")
        print(" 1. Admin Approver:   Shanthi@innowell.com    | Password: Shanthi@123")
        print(" 2. HR Approvers:     Janani@innowell.com     | Password: Janani@123")
        print("                      Leninkumar@innowell.com | Password: Lenin@123")
        print(" 3. Manager Approver: Kannan@innowell.com     | Password: Kannan@123")
        print("\n Demo Employees (Password: Employee123!):")
        print(" - Ravi:  ravi@innowell.com")
        print(" - Teja:  teja@innowell.com")
        print(" - Priya: priya@innowell.com")
        print(" - Suchi: suchi@innowell.com")
        print("="*75 + "\n")

    except Exception as e:
        print(f"[Seed Error] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
