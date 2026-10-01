"""Report real PulseAudio/Speech Dispatcher readiness; browser checks remain mandatory."""
import json
import pathlib
import subprocess

out = pathlib.Path('audit-results')
out.mkdir(exist_ok=True)
report = {}
for name, command in {
    'sources': ['pactl', 'list', 'sources'],
    'sinks': ['pactl', 'list', 'short', 'sinks'],
    'dispatcher_process': ['pgrep', '-a', 'speech-dispatch'],
    'dispatcher_voices': ['spd-say', '-L'],
    'dispatcher_turkish_probe': ['spd-say', '--wait', '--language=tr', 'Ses sistemi hazır.'],
}.items():
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=20)
        report[name] = {'command': command, 'returncode': result.returncode,
                        'stdout': result.stdout, 'stderr': result.stderr}
    except (OSError, subprocess.TimeoutExpired) as error:
        report[name] = {'command': command, 'error': str(error)}
(out / 'native-audio-os-preflight.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
