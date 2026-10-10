import sys
import threading
import uvicorn

sys.path.insert(0, sys.argv[1])
server = uvicorn.Server(uvicorn.Config("main:app", host="127.0.0.1", port=8000, log_level="info"))

def wait_for_shutdown():
    # This pipe is inherited only from our launcher; no HTTP shutdown endpoint.
    sys.stdin.buffer.readline()
    server.should_exit = True

# Load ASGI/native numeric extensions before a blocking Windows stdin reader.
# The previous order stalled NumPy DLL initialization in the normal launcher;
# the owned pipe still controls graceful shutdown once initialization completes.
server.config.load()
threading.Thread(target=wait_for_shutdown, daemon=True).start()
server.run()
