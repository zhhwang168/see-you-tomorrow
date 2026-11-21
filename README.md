# See You Tomorrow

A local AI family chat app for Windows. Meet Mira and Nora, give each member a personality and voice, and talk by text or microphone. Chat privately with one member or invite both into a shared conversation room.

The project started with a viewer's comment and grew through small experiments with help from ChatGPT and Codex. It is a practical example of turning an idea into an app with almost no coding experience.

## Website and source code

- **Cloudflare website:** [see-you-tomorrow-eaq.pages.dev](https://see-you-tomorrow-eaq.pages.dev/)
- **GitHub repository:** [zhhwang168/see-you-tomorrow](https://github.com/zhhwang168/see-you-tomorrow)
- **Download:** [Download the project ZIP](https://github.com/zhhwang168/see-you-tomorrow/archive/refs/heads/main.zip)

The public website and the local AI app have different roles. The website is the project's public address; live conversations require the Windows app, its local server, and the downloaded models. Opening the Cloudflare address does not run Qwen on your computer.

## What the app can do

- **Generate replies locally.** Qwen generates answers during the conversation rather than selecting prerecorded responses.
- **Chat with individual members.** Edit each member's name, relationship, personality, and Kokoro voice in **Member settings**.
- **Use text or voice.** Type a message or use supported Chrome on-device English recognition for hands-free conversation. Your transcript and the reply appear on screen, and narration can read replies aloud.
- **Record a voice message.** If browser recognition is unavailable, record a message and send it for local English transcription with faster-whisper.
- **Bring members together.** Open **Room** and invite Mira, Nora, or both. Members answer in invitation order; the second receives the first reply as context.
- **See expressions and replay replies.** The portrait follows the speaking member and the expression selected for that reply. **Play reply** replays available audio during the current page session.
- **Keep conversation records.** Private chats and room chats have separate histories. Remember a topic for a future greeting, or export the current conversation as JSON.

Try a science question, ask for a gentle bedtime story, request a family-friendly joke, or ask for help with an English sentence. Responses depend on the model, recent context, and character profile, and may contain mistakes.

## Quick setup on Windows

1. Download the project ZIP and extract it into a folder on your computer.
2. Double-click **Setup See You Tomorrow.cmd**.
3. Follow any Windows installation prompts and wait for setup to finish.
4. Keep the app's server window open and use the browser page it opens.

Setup checks for Node.js, Python 3.12, and Ollama. Where Windows Package Manager is available, it can install missing tools. It also prepares the Python environment, speech dependencies, and Qwen model.

The first setup needs an Internet connection, several gigabytes of disk space, and time for downloads. Kokoro model and voice files download on first use. Chrome may separately request its English recognition pack and microphone permission.

On later visits, double-click **Start See You Tomorrow.cmd**. Keep Ollama running for AI replies.

## Manual installation

Use these steps if automatic setup is unavailable or stops before completion. Run commands from the extracted project folder in PowerShell.

### 1. Prepare the chat model

Install Node.js 22 or newer, Python 3.12, and Ollama. Start Ollama, then download the model:

```powershell
ollama pull qwen3:4b-instruct
```

### 2. Prepare the speech environment

Create the Python environment:

```powershell
py -3.12 -m venv .kokoro
```

If the `py` launcher is unavailable, use the full path to your Python 3.12 executable in its place.

For an NVIDIA GPU, install the CUDA-enabled PyTorch build:

```powershell
.\.kokoro\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cu126
```

For CPU-only speech synthesis, use this command instead:

```powershell
.\.kokoro\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Install the speech and transcription dependencies:

```powershell
.\.kokoro\Scripts\python.exe -m pip install 'kokoro==0.9.4' 'misaki[en]==0.9.4' 'faster-whisper==1.2.1' 'av==16.0.1'
.\.kokoro\Scripts\python.exe -m pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
```

To force an existing Kokoro installation to use the CPU, set `MIRA_TTS_DEVICE=cpu` before launching the app.

### 3. Start the app

Double-click **Start See You Tomorrow.cmd**, or run:

```powershell
node launcher.mjs
```

Open [http://127.0.0.1:3081/](http://127.0.0.1:3081/) and keep the terminal window open. Do not open `index.html` directly as a file; the app needs its running local server.

The launcher prefers Google Chrome even if another browser, such as Avast, is your default. This does not change your Windows default browser. If Chrome is unavailable, the launcher falls back to the default browser, where hands-free recognition may not work.

## Your first conversation

1. Type a message to Mira and check that a generated reply appears.
2. Turn narration on and preview a voice in **Member settings**.
3. In a supported Chrome version, select **Start live conversation**, allow the microphone, speak, and pause for the reply.
4. If hands-free recognition is unavailable, select **Record voice message**, speak, then select **Send recording**.
5. Open **Room**, invite Mira and Nora, and ask each for a different suggestion.

Selecting **End live conversation** stops the live session and requests that Qwen and the Kokoro process started by the app release their model memory. The next conversation reloads the models. Saved text records remain available.

## How it works

| Component | Purpose |
| --- | --- |
| Browser interface | Chat, character settings, microphone input, portraits, and audio playback |
| Node.js server, port 3081 | Serves the app, streams replies, and saves member records |
| Ollama, port 11434 | Runs `qwen3:4b-instruct` for both members |
| Kokoro service, port 3082 | Generates English speech using each member's saved voice |
| Chrome on-device recognition | Recognizes spoken English for supported hands-free sessions |
| faster-whisper | Transcribes recorded English messages locally using `base.en` on the CPU |

The two members share a chat model but use different character profiles. Qwen receives recent turns from the open page and any explicitly remembered topic. Archived conversations are saved for review and export, but the full archive is not automatically sent to the model as long-term memory.

The interface includes English, Chinese, and Japanese labels. This does not mean that multilingual voice conversation or translation is already implemented; the current speech setup is English-focused.

## Data and privacy

New installations save records in:

```text
%LOCALAPPDATA%\See You Tomorrow
```

If the earlier `C:\GitHub\output\See You Tomorrow` folder already exists, the app continues using that directory. To choose a different location, set it before starting the server:

```powershell
$env:MIRA_DATA_DIR = Join-Path $env:LOCALAPPDATA 'See You Tomorrow'
node launcher.mjs
```

Mira, Nora, and the Room each have their own folder and `member.json`. These files contain profiles, timestamps, message text, and saved topics. The browser also keeps a local copy.

Raw microphone recordings and generated reply audio are not written into these history files. Recorded voice messages are processed in memory. Chat generation, speech synthesis, and recorded-message transcription run locally after their required downloads.

Before sharing a project folder or export, check that it contains only the files you intend to publish. The public source distribution does not include personal conversation records, model weights, or the local Python environment.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| The page does not open | Run the launcher and visit `http://127.0.0.1:3081/`. Keep the server window open. |
| Qwen does not reply | Start Ollama and check that `ollama list` includes `qwen3:4b-instruct`. |
| Text appears without speech | Enable narration, try an English reply, preview the member's voice, and check the terminal for Kokoro errors. |
| Hands-free speech does not work | Open the local page in supported Google Chrome, allow the microphone, and install the English recognition pack if offered. |
| The recognition pack is unavailable | Use **Record voice message** and **Send recording**, or type your message. |
| The first reply is slow | Initial model downloads and loading can take time. Later requests may be faster. |
| A character replies before you finish | Pause less between phrases or use recorded-message input for a complete turn. Better turn-taking is a planned improvement. |

## Development ideas

The project is an experimental prototype. Areas to improve include more patient turn-taking, better family-member awareness, more reliable factual answers, and more natural character behaviour.

Future experiments may include dedicated English practice, additional spoken languages, and speech translation. These are development directions rather than promises about the current version.

Ideas, bug reports, and contributions are welcome through [GitHub Issues](https://github.com/zhhwang168/see-you-tomorrow/issues) and pull requests.

## Credits

Developed by **zhhwang168 / TubeUnderdeveloped**, with assistance from ChatGPT and Codex.

Mira and Nora are fictional AI characters. The project includes AI-generated portraits.

The app builds on these projects:

- [Ollama](https://ollama.com/) — local model runtime.
- [Qwen](https://ollama.com/library/qwen3:4b-instruct) — conversation model.
- [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) — speech synthesis.
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — recorded-message transcription.
- [spaCy](https://spacy.io/) and [Misaki](https://github.com/hexgrad/misaki) — speech text-processing dependencies.
- [ArtificialGirlfriend](https://github.com/ARP224/ArtificialGirlfriend) — an early reference for the local voice workflow.

## Copyright and MIT license

Copyright (c) 2026 zhhwang168.

The original project source code and documentation are released under the [MIT License](https://opensource.org/license/mit), reproduced below. Third-party software, model weights, voices, fonts, and other third-party assets remain subject to their own licenses; this notice does not replace those terms.

```text
MIT License

Copyright (c) 2026 zhhwang168

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
