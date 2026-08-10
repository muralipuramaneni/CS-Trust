from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin, require_any_auth
from app.models import School, Sponsor, User
from app.schemas.sponsor import SponsorCreate, SponsorCreateResponse, SponsorOut, SponsorUpdate
from app.services.auth import create_sponsor_with_user, sponsor_school_ids

router = APIRouter(prefix="/sponsors", tags=["sponsors"])


def _sponsor_out(db: Session, sponsor: Sponsor) -> SponsorOut:
    return SponsorOut(
        id=sponsor.id,
        name=sponsor.name,
        email=sponsor.email,
        phone=sponsor.phone,
        organization=sponsor.organization,
        address=sponsor.address,
        active=sponsor.active,
        user_id=sponsor.user_id,
        school_ids=sponsor_school_ids(db, sponsor.id),
    )


@router.get("", response_model=list[SponsorOut])
def list_sponsors(db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    if user.role == "sponsor":
        sponsor = db.query(Sponsor).filter(Sponsor.id == user.id).first()
        return [_sponsor_out(db, sponsor)] if sponsor else []
    return [_sponsor_out(db, s) for s in db.query(Sponsor).order_by(Sponsor.name).all()]


@router.get("/{sponsor_id}", response_model=SponsorOut)
def get_sponsor(sponsor_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    if user.role == "sponsor" and user.id != sponsor_id:
        raise HTTPException(status_code=403, detail="Access denied")
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    return _sponsor_out(db, sponsor)


@router.post("", response_model=SponsorCreateResponse, status_code=201)
def create_sponsor(payload: SponsorCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    data = payload.model_dump()
    password = data.pop("password", None)
    sponsor, temp_password = create_sponsor_with_user(db, data, password)
    return SponsorCreateResponse(sponsor=_sponsor_out(db, sponsor), temp_password=temp_password)


@router.patch("/{sponsor_id}", response_model=SponsorOut)
def update_sponsor(
    sponsor_id: str,
    payload: SponsorUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    updates = payload.model_dump(exclude_unset=True)
    school_ids = updates.pop("school_ids", None)
    for key, value in updates.items():
        setattr(sponsor, key, value)
    if sponsor.user_id and any(k in updates for k in ("name", "email", "phone")):
        linked = db.query(User).filter(User.id == sponsor.user_id).first()
        if linked:
            if "name" in updates:
                linked.name = updates["name"]
            if "email" in updates:
                linked.email = updates["email"]
            if "phone" in updates:
                linked.phone = updates["phone"]
    if school_ids is not None:
        db.query(School).filter(School.sponsor_id == sponsor.id).update(
            {School.sponsor_id: None}, synchronize_session=False
        )
        if school_ids:
            db.query(School).filter(School.id.in_(school_ids)).update(
                {School.sponsor_id: sponsor.id}, synchronize_session=False
            )
    db.commit()
    db.refresh(sponsor)
    return _sponsor_out(db, sponsor)


@router.post("/{sponsor_id}/reset-password")
def reset_sponsor_password(
    sponsor_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    from app.services.auth import set_temporary_password

    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    if not sponsor.user_id:
        raise HTTPException(status_code=400, detail="Sponsor has no login account")
    linked = db.query(User).filter(User.id == sponsor.user_id).first()
    if not linked:
        raise HTTPException(status_code=400, detail="Sponsor login account not found")
    temp_password = set_temporary_password(db, linked)
    return {"tempPassword": temp_password}


@router.delete("/{sponsor_id}", status_code=204)
def delete_sponsor(sponsor_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    db.query(School).filter(School.sponsor_id == sponsor.id).update(
        {School.sponsor_id: None}, synchronize_session=False
    )
    user_id = sponsor.user_id
    db.delete(sponsor)
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)
    db.commit()
