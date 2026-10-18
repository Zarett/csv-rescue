"""Independently inspect picker and repair-to-conversion browser downloads.

Run after desktop/mobile and Android browser tests using existing openpyxl.
Optional argument: ignored directory containing original stress-test QA outputs.
"""
import csv
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import openpyxl

count = 0
def verify(path, expected):
    global count
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, path
        ns = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        strings = ET.fromstring(archive.read('xl/sharedStrings.xml'))
        decode = lambda value: re.sub(r'_x([0-9a-fA-F]{4})_', lambda match: chr(int(match[1], 16)), value)
        values = [decode(''.join(node.itertext())) for node in strings.findall('s:si', ns)]
        sheet_xml = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        assert not sheet_xml.findall('.//s:f', ns), path
        assert all(cell.get('t') == 's' for cell in sheet_xml.findall('.//s:c', ns)), path
        assert [[values[int(cell.find('s:v', ns).text)] for cell in row.findall('s:c', ns)] for row in sheet_xml.findall('.//s:row', ns)] == expected, path
    workbook = openpyxl.load_workbook(path, data_only=False)
    assert len(workbook.worksheets) == 1, path
    sheet = workbook.active
    # openpyxl 3.1.5 leaves the valid OOXML carriage-return token in shared
    # strings undecoded. Normalize that reader limitation only; XML above is
    # checked independently with exactly one OOXML decoding pass.
    actual = [[value.replace('_x000d_', '\r') if isinstance(value, str) else value for value in row] for row in sheet.values]
    assert actual == expected, (path, actual)
    assert all(cell.data_type == 's' for row in sheet for cell in row), path
    count += 1

for project in ['desktop', 'mobile', 'android-chrome']:
    providers = [p for p in Path('test-results').rglob('provider-filenames.xlsx') if p.parent.name.endswith('-' + project)]
    repairs = [p for p in Path('test-results').rglob('repair-conversion.xlsx') if p.parent.name.endswith('-' + project)]
    assert providers and repairs, f'Missing {project} browser downloads'
    for path in providers:
        verify(path, [['id', 'note'], ['00123', '  müşteri 😀  '], ['12345678901234567890', '-12.50']])
    for path in repairs:
        with path.with_suffix('.csv').open(encoding='utf-8', newline='') as stream:
            expected = list(csv.reader(stream, strict=True))
        assert expected == [['id','note','Extra field 3'],['00123','open',''],['00042','next',''],['00008','other','EXTRA'],['00007','valid\r\nmultiline','']]
        verify(path, expected)

if len(sys.argv) > 1:
    root = Path(sys.argv[1])
    for label in ['desktop', 'android']:
        expected = json.loads((root / f'{label}-expected.json').read_text(encoding='utf-8'))
        assert len(expected) == 22 and all(len(row) == 8 for row in expected)
        verify(root / f'{label}-stress.xlsx', expected)
        assert (root / f'{label}-stress-cleaned.csv').read_bytes() == (root / f'{label}-converter-original.csv').read_bytes()

print(f'PASS: {count} XLSX downloads independently verified with openpyxl; exact text, dimensions, blank fields, Unicode, multiline values and ZIP checksums.')
