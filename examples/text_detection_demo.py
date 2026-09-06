"""Run two independent examples of the ProofPrint text detector."""

from proofprint_ai.text_detector import analyze_text


SAMPLE_INPUTS = {
    "human_style": (
        "I missed the bus this morning, so I took the longer route through the market. "
        "It was noisy and inconvenient, but I found a small bookshop on the way."
    ),
    "formulaic_style": (
        "Furthermore, this solution demonstrates a comprehensive and effective approach. "
        "Moreover, it plays a crucial role in today's world. In conclusion, the results "
        "provide a valuable and meaningful contribution to the field. "
    ) * 4,
}


if __name__ == "__main__":
    for name, sample in SAMPLE_INPUTS.items():
        result = analyze_text(sample)
        print(f"{name}: {result.model_dump_json(indent=2)}")