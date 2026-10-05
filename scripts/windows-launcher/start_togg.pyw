import ctypes
from ctypes import wintypes
import json
import msvcrt
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
TEST = "--verify-lifecycle" in sys.argv
HERE = Path(os.environ["ATTUNE_LAUNCHER_TEST_HOME"]) if TEST and "ATTUNE_LAUNCHER_TEST_HOME" in os.environ else Path(__file__).resolve().parent
HERE.mkdir(parents=True, exist_ok=True)
HOST_SCRIPT = Path(__file__).resolve().parent / "backend_host.py"
URL = "http://127.0.0.1:3000"
PYTHON = Path(r"C:\Users\PC\AppData\Local\Programs\Python\Python311\python.exe")
NODE = Path(r"C:\nvm4w\nodejs\node.exe")
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
TEST = "--verify-lifecycle" in sys.argv
PROFILE = HERE / ("chrome-verification-profile" if TEST else "chrome-profile")

class BasicLimits(ctypes.Structure):
    _fields_ = [("PerProcessUserTimeLimit", ctypes.c_int64), ("PerJobUserTimeLimit", ctypes.c_int64),
                ("LimitFlags", wintypes.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
                ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
                ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD), ("SchedulingClass", wintypes.DWORD)]

class IOCounters(ctypes.Structure):
    _fields_ = [(name, ctypes.c_uint64) for name in ("ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
                                                  "ReadTransferCount", "WriteTransferCount", "OtherTransferCount")]

class ExtendedLimits(ctypes.Structure):
    _fields_ = [("BasicLimitInformation", BasicLimits), ("IoInfo", IOCounters),
                ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t)]

kernel = ctypes.WinDLL("kernel32", use_last_error=True)
kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
kernel.CreateJobObjectW.restype = wintypes.HANDLE
kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
kernel.SetInformationJobObject.restype = wintypes.BOOL
kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
kernel.AssignProcessToJobObject.restype = wintypes.BOOL
kernel.CloseHandle.argtypes = [wintypes.HANDLE]
kernel.CloseHandle.restype = wintypes.BOOL

class OwnedJob:
    def __init__(self):
        self.handle = kernel.CreateJobObjectW(None, None)
        if not self.handle:
            raise ctypes.WinError(ctypes.get_last_error())
        limits = ExtendedLimits()
        limits.BasicLimitInformation.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if not kernel.SetInformationJobObject(self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)):
            self.close()
            raise ctypes.WinError(ctypes.get_last_error())

    def add(self, process):
        if not kernel.AssignProcessToJobObject(self.handle, wintypes.HANDLE(process._handle)):
            process.terminate()
            process.wait(timeout=5)
            raise ctypes.WinError(ctypes.get_last_error())

    def close(self):
        if self.handle:
            kernel.CloseHandle(self.handle)
            self.handle = None


def fetch(url):
    try:
        with urllib.request.urlopen(url, timeout=3) as response:
            return response.read()
    except Exception:
        return None


def occupied(port):
    with socket.socket() as sock:
        sock.settimeout(1)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def start_service(job, name, args, cwd, env, controlled_stdin=False):
    with (HERE / (name + ".log")).open("ab") as log:
        process = subprocess.Popen(args, cwd=str(cwd), env=env,
                                   stdin=subprocess.PIPE if controlled_stdin else subprocess.DEVNULL,
                                   stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
    job.add(process)
    return process


def await_ready(url, process, name):
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        if fetch(url) is not None:
            return
        if process.poll() is not None:
            raise RuntimeError(name + " baslatilamadi. Ayrinti: " + str(HERE / (name + ".log")))
        time.sleep(0.5)
    raise RuntimeError(name + " zamaninda hazir olmadi. Ayrinti: " + str(HERE / (name + ".log")))


def chrome_args(profile):
    args = [str(CHROME), "--user-data-dir=" + str(profile), "--app=" + URL,
            "--disable-background-mode", "--no-first-run", "--no-default-browser-check"]
    if TEST:
        # Only the bounded verification launch exposes a random loopback debugging port.
        args += ["--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0"]
    return args


def write_state(state):
    (HERE / "session.json").write_text(json.dumps(state, indent=2), encoding="utf-8")


def main():
    if not CHROME.is_file():
        raise RuntimeError("Google Chrome bulunamadi.")
    if not (ROOT / "apps/vehicle-app/.next/BUILD_ID").is_file():
        raise RuntimeError("Uretim derlemesi bulunamadi; proje dosyalarina dokunulmadi.")
    with (HERE / "start.lock").open("a+b") as lock:
        # Reading the locked byte raises PermissionError on Windows on a second launch.
        lock.seek(0, os.SEEK_END)
        if lock.tell() == 0:
            lock.write(b"0")
            lock.flush()
        lock.seek(0)
        try:
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            state = json.loads((HERE / "session.json").read_text(encoding="utf-8"))
            if state.get("status") == "running":
                subprocess.Popen(chrome_args(Path(state["profile"])), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return
        if occupied(3000) or occupied(8000):
            raise RuntimeError("3000 veya 8000 portunda mevcut bir servis var. Kisa yol bu servisi kapatmaz veya sahiplenmez.")
        env = {key: value for key, value in os.environ.items() if not key.startswith("OPENAI_")}
        env["OPENAI_API_KEY"] = ""
        env["ATTUNE_LOAD_LOCAL_ENV"] = "0"
        env["ATTUNE_TRUSTED_ORIGINS"] = "http://localhost:3000,http://127.0.0.1:3000"
        env["ATTUNE_DATA_DIR"] = str(HERE / "data")
        job = OwnedJob()
        backend = frontend = browser = None
        state = {"status": "starting", "launcher_pid": os.getpid(), "profile": str(PROFILE), "url": URL,
                 "verification": TEST, "started_at": time.strftime("%Y-%m-%dT%H:%M:%S")}
        write_state(state)
        try:
            backend = start_service(job, "backend", [str(PYTHON), str(HOST_SCRIPT),
                                     str(ROOT / "services/core-api")], ROOT, {**env, "ATTUNE_LOAD_LOCAL_ENV": "0" if TEST else "1"}, True)
            await_ready("http://127.0.0.1:8000/api/health", backend, "backend")
            frontend = start_service(job, "frontend", [str(NODE), str(ROOT / "node_modules/next/dist/bin/next"),
                                     "start", "--hostname", "127.0.0.1", "--port", "3000"], ROOT / "apps/vehicle-app", env)
            await_ready("http://127.0.0.1:3000/", frontend, "frontend")
            browser = subprocess.Popen(chrome_args(PROFILE), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            job.add(browser)
            state.update(status="running", backend_pid=backend.pid, frontend_pid=frontend.pid, browser_pid=browser.pid)
            write_state(state)
            # The dedicated profile keeps unrelated Chrome windows outside our process tree.
            while browser.poll() is None:
                if backend.poll() is not None or frontend.poll() is not None:
                    raise RuntimeError("TOGG servisi beklenmedik sekilde durdu; bu oturum kapatildi.")
                time.sleep(0.25)
        finally:
            if backend is not None and backend.poll() is None:
                try:
                    backend.stdin.write(b"stop\n")
                    backend.stdin.flush()
                    backend.wait(timeout=8)  # Uvicorn drains requests and closes storage operations.
                except (OSError, subprocess.TimeoutExpired):
                    pass
            job.close()  # Only descendants owned by this session are stopped.
            for process in (backend, frontend, browser):
                if process is not None:
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        pass
            state.update(status="stopped", stopped_at=time.strftime("%Y-%m-%dT%H:%M:%S"))
            write_state(state)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        if TEST:
            write_state({"status": "error", "verification": True, "error": str(error)})
            raise SystemExit(1)
        from tkinter import Tk, messagebox
        window = Tk()
        window.withdraw()
        messagebox.showerror("TOGG baslatilamadi", str(error))
        window.destroy()
