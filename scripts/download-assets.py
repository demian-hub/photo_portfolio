from pathlib import Path
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'images'
OUT.mkdir(parents=True, exist_ok=True)
photos = {
 'hero': 'photo-1524504388940-b1c1722653e1',
 'portrait-1': 'photo-1534528741775-53994a69daeb',
 'portrait-2': 'photo-1506794778202-cad84cf45f1d',
 'fashion-1': 'photo-1483985988355-763728e1935b',
 'fashion-2': 'photo-1483985988355-763728e1935b',
 'product-1': 'photo-1608571423902-eed4a5ad8108',
 'product-2': 'photo-1541643600914-78b084683601',
 'corporate-1': 'photo-1497366811353-6870744d04b2',
 'corporate-2': 'photo-1521737711867-e3b97375f902',
 'event-1': 'photo-1511795409834-ef04bbd61622',
 'event-2': 'photo-1505373877841-8d25f7d46678',
}
photos['fashion-2'] = 'photo-1483985988355-763728e1935b'
def download(item):
 name, identifier = item
 # Original stock images are illustrative placeholders, never the photographer's work.
 query = 'auto=format&fit=crop&w=1800&q=85' if name == 'hero' else 'auto=format&fit=crop&w=1200&q=82'
 if name == 'fashion-2':
  identifier = 'photo-1445205170230-053b83016050'
 url = f'https://images.unsplash.com/{identifier}?{query}'
 with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=45) as response:
  data = response.read()
 (OUT / f'{name}.jpg').write_bytes(data)
 return {'file': f'{name}.jpg', 'source': url, 'usage': 'Illustrative stock placeholder; replace before publication.'}
with ThreadPoolExecutor(max_workers=5) as pool:
 result = list(pool.map(download, photos.items()))
(OUT / 'sources.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(f'Downloaded {len(result)} sample photos.')
