"""Prepare user-provided timer recordings. Requires ffmpeg, no Python packages.

python3 scripts/prepare-timer-audio.py --source /path/to/recordings
Originals are untouched. Processed MP3s and a report go to source/Timer-prontos;
the same files are copied to assets/tabata-audio for reproducible packaging.
"""
from pathlib import Path
import argparse
import array
import hashlib
import json
import math
import shutil
import subprocess
import unicodedata

RATE = 24000
ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "preparation": "Prepare-se.mp3",
    "warmup": "Aquecimento.mp3",
    "exercise": "Exercício.mp3",
    "rest": "Descanso.mp3",
    "setRest": "Pausa entre séries.mp3",
    "cooldown": "Desaquecimento.mp3",
    "complete": "Treino concluído.mp3",
    "test": "Teste de som.mp3",
    "ready": "ready.m4a",
    "finish": "complete.m4a",
}


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, **kwargs).stdout


def decode(path):
    samples = array.array("f")
    samples.frombytes(run([
        "ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(RATE),
        "-f", "f32le", "pipe:1",
    ]))
    return samples


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    options = parser.parse_args()
    originals = {
        unicodedata.normalize("NFC", path.name): path
        for path in options.source.iterdir() if path.is_file()
    }
    # Resolve every input before creating or changing any output.
    inputs = {key: originals[name] for key, name in SOURCES.items()}
    output = options.source / "Timer-prontos"
    assets = ROOT / "assets/tabata-audio"
    output.mkdir(exist_ok=True)
    assets.mkdir(parents=True, exist_ok=True)
    report = []
    for key, source in inputs.items():
        audio = decode(source)
        original_count = len(audio)
        peak = max(map(abs, audio), default=0)
        if peak < .005:
            raise ValueError(f"No usable audio: {source.name}")
        threshold = max(.0015, peak * .006)
        active = [i for i, value in enumerate(audio) if abs(value) >= threshold]
        start = max(0, active[0] - round(.06 * RATE))
        end = min(len(audio), active[-1] + round(.09 * RATE))
        audio = audio[start:end]
        frame = RATE // 100
        audible = [
            value for i in range(0, len(audio), frame)
            if max(map(abs, audio[i:i + frame]), default=0) >= threshold
            for value in audio[i:i + frame]
        ]
        rms = math.sqrt(sum(value * value for value in audible) / len(audible))
        target = .12 if key not in {"ready", "finish"} else .16
        gain = min(target / max(rms, 1e-6), .72 / peak)
        fade = round(.004 * RATE)
        for i in range(len(audio)):
            edge = min(1, i / fade, (len(audio) - 1 - i) / fade)
            audio[i] *= gain * edge
        destination = output / f"{key}.mp3"
        run([
            "ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(RATE),
            "-ac", "1", "-i", "pipe:0", "-map_metadata", "-1",
            "-c:a", "libmp3lame", "-b:a", "64k", str(destination),
        ], input=audio.tobytes())
        shutil.copyfile(destination, assets / destination.name)
        decoded = decode(destination)
        if max(map(abs, decoded)) >= .99:
            raise ValueError(f"Output peak too high: {destination.name}")
        item = {
            "key": key, "original": source.name, "file": destination.name,
            "original_bytes": source.stat().st_size,
            "processed_bytes": destination.stat().st_size,
            "original_seconds": round(original_count / RATE, 3),
            "processed_seconds": round(len(decoded) / RATE, 3),
            "trim_start_seconds": round(start / RATE, 3),
            "trim_end_seconds": round((original_count - end) / RATE, 3),
            "gain_db": round(20 * math.log10(gain), 2),
            "peak_db": round(20 * math.log10(max(map(abs, decoded))), 2),
            "original_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "processed_sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        }
        report.append(item)
        print(json.dumps(item, ensure_ascii=False))
    metadata = {"format": "MP3 mono, 24 kHz, 64 kbps", "files": report}
    for path in [output / "audio-report.json", assets / "audio-report.json"]:
        path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    run(["python3", str(ROOT / "scripts/pack-timer-audio.py")])
    print(f"Prepared copies: {output}")


if __name__ == "__main__":
    main()
