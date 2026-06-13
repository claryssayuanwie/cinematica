# Cinematica

Upload a movie clip. Watch the color palette shift in real time as the video plays.

**Live demo:** [cinematica-xi.vercel.app](https://cinematica-xi.vercel.app)

> The live demo runs on Render's free tier — cold starts can take 50+ seconds and large files may time out. For best results, run locally. Mobile is untested.

---

## Inspiration

I wanted to build a fun computer vision project at the intersection of technology and art, and movie color palettes felt like the perfect subject. There are countless Instagram pages dedicated to film color grading, but they all share the same limitation: static, hand-picked screencaps triggered only on hard cuts. Nothing follows the video in real time, and nothing is mathematically accurate. I wanted to fix that.

---

## How It Works

### Scene Detection: Bhattacharyya Distance on HSV Histograms

Each video frame is converted from RGB to **HSV color space** (Hue, Saturation, Value). HSV separates color from brightness, which more closely mirrors human visual perception than raw RGB.

For each frame, I compute a **color histogram**, a statistical distribution describing the frequency of each hue and saturation value across all pixels. Consecutive frames are then compared using **Bhattacharyya distance**, a measure from information theory that quantifies the divergence between two probability distributions.

When the divergence exceeds a threshold, a scene change is registered. This approach detects both hard cuts and gradual lighting or location shifts within a continuous shot, something most tools miss entirely.

### Color Extraction: K-Means Clustering

For each detected scene, the frame's pixels are treated as points in 3D color space and clustered using **k-means**, an unsupervised machine learning algorithm. The five cluster centroids represent the dominant colors, not a muddy average, but the actual modes of the color distribution.

The key insight: averaging pixel values produces gray noise. Clustering finds the colors that actually appear.

### Frontend Sync

The backend returns a timestamped list of palettes. The React frontend maps the current video timestamp to the corresponding palette entry in real time, creating a live color strip that scrubs with the video.

---

## Setup

### Backend

```bash
cd backend
pip3 install flask flask-cors opencv-python-headless scikit-learn numpy
python3 app.py
```

Runs on `http://localhost:5001`

### Frontend

```bash
cd frontend
npm install
npm start
```

Runs on `http://localhost:3000`

---

## Usage

1. Upload any `.mp4` — movie trailers work best
2. Click **Extract Palette**
3. Watch the video — the color strip below scrubs with playback
4. The side panel shows dominant colors for the current scene
5. Click any scene in the list to jump to it

For the fastest and most reliable experience, run locally. The deployed version works best with short clips under 30MB.

---

## Stack

- **Backend:** Python, Flask, OpenCV, scikit-learn
- **Frontend:** React
- **ML:** K-means clustering (scikit-learn), Bhattacharyya distance (OpenCV)
- **Deployment:** Render (backend), Vercel (frontend)
