// Modes: 1, 2, 4 drivers
const MODES = [1, 2, 4];
let currentModeIndex = 0;

const modeHeader = document.getElementById('mode-header');

// --- GLOBAL BEST LAP (for purple highlight) -----------------------------
let globalBestLapTime = null;       // fastest lap time across all drivers
let globalBestLapDriverIdx = null;  // 0‑based index (0 = d1, 1 = d2 ...)

// --- GLOBAL BEST SPLIT (for purple highlight) ---------------------------
let globalBestSplitTime   = null;   // fastest split (ms) across all drivers
let globalBestSplitDriverIdx = null; // 0‑based index of that driver

function refreshPurpleSplitHighlight() {
    // Active only in 2‑ & 4‑driver modes
    if (MODES[currentModeIndex] !== 2 && MODES[currentModeIndex] !== 4) return;

    // remove old purple
    document.querySelectorAll('.best-split-span')
            .forEach(el => el.classList.remove('purple'));

    // apply to current fastest split
    if (globalBestSplitDriverIdx != null) {
        const el = document.querySelector(
            `#d${globalBestSplitDriverIdx + 1}-best-split`
        );
        if (el) el.classList.add('purple');
    }
}

function refreshPurpleHighlight() {
    // Only active in 2‑ & 4‑driver screens
    if (MODES[currentModeIndex] !== 2 && MODES[currentModeIndex] !== 4) return;

    // Remove any previous purple classes
    document.querySelectorAll('.best-lap-span').forEach(el =>
        el.classList.remove('purple')
    );

    // Apply purple to the span holding the overall fastest lap
    if (globalBestLapDriverIdx != null) {
        const el = document.querySelector(`#d${globalBestLapDriverIdx + 1}-best`);
        if (el) el.classList.add('purple');
    }
}

// --- Update active/inactive states of Lap/Split buttons based on mode ---
function refreshButtonStates() {
  const mode = MODES[currentModeIndex]; // 1, 2, or 4
  const activePairs = (mode === 1) ? 1 : (mode === 2 ? 2 : 4);
  [0, 1, 2, 3].forEach(i => {
    const lap = lapBtns[i], sp = splitBtns[i];
    if (!lap || !sp) return;
    if (i < activePairs) {
      lap.classList.remove('inactive');
      sp.classList.remove('inactive');
    } else {
      lap.classList.add('inactive');
      sp.classList.add('inactive');
    }
  });
}

// Promote mode if needed when tapping a Lap button (L2/L3/L4)
function maybeJumpModeForLap(idx /* 0..3 for L1..L4 */) {
  // idx=1 needs 2-driver; idx=2 or 3 needs 4-driver.
  if (idx === 1 && MODES[currentModeIndex] !== 2) {
    currentModeIndex = 1; // MODES[1] === 2
    modeHeader.textContent = getModeName(MODES[currentModeIndex]);
    onModeSwitch();
    // After DOM updates, re-click the same button to continue normal logic
    setTimeout(() => lapBtns[idx].click(), 0);
    return true;
  }
  if ((idx === 2 || idx === 3) && MODES[currentModeIndex] !== 4) {
    currentModeIndex = 2; // MODES[2] === 4
    modeHeader.textContent = getModeName(MODES[currentModeIndex]);
    onModeSwitch();
    setTimeout(() => lapBtns[idx].click(), 0);
    return true;
  }
  return false;
}

function recomputeGlobalBest2Driver() {
    const drivers = [timer2a, timer2b];
    globalBestLapTime = null;
    globalBestLapDriverIdx = null;

    drivers.forEach((t, idx) => {
        if (t.bestLapTime != null &&
            (globalBestLapTime == null || t.bestLapTime < globalBestLapTime)) {
            globalBestLapTime = t.bestLapTime;
            globalBestLapDriverIdx = idx;
        }
    });
    refreshPurpleHighlight();
}

function recomputeGlobalBest4Driver() {
    globalBestLapTime = null;
    globalBestLapDriverIdx = null;

    timer4.forEach((t, idx) => {
        if (t.bestLapTime != null &&
            (globalBestLapTime == null || t.bestLapTime < globalBestLapTime)) {
            globalBestLapTime = t.bestLapTime;
            globalBestLapDriverIdx = idx;
        }
    });
    refreshPurpleHighlight();
}

function recomputeGlobalBestSplit2Driver() {
    const drivers = [timer2a, timer2b];
    globalBestSplitTime = null;
    globalBestSplitDriverIdx = null;

    drivers.forEach((t, idx) => {
        if (t.bestSplit != null &&
           (globalBestSplitTime == null || t.bestSplit < globalBestSplitTime)) {
            globalBestSplitTime = t.bestSplit;
            globalBestSplitDriverIdx = idx;
        }
    });
    refreshPurpleSplitHighlight();
}

function recomputeGlobalBestSplit4Driver() {
    globalBestSplitTime = null;
    globalBestSplitDriverIdx = null;

    timer4.forEach((t, idx) => {
        if (t.bestSplit != null &&
           (globalBestSplitTime == null || t.bestSplit < globalBestSplitTime)) {
            globalBestSplitTime = t.bestSplit;
            globalBestSplitDriverIdx = idx;
        }
    });
    refreshPurpleSplitHighlight();
}

const dataWindow = document.getElementById('data-window');
const buttonGrid = document.querySelector('.button-grid');
const menuPopup = document.getElementById('menu-popup');

// Button references
const lapBtns = [
    document.getElementById('lap1'),
    document.getElementById('lap2'),
    document.getElementById('lap3'),
    document.getElementById('lap4'),
];
const splitBtns = [
    document.getElementById('split1'),
    document.getElementById('split2'),
    document.getElementById('split3'),
    document.getElementById('split4'),
];
const menuBtn = document.getElementById('menu-btn');
const okBtn = document.getElementById('ok-btn');

// --- micro-interaction helper (v2) ---
function microFeedback() {
    /* 1. Haptic kick-back (silently fails where unsupported) */
    if (navigator.vibrate) navigator.vibrate(30);
  
    /* 2. Always play the 50 ms click */
    const snd = new Audio('public/click.mp3');
    snd.volume = 1;
    snd.play().catch(() => {});   // ignore autoplay warnings
}


// Mode switching logic
function getModeName(mode) {
    if (mode === 1) return '1 Driver Mode';
    if (mode === 2) return '2 Driver Mode';
    if (mode === 4) return '4 Driver Mode';
    return '';
}

function renderDataWindow() {
    const mode = MODES[currentModeIndex];
    let html = '';
    if (mode === 1) {
        html = `
            <div><strong>Time:</strong> <span id="d1-time">00:00.00</span> <span id="d1-lap">(Lap #1)</span></div>
            <div><strong>Last:</strong> <span id="d1-last">--:--.--</span> <span id="d1-last-lap">(Lap #0)</span></div>
            <div><strong>Diff:</strong> <span id="d1-diff">+00.00</span></div>
            <div><strong>Best:</strong> <span id="d1-best">--:--.--</span> <span id="d1-best-lap">(Lap #0)</span></div>
            <div><strong>Split:</strong> <span id="d1-split-count">(0)</span> <span id="d1-split">--.--</span> [<span id="d1-best-split">--.--</span>]</div>
        `;
    } else if (mode === 2) {
        html = `
            <div><strong>Driver A:</strong></div>
            <div>&nbsp;&nbsp;Time: <span id="d1-time">00:00.00</span> (Lap <span id="d1-lap">#1</span>)</div>
            <div>&nbsp;&nbsp;Last: <span id="d1-last">--:--.--</span> (Lap <span id="d1-last-lap">#0</span>)</div>
            <div>&nbsp;&nbsp;Best: <span id="d1-best" class="best-lap-span">--:--.--</span> (Lap <span id="d1-best-lap">#0</span>)</div>
            <div>&nbsp;&nbsp;Split: <span id="d1-split-count">(0)</span> <span id="d1-split">--.--</span> [<span id="d1-best-split" class="best-split-span">--.--</span>]</div>
            <br>
            <div><strong>Driver B:</strong></div>
            <div>&nbsp;&nbsp;Time: <span id="d2-time">00:00.00</span> (Lap <span id="d2-lap">#1</span>)</div>
            <div>&nbsp;&nbsp;Last: <span id="d2-last">--:--.--</span> (Lap <span id="d2-last-lap">#0</span>)</div>
            <div>&nbsp;&nbsp;Best: <span id="d2-best" class="best-lap-span">--:--.--</span> (Lap <span id="d2-best-lap">#0</span>)</div>
            <div>&nbsp;&nbsp;Split: <span id="d2-split-count">(0)</span> <span id="d2-split">--.--</span> [<span id="d2-best-split" class="best-split-span">--.--</span>]</div>
        `;
    } else if (mode === 4) {
        html = `
            <div class="driver-block">
                <div><strong>Driver A:</strong> Time: <span id="d1-time">00:00.00</span> (Lap <span id="d1-lap">#1</span>)</div>
                <div class="driver-sub">Last: <span id="d1-last">--:--.--</span> &nbsp; Best: <span id="d1-best" class="best-lap-span">--:--.--</span> (Lap <span id="d1-best-lap">#0</span>)</div>
                <div class="driver-sub">Split: <span id="d1-split-count">(0)</span> <span id="d1-split">--.--</span> [<span id="d1-best-split" class="best-split-span">--.--</span>]</div>
            </div>
            <div class="driver-block">
                <div><strong>Driver B:</strong> Time: <span id="d2-time">00:00.00</span> (Lap <span id="d2-lap">#1</span>)</div>
                <div class="driver-sub">Last: <span id="d2-last">--:--.--</span> &nbsp; Best: <span id="d2-best" class="best-lap-span">--:--.--</span> (Lap <span id="d2-best-lap">#0</span>)</div>
                <div class="driver-sub">Split: <span id="d2-split-count">(0)</span> <span id="d2-split">--.--</span> [<span id="d2-best-split" class="best-split-span">--.--</span>]</div>
            </div>
            <div class="driver-block">
                <div><strong>Driver C:</strong> Time: <span id="d3-time">00:00.00</span> (Lap <span id="d3-lap">#1</span>)</div>
                <div class="driver-sub">Last: <span id="d3-last">--:--.--</span> &nbsp; Best: <span id="d3-best" class="best-lap-span">--:--.--</span> (Lap <span id="d3-best-lap">#0</span>)</div>
                <div class="driver-sub">Split: <span id="d3-split-count">(0)</span> <span id="d3-split">--.--</span> [<span id="d3-best-split" class="best-split-span">--.--</span>]</div>
            </div>
            <div class="driver-block">
                <div><strong>Driver D:</strong> Time: <span id="d4-time">00:00.00</span> (Lap <span id="d4-lap">#1</span>)</div>
                <div class="driver-sub">Last: <span id="d4-last">--:--.--</span> &nbsp; Best: <span id="d4-best" class="best-lap-span">--:--.--</span> (Lap <span id="d4-best-lap">#0</span>)</div>
                <div class="driver-sub">Split: <span id="d4-split-count">(0)</span> <span id="d4-split">--.--</span> [<span id="d4-best-split" class="best-split-span">--.--</span>]</div>
            </div>
        `;
    }
    dataWindow.innerHTML = html;
    wireClickSound();
}

function updateButtonGrid() {
    // 1) Ensure ALL lap/split buttons are visible in every mode
    lapBtns.forEach((btn) => { btn.style.display = ''; });
    splitBtns.forEach((btn) => { btn.style.display = ''; });

    // 2) Do NOT set disabled or block clicks; L2/L3/L4 should be tappable
    //    so they can promote the mode and start their driver.

    // 3) Rely on our central visual logic
    refreshButtonStates();
    wireClickSound();
}

function switchMode() {
    currentModeIndex = (currentModeIndex + 1) % MODES.length;
    modeHeader.textContent = getModeName(MODES[currentModeIndex]);
    renderDataWindow();
    updateButtonGrid();
}

modeHeader.addEventListener('click', switchMode);
modeHeader.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        switchMode();
    }
});

// 🔊  Attach click-sound to every interactive control
function wireClickSound() {
  const selectors = [
    '.lap-btn', '.split-btn',                 // timing buttons
    '#menu-btn', '#ok-btn',                   // grid extras
    '#mode-header',                           // header tap
    '#menu-popup button',                     // popup items
  ];
  selectors.forEach(sel =>
    document.querySelectorAll(sel).forEach(el => {
      el.removeEventListener('click', microFeedback);   // avoid duplicates
      el.addEventListener('click', microFeedback, { passive: true });
    })
  );
}

// Initial render
modeHeader.textContent = getModeName(MODES[currentModeIndex]);
renderDataWindow();
updateButtonGrid();

// Attach haptic/audio feedback to every Lap & Split button
document.querySelectorAll('.lap-btn, .split-btn').forEach(btn =>
    btn.addEventListener('click', microFeedback, { capture: true })
);

// --- 1 DRIVER MODE STOPWATCH LOGIC ---

// State for 1-driver mode
let timer1 = {
    running: false,
    startTimestamp: null, // ms since epoch
    elapsed: 0, // ms, accumulates when paused
    intervalId: null,
    lapNum: 1,
    laps: [], // {time, lapNum}
    lastLapTime: null,
    bestLapTime: null,
    bestLapNum: null,
    diff: 0,
    splitCount: 0,
    splits: [], // {time, lapNum, splitNum}
    lastSplit: null,
    bestSplit: null,
};

// --- 2 DRIVER MODE STOPWATCH LOGIC ---
// State for 2-driver mode (Driver A = timer2a, Driver B = timer2b)
let timer2a = createTimerState();
let timer2b = createTimerState();
let interval2 = null;

function createTimerState() {
    return {
        running: false,
        startTimestamp: null,
        elapsed: 0,
        lapNum: 1,
        laps: [],
        lastLapTime: null,
        bestLapTime: null,
        bestLapNum: null,
        diff: 0,
        splitCount: 0,
        splits: [],
        lastSplit: null,
        bestSplit: null,
    };
}

function formatTime(ms) {
    if (ms == null) return '--:--.--';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10); // centiseconds
    return `${m}:${s.toString().padStart(2,'0')}.${cs.toString().padStart(2,'0')}`;
}

/* ---- per-driver LAST-lap colour helper ------------------- */
function applyLastLapColor(driverIdx, lapTime, prevBest) {
    const el = document.getElementById(`d${driverIdx}-last`);
    if (!el) return;
    el.classList.remove('greenlap', 'yellowlap');
    if (prevBest == null || lapTime < prevBest) {
        el.classList.add('greenlap');   // faster  ⇒ green
    } else {
        el.classList.add('yellowlap');  // slower  ⇒ yellow
    }
}

// --- 2 DRIVER MODE DATA WINDOW UPDATE ---
function update2DriverDataWindow() {
    // Driver A
    if (document.getElementById('d1-time')) {
        document.getElementById('d1-time').textContent = formatTime(timer2a.running ? Date.now() - timer2a.startTimestamp + timer2a.elapsed : timer2a.elapsed);
        document.getElementById('d1-lap').textContent = `#${timer2a.lapNum}`;
        // Last lap
        if (document.getElementById('d1-last')) {
            document.getElementById('d1-last').textContent =
                timer2a.lastLapTime != null ? formatTime(timer2a.lastLapTime) : '--:--.--';
        }
        if (document.getElementById('d1-last-lap')) {
            const last = timer2a.lapNum > 1 ? timer2a.lapNum - 1 : 0;
            document.getElementById('d1-last-lap').textContent = `#${last}`;
        }
        document.getElementById('d1-best').textContent = timer2a.bestLapTime != null ? formatTime(timer2a.bestLapTime) : '--:--.--';
        document.getElementById('d1-best-lap').textContent = `#${timer2a.bestLapNum || 0}`;
        document.getElementById('d1-split-count').textContent = `(${timer2a.splitCount})`;
        document.getElementById('d1-split').textContent = timer2a.lastSplit != null ? (timer2a.lastSplit/1000).toFixed(2) : '--.--';
        document.getElementById('d1-best-split').textContent = timer2a.bestSplit != null ? (timer2a.bestSplit/1000).toFixed(2) : '--.--';
    }
    // Driver B
    if (document.getElementById('d2-time')) {
        document.getElementById('d2-time').textContent = formatTime(timer2b.running ? Date.now() - timer2b.startTimestamp + timer2b.elapsed : timer2b.elapsed);
        document.getElementById('d2-lap').textContent = `#${timer2b.lapNum}`;
        document.getElementById('d2-best').textContent = timer2b.bestLapTime != null ? formatTime(timer2b.bestLapTime) : '--:--.--';
        document.getElementById('d2-best-lap').textContent = `#${timer2b.bestLapNum || 0}`;
        // Last lap
        if (document.getElementById('d2-last')) {
            document.getElementById('d2-last').textContent =
                timer2b.lastLapTime != null ? formatTime(timer2b.lastLapTime) : '--:--.--';
        }
        if (document.getElementById('d2-last-lap')) {
            const last = timer2b.lapNum > 1 ? timer2b.lapNum - 1 : 0;
            document.getElementById('d2-last-lap').textContent = `#${last}`;
        }
        document.getElementById('d2-split-count').textContent = `(${timer2b.splitCount})`;
        document.getElementById('d2-split').textContent = timer2b.lastSplit != null ? (timer2b.lastSplit/1000).toFixed(2) : '--.--';
        document.getElementById('d2-best-split').textContent = timer2b.bestSplit != null ? (timer2b.bestSplit/1000).toFixed(2) : '--.--';
    }
}

function tick2Driver() {
    if (MODES[currentModeIndex] !== 2) return;
    update2DriverDataWindow();
}

function start2DriverTimer(timer) {
    if (timer.running) return;
    timer.running = true;
    timer.startTimestamp = Date.now();
    if (!interval2) interval2 = setInterval(tick2Driver, 31);
}

function stop2DriverTimer(timer) {
    if (!timer.running) return;
    timer.running = false;
    timer.elapsed += Date.now() - timer.startTimestamp;
    timer.startTimestamp = null;
    // If both stopped, clear interval
    if (!timer2a.running && !timer2b.running && interval2) {
        clearInterval(interval2);
        interval2 = null;
    }
}

function reset2DriverTimer() {
    stop2DriverTimer(timer2a);
    stop2DriverTimer(timer2b);
    timer2a = createTimerState();
    timer2b = createTimerState();
    update2DriverDataWindow();
    recomputeGlobalBest2Driver();
    recomputeGlobalBestSplit2Driver();
}

function lap2Driver(timer) {
    if (!timer.running) {
        // Start timer
        start2DriverTimer(timer);
        timer.lapNum = 1;
        timer.elapsed = 0;
        timer.laps = [];
        timer.lastLapTime = null;
        timer.bestLapTime = null;
        timer.bestLapNum = null;
        timer.diff = 0;
        timer.splitCount = 0;
        timer.splits = [];
        timer.lastSplit = null;
        timer.bestSplit = null;
        update2DriverDataWindow();
        recomputeGlobalBest2Driver();
        recomputeGlobalBestSplit2Driver();
    } else {
        // End current lap
        const lapTime = Date.now() - timer.startTimestamp + timer.elapsed;
        const prevBest = timer.bestLapTime;          // NEW
        timer.laps.push({ time: lapTime, lapNum: timer.lapNum });
        timer.lastLapTime = lapTime;
        if (timer.bestLapTime == null || lapTime < timer.bestLapTime) {
            timer.bestLapTime = lapTime;
            timer.bestLapNum = timer.lapNum;
        }
        applyLastLapColor(timer === timer2a ? 1 : 2, lapTime, prevBest); // NEW
        timer.diff = timer.bestLapTime != null ? lapTime - timer.bestLapTime : 0;
        timer.lapNum++;
        // Reset timer for next lap
        timer.elapsed = 0;
        timer.startTimestamp = Date.now();
        timer.splitCount = 0;
        timer.lastSplit = null;
        update2DriverDataWindow();
        recomputeGlobalBest2Driver();
        recomputeGlobalBestSplit2Driver();
    }
}

function split2Driver(timer) {
    if (!timer.running) return;
    const splitTime = Date.now() - timer.startTimestamp + timer.elapsed;
    timer.splitCount++;
    timer.splits.push({ time: splitTime, lapNum: timer.lapNum, splitNum: timer.splitCount });
    timer.lastSplit = splitTime;
    if (timer.bestSplit == null || splitTime < timer.bestSplit) {
        timer.bestSplit = splitTime;
    }
    update2DriverDataWindow();
    recomputeGlobalBestSplit2Driver();
}

// L1/S1: Driver A
lapBtns[0].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 2) lap2Driver(timer2a);
});
splitBtns[0].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 2) split2Driver(timer2a);
});
// L2/S2: Driver B
lapBtns[1].addEventListener('click', () => {
    if (maybeJumpModeForLap(1)) return;
    if (MODES[currentModeIndex] === 2) lap2Driver(timer2b);
});
splitBtns[1].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 2) split2Driver(timer2b);
});

// Stop/Reset all timers in 2 driver mode
function stopAll2DriverTimers() {
    stop2DriverTimer(timer2a);
    stop2DriverTimer(timer2b);
}

// --- END 2 DRIVER MODE LOGIC ---

// --- 4 DRIVER MODE STOPWATCH LOGIC ---
// State for 4-driver mode (timers for each driver)
let timer4 = [createTimerState(), createTimerState(), createTimerState(), createTimerState()];
let interval4 = null;

function update4DriverDataWindow() {
    for (let i = 0; i < 4; i++) {
        const prefix = `d${i+1}-`;
        const t = timer4[i];
        // Time and Lap
        if (document.getElementById(prefix + 'lap')) {
            document.getElementById(prefix + 'lap').textContent = t.lapNum;
        }
        if (document.getElementById(prefix + 'time')) {
            document.getElementById(prefix + 'time').textContent = formatTime(t.running ? Date.now() - t.startTimestamp + t.elapsed : t.elapsed);
        }
        // Last lap (time only)
        if (document.getElementById(prefix + 'last')) {
            document.getElementById(prefix + 'last').textContent =
                t.lastLapTime != null ? formatTime(t.lastLapTime) : '--:--.--';
        }
        // Best lap
        if (document.getElementById(prefix + 'best')) {
            document.getElementById(prefix + 'best').textContent = t.bestLapTime != null ? formatTime(t.bestLapTime) : '--:--.--';
        }
        if (document.getElementById(prefix + 'best-lap')) {
            document.getElementById(prefix + 'best-lap').textContent = t.bestLapNum != null ? t.bestLapNum : '#0';
        }
        // Split count
        if (document.getElementById(prefix + 'split-count')) {
            document.getElementById(prefix + 'split-count').textContent = `(${t.splitCount})`;
        }
        // Last split
        if (document.getElementById(prefix + 'split')) {
            document.getElementById(prefix + 'split').textContent = t.lastSplit != null ? (t.lastSplit/1000).toFixed(2) : '--.--';
        }
        // Best split
        if (document.getElementById(prefix + 'best-split')) {
            document.getElementById(prefix + 'best-split').textContent = t.bestSplit != null ? (t.bestSplit/1000).toFixed(2) : '--.--';
        }
}
wireClickSound();
}

function lap4Driver(idx) {
    const t = timer4[idx];
        if (!t.running) {
        // Start timer
        start4DriverTimer(idx);
        t.lapNum = 1;
        t.elapsed = 0;
        t.laps = [];
        t.lastLapTime = null;
        t.bestLapTime = null;
        t.bestLapNum = null;
        t.diff = 0;
        t.splitCount = 0;
        t.splits = [];
        t.lastSplit = null;
        t.bestSplit = null;
        update4DriverDataWindow();
        recomputeGlobalBest4Driver();
        recomputeGlobalBestSplit4Driver();
    } else {
        // End current lap
        const lapTime = Date.now() - t.startTimestamp + t.elapsed;
        t.laps.push({ time: lapTime, lapNum: t.lapNum });
        t.lastLapTime = lapTime;
        const prevBest = t.bestLapTime;               //  NEW
        applyLastLapColor(idx + 1, lapTime, prevBest); //  NEW
        if (t.bestLapTime == null || lapTime < t.bestLapTime) {
            t.bestLapTime = lapTime;
            t.bestLapNum = t.lapNum;
        }
        t.diff = t.bestLapTime != null ? lapTime - t.bestLapTime : 0;
        t.lapNum++;
        // Reset timer for next lap
        t.elapsed = 0;
        t.startTimestamp = Date.now();
        t.splitCount = 0;
        t.lastSplit = null;
        update4DriverDataWindow();
        recomputeGlobalBest4Driver();
        recomputeGlobalBestSplit4Driver();
    }
}

function split4Driver(idx) {
        const t = timer4[idx];
    if (!t.running) return;
    const splitTime = Date.now() - t.startTimestamp + t.elapsed;
    t.splitCount++;
    t.splits.push({ time: splitTime, lapNum: t.lapNum, splitNum: t.splitCount });
    t.lastSplit = splitTime;
    if (t.bestSplit == null || splitTime < t.bestSplit) {
        t.bestSplit = splitTime;
    }
    update4DriverDataWindow();
    recomputeGlobalBestSplit4Driver();
}


function tick4Driver() {
    if (MODES[currentModeIndex] !== 4) return;
    update4DriverDataWindow();
    recomputeGlobalBestSplit4Driver();
}

function start4DriverTimer(idx) {
    if (timer4[idx].running) return;
    timer4[idx].running = true;
    timer4[idx].startTimestamp = Date.now();
    if (!interval4) interval4 = setInterval(tick4Driver, 31);
}

function stop4DriverTimer(idx) {
    if (!timer4[idx].running) return;
    timer4[idx].running = false;
    timer4[idx].elapsed += Date.now() - timer4[idx].startTimestamp;
    timer4[idx].startTimestamp = null;
    // If all stopped, clear interval
    if (!timer4.some(t => t.running) && interval4) {
        clearInterval(interval4);
        interval4 = null;
    }
}

function reset4DriverTimers() {
    for (let i = 0; i < 4; i++) stop4DriverTimer(i);
    timer4 = [createTimerState(), createTimerState(), createTimerState(), createTimerState()];
    update4DriverDataWindow();
    recomputeGlobalBest4Driver();
    recomputeGlobalBestSplit4Driver();
}

function lap4Driver(idx) {
    const t = timer4[idx];
        if (!t.running) {
        // Start timer
        start4DriverTimer(idx);
        t.lapNum = 1;
        t.elapsed = 0;
        t.laps = [];
        t.lastLapTime = null;
        t.bestLapTime = null;
        t.bestLapNum = null;
        t.diff = 0;
        t.splitCount = 0;
        t.splits = [];
        t.lastSplit = null;
        t.bestSplit = null;
        update4DriverDataWindow();
        recomputeGlobalBest4Driver();
        recomputeGlobalBestSplit4Driver();
    } else {
        // End current lap
        const lapTime = Date.now() - t.startTimestamp + t.elapsed;
        t.laps.push({ time: lapTime, lapNum: t.lapNum });
        t.lastLapTime = lapTime;
        const prevBest = t.bestLapTime;               //  NEW
        applyLastLapColor(idx + 1, lapTime, prevBest); //  NEW
        if (t.bestLapTime == null || lapTime < t.bestLapTime) {
            t.bestLapTime = lapTime;
            t.bestLapNum = t.lapNum;
        }
        t.diff = t.bestLapTime != null ? lapTime - t.bestLapTime : 0;
        t.lapNum++;
        // Reset timer for next lap
        t.elapsed = 0;
        t.startTimestamp = Date.now();
        t.splitCount = 0;
        t.lastSplit = null;
        update4DriverDataWindow();
        recomputeGlobalBest4Driver();
        recomputeGlobalBestSplit4Driver();
    }
}

function split4Driver(idx) {
        const t = timer4[idx];
    if (!t.running) return;
    const splitTime = Date.now() - t.startTimestamp + t.elapsed;
    t.splitCount++;
    t.splits.push({ time: splitTime, lapNum: t.lapNum, splitNum: t.splitCount });
    t.lastSplit = splitTime;
    if (t.bestSplit == null || splitTime < t.bestSplit) {
        t.bestSplit = splitTime;
    }
    update4DriverDataWindow();
    recomputeGlobalBestSplit4Driver();
}

// L1/S1, L2/S2, L3/S3, L4/S4 for 4 Driver Mode
lapBtns[0].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) lap4Driver(0);
});
splitBtns[0].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) split4Driver(0);
});
lapBtns[1].addEventListener('click', () => {
    if (maybeJumpModeForLap(1)) return;
    if (MODES[currentModeIndex] === 4) lap4Driver(1);
});
splitBtns[1].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) split4Driver(1);
});
lapBtns[2].addEventListener('click', () => {
    if (maybeJumpModeForLap(2)) return;
    if (MODES[currentModeIndex] === 4) lap4Driver(2);
});
splitBtns[2].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) split4Driver(2);
});
lapBtns[3].addEventListener('click', () => {
    if (maybeJumpModeForLap(3)) return;
    if (MODES[currentModeIndex] === 4) lap4Driver(3);
});
splitBtns[3].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) split4Driver(3);
});

function stopAll4DriverTimers() {
    for (let i = 0; i < 4; i++) stop4DriverTimer(i);
}
// --- END 4 DRIVER MODE LOGIC ---

function update1DriverDataWindow() {
    // Update all relevant fields
    document.getElementById('d1-time').textContent = formatTime(timer1.running ? Date.now() - timer1.startTimestamp + timer1.elapsed : timer1.elapsed);
    document.getElementById('d1-lap').textContent = `(Lap #${timer1.lapNum})`;
    document.getElementById('d1-last').textContent = timer1.lastLapTime != null ? formatTime(timer1.lastLapTime) : '--:--.--';
    document.getElementById('d1-last-lap').textContent = `(Lap #${timer1.lapNum-1})`;
    document.getElementById('d1-diff').textContent = timer1.bestLapTime != null && timer1.lastLapTime != null ?
        ((timer1.lastLapTime - timer1.bestLapTime >= 0 ? '+' : '-') + (Math.abs(timer1.lastLapTime - timer1.bestLapTime)/1000).toFixed(2)) : '+00.00';
    document.getElementById('d1-best').textContent = timer1.bestLapTime != null ? formatTime(timer1.bestLapTime) : '--:--.--';
    document.getElementById('d1-best-lap').textContent = `(Lap #${timer1.bestLapNum || 0})`;
    document.getElementById('d1-split-count').textContent = `(${timer1.splitCount})`;
    document.getElementById('d1-split').textContent = timer1.lastSplit != null ? (timer1.lastSplit/1000).toFixed(2) : '--.--';
    document.getElementById('d1-best-split').textContent = timer1.bestSplit != null ? (timer1.bestSplit/1000).toFixed(2) : '--.--';
}

function tick1Driver() {
    if (MODES[currentModeIndex] !== 1) return;
    update1DriverDataWindow();
}

function start1DriverTimer() {
    if (timer1.running) return;
    timer1.running = true;
    timer1.startTimestamp = Date.now();
    timer1.intervalId = setInterval(tick1Driver, 31); // ~30fps
}

function stop1DriverTimer() {
    if (!timer1.running) return;
    timer1.running = false;
    clearInterval(timer1.intervalId);
    timer1.elapsed += Date.now() - timer1.startTimestamp;
    timer1.intervalId = null;
}

function reset1DriverTimer() {
    stop1DriverTimer();
    timer1 = {
        running: false,
        startTimestamp: null,
        elapsed: 0,
        intervalId: null,
        lapNum: 1,
        laps: [],
        lastLapTime: null,
        bestLapTime: null,
        bestLapNum: null,
        diff: 0,
        splitCount: 0,
        splits: [],
        lastSplit: null,
        bestSplit: null,
    };
    update1DriverDataWindow();
}

// L1 button logic
lapBtns[0].addEventListener('click', () => {
    if (MODES[currentModeIndex] !== 1) return;
    if (!timer1.running) {
        // First tap: start timer
        start1DriverTimer();
        timer1.lapNum = 1;
        timer1.elapsed = 0;
        timer1.laps = [];
        timer1.lastLapTime = null;
        timer1.bestLapTime = null;
        timer1.bestLapNum = null;
        timer1.diff = 0;
        timer1.splitCount = 0;
        timer1.splits = [];
        timer1.lastSplit = null;
        timer1.bestSplit = null;
        update1DriverDataWindow();
    } else {
        // End current lap  -----------------------------------------
const lapTime  = Date.now() - timer1.startTimestamp + timer1.elapsed;
const prevBest = timer1.bestLapTime;          // << NEW: snapshot PB
timer1.laps.push({ time: lapTime, lapNum: timer1.lapNum });
timer1.lastLapTime = lapTime;
// Best-lap logic (existing)
if (timer1.bestLapTime == null || lapTime < timer1.bestLapTime) {
    timer1.bestLapTime = lapTime;
    timer1.bestLapNum  = timer1.lapNum;
}
// Diff (existing)
timer1.diff = timer1.bestLapTime != null ? lapTime - timer1.bestLapTime : 0;
// Colour feedback  --------- NEW
applyLastLapColor(1, lapTime, prevBest);
// Lap ++ and reset clock for next lap (existing lines)
timer1.lapNum++;
timer1.elapsed        = 0;
timer1.startTimestamp = Date.now();
timer1.splitCount     = 0;
timer1.lastSplit      = null;
update1DriverDataWindow();
    }
});

// S1 button logic
splitBtns[0].addEventListener('click', () => {
    if (MODES[currentModeIndex] !== 1 || !timer1.running) return;
    const splitTime = Date.now() - timer1.startTimestamp + timer1.elapsed;
    timer1.splitCount++;
    timer1.splits.push({ time: splitTime, lapNum: timer1.lapNum, splitNum: timer1.splitCount });
    timer1.lastSplit = splitTime;
    if (timer1.bestSplit == null || splitTime < timer1.bestSplit) {
        timer1.bestSplit = splitTime;
    }
    update1DriverDataWindow();
});

// Reset timer when switching modes or on reset action
function onModeSwitch() {
    renderDataWindow();
    updateButtonGrid();
    if (MODES[currentModeIndex] === 1) {
        update1DriverDataWindow();
    } else {
        stop1DriverTimer();
    }
    refreshButtonStates();
}

modeHeader.removeEventListener('click', switchMode);
modeHeader.addEventListener('click', () => {
    currentModeIndex = (currentModeIndex + 1) % MODES.length;
    modeHeader.textContent = getModeName(MODES[currentModeIndex]);
    onModeSwitch();
});
modeHeader.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        currentModeIndex = (currentModeIndex + 1) % MODES.length;
        modeHeader.textContent = getModeName(MODES[currentModeIndex]);
        onModeSwitch();
    }
});

// Menu popup logic
menuBtn.addEventListener('click', () => {
    menuPopup.style.display = 'flex';
});
menuPopup.addEventListener('click', (e) => {
    if (e.target === menuPopup) {
        menuPopup.style.display = 'none';
    }
});
// Menu actions (to be implemented)
document.getElementById('stop-timing').addEventListener('click', () => {
    if (MODES[currentModeIndex] === 1) {
        stop1DriverTimer();
    } else if (MODES[currentModeIndex] === 2) {
        stopAll2DriverTimers();
    } else if (MODES[currentModeIndex] === 4) {
        stopAll4DriverTimers();
    }
    menuPopup.style.display = 'none';
});
document.getElementById('reset-timing').addEventListener('click', () => {
    if (MODES[currentModeIndex] === 1) {
        reset1DriverTimer();
    } else if (MODES[currentModeIndex] === 2) {
        reset2DriverTimer();
    } else if (MODES[currentModeIndex] === 4) {
        reset4DriverTimers();
    }
    menuPopup.style.display = 'none';
});
document.getElementById('user-guide').addEventListener('click', () => {
    if (MODES[currentModeIndex] === 1 || MODES[currentModeIndex] === 2 || MODES[currentModeIndex] === 4) {
        menuPopup.style.display = 'none';
        document.getElementById('user-guide-popup').style.display = 'flex';
    } else {
        menuPopup.style.display = 'none';
    }
});

// Dismiss User Guide popup when clicking on the overlay (but not the popup window itself)
document.getElementById('user-guide-popup').addEventListener('click', function(e) {
    if (e.target === this) {
        this.style.display = 'none';
    }
});

// OK button (no action in MVP)
okBtn.addEventListener('click', () => {});

// Initialize 1-driver mode fields
if (MODES[currentModeIndex] === 1) update1DriverDataWindow();
updateButtonGrid();
refreshButtonStates();

