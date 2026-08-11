from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    working_status: Mapped[str] = mapped_column(String(64), nullable=False)
    purchase_date: Mapped[str] = mapped_column(String(32), nullable=False)
    warranty: Mapped[str] = mapped_column(String(32), default="")
    school_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
