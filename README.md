# LenStratify

> *See through the layers.*

LenStratify is a premium, offline-first web application designed for photographers, designers, and AI/ML practitioners to compare, organize, and track changes across multiple versions of an image in high fidelity.

---

## Key Features

- **📂 Auto-Seeding**: Automatically seeds and initializes the browser database with sample groups specified in `groups.txt` on first launch via a local FastAPI sidecar.
- **💾 IndexedDB Offline Persistence**: Stores full-res image binary Blobs, client-side generated thumbnails, and metadata locally in the browser using Dexie.js (IndexedDB wrapper).
- **🔍 Synchronized Comparison Modes**:
  - **Single**: Full viewport view with arrow-key keyboard navigation and crossfade transitions.
  - **A/B Slide**: A viewport scrubber/slider to compare two versions, with support for synchronized zoom and pan.
  - **2-Up (Side-by-Side)**: Displays two versions side by side with fully synchronized pan and zoom.
  - **Grid**: Displays a responsive grid of all versions simultaneously.
- **📐 Pixel-Perfect Dimension Alignment**: Automatically scans all versions in a group to find the largest image dimensions, then upscales smaller images to match without cropping, ensuring flawless comparison alignments.
- **🎞️ Direct Filmstrip Management**: Add new image versions or delete existing versions directly from the comparison viewer's bottom filmstrip.
- **🧠 Auto-Grouping (AI/CV)**: Connects to a FastAPI + OpenCV + ImageHash backend to cluster large batches of uploaded images into version sequences automatically based on perceptual hashing (pHash), structural similarity (SSIM), and ORB keypoint matching.
- **📦 Import/Export**: Package and export entire version groups as standard ZIP files containing a `manifest.json` file, allowing you to share comparisons across devices.

---

## Tech Stack

| Layer | Choice |
|---|---|
| **UI Framework** | React 19 + Vite |
| **Persistence** | Dexie.js (IndexedDB wrapper) |
| **Styling** | Tailwind CSS v3 (Dark-mode first) |
| **Icons** | Lucide React |
| **Backend** | FastAPI (Python 3.12) |
| **CV Library** | OpenCV-Python + ImageHash |

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.11+) and [uv](https://github.com/astral-sh/uv)

### Setup & Installation

1. **Clone and Navigate**:
   ```bash
   cd LenStratify
   ```

2. **Run Dev Servers (Combined)**:
   The frontend project contains a helper utility to launch both the FastAPI backend and the Vite frontend simultaneously.
   ```bash
   cd frontend
   # Install frontend dependencies
   npm install
   
   # Run Vite frontend and FastAPI backend together
   npm run dev
   ```

   - Vite Frontend will run on: `http://localhost:5173/` (or `http://localhost:5174/` if 5173 is in use)
   - FastAPI Backend will run on: `http://localhost:8000/`

3. **Database Seeding**:
   On your first visit, the frontend will call the backend `/api/seed-groups` endpoint to parse `groups.txt` and automatically load the default comparison groups into your local browser database.