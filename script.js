// Feature detect
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  document.body.innerHTML = `
        <h1>Speech Recognition Not Supported</h1>
        <p>Your browser does not support the Web Speech API's SpeechRecognition. Try Chrome or Edge (Chromium) and run over HTTPS or localhost.</p>
      `;
  throw new Error('SpeechRecognition not supported');
}

// UI references
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const finalEl = document.getElementById('final');
const interimEl = document.getElementById('interim');
const langSelect = document.getElementById('langSelect');
const modeSelect = document.getElementById('modeSelect');
const interimSelect = document.getElementById('interimSelect');

// recognition instance
const recognition = new SpeechRecognition();

// config defaults
recognition.lang = 'en-US';
recognition.continuous = true;      // keep listening (set by Mode)
recognition.interimResults = true;  // show interim results live

let finalTranscript = '';
let shouldAutoRestart = false; // set true to automatically restart onend (careful with loops)

function setStatus(text, color = '') {
  statusEl.innerHTML = `Status: <strong>${text}</strong>`;
  if (color) statusEl.style.color = color; else statusEl.style.color = '';
}

// handle results (robust handling of interim + final)
recognition.onresult = (event) => {
  let interim = '';
  // event.resultIndex is the first changed result index
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const res = event.results[i];
    const transcript = res[0].transcript;
    if (res.isFinal) {
      finalTranscript += transcript;
    } else {
      interim += transcript;
    }
  }
  finalEl.textContent = finalTranscript.trim();
  interimEl.textContent = interim.trim();
  console.log('result event', { interim, finalTranscript });
  // if mode is single and we got a final, stop
  if (modeSelect.value === 'single' && interim === '' && event.results[event.results.length - 1].isFinal) {
    recognition.stop();
  }
};

recognition.onerror = (err) => {
  console.error('Speech recognition error', err);
  setStatus('error: ' + (err.error || 'unknown'), 'crimson');
};

recognition.onstart = () => {
  setStatus('listening', 'green');
  console.log('Speech recognition started');
};

recognition.onend = () => {
  setStatus('stopped');
  console.log('Speech recognition ended');
  // optionally auto-restart if continuous mode and the user wants it
  if (shouldAutoRestart && recognition.continuous) {
    try { recognition.start(); } catch (e) { console.warn('Restart failed', e); }
  }
};

// wire the UI
startBtn.addEventListener('click', () => {
  // apply UI-configured options BEFORE starting
  recognition.lang = (langSelect.value === 'auto') ? navigator.language || 'en-US' : langSelect.value;
  recognition.interimResults = interimSelect.value === 'true';
  recognition.continuous = modeSelect.value === 'continuous';
  // clear interim box only
  interimEl.textContent = '';
  try {
    recognition.start(); // must be user gesture for many browsers
    setStatus('starting…');
  } catch (e) {
    console.error('start() failed', e);
    setStatus('error starting');
  }
});

stopBtn.addEventListener('click', () => {
  try {
    shouldAutoRestart = false;
    recognition.stop();
    setStatus('stopping…');
  } catch (e) {
    console.warn('stop() failed', e);
  }
});

// convenience: press Ctrl+M to clear transcripts
window.addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'm') {
    finalTranscript = '';
    finalEl.textContent = '';
    interimEl.textContent = '';
  }
});

// expose for debug in console
window._sr = { recognition, getFinal: () => finalTranscript };

// You had a recognition.start() in your snippet. If you want to auto-start, either:
// - call recognition.start() here (but many browsers require user gesture),
// - or set shouldAutoRestart = true and start once from the UI.
// For predictable behavior, we leave auto-start off.