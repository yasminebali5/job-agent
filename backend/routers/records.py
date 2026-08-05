import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Company, Resume, User
from ..schemas import CompanyApply, CompanyCreate, CompanyOut, ResumeOut

router = APIRouter(tags=["records"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "resumes"
ALLOWED_RESUME_EXT = {".pdf", ".doc", ".docx"}


def company_to_out(company: Company) -> CompanyOut:
    return CompanyOut(
        id=company.id,
        name=company.name,
        email=company.email,
        description=company.description,
        applied=company.applied,
        applied_at=company.applied_at,
        resume_id=company.resume_id,
        resume_filename=company.resume.filename if company.resume else None,
        created_at=company.created_at,
    )


@router.post("/resumes", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_RESUME_EXT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF, DOC, or DOCX files are allowed")

    user_dir = UPLOAD_DIR / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = user_dir / stored_name
    content = await file.read()
    dest.write_bytes(content)

    resume = Resume(user_id=current_user.id, filename=file.filename, stored_path=str(dest))
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("/resumes", response_model=list[ResumeOut])
def list_resumes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.uploaded_at.desc())
        .all()
    )


@router.get("/resumes/{resume_id}/download")
def download_resume(resume_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume or not Path(resume.stored_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return FileResponse(resume.stored_path, filename=resume.filename)


@router.delete("/resumes/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(resume_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    db.query(Company).filter(Company.resume_id == resume.id).update({"resume_id": None})
    try:
        Path(resume.stored_path).unlink(missing_ok=True)
    except OSError:
        pass
    db.delete(resume)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/companies", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = None
    if payload.resume_id is not None:
        resume = db.query(Resume).filter(Resume.id == payload.resume_id, Resume.user_id == current_user.id).first()
        if not resume:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume")

    company = Company(
        user_id=current_user.id,
        name=payload.name.strip(),
        email=payload.email.strip(),
        description=(payload.description or "").strip() or None,
        resume_id=resume.id if resume else None,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company_to_out(company)


@router.get("/companies", response_model=list[CompanyOut])
def list_companies(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    companies = (
        db.query(Company)
        .filter(Company.user_id == current_user.id)
        .order_by(Company.created_at.desc())
        .all()
    )
    return [company_to_out(c) for c in companies]


@router.patch("/companies/{company_id}/apply", response_model=CompanyOut)
def mark_company_applied(
    company_id: int,
    payload: CompanyApply,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id, Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if payload.resume_id is not None:
        resume = db.query(Resume).filter(Resume.id == payload.resume_id, Resume.user_id == current_user.id).first()
        if not resume:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resume")
        company.resume_id = resume.id

    company.applied = True
    company.applied_at = datetime.utcnow()
    db.commit()
    db.refresh(company)
    return company_to_out(company)


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id, Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    db.delete(company)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
