"""Run image detector examples without needing external image files."""

import io

from PIL import Image

from proofprint_ai.image_detector import analyze_image


def make_sample(color: tuple[int, int, int]) -> bytes:
    image = Image.new("RGB", (128, 128), color=color)
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    return stream.getvalue()


if __name__ == "__main__":
    samples = {
        "plain_image.png": make_sample((80, 120, 180)),
        "midjourney_output.png": make_sample((160, 100, 80)),
        "edited_photoshop.png": make_sample((100, 160, 100)),
    }
    for filename, image_bytes in samples.items():
        result = analyze_image(image_bytes, filename=filename)
        print(f"{filename}: {result.model_dump_json(indent=2)}")