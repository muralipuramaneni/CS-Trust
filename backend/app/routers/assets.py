from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_school_ids, assert_school_access, require_admin, require_any_auth
from app.models import Asset, User
from app.schemas.asset import AssetCreate, AssetOut, AssetUpdate
from app.utils.ids import next_sequential_id

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=list[AssetOut])
def list_assets(
    school_id: str | None = Query(None, alias="schoolId"),
    db: Session = Depends(get_db),
    user: User = Depends(require_any_auth),
):
    q = db.query(Asset)
    allowed = accessible_school_ids(db, user)
    if allowed is not None:
        q = q.filter(Asset.school_id.in_(allowed or ["__none__"]))
    if school_id:
        q = q.filter(Asset.school_id == school_id)
    return q.order_by(Asset.type).all()


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: str, db: Session = Depends(get_db), user: User = Depends(require_any_auth)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    assert_school_access(db, user, asset.school_id)
    return asset


@router.post("", response_model=AssetOut, status_code=201)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    asset = Asset(id=next_sequential_id(db, Asset, "ast"), **payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: str,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
