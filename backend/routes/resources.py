

# ==========================================
# documents.py
# ==========================================

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import List
from pypdf import PdfReader
import io
from utils.rag_utils import store_document, list_user_documents, delete_user_document

documents_router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentListResponse(BaseModel):
    documents: List[dict]


class DeleteRequest(BaseModel):
    uid: str
    source_name: str


@documents_router.post("/upload")
async def upload_document(
    uid: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Upload a PDF or plain-text file and store its embeddings in Firestore.
    Supported: .pdf, .txt, .md
    """
    filename = file.filename or "document"
    content_bytes = await file.read()

    try:
        # Extract text based on file type
        if filename.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(content_bytes))
            text = "\n\n".join(
                page.extract_text() or "" for page in reader.pages
            ).strip()
        else:
            # Treat as plain text / markdown
            text = content_bytes.decode("utf-8", errors="ignore").strip()

        if not text:
            raise HTTPException(status_code=400, detail="Could not extract any text from the file.")

        chunks_stored = store_document(uid=uid, text=text, source_name=filename)

        return {
            "success": True,
            "message": f"Uploaded '{filename}' and stored {chunks_stored} chunks.",
            "source": filename,
            "chunks": chunks_stored
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@documents_router.get("/{uid}", response_model=DocumentListResponse)
async def get_documents(uid: str):
    """List all documents uploaded by the user."""
    try:
        docs = list_user_documents(uid)
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@documents_router.delete("/")
async def delete_document(request: DeleteRequest):
    """Delete all chunks of a specific document for a user."""
    try:
        deleted = delete_user_document(uid=request.uid, source_name=request.source_name)
        return {
            "success": True,
            "message": f"Deleted {deleted} chunks for '{request.source_name}'."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
