from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn
import os

from similarity import compute_phash
from grouping import run_grouping

app = FastAPI(title="LenStratify OpenCV Backend")


# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auto-group")
async def auto_group(files: List[UploadFile] = File(...)):
    if not files or len(files) == 0:
        raise HTTPException(status_code=422, detail="No files provided")

    images_data = []

    for file in files:
        is_image_type = file.content_type and file.content_type.startswith("image/")
        is_image_ext = file.filename and file.filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))
        if not is_image_type and not is_image_ext:
            continue
        try:
            content = await file.read()
            # Compute pHash immediately as it is fast
            phash = compute_phash(content)
            images_data.append({
                "filename": file.filename,
                "content": content,
                "phash": phash
            })
        except Exception as e:
            print(f"Error reading file {file.filename}: {e}")
            continue

    if len(images_data) == 0:
        raise HTTPException(status_code=400, detail="No valid images could be read")

    try:
        proposed_groups, ungrouped = run_grouping(images_data)
        return {
            "groups": proposed_groups,
            "ungrouped": ungrouped
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grouping execution error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
