import csv
from pathlib import Path

src = Path(r'c:\Projetos\RAT-AASISTENCIA-TECNICA\data\clients_full_import.csv')
with src.open('r', encoding='utf-8', newline='') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader, start=1):
        if i <= 5:
            print(i, row['codigo'], repr(row['razao_social']), repr(row['cidade']), repr(row['estado']))
        else:
            break
