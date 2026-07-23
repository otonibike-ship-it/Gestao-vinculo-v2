import os
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.environ.get("CLOUDINARY_API_KEY", ""),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET", ""),
    secure=True,
)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("")
async def upload_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Tipo de arquivo não permitido: {ext}")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (máx. 10MB)")

    try:
        result = cloudinary.uploader.upload(
            content,
            folder="gestao-vinculo",
            resource_type="auto",
            timeout=30,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no upload: {str(e)}")

    return {"filename": result["public_id"], "url": result["secure_url"]}
