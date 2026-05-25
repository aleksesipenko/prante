#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json, socket, urllib.parse

REPO_ROOT = Path(__file__).resolve().parents[3]
THEME_PATH = Path(__file__).resolve().parent / 'content' / 'theme-overrides.json'
HOST, PORT = '0.0.0.0', 8777

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def _send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == '/__theme__':
            try:
                data = json.loads(THEME_PATH.read_text(encoding='utf-8'))
            except Exception as e:
                data = {'error': str(e), 'vars': {}}
            return self._send_json(200, data)
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == '/__save_theme__':
            length = int(self.headers.get('Content-Length', '0'))
            raw = self.rfile.read(length)
            data = json.loads(raw.decode('utf-8'))
            THEME_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            return self._send_json(200, {'ok': True, 'path': str(THEME_PATH)})
        self.send_error(404, 'Not found')

def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()

if __name__ == '__main__':
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f'Serving repo root: {REPO_ROOT}')
    print(f'Prototype: http://127.0.0.1:{PORT}/docs/prototypes/final-mvp/index.html')
    print(f'Admin:     http://127.0.0.1:{PORT}/docs/prototypes/final-mvp/admin/')
    print(f'LAN:       http://{lan_ip()}:{PORT}/docs/prototypes/final-mvp/index.html')
    httpd.serve_forever()
