from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn
import os
import base64

from similarity import compute_phash
from grouping import run_grouping

app = FastAPI(title="LenStratify OpenCV Backend")

@app.get("/api/seed-groups")
async def seed_groups():
    groups_file_path = "/Users/oindrila/Projects/LenStratify/groups.txt"
    if not os.path.exists(groups_file_path):
        groups_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "groups.txt")
    
    if not os.path.exists(groups_file_path):
        raise HTTPException(status_code=404, detail="groups.txt not found")
        
    with open(groups_file_path, "r") as f:
        content = f.read()
        
    lines = [line.strip() for line in content.split("\n")]
    
    groups = []
    current_group = None
    
    base_dir = os.path.dirname(os.path.abspath(groups_file_path))
    
    for line in lines:
        if not line:
            continue
        if line.startswith("Group"):
            current_group = {"name": line, "images": []}
            groups.append(current_group)
        else:
            if current_group is not None:
                # It's an image path
                img_path = os.path.normpath(os.path.join(base_dir, line))
                if os.path.exists(img_path):
                    with open(img_path, "rb") as img_file:
                        encoded = base64.b64encode(img_file.read()).decode("utf-8")
                    filename = os.path.basename(img_path)
                    current_group["images"].append({
                        "filename": filename,
                        "content_b64": encoded,
                        "mime": "image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "image/png"
                    })
    return {"groups": groups}


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
        if not file.content_type.startswith("image/"):
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
