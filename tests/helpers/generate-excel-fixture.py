"""Optional regeneration of the intentionally synthetic, independent XLSX fixture.
Uses already-installed openpyxl for QA only; not an application dependency.
"""
from pathlib import Path
from datetime import datetime
from openpyxl import Workbook
w = Workbook()
w.properties.creator = "CSV Rescue synthetic test"
w.properties.created = datetime(2026, 1, 1)
w.properties.modified = datetime(2026, 1, 1)
s = w.active
s.title = "Independent"
s.append(["id", "postal", "date", "negative", "unicode"])
s.append(["00123", 42, 45292, -12.5, "東京 😀"])
s["B2"].number_format = "00000"
s["C2"].number_format = "yyyy-mm-dd"
s["D2"].number_format = "0.00"
s.append(["12345678901234567890"])
w.create_sheet("Other").append(["00007"])
w.save(Path(__file__).resolve().parents[1] / "fixtures" / "excel-independent.xlsx")
