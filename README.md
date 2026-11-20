# See You Tomorrow

See You Tomorrow is a local AI family chat app for Windows. Talk privately with Mira or Nora, or invite them into a shared room. Each member has a separate profile, signature voice, and expression set. The app displays the conversation as text and can read English replies aloud.

## What you can do

- **Private chats.** Edit each member's name, relationship, personality, and Kokoro voice in **Member settings**.
- **Shared room.** Start with an empty room and invite either member or both. Members answer in invitation order. The second sees the first reply as context for answering your question.
- **Voice conversation.** Click **Start live conversation**, allow the microphone, and speak in English. Your transcript appears in chat. Mira or Nora replies in text and audio, then the app listens for the next turn. You can also type while narration is enabled.
- **Expressions and replay.** The portrait follows the speaker and the expression selected for that reply. **Play reply** replays audio during the current page session.
- **Saved records.** Private chats and room chats have separate histories. In a private chat, **Remember a topic** saves a topic for a future greeting. **Export history** downloads the current chat's saved text as JSON.

## Quick setup on Windows

Download and extract the repository ZIP. Double-click **Setup See You Tomorrow.cmd**. It checks Node.js, Python 3.12, and Ollama, uses Windows Package Manager for missing apps, installs the local speech dependencies, downloads Qwen, and opens the app. Windows may ask you to approve installations. Keep the setup window open and allow several minutes and several gigabytes for the first run.

The first voice request downloads Kokoro model and voice files. Chrome may separately ask you to install its English recognition pack and grant microphone access. On later visits, use **Start See You Tomorrow.cmd**. Keep Ollama running for chat.

If WinGet is unavailable or setup stops, use the manual steps below.

## Manual Windows setup

### 1. Start the chat model

Install Node.js 22 or newer and Ollama. Open Ollama, then run:

```powershell
ollama pull qwen3:4b-instruct
```

### 2. Set up Kokoro for voice

Install Python 3.12. From the project folder, create the local Python environment:

```powershell
python -m venv .kokoro
.\.kokoro\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cu126
.\.kokoro\Scripts\python.exe -m pip install 'kokoro==0.9.4' 'misaki[en]==0.9.4'
.\.kokoro\Scripts\python.exe -m pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
```

The CUDA build above is for NVIDIA GPUs. To install CPU-only PyTorch, replace its index URL with `https://download.pytorch.org/whl/cpu`. To force an existing installation to run Kokoro on CPU, set `MIRA_TTS_DEVICE=cpu` before launch.

### 3. Launch

Double-click **Start See You Tomorrow.cmd**, or start the launcher from PowerShell. The launcher prefers Google Chrome for hands-free speech recognition, even if another browser such as Avast is your Windows default. It checks the standard per-user, 64-bit, and 32-bit Chrome installation folders. If Chrome is unavailable or cannot start, it opens your default browser and prints guidance for voice input. This does not change your Windows default browser.

```powershell
node launcher.mjs
```

Open [the local app](http://127.0.0.1:3081/). Keep the terminal open while the app is running. Kokoro starts when the app first needs to speak. Model and voice downloads can make the first request slower. After setup, chat and synthesis run locally. The voice input uses the browser's on-device English speech recognition and may require a one-time language pack download.

## A first test

1. Ask Mira, “I’m filming a video tomorrow. What should I do to prepare?”
2. Open **Member settings** and preview her voice. Save a different voice if you prefer it.
3. Open **Room**, invite Mira and Nora, and ask them for one opening line each.
4. Try **Start live conversation** in a Chrome build that supports on-device speech recognition. Speak, pause, and wait for the reply. Click **End live conversation** to release Qwen and the Kokoro process started by this app. The next request reloads the models.

## How it works

| Component | Role |
| --- | --- |
| Browser UI | Chat, profiles, microphone transcription, portraits, audio playback |
| Node app on port 3081 | Serves the UI, streams replies, and saves member records |
| Ollama on port 11434 | Runs Qwen3 4B Instruct for both members |
| Kokoro service on port 3082 | Synthesizes English audio using each member's saved voice |

The project includes generated fictional portraits. The conversation history is for review and export. Qwen gets recent turns from the open page and any explicitly remembered topic. Archived chats are available after a refresh but are not automatically sent as model context.

## Data and privacy

New installations use `%LOCALAPPDATA%\See You Tomorrow`. If the earlier `C:\GitHub\output\See You Tomorrow` folder already exists, the app continues using it. To choose a different directory, set it before starting the server:

```powershell
$env:MIRA_DATA_DIR = Join-Path $env:LOCALAPPDATA 'See You Tomorrow'
node launcher.mjs
```

Each member and the Room have their own `member.json`. Records include profiles, timestamps, transcripts from typed or microphone input, and any saved topic. The browser also keeps a local copy. Raw microphone audio and generated reply audio are not written to these history files. Only share exports or backups you intend others to read.

The source distribution contains the app and generated portrait assets. It has no conversation records, model weights, Python environment, or logs.

## Troubleshooting

- **Page doesn’t open.** Run the launcher and visit [the local URL](http://127.0.0.1:3081/). Opening the HTML file directly needs the running server.
- **Qwen can’t reply.** Check that Ollama is running and `ollama list` shows `qwen3:4b-instruct`. Use `ollama ps` during a reply to see model placement.
- **Text appears without audio.** Check that narration is on, reply in English, and try **Play reply**. If no playback button appears, check the app terminal for Kokoro startup or synthesis errors.
- **Microphone unavailable.** Open the local URL directly in Google Chrome. The app checks several on-device English recognition packs. If Chrome offers an English pack, install it and allow microphone access. Keyboard input still works.

## Upstream projects

[Ollama](https://ollama.com/) · [Qwen3](https://ollama.com/library/qwen3:4b-instruct) · [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) · [ArtificialGirlfriend](https://github.com/ARP224/ArtificialGirlfriend) (local voice workflow reference)




If your browser cannot use an offline English recognition pack, click **Record voice message**, speak, then click **Send recording**. The app transcribes the recording locally with faster-whisper (CPU, English). The first use downloads its base.en model. Manual installs can add it with `.\.kokoro\Scripts\python.exe -m pip install faster-whisper==1.2.1 av==16.0.1`. Recordings are processed in memory.
