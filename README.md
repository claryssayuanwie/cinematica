# cinematica

upload a movie clip. watch the color palette shift in real time as the video plays.

---

## setup

### backend

```bash
cd backend
pip3 install flask flask-cors opencv-python-headless scikit-learn numpy
python app.py
```

runs on `http://localhost:5001`

### frontend

```bash
cd frontend
npm install
npm start
```

runs on `http://localhost:3000`

---

## how it works

1. upload any `.mp4` — trailers work great
2. click **extract palette**
3. watch the video — the color strip below scrubs with it
4. the side panel shows the dominant colors for the current scene
5. click any scene in the list to jump to it

**scene detection** uses color histogram comparison (Bhattacharyya distance) — so it catches both hard cuts and lighting/location shifts within a continuous shot.

**color extraction** uses k-means clustering on frame pixels to find the 5 most dominant colors per scene.

---

## stack

- python: flask, opencv, scikit-learn
- frontend: react
- no external APIs, runs fully local
