import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma

load_dotenv()

# ── Embeddings ────────────────────────────────────────────────────────────────
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
)

# ── Chroma persist directory — lives inside the backend folder ────────────────
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
COLLECTION_NAME = "adaptiq_docs"


def _get_store() -> Chroma:
    """Return (or create) the shared Chroma vector store."""
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ".", " ", ""],
    )
    return splitter.split_text(text)


# ── Public API ─────────────────────────────────────────────────────────────────

def store_document(uid: str, text: str, source_name: str) -> int:
    """
    Embed and persist document chunks in ChromaDB.
    Each chunk is tagged with uid + source in its metadata.
    Returns number of chunks stored.
    """
    chunks = chunk_text(text)
    if not chunks:
        return 0

    metadatas = [{"uid": uid, "source": source_name} for _ in chunks]

    store = _get_store()
    store.add_texts(texts=chunks, metadatas=metadatas)
    return len(chunks)


def search_documents(uid: str, query: str, k: int = 4) -> list[str]:
    """
    Similarity search over the user's documents only.
    Returns a list of formatted text passages.
    """
    store = _get_store()

    results = store.similarity_search(
        query=query,
        k=k,
        filter={"uid": uid},   # Only this user's chunks
    )

    if not results:
        return []

    passages = []
    for doc in results:
        source = doc.metadata.get("source", "unknown")
        passages.append(f"[Source: {source}]\n{doc.page_content}")

    return passages


def list_user_documents(uid: str) -> list[dict]:
    """List all distinct documents a user has uploaded."""
    store = _get_store()

    # Fetch all chunks belonging to this user, then dedupe by source
    results = store.get(where={"uid": uid})
    metadatas = results.get("metadatas", [])

    seen: dict[str, dict] = {}
    for meta in metadatas:
        src = meta.get("source", "unknown")
        if src not in seen:
            seen[src] = {"name": src}

    return list(seen.values())


def delete_user_document(uid: str, source_name: str) -> int:
    """Delete all chunks of a specific document for a user."""
    store = _get_store()

    # Get matching chunk IDs
    results = store.get(where={"uid": uid, "source": source_name})
    ids = results.get("ids", [])

    if ids:
        store.delete(ids=ids)

    return len(ids)
