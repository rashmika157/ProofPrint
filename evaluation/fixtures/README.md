# Evaluation image fixtures

The default evaluator creates small in-memory PNG proxies so it works immediately without downloading copyrighted or external media. For a stronger benchmark, place locally sourced examples in these folders:

```text
evaluation/fixtures/
  real/
  ai_generated/
  manipulated/
```

Use several different images in each folder. Keep the original files and record their source, license, generator, and editing history in your project notes. Do not commit private or copyrighted images without permission.

The built-in evaluator currently uses neutral generated proxies with embedded `Midjourney`, `Stable Diffusion`, `Adobe Photoshop`, and `GIMP` metadata to exercise the baseline's known signals. The resulting scores must not be presented as real-world detector accuracy.