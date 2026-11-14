"""
Automatic transcription of F1 team radios (Races and Sprints) with faster-whisper.

Run by .github/workflows/radio-transcripts.yml. For every finished Race/Sprint of the season
that has no transcript yet, downloads the OpenF1 team radios, transcribes them in their original
language and writes public/data/live/radio/<session_key>.json:

  { "session_key": 9999, "model": "large-v3-turbo", "generated_at": "...",
    "items": { "<recording_url>": { "text": "...", "lang": "en" } } }

The browser cannot transcribe them itself: the MP3s are served without CORS headers.

Env: YEAR (default: current year), MAX_SESSIONS (default 3), MODEL (default large-v3-turbo),
     SESSION_KEYS (optional, comma-separated: force these sessions, overwriting existing files).
"""
import datetime as dt
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

import av
import numpy as np
from faster_whisper import WhisperModel

API = "https://api.openf1.org/v1"
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "data", "live", "radio")
UA = {"User-Agent": "f1-explorer-radio-transcriber"}

BASE_PROMPT = (
    "Formula 1 team radio. Box box. Copy. Tyres, softs, mediums, hards, inters, undercut, overcut, "
    "overtake mode, boost, Safety Car, VSC, gap, delta, push, lift and coast, battery, deploy, harvest, "
    "P1, P2, P3, mate. "
)


def get(url, binary=False):
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                data = r.read()
            time.sleep(0.4)  # OpenF1 rate limit
            return data if binary else json.loads(data)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < 5:
                time.sleep(2 * (attempt + 1))
                continue
            raise


def api(endpoint, **params):
    try:
        return get(f"{API}/{endpoint}?{urllib.parse.urlencode(params)}")
    except urllib.error.HTTPError as e:
        if e.code == 404:  # OpenF1 answers 404 "No results found." for empty results
            return []
        raise


def load_audio(path):
    """Decode to 16 kHz mono float32 (faster-whisper's own decoder breaks with recent PyAV)."""
    c = av.open(path)
    rs = av.AudioResampler(format="s16", layout="mono", rate=16000)
    chunks = []
    for frame in c.decode(audio=0):
        chunks += [f.to_ndarray().reshape(-1) for f in rs.resample(frame)]
    chunks += [f.to_ndarray().reshape(-1) for f in rs.resample(None)]
    c.close()
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(chunks).astype(np.float32) / 32768.0


# Languages actually heard on F1 radios; anything else is a misdetection on a noisy clip.
LANGS = {"en", "es", "it", "fr", "de", "nl", "pt", "fi", "da", "ja", "zh", "th"}


def pick_language(model, audio):
    try:
        lang, prob, _ = model.detect_language(audio, vad_filter=True)
    except Exception:
        return "en"
    return lang if lang in LANGS and (lang == "en" or prob >= 0.7) else "en"


def sessions_to_do(year, forced):
    if forced:
        return [{"session_key": k, "session_name": "?", "location": "?"} for k in forced]
    now = dt.datetime.now(dt.timezone.utc)
    todo = []
    for s in sorted(api("sessions", year=year), key=lambda s: s["date_start"]):
        if s.get("session_name") not in ("Race", "Sprint") or not s.get("date_end"):
            continue
        # OpenF1 publishes free data shortly after the session: leave a margin
        if dt.datetime.fromisoformat(s["date_end"]) > now - dt.timedelta(hours=3):
            continue
        if os.path.exists(os.path.join(OUT, f"{s['session_key']}.json")):
            continue
        todo.append(s)
    return todo


def transcribe_session(model, s):
    key = s["session_key"]
    radios = api("team_radio", session_key=key)
    if not radios:
        print(f"  {key}: no radio published yet, skipped")
        return False
    drivers = api("drivers", session_key=key)
    names = sorted({d["last_name"] for d in drivers if d.get("last_name")})
    prompt = BASE_PROMPT + ", ".join(names) + "."
    items = {}
    with tempfile.TemporaryDirectory() as tmp:
        for i, r in enumerate(radios):
            url = r["recording_url"]
            path = os.path.join(tmp, f"{i}.mp3")
            try:
                parts = urllib.parse.urlsplit(url)
                safe = urllib.parse.urlunsplit(parts._replace(path=urllib.parse.quote(parts.path)))
                with open(path, "wb") as f:
                    f.write(get(safe, binary=True))
                audio = load_audio(path)
                segs, info = model.transcribe(
                    audio, language=pick_language(model, audio), beam_size=5, initial_prompt=prompt,
                    vad_filter=True, condition_on_previous_text=False,
                )
                text = " ".join(seg.text.strip() for seg in segs).strip()
            except Exception as e:  # one bad clip must not lose the whole session
                print(f"  {key} #{i}: {e}", file=sys.stderr)
                continue
            items[url] = {"text": text, "lang": info.language}
            print(f"  {key} #{i + 1}/{len(radios)} [{info.language}] {text[:80]}")
    if len(items) < len(radios) / 2:
        # e.g. livetiming.formula1.com refusing the downloads (403): keep the session for a later run
        raise RuntimeError(f"session {key}: only {len(items)}/{len(radios)} radios transcribed, nothing written")
    os.makedirs(OUT, exist_ok=True)
    doc = {
        "session_key": key,
        "model": os.environ.get("MODEL", "large-v3-turbo"),
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "items": items,
    }
    with open(os.path.join(OUT, f"{key}.json"), "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    return True


def main():
    year = int(os.environ.get("YEAR") or dt.date.today().year)
    max_sessions = int(os.environ.get("MAX_SESSIONS") or 3)
    forced = [int(k) for k in (os.environ.get("SESSION_KEYS") or "").replace(" ", "").split(",") if k]
    todo = sessions_to_do(year, forced)
    if not todo:
        print("Nothing to transcribe.")
        return
    model = WhisperModel(os.environ.get("MODEL", "large-v3-turbo"), device="cpu", compute_type="int8",
                         cpu_threads=os.cpu_count() or 4)
    done = 0
    for s in todo:  # sessions without published radios don't count toward MAX_SESSIONS
        if done >= max_sessions:
            break
        print(f"Session {s['session_key']} ({s['session_name']} {s['location']})")
        t0 = time.time()
        if transcribe_session(model, s):
            done += 1
            print(f"  done in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
