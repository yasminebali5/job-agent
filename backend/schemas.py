from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class SignUpRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=200)


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeOut(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=1, max_length=254)
    description: Optional[str] = None
    resume_id: Optional[int] = None


class CompanyApply(BaseModel):
    resume_id: Optional[int] = None


class CompanyOut(BaseModel):
    id: int
    name: str
    email: str
    description: Optional[str] = None
    applied: bool
    applied_at: Optional[datetime] = None
    resume_id: Optional[int] = None
    resume_filename: Optional[str] = None
    created_at: datetime
