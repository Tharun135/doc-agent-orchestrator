import imageio
import sys
import numpy as np
from PIL import Image

def stitch_frames_to_mp4(frame_paths, output_path, fps=0.5):
    print(f"Stitching {len(frame_paths)} frames to {output_path}...")
    
    processed_frames = []
    
    # Use the first frame to determine target dimensions (must be even)
    with Image.open(frame_paths[0]) as first_img:
        w, h = first_img.size
        new_w = w if w % 2 == 0 else w - 1
        new_h = h if h % 2 == 0 else h - 1
        print(f"Target dimensions: {new_w}x{new_h}")

    for path in frame_paths:
        print(f"Processing {path}...")
        with Image.open(path) as img:
            img = img.convert("RGB")
            # Resize or crop to target dimensions
            img = img.crop((0, 0, new_w, new_h))
            processed_frames.append(np.array(img))

    # To make a 20-second video from 10 frames, we want 2 seconds per frame.
    # So fps = 0.5 (1 frame every 2 seconds).
    # But some players handle low fps badly. Better to repeat frames.
    # Let's say we want 10 fps, and 2 seconds per unique frame. 
    # That's 20 repeats per frame.
    
    target_fps = 10
    seconds_per_frame = 2
    repeats = target_fps * seconds_per_frame
    
    final_frames = []
    for f in processed_frames:
        for _ in range(repeats):
            final_frames.append(f)

    print(f"Total frames after repeating: {len(final_frames)}")
    
    writer = imageio.get_writer(output_path, fps=target_fps, codec='libx264', pixelformat='yuv420p', quality=8)
    for frame in final_frames:
        writer.append_data(frame)
    writer.close()
    print("Done!")

if __name__ == "__main__":
    # Frame paths are passed as arguments
    if len(sys.argv) < 3:
        print("Usage: python stitch_video.py <output.mp4> <frame1.png> <frame2.png> ...")
        sys.exit(1)
    
    out_path = sys.argv[1]
    frames = sys.argv[2:]
    stitch_frames_to_mp4(frames, out_path)
