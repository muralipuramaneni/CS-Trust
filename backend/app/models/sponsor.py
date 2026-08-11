from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Sponsor(Base):
    __tablename__ = "sponsors"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    organization: Mapped[str] = mapped_column(String(255), default="")
    address: Mapped[str] = mapped_column(String(512), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    user_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="sponsor_profile", foreign_keys=[user_id])
