#!/usr/bin/env python3
"""Validate the eight creator-supplied recordings and stage them for GitHub Pages.

Usage: python3 scripts/install-original-soundtrack.py /path/to/MeekLeeAdventures.zip
No pip packages needed. The original uploaded ZIP is ~29 MB and each of its
eight MP3 SHA-256 digests is pinned in original-soundtrack.json.
"""
import hashlib
import json
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = json.loads((ROOT / "scripts" / "original-soundtrack.json").read_text(encoding="utf-8"))
MAX_ZIP = 128 * 1024 * 1024
MAX_AUDIO = 60 * 1024 * 1024
MAX_TOTAL = 80 * 1024 * 1024
PUBLIC_AUDIO = ROOT / "public" / "audio"


def verify_and_extract(archive_path: Path):
    if not archive_path.is_file():
        raise ValueError("MeekLeeAdventures.zip must be attached to the release first.")
    if not 22 <= archive_path.stat().st_size <= MAX_ZIP:
        raise ValueError("The ZIP file is too large or empty.")
    tracks = INDEX["tracks"]
    if len(tracks) != 8 or {t["slot"] for t in tracks} != set(range(8)):
        raise ValueError("The expected eight-song manifest is damaged.")
    expected = {t["name"]: t for t in tracks}
    with zipfile.ZipFile(archive_path) as archive:
        infos = [i for i in archive.infolist() if not i.is_dir()]
        if len(infos) != len(tracks) or {i.filename for i in infos} != set(expected):
            raise ValueError("The ZIP must contain exactly the eight original MeekLee MP3 tracks.")
        if sum(i.file_size for i in infos) > MAX_TOTAL:
            raise ValueError("Total uncompressed audio exceeds the safety limit.")
        # Verify all tracks before writing any into public/audio.
        with tempfile.TemporaryDirectory(prefix="meeklee-audio-") as stage:
            temp = Path(stage)
            for info in infos:
                track = expected[info.filename]
                if info.flag_bits & 1:
                    raise ValueError("Encrypted audio files are not supported.")
                if info.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                    raise ValueError("Only standard ZIP compression is supported.")
                if not (1 <= info.file_size <= MAX_AUDIO) or info.file_size != track["size"]:
                    raise ValueError(f"Unexpected size for {info.filename}")
                if Path(info.filename).name != info.filename:
                    raise ValueError("Nested or unsafe ZIP paths are not permitted.")
                target = temp / track["file"]
                h = hashlib.sha256()
                total = 0
                with archive.open(info) as source, target.open("wb") as out:
                    while True:
                        chunk = source.read(256 * 1024)
                        if not chunk:
                            break
                        total += len(chunk)
                        if total > info.file_size or total > MAX_AUDIO:
                            raise ValueError("Uncompressed audio exceeds its stated size.")
                        h.update(chunk)
                        out.write(chunk)
                if total != info.file_size or h.hexdigest() != track["sha256"]:
                    raise ValueError(f"Checksum mismatch: {info.filename}")
                first = target.read_bytes()[:4]
                if not (first.startswith(b"ID3") or first[:1] == b"\\xff"):
                    raise ValueError(f"Not an MP3 recording: {info.filename}")
                print(f"Verified {track['file']} ({total:,} bytes)")
            PUBLIC_AUDIO.mkdir(parents=True, exist_ok=True)
            for track in tracks:
                (temp / track["file"]).replace(PUBLIC_AUDIO / track["file"])
    print("All eight original MP3s verified and staged in public/audio/.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: install-original-soundtrack.py MeekLeeAdventures.zip")
    try:
        verify_and_extract(Path(sys.argv[1]))
    except (ValueError, OSError, zipfile.BadZipFile) as error:
        print(f"Soundtrack validation FAILED: {error}", file=sys.stderr)
        sys.exit(1)
