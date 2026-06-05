import sys
import json
import whisper
import os

def align_audio(audio_path, pages_json):
    # Load pages
    try:
        pages = json.loads(pages_json)
    except Exception as e:
        print(json.dumps({"error": f"Failed to parse pages JSON: {e}"}))
        sys.exit(1)

    if not pages:
        print(json.dumps({"error": "No pages provided."}))
        sys.exit(1)

    # Load whisper model
    try:
        model = whisper.load_model("tiny.en")
    except Exception as e:
        print(json.dumps({"error": f"Failed to load Whisper model: {e}"}))
        sys.exit(1)

    # Transcribe with word timestamps
    try:
        result = model.transcribe(audio_path, word_timestamps=True)
    except Exception as e:
        print(json.dumps({"error": f"Failed to transcribe audio: {e}"}))
        sys.exit(1)

    # Flatten words
    words = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            word_text = w["word"].strip().lower()
            # remove punctuation for easier matching
            for p in ['.', ',', '!', '?', '"', "'"]:
                word_text = word_text.replace(p, '')
            if word_text:
                words.append({
                    "word": word_text,
                    "start": w["start"],
                    "end": w["end"]
                })

    if not words:
        print(json.dumps({"error": "No words transcribed."}))
        sys.exit(1)

    # Map pages to words
    # We do a simple greedy search: for each page, find the start and end words
    page_timestamps = []
    current_word_idx = 0
    previous_end_ts = 0.0

    for idx, page in enumerate(pages):
        text = page.get("text", "")
        # Extract target words
        target_words = [w.strip().lower() for w in text.split()]
        target_words = [w.replace('.', '').replace(',', '').replace('!', '').replace('?', '').replace('"', '').replace("'", '') for w in target_words]
        target_words = [w for w in target_words if w]
        
        if not target_words:
            continue
            
        start_ts = None
        end_ts = None
        
        # --- N-GRAM START MATCHING ---
        start_seq = target_words[:min(3, len(target_words))]
        best_start_idx = current_word_idx
        start_ts = words[current_word_idx]["start"] if current_word_idx < len(words) else 0.0
        
        # Look forward a small buffer (e.g. 25 words) to find the start sequence
        for i in range(current_word_idx, min(len(words) - len(start_seq) + 1, current_word_idx + 25)):
            match_count = sum(1 for j in range(len(start_seq)) if words[i+j]["word"] == start_seq[j])
            # If we match all, or all but one (e.g. 2 out of 3, or 1 out of 2), it's a match
            if match_count >= max(1, len(start_seq) - 1):
                start_ts = words[i]["start"]
                best_start_idx = i
                break
            
        # --- N-GRAM END MATCHING ---
        end_seq = target_words[-min(3, len(target_words)):]
        expected_end_idx = min(len(words) - 1, best_start_idx + len(target_words) - 1)
        best_end_idx = expected_end_idx
        end_ts = words[expected_end_idx]["end"] if expected_end_idx < len(words) else 0.0
        
        # Look around the expected index for the exact end sequence
        search_start = max(best_start_idx, expected_end_idx - 20)
        search_end = min(len(words) - len(end_seq) + 1, expected_end_idx + 20)
        
        best_dist = float('inf')
        for i in range(search_start, search_end):
            match_count = sum(1 for j in range(len(end_seq)) if words[i+j]["word"] == end_seq[j])
            if match_count >= max(1, len(end_seq) - 1):
                # Calculate distance from the expected end index
                end_word_idx = i + len(end_seq) - 1
                dist = abs(end_word_idx - expected_end_idx)
                if dist < best_dist:
                    best_dist = dist
                    end_ts = words[end_word_idx]["end"]
                    best_end_idx = end_word_idx
            
        current_word_idx = best_end_idx + 1
        
        # Calculate duration based on previous page's end to close any gaps
        safe_end_ts = end_ts if end_ts is not None else previous_end_ts + 5.0
        calculated_duration = round(safe_end_ts - previous_end_ts, 3)
        if calculated_duration < 0:
            calculated_duration = 5.0 # fallback
            
        previous_end_ts = safe_end_ts
        
        page_timestamps.append({
            "id": page.get("id"),
            "start": round(start_ts, 3) if start_ts is not None else 0.0,
            "end": round(safe_end_ts, 3),
            "duration": calculated_duration
        })

    print(json.dumps({"success": True, "pages": page_timestamps}))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments. Usage: python sync_durations.py <audio_path> <pages_json_string>"}))
        sys.exit(1)
        
    audio_file = sys.argv[1]
    pages_data = sys.argv[2]
    
    # redirect standard error to standard out to avoid breaking json parsing, or suppress it
    # Whisper prints progress to stderr, so we redirect stderr to devnull
    devnull = open(os.devnull, 'w')
    os.dup2(devnull.fileno(), sys.stderr.fileno())
    
    align_audio(audio_file, pages_data)
