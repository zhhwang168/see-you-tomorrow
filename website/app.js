const player = document.querySelector('#showcase');
const status = document.querySelector('#player-status');
const chapterButtons = [...document.querySelectorAll('[data-time]')];
let selection = 0;

async function playChapter(time, button) {
  const request = ++selection;
  try {
    if (player.readyState === 0) {
      await new Promise((resolve, reject) => {
        const clear = () => { player.removeEventListener('loadedmetadata', loaded); player.removeEventListener('error', failed); };
        const loaded = () => { clear(); resolve(); };
        const failed = () => { clear(); reject(new Error('The video could not load. Please try the download link below.')); };
        player.addEventListener('loadedmetadata', loaded, { once: true });
        player.addEventListener('error', failed, { once: true });
        player.load();
      });
    }
    if (request !== selection) return;
    player.currentTime = time;
    for (const item of chapterButtons) item.setAttribute('aria-pressed', String(item === button));
    await player.play();
    status.textContent = '';
  } catch {
    if (request === selection) status.textContent = 'Press Play in the video player to start. If it cannot load, download the MP4 from the transcript section.';
  }
}
for (const button of chapterButtons) button.addEventListener('click', () => playChapter(Number(button.dataset.time), button));
for (const button of document.querySelectorAll('.copy')) {
  button.addEventListener('click', async () => {
    const prompt = button.closest('article').querySelector('.prompt-text').textContent;
    const copyStatus = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(prompt);
      copyStatus.textContent = 'Prompt copied. Paste it into the local app.';
    } catch {
      copyStatus.textContent = 'Select the prompt text above and copy it using your browser.';
    }
  });
}
