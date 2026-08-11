from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_teacher_for_user, require_admin, require_admin_or_teacher, require_any_auth
from app.models import LeaveRequest, User
from app.schemas.leave import LeaveCreate, LeaveOut, LeaveUpdate
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/leaves", tags=["leaves"])


@router.get("", response_model=list[LeaveOut])
def list_leaves(
    teacher_id: str | None = Query(None, alias="teacherId"),
    status: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(LeaveRequest)
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if teacher:
            q = q.filter(LeaveRequest.teacher_id == teacher.id)
    elif teacher_id:
        q = q.filter(LeaveRequest.teacher_id == teacher_id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    return q.order_by(LeaveRequest.from_date.desc()).all()


@router.get("/{leave_id}", response_model=LeaveOut)
def get_leave(leave_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if not teacher or leave.teacher_id != teacher.id:
            raise HTTPException(status_code=403, detail="Access denied")
    return leave


@router.post("", response_model=LeaveOut, status_code=201)
def create_leave(
    payload: LeaveCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    data = payload.model_dump()
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if not teacher:
            raise HTTPException(status_code=400, detail="Teacher profile not found")
        data["teacher_id"] = teacher.id
        data["teacher_name"] = teacher.name
        data["status"] = "Pending"
    leave = LeaveRequest(id=next_sequential_id(db, LeaveRequest, "lv"), **data)
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


@router.patch("/{leave_id}", response_model=LeaveOut)
def update_leave(
    leave_id: str,
    payload: LeaveUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin_or_teacher),
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    updates = payload.model_dump(exclude_unset=True)
    if user.role == "teacher":
        teacher = get_teacher_for_user(db, user)
        if not teacher or leave.teacher_id != teacher.id:
            raise HTTPException(status_code=403, detail="Access denied")
        updates.pop("status", None)
    for key, value in updates.items():
        setattr(leave, key, value)
    db.commit()
    db.refresh(leave)
    return leave


@router.delete("/{leave_id}", status_code=204)
def delete_leave(leave_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    db.delete(leave)
    db.commit()
