import csv
from pathlib import Path

src = Path('data/clients_full_import.csv')
with src.open('r', encoding='utf-8', newline='') as f:
    reader = csv.reader(f)
    for i, row in enumerate(reader, start=1):
        if i <= 3:
            print(i, len(row), row)
        else:
            break
