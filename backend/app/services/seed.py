"""Seed database with demo data matching the frontend mockData.

Usage:
    python -m app.services.seed
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.database import Base, SessionLocal, engine
import app.models  # noqa: F401
from app.models import (
    Activity,
    Asset,
    Event,
    LeaveRequest,
    School,
    Sponsor,
    Student,
    SupportTicket,
    SyllabusProgress,
    Teacher,
    TeacherAttendance,
    User,
)
from app.utils.security import hash_password

SEED_PASSWORD = "demo1234"


def ensure_schema() -> None:
    """Create missing tables. Tolerates Supabase pooler checkfirst quirks."""
    from sqlalchemy.exc import ProgrammingError

    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except ProgrammingError as exc:
        # Relation already exists under concurrent/pooler connections
        if "already exists" not in str(exc).lower():
            raise


def clear_all_data(db) -> None:
    """Delete every row from all app tables (keeps schema)."""
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()


def seed_login_users_only() -> None:
    """Wipe all data and insert only login accounts (no schools / domain data)."""
    ensure_schema()
    db = SessionLocal()
    try:
        clear_all_data(db)
        password_hash = hash_password(SEED_PASSWORD)
        users = [
            User(
                id="usr_super_01",
                name="Super Admin",
                email="superadmin@chaitanyasaradhi.org",
                phone="9876543210",
                password_hash=password_hash,
                role="admin",
            ),
            User(
                id="usr_admin_01",
                name="Trust Admin",
                email="admin@chaitanyasaradhi.org",
                phone="9876543211",
                password_hash=password_hash,
                role="admin",
            ),
            User(
                id="usr_teacher_01",
                name="Priya Sharma",
                email="teacher@chaitanyasaradhi.org",
                phone="9876543220",
                password_hash=password_hash,
                role="teacher",
                school_id=None,
            ),
            User(
                id="usr_sponsor_01",
                name="Donor Sponsor",
                email="sponsor@chaitanyasaradhi.org",
                phone="9876543230",
                password_hash=password_hash,
                role="sponsor",
            ),
        ]
        db.add_all(users)
        # Sponsor profile row so sponsor APIs don't break after login
        db.add(
            Sponsor(
                id="usr_sponsor_01",
                name="Donor Sponsor",
                email="sponsor@chaitanyasaradhi.org",
                phone="9876543230",
                organization="",
                address="",
                active=True,
                user_id="usr_sponsor_01",
            )
        )
        db.commit()
        print("Database cleared.")
        print(f"Login-only users created. Password: {SEED_PASSWORD}")
        print("  admin@chaitanyasaradhi.org (admin)")
        print("  teacher@chaitanyasaradhi.org (teacher)")
        print("  sponsor@chaitanyasaradhi.org (sponsor)")
        print("  superadmin@chaitanyasaradhi.org (admin)")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def seed(reset: bool = False) -> None:
    ensure_schema()
    db = SessionLocal()
    try:
        if reset:
            clear_all_data(db)

        if db.query(User).filter(User.email == "admin@chaitanyasaradhi.org").first():
            print("Seed data already present. Use --reset to wipe and reseed.")
            return

        schools = [
            School(
                id="sch_01",
                name="ZPHS Vijayawada East",
                district="NTR",
                mandal="Vijayawada Rural",
                village="Gollapudi",
                principal_name="K. Ramesh",
                contact_number="9876500011",
                student_count=186,
                computer_count=18,
                teacher_count=2,
                status="active",
                syllabus_completion=72,
                sponsor_id="usr_sponsor_01",
            ),
            School(
                id="sch_02",
                name="ZPHS Guntur West",
                district="Guntur",
                mandal="Guntur",
                village="Nallapadu",
                principal_name="S. Lakshmi",
                contact_number="9876500022",
                student_count=142,
                computer_count=12,
                teacher_count=1,
                status="active",
                syllabus_completion=64,
                sponsor_id="usr_sponsor_01",
            ),
            School(
                id="sch_03",
                name="ZPHS Tirupati Central",
                district="Tirupati",
                mandal="Tirupati Urban",
                village="Renigunta",
                principal_name="M. Prasad",
                contact_number="9876500033",
                student_count=210,
                computer_count=20,
                teacher_count=2,
                status="active",
                syllabus_completion=81,
                sponsor_id="usr_sponsor_02",
            ),
            School(
                id="sch_04",
                name="ZPHS Visakhapatnam North",
                district="Visakhapatnam",
                mandal="Gajuwaka",
                village="Pendurthi",
                principal_name="A. Srinivas",
                contact_number="9876500044",
                student_count=168,
                computer_count=16,
                teacher_count=2,
                status="active",
                syllabus_completion=69,
            ),
            School(
                id="sch_05",
                name="ZPHS Kakinada South",
                district="Kakinada",
                mandal="Kakinada Rural",
                village="Turangi",
                principal_name="P. Divya",
                contact_number="9876500055",
                student_count=124,
                computer_count=10,
                teacher_count=1,
                status="active",
                syllabus_completion=58,
            ),
            School(
                id="sch_06",
                name="ZPHS Nellore East",
                district="SPSR Nellore",
                mandal="Nellore Rural",
                village="Buja Buja Nellore",
                principal_name="V. Naidu",
                contact_number="9876500066",
                student_count=195,
                computer_count=15,
                teacher_count=2,
                status="active",
                syllabus_completion=75,
            ),
            School(
                id="sch_07",
                name="ZPHS Anantapur Central",
                district="Anantapur",
                mandal="Anantapur Urban",
                village="Ramnagar",
                principal_name="B. Fatima",
                contact_number="9876500077",
                student_count=150,
                computer_count=14,
                teacher_count=1,
                status="active",
                syllabus_completion=61,
            ),
            School(
                id="sch_08",
                name="ZPHS Kadapa West",
                district="YSR Kadapa",
                mandal="Kadapa",
                village="Chinnachowk",
                principal_name="R. Venkat",
                contact_number="9876500088",
                student_count=138,
                computer_count=11,
                teacher_count=1,
                status="disabled",
                syllabus_completion=42,
            ),
            School(
                id="sch_09",
                name="ZPHS Ongole Rural",
                district="Prakasam",
                mandal="Ongole",
                village="Pernamitta",
                principal_name="N. Kavitha",
                contact_number="9876500099",
                student_count=162,
                computer_count=13,
                teacher_count=2,
                status="active",
                syllabus_completion=70,
            ),
            School(
                id="sch_10",
                name="ZPHS Eluru Town",
                district="Eluru",
                mandal="Eluru",
                village="Sanivarapupeta",
                principal_name="T. Moses",
                contact_number="9876500100",
                student_count=178,
                computer_count=17,
                teacher_count=2,
                status="active",
                syllabus_completion=77,
            ),
            School(
                id="sch_11",
                name="ZPHS Rajahmundry East",
                district="East Godavari",
                mandal="Rajahmundry Rural",
                village="Dowleswaram",
                principal_name="L. Geetha",
                contact_number="9876500111",
                student_count=155,
                computer_count=12,
                teacher_count=1,
                status="active",
                syllabus_completion=66,
            ),
            School(
                id="sch_12",
                name="ZPHS Srikakulam North",
                district="Srikakulam",
                mandal="Srikakulam",
                village="Arasavalli",
                principal_name="G. Harish",
                contact_number="9876500122",
                student_count=119,
                computer_count=9,
                teacher_count=1,
                status="active",
                syllabus_completion=54,
            ),
        ]
        db.add_all(schools)
        db.flush()

        pw = hash_password(SEED_PASSWORD)
        users = [
            User(
                id="usr_super_01",
                name="Super Admin",
                email="superadmin@chaitanyasaradhi.org",
                phone="9876543210",
                password_hash=pw,
                role="admin",
            ),
            User(
                id="usr_admin_01",
                name="Trust Admin",
                email="admin@chaitanyasaradhi.org",
                phone="9876543211",
                password_hash=pw,
                role="admin",
            ),
            User(
                id="usr_teacher_01",
                name="Priya Sharma",
                email="teacher@chaitanyasaradhi.org",
                phone="9876543220",
                password_hash=pw,
                role="teacher",
                school_id="sch_01",
            ),
            User(
                id="usr_teacher_02",
                name="Ravi Kumar",
                email="ravi.kumar@chaitanyasaradhi.org",
                phone="9876543221",
                password_hash=pw,
                role="teacher",
                school_id="sch_02",
            ),
            User(
                id="usr_sponsor_01",
                name="Donor Sponsor",
                email="sponsor@chaitanyasaradhi.org",
                phone="9876543230",
                password_hash=pw,
                role="sponsor",
            ),
            User(
                id="usr_sponsor_02",
                name="Ananya Mehta",
                email="ananya.mehta@example.org",
                phone="9876543231",
                password_hash=pw,
                role="sponsor",
            ),
            User(
                id="usr_sponsor_03",
                name="Vikram Reddy",
                email="vikram.reddy@example.org",
                phone="9876543232",
                password_hash=pw,
                role="sponsor",
            ),
        ]
        db.add_all(users)
        db.flush()

        teachers = [
            Teacher(
                id="tch_01",
                employee_id="EMP-1001",
                name="Priya Sharma",
                mobile="9876543220",
                email="teacher@chaitanyasaradhi.org",
                qualification="B.Sc Computers, B.Ed",
                joining_date="2023-06-12",
                school_id="sch_01",
                assigned_classes=["6", "7", "8"],
                active=True,
                user_id="usr_teacher_01",
            ),
            Teacher(
                id="tch_02",
                employee_id="EMP-1002",
                name="Ravi Kumar",
                mobile="9876543221",
                email="ravi.kumar@chaitanyasaradhi.org",
                qualification="MCA",
                joining_date="2022-08-01",
                school_id="sch_02",
                assigned_classes=["8", "9", "10"],
                active=True,
                user_id="usr_teacher_02",
            ),
        ]
        db.add_all(teachers)
        db.flush()

        sponsors = [
            Sponsor(
                id="usr_sponsor_01",
                name="Donor Sponsor",
                email="sponsor@chaitanyasaradhi.org",
                phone="9876543230",
                organization="Community Impact Foundation",
                address="12 MG Road, Hyderabad, Telangana 500001",
                active=True,
                user_id="usr_sponsor_01",
            ),
            Sponsor(
                id="usr_sponsor_02",
                name="Ananya Mehta",
                email="ananya.mehta@example.org",
                phone="9876543231",
                organization="AP Education Partners",
                address="45 Beach Road, Visakhapatnam, Andhra Pradesh 530003",
                active=True,
                user_id="usr_sponsor_02",
            ),
            Sponsor(
                id="usr_sponsor_03",
                name="Vikram Reddy",
                email="vikram.reddy@example.org",
                phone="9876543232",
                organization="Rural Labs Trust",
                address="8 Temple Street, Guntur, Andhra Pradesh 522001",
                active=True,
                user_id="usr_sponsor_03",
            ),
        ]
        db.add_all(sponsors)
        db.flush()

        # Demo roster for teacher attendance (sch_01 classes 6–8, plus sch_02 sample)
        students = [
            Student(id="stu_01", student_id="STU-601", name="Ananya Reddy", gender="Female", class_grade="6", section="A", parent_name="Venkatesh Reddy", parent_phone="9000001001", school_id="sch_01", status="active"),
            Student(id="stu_02", student_id="STU-602", name="Karthik Rao", gender="Male", class_grade="6", section="A", parent_name="Suresh Rao", parent_phone="9000001002", school_id="sch_01", status="active"),
            Student(id="stu_04", student_id="STU-603", name="Sai Teja", gender="Male", class_grade="6", section="A", parent_name="M. Teja", parent_phone="9000001004", school_id="sch_01", status="active"),
            Student(id="stu_05", student_id="STU-604", name="Divya Sri", gender="Female", class_grade="6", section="A", parent_name="K. Sri", parent_phone="9000001005", school_id="sch_01", status="active"),
            Student(id="stu_06", student_id="STU-605", name="Ramesh Babu", gender="Male", class_grade="6", section="A", parent_name="P. Babu", parent_phone="9000001006", school_id="sch_01", status="active"),
            Student(id="stu_07", student_id="STU-701", name="Lakshmi Priya", gender="Female", class_grade="7", section="A", parent_name="S. Priya", parent_phone="9000001011", school_id="sch_01", status="active"),
            Student(id="stu_08", student_id="STU-702", name="Vikram Singh", gender="Male", class_grade="7", section="A", parent_name="R. Singh", parent_phone="9000001012", school_id="sch_01", status="active"),
            Student(id="stu_09", student_id="STU-703", name="Padma Latha", gender="Female", class_grade="7", section="A", parent_name="N. Latha", parent_phone="9000001013", school_id="sch_01", status="active"),
            Student(id="stu_10", student_id="STU-704", name="Arjun Naidu", gender="Male", class_grade="7", section="A", parent_name="V. Naidu", parent_phone="9000001014", school_id="sch_01", status="active"),
            Student(id="stu_11", student_id="STU-705", name="Sneha Patel", gender="Female", class_grade="7", section="A", parent_name="A. Patel", parent_phone="9000001015", school_id="sch_01", status="active"),
            Student(id="stu_12", student_id="STU-706", name="Rahul Varma", gender="Male", class_grade="7", section="A", parent_name="K. Varma", parent_phone="9000001016", school_id="sch_01", status="active"),
            Student(id="stu_13", student_id="STU-711", name="Kavya Reddy", gender="Female", class_grade="7", section="B", parent_name="B. Reddy", parent_phone="9000001021", school_id="sch_01", status="active"),
            Student(id="stu_14", student_id="STU-712", name="Manoj Kumar", gender="Male", class_grade="7", section="B", parent_name="D. Kumar", parent_phone="9000001022", school_id="sch_01", status="active"),
            Student(id="stu_15", student_id="STU-713", name="Isha Begum", gender="Female", class_grade="7", section="B", parent_name="F. Begum", parent_phone="9000001023", school_id="sch_01", status="active"),
            Student(id="stu_16", student_id="STU-714", name="Harshith Goud", gender="Male", class_grade="7", section="B", parent_name="L. Goud", parent_phone="9000001024", school_id="sch_01", status="active"),
            Student(id="stu_17", student_id="STU-801", name="Meena Devi", gender="Female", class_grade="8", section="A", parent_name="R. Devi", parent_phone="9000001031", school_id="sch_01", status="active"),
            Student(id="stu_18", student_id="STU-802", name="Nikhil Sharma", gender="Male", class_grade="8", section="A", parent_name="P. Sharma", parent_phone="9000001032", school_id="sch_01", status="active"),
            Student(id="stu_19", student_id="STU-803", name="Harika Chowdary", gender="Female", class_grade="8", section="A", parent_name="S. Chowdary", parent_phone="9000001033", school_id="sch_01", status="active"),
            Student(id="stu_20", student_id="STU-804", name="Yashwant Rao", gender="Male", class_grade="8", section="A", parent_name="M. Rao", parent_phone="9000001034", school_id="sch_01", status="active"),
            Student(id="stu_21", student_id="STU-805", name="Bhavana Sri", gender="Female", class_grade="8", section="A", parent_name="T. Sri", parent_phone="9000001035", school_id="sch_01", status="active"),
            Student(id="stu_03", student_id="STU-811", name="Chaitra Nair", gender="Female", class_grade="8", section="B", parent_name="J. Nair", parent_phone="9000001041", school_id="sch_01", status="active"),
            Student(id="stu_22", student_id="STU-812", name="Deepak Reddy", gender="Male", class_grade="8", section="B", parent_name="G. Reddy", parent_phone="9000001042", school_id="sch_01", status="active"),
            Student(id="stu_23", student_id="STU-813", name="Pooja Kumari", gender="Female", class_grade="8", section="B", parent_name="H. Kumari", parent_phone="9000001043", school_id="sch_01", status="active"),
            Student(id="stu_24", student_id="STU-814", name="Siddharth Jain", gender="Male", class_grade="8", section="B", parent_name="R. Jain", parent_phone="9000001044", school_id="sch_01", status="active"),
            Student(id="stu_25", student_id="STU-901", name="Ayesha Khan", gender="Female", class_grade="9", section="A", parent_name="I. Khan", parent_phone="9000001051", school_id="sch_02", status="active"),
            Student(id="stu_26", student_id="STU-902", name="Rohan Das", gender="Male", class_grade="9", section="A", parent_name="S. Das", parent_phone="9000001052", school_id="sch_02", status="active"),
        ]
        db.add_all(students)
        db.flush()

        assets = [
            Asset(
                id="ast_01",
                type="Computer",
                quantity=18,
                working_status="Working",
                purchase_date="2023-04-10",
                warranty="2026-04-10",
                school_id="sch_01",
            ),
            Asset(
                id="ast_02",
                type="UPS",
                quantity=10,
                working_status="Needs Repair",
                purchase_date="2023-04-10",
                warranty="2025-04-10",
                school_id="sch_01",
            ),
            Asset(
                id="ast_03",
                type="Monitor",
                quantity=12,
                working_status="Working",
                purchase_date="2024-01-15",
                warranty="2027-01-15",
                school_id="sch_02",
            ),
        ]
        db.add_all(assets)

        tickets = [
            SupportTicket(
                id="tkt_01",
                type="Hardware",
                status="Open",
                school_id="sch_01",
                raised_by="Priya Sharma",
                description="Two keyboards not responding in lab row 2.",
                created_at=datetime(2026, 8, 2, tzinfo=timezone.utc),
            ),
            SupportTicket(
                id="tkt_02",
                type="Power",
                status="In Progress",
                school_id="sch_02",
                raised_by="Ravi Kumar",
                description="UPS backup failing during periods 3–4.",
                created_at=datetime(2026, 8, 1, tzinfo=timezone.utc),
            ),
            SupportTicket(
                id="tkt_03",
                type="Software",
                status="Resolved",
                school_id="sch_01",
                raised_by="Priya Sharma",
                description="Browser crash fixed after reinstall.",
                created_at=datetime(2026, 7, 28, tzinfo=timezone.utc),
            ),
        ]
        db.add_all(tickets)

        leaves = [
            LeaveRequest(
                id="lv_01",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                type="Casual",
                from_date="2026-08-08",
                to_date="2026-08-09",
                reason="Family function",
                status="Pending",
            ),
            LeaveRequest(
                id="lv_02",
                teacher_id="tch_02",
                teacher_name="Ravi Kumar",
                type="Sick",
                from_date="2026-07-20",
                to_date="2026-07-21",
                reason="Fever",
                status="Approved",
            ),
            LeaveRequest(
                id="lv_03",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                type="Casual",
                from_date="2026-06-12",
                to_date="2026-06-13",
                reason="Personal work",
                status="Approved",
            ),
            LeaveRequest(
                id="lv_04",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                type="Sick",
                from_date="2026-05-05",
                to_date="2026-05-06",
                reason="Viral fever",
                status="Approved",
            ),
            LeaveRequest(
                id="lv_05",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                type="Earned",
                from_date="2026-04-14",
                to_date="2026-04-16",
                reason="Travel home",
                status="Approved",
            ),
            LeaveRequest(
                id="lv_06",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                type="Casual",
                from_date="2026-03-02",
                to_date="2026-03-02",
                reason="Bank appointment",
                status="Rejected",
            ),
            LeaveRequest(
                id="lv_07",
                teacher_id="tch_02",
                teacher_name="Ravi Kumar",
                type="Casual",
                from_date="2026-06-01",
                to_date="2026-06-02",
                reason="Personal",
                status="Approved",
            ),
        ]
        db.add_all(leaves)

        events = [
            Event(
                id="evt_01",
                school_id="sch_01",
                name="Independence Day Tech Showcase",
                date="2026-08-15",
                description="Students demonstrated typing and basic paint tools.",
            ),
            Event(
                id="evt_02",
                school_id="sch_02",
                name="Lab Orientation Day",
                date="2026-07-10",
                description="Orientation for classes 6–8.",
            ),
        ]
        db.add_all(events)

        activities = [
            Activity(id="act_1", text="Priya Sharma clocked in at ZPHS Vijayawada East", time="Today 09:05"),
            Activity(id="act_2", text="Student attendance submitted for Class 7-A", time="Today 10:20"),
            Activity(id="act_3", text="Support ticket TKT-01 opened (Hardware)", time="Yesterday"),
            Activity(id="act_4", text="Syllabus progress updated for Class 8", time="Yesterday"),
        ]
        db.add_all(activities)

        attendance = [
            TeacherAttendance(
                id="ta_01",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                school_id="sch_01",
                school_name="ZPHS Vijayawada East",
                date="2026-08-04",
                clock_in="09:05",
                in_location="16.5062° N, 80.6480° E",
                clock_out="16:40",
                out_location="16.5061° N, 80.6482° E",
                hours="7h 35m",
            ),
            TeacherAttendance(
                id="ta_02",
                teacher_id="tch_02",
                teacher_name="Ravi Kumar",
                school_id="sch_02",
                school_name="ZPHS Guntur West",
                date="2026-08-04",
                clock_in="09:12",
                in_location="16.3067° N, 80.4365° E",
                clock_out="—",
                out_location="—",
                hours="In progress",
            ),
            TeacherAttendance(
                id="ta_03",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                school_id="sch_01",
                school_name="ZPHS Vijayawada East",
                date="2026-08-03",
                clock_in="08:58",
                in_location="16.5062° N, 80.6480° E",
                clock_out="16:35",
                out_location="16.5062° N, 80.6481° E",
                hours="7h 37m",
            ),
            TeacherAttendance(
                id="ta_04",
                teacher_id="tch_02",
                teacher_name="Ravi Kumar",
                school_id="sch_02",
                school_name="ZPHS Guntur West",
                date="2026-08-03",
                clock_in="09:02",
                in_location="16.3067° N, 80.4365° E",
                clock_out="16:50",
                out_location="16.3068° N, 80.4364° E",
                hours="7h 48m",
            ),
            TeacherAttendance(
                id="ta_05",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                school_id="sch_01",
                school_name="ZPHS Vijayawada East",
                date="2026-08-01",
                clock_in="09:10",
                in_location="16.5062° N, 80.6480° E",
                clock_out="16:42",
                out_location="16.5061° N, 80.6480° E",
                hours="7h 32m",
            ),
            TeacherAttendance(
                id="ta_06",
                teacher_id="tch_02",
                teacher_name="Ravi Kumar",
                school_id="sch_02",
                school_name="ZPHS Guntur West",
                date="2026-08-07",
                clock_in="09:00",
                in_location="16.3067° N, 80.4365° E",
                clock_out="16:45",
                out_location="16.3067° N, 80.4366° E",
                hours="7h 45m",
            ),
        ]
        db.add_all(attendance)

        syllabus = [
            SyllabusProgress(
                id="syl_01",
                school_id="sch_01",
                school_name="ZPHS Vijayawada East",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                class_label="7-A",
                subject="Computer Basics",
                topic="MS Paint tools",
                completed_pct=72,
                topics_done=18,
                topics_total=25,
            ),
            SyllabusProgress(
                id="syl_02",
                school_id="sch_01",
                school_name="ZPHS Vijayawada East",
                teacher_id="tch_01",
                teacher_name="Priya Sharma",
                class_label="8-B",
                subject="Office Tools",
                topic="Word formatting",
                completed_pct=81,
                topics_done=22,
                topics_total=27,
            ),
            SyllabusProgress(
                id="syl_03",
                school_id="sch_02",
                school_name="ZPHS Guntur West",
                teacher_id="tch_02",
                teacher_name="Ravi Kumar",
                class_label="9-B",
                subject="Digital Safety",
                topic="Internet safety",
                completed_pct=64,
                topics_done=16,
                topics_total=25,
            ),
            SyllabusProgress(
                id="syl_04",
                school_id="sch_03",
                school_name="ZPHS Tirupati Central",
                teacher_id=None,
                teacher_name="Anitha Devi",
                class_label="6-A",
                subject="Computer Basics",
                topic="Keyboard practice",
                completed_pct=88,
                topics_done=21,
                topics_total=24,
            ),
            SyllabusProgress(
                id="syl_05",
                school_id="sch_04",
                school_name="ZPHS Visakhapatnam North",
                teacher_id=None,
                teacher_name="Suresh Babu",
                class_label="10-C",
                subject="Programming Intro",
                topic="Scratch loops",
                completed_pct=45,
                topics_done=9,
                topics_total=20,
            ),
            SyllabusProgress(
                id="syl_06",
                school_id="sch_05",
                school_name="ZPHS Kakinada South",
                teacher_id=None,
                teacher_name="Lakshmi Rao",
                class_label="7-B",
                subject="Office Tools",
                topic="Excel basics",
                completed_pct=58,
                topics_done=14,
                topics_total=24,
            ),
            SyllabusProgress(
                id="syl_07",
                school_id="sch_06",
                school_name="ZPHS Nellore East",
                teacher_id=None,
                teacher_name="Venkat Rao",
                class_label="8-A",
                subject="Digital Safety",
                topic="Cyber hygiene",
                completed_pct=75,
                topics_done=18,
                topics_total=24,
            ),
            SyllabusProgress(
                id="syl_08",
                school_id="sch_08",
                school_name="ZPHS Kadapa West",
                teacher_id=None,
                teacher_name="Meena Kumari",
                class_label="6-B",
                subject="Computer Basics",
                topic="Parts of a computer",
                completed_pct=42,
                topics_done=8,
                topics_total=19,
            ),
        ]
        db.add_all(syllabus)

        db.commit()
        print("Seed complete.")
        print(f"Demo password for all seed users: {SEED_PASSWORD}")
        print("Accounts: superadmin@ / admin@ / teacher@ / sponsor@chaitanyasaradhi.org")
        print("Also: ravi.kumar@chaitanyasaradhi.org, ananya.mehta@example.org, vikram.reddy@example.org")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    import sys

    if "--clear" in sys.argv or "--logins-only" in sys.argv:
        seed_login_users_only()
        return

    reset = "--reset" in sys.argv
    seed(reset=reset)


if __name__ == "__main__":
    main()
