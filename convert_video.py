from PIL import Image, ImageSequence
import imageio
import sys
import numpy as np

def convert_webp_to_mp4(input_path, output_path):
    print(f"Reading {input_path} with PIL...")
    with Image.open(input_path) as img:
        frames = []
        for i, frame in enumerate(ImageSequence.Iterator(img)):
            # Convert frame to numpy array
            frames.append(np.array(frame.convert("RGB")))
            if i % 100 == 0:
                print(f"Loaded {i} frames...")
    
    if not frames:
        print("No frames found!")
        return

    print(f"Loaded {len(frames)} frames total.")

    h, w, c = frames[0].shape
    new_h = h if h % 2 == 0 else h - 1
    new_w = w if w % 2 == 0 else w - 1
    
    print(f"Writing to {output_path} with yuv420p...")
    writer = imageio.get_writer(output_path, fps=10, codec='libx264', pixelformat='yuv420p', quality=8)
    for f in frames:
        writer.append_data(f[:new_h, :new_w, :])
    writer.close()
    print("Done!")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convert.py <input.webp> <output.mp4>")
        sys.exit(1)
    convert_webp_to_mp4(sys.argv[1], sys.argv[2])
