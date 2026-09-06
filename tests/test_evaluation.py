from evaluation.evaluate import _classification_metrics, evaluate_api, evaluate_images, evaluate_text


def test_metric_calculation_has_expected_confusion_matrix():
    metrics = _classification_metrics(
        ["human", "human", "ai", "ai"],
        ["human", "ai", "ai", "ai"],
        ["human", "ai"],
    )
    assert metrics["accuracy"] == 0.75
    assert metrics["confusion_matrix"] == [[1, 1], [0, 2]]


def test_evaluation_datasets_return_metrics():
    assert evaluate_text()["sample_count"] >= 6
    assert evaluate_images()["sample_count"] >= 6


def test_evaluation_api_checks_pass():
    result = evaluate_api()
    assert result["passed"] == result["total"]