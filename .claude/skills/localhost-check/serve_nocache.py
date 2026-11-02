# Lokale webserver zonder cache: Chrome haalt bij elke keer laden de nieuwste bestanden op.
# Gebruik (vanuit de repo-root): python .claude/skills/localhost-check/serve_nocache.py frontend 8080
import functools
import http.server
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


root, port = sys.argv[1], int(sys.argv[2])
http.server.ThreadingHTTPServer(('', port), functools.partial(NoCache, directory=root)).serve_forever()
