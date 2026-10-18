"""Independent stdlib CSV validation of actual desktop/mobile browser downloads.
Run the Excel browser tests before this script. All fixtures are synthetic.
"""
import csv
from pathlib import Path

expected = {
    "xlsx": [
        ["id", "postal", "date", "negative", "unicode"],
        ["00123", "00042", "2024-01-01", "-12.50", "東京 😀"],
        ["12345678901234567890", "", "", "", ""],
    ],
    "xls": [
        ["id", "note", "amount"],
        ["00123", '東京 😀, "quote"\nnext', "-12.5"],
    ],
}
checked = 0
for extension, rows in expected.items():
    paths = list(Path("test-results").glob(f"**/from-{extension}.csv"))
    assert all(any(path.parent.name.endswith("-" + project) for path in paths) for project in ["desktop", "mobile"]), f"Run desktop and mobile browser projects first: {extension}"
    for path in paths:
        with path.open(encoding="utf-8", newline="") as source:
            actual = list(csv.reader(source))
        assert actual == rows, (path, actual)
        checked += 1
print(f"PASS: {checked} actual XLSX/XLS browser CSV downloads independently parsed with Python csv; exact values and positions.")
