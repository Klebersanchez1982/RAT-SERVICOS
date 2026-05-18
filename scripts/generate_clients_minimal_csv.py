import csv
from pathlib import Path

src = Path(r'c:\Projetos\RAT-AASISTENCIA-TECNICA\data\clients_full_import.csv')
dst = Path(r'c:\Projetos\RAT-AASISTENCIA-TECNICA\data\clients_minimal_import.csv')

with src.open('r', encoding='utf-8', newline='') as f_in:
    reader = csv.DictReader(f_in)
    fieldnames = ['codigo', 'razao_social', 'cidade', 'estado']
    with dst.open('w', encoding='utf-8', newline='') as f_out:
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()
        count = 0
        for row in reader:
            writer.writerow({key: row.get(key, '').strip() for key in fieldnames})
            count += 1

print('created', dst, 'rows', count)
