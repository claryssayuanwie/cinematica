import os
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sklearn.cluster import KMeans
import tempfile
import json

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = tempfile.mkdtemp()

def rgb_to_hex(rgb):
    return '#{:02x}{:02x}{:02x}'.format(int(rgb[0]), int(rgb[1]), int(rgb[2]))

def extract_dominant_colors(frame, n_colors=5):
    """Extract dominant colors from a frame using k-means."""
    # Resize for speed
    small = cv2.resize(frame, (150, 150))
    # Convert BGR to RGB
    rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
    pixels = rgb.reshape(-1, 3).astype(float)

    kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=5, max_iter=100)
    kmeans.fit(pixels)

    centers = kmeans.cluster_centers_
    labels = kmeans.labels_
    counts = np.bincount(labels)
    # Sort by frequency
    sorted_idx = np.argsort(-counts)
    sorted_centers = centers[sorted_idx]

    return [rgb_to_hex(c) for c in sorted_centers]

def compute_histogram(frame):
    """Compute color histogram for scene change detection."""
    small = cv2.resize(frame, (100, 100))
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
    cv2.normalize(hist, hist)
    return hist

def histogram_diff(h1, h2):
    return cv2.compareHist(h1, h2, cv2.HISTCMP_BHATTACHARYYA)

@app.route('/process', methods=['POST'])
def process_video():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400

    file = request.files['video']
    if not file.filename.endswith('.mp4'):
        return jsonify({'error': 'Only MP4 files supported'}), 400

    # Save uploaded file
    path = os.path.join(UPLOAD_FOLDER, 'input.mp4')
    file.save(path)

    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    palettes = []  # [{timestamp, colors}]
    prev_hist = None
    frame_idx = 0
    THRESHOLD = 0.35  # scene change sensitivity
    MIN_INTERVAL = fps * 0.5  # min 0.5s between palette updates
    last_palette_frame = -MIN_INTERVAL

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        hist = compute_histogram(frame)

        if prev_hist is None:
            diff = 1.0  # force first frame
        else:
            diff = histogram_diff(prev_hist, hist)

        if diff > THRESHOLD and (frame_idx - last_palette_frame) >= MIN_INTERVAL:
            timestamp = frame_idx / fps
            colors = extract_dominant_colors(frame)
            palettes.append({
                'timestamp': round(timestamp, 3),
                'colors': colors
            })
            last_palette_frame = frame_idx
            prev_hist = hist

        prev_hist = hist
        frame_idx += 1

    cap.release()

    # Always include a final entry
    if not palettes or palettes[-1]['timestamp'] < duration - 1:
        cap2 = cv2.VideoCapture(path)
        cap2.set(cv2.CAP_PROP_POS_FRAMES, total_frames - 1)
        ret, frame = cap2.read()
        if ret:
            colors = extract_dominant_colors(frame)
            palettes.append({'timestamp': round(duration, 3), 'colors': colors})
        cap2.release()

    return jsonify({
        'duration': round(duration, 3),
        'fps': fps,
        'palettes': palettes,
        'total_scenes': len(palettes)
    })

@app.route('/video/<filename>')
def serve_video(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    print(f"Upload folder: {UPLOAD_FOLDER}")
    app.run(debug=True, port=5001)
