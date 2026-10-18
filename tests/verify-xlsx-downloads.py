"""Independent verification of synthetic Playwright sample downloads (stdlib only).

Run after npm run test:e2e: python tests/verify-xlsx-downloads.py
Optional: --openpyxl also verifies using an already-installed independent reader.
Never used by the web application; never opens user uploads.
"""
import glob
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

EXPECTED = [
    ['id', 'name', 'date', 'amount', 'note'],
    ['00123', 'Español 😀', '01/02/2026', '-12.50', '  keep spaces  '],
    ['12345678901234567890', 'Alice', '2026-10-18', '-5', '=SUM(A1:A2)'],
]
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
paths = glob.glob('test-results/**/sample.xlsx', recursive=True)
assert len(paths) == 2, 'Run both desktop and mobile browser tests first.'
for path in paths:
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, 'Invalid ZIP checksum'
        strings = ET.fromstring(archive.read('xl/sharedStrings.xml'))
        values = [re.sub(r'_x([a-fA-F0-9]{4})_', lambda m: chr(int(m[1], 16)), ''.join(n.itertext())) for n in strings.findall('s:si', NS)]
        sheet = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        assert not sheet.findall('.//s:f', NS), 'Unexpected executable formula'
        cells = sheet.findall('.//s:c', NS)
        assert all(c.get('t') == 's' for c in cells), 'Non-text cell'
        actual = {c.get('r'): values[int(c.find('s:v', NS).text)] for c in cells}
        expected = {f'{chr(65+c)}{r+1}': value for r, row in enumerate(EXPECTED) for c, value in enumerate(row)}
        assert actual == expected, 'Workbook value or coordinate mismatch'
    if '--openpyxl' in sys.argv:
        import openpyxl
        workbook = openpyxl.load_workbook(path)
        assert list(workbook.active.values) == [tuple(row) for row in EXPECTED]
        assert all(c.data_type == 's' for row in workbook.active for c in row)
integrity_paths = glob.glob('test-results/**/integrity.xlsx', recursive=True)
assert len(integrity_paths) == 2, 'Run both desktop and mobile integrity regressions first.'
for path in integrity_paths:
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
        strings = [re.sub(r'_x([a-fA-F0-9]{4})_', lambda m: chr(int(m[1], 16)), ''.join(n.itertext())) for n in root.findall('s:si', NS)]
        sheet = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        cells = sheet.findall('.//s:c', NS)
        assert not sheet.findall('.//s:f', NS)
        assert all(c.get('t') == 's' for c in cells)
        actual = {c.get('r'): strings[int(c.find('s:v', NS).text)] for c in cells}
        assert actual == {'A1': '\ufeff00123', 'B1': '_x0041_x0042_', 'C1': '_x005F_x0041_'}
print(f'PASS: {len(paths)} sample and {len(integrity_paths)} integrity downloads; exact text values, coordinates, ZIP checksums, no formulas.' + (' Samples also verified with openpyxl.' if '--openpyxl' in sys.argv else ''))
