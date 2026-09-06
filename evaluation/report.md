# ProofPrint AI Evaluation Report

Generated: 2026-09-05T19:07:32.155811+00:00

## Summary

This report evaluates the current lightweight heuristic detectors and API contract. It is a reproducible smoke benchmark, not a forensic validation study.

### Text detection
Samples: 6

| Metric | Score |
|---|---:|
| Accuracy | 100.0% |
| Macro precision | 100.0% |
| Macro recall | 100.0% |
| Macro F1-score | 100.0% |

Confusion matrix (rows = expected, columns = predicted):

```text
[
  [
    3,
    0
  ],
  [
    0,
    3
  ]
]
```

### Image detection
Samples: 6

| Metric | Score |
|---|---:|
| Accuracy | 100.0% |
| Macro precision | 100.0% |
| Macro recall | 100.0% |
| Macro F1-score | 100.0% |

Confusion matrix (rows = expected, columns = predicted):

```text
[
  [
    2,
    0,
    0
  ],
  [
    0,
    2,
    0
  ],
  [
    0,
    0,
    2
  ]
]
```

### FastAPI checks

Passed: 6/6

| Check | Result |
|---|---|
| valid_text | PASS |
| valid_image | PASS |
| missing_input | PASS |
| multiple_inputs | PASS |
| unsupported_type | PASS |
| invalid_image | PASS |

## Limitations

- This is a small, hand-authored evaluation set, not a representative production benchmark.
- The image fixtures are generated PNG proxies, not real photographs or genuinely generated images.
- Image AI/manipulation cases include embedded tool metadata because the baseline explicitly uses metadata signals; this can inflate scores and is reported as a limitation.
- Text labels describe the source examples, not a proof of authorship. Paraphrasing, editing, short inputs, and new generators can change results.
- Use the metrics to compare future detector versions, not as evidence that any individual user submission is authentic.
