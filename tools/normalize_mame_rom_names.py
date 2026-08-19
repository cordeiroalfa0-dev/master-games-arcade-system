from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re

rom_dir = Path('/tmp/mga-full-source/emulators/mame168/roms')
for name in ('kof94.zip', 'kof95.zip'):
    src = rom_dir / name
    tmp = rom_dir / (name + '.tmp')
    with ZipFile(src, 'r') as zin, ZipFile(tmp, 'w', ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            new_name = item.filename
            m = re.fullmatch(r'(\d+-[a-z]\d+)\.bin', item.filename, re.I)
            if m:
                new_name = f'{m.group(1)}.{m.group(1).split("-")[-1]}'
            zout.writestr(new_name, data)
    tmp.replace(src)
    print(f'normalized {src}')
