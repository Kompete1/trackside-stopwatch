// Modes: 1, 2, 4 drivers
const MODES = [1, 2, 4];
let currentModeIndex = 0;

const modeHeader = document.getElementById('mode-header');

// --- GLOBAL BEST LAP (for purple highlight) -----------------------------
let globalBestLapTime = null;       // fastest lap time across all drivers
let globalBestLapDriverIdx = null;  // 0‑based index (0 = d1, 1 = d2 ...)

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

// --- micro‑interaction helper ---
function microFeedback() {
    // Try vibration first
    const vibrated = navigator.vibrate ? navigator.vibrate(30) : false;
    // If vibration unavailable (iOS Safari) fall back to a tiny click sound
    if (!vibrated) {
        const click = document.getElementById('click-sound');
        if (click) {
            click.currentTime = 0;
            click.play().catch(()=>{}); // ignore auto‑play blocks
        }
    }
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
            <div>&nbsp;&nbsp;Best: <span id="d1-best" class="best-lap-span">--:--.--</span> (Lap <span id="d1-best-lap">#0</span>)</div>
            <div>&nbsp;&nbsp;Split: <span id="d1-split-count">(0)</span> <span id="d1-split">--.--</span> [<span id="d1-best-split">--.--</span>]</div>
            <br>
            <div><strong>Driver B:</strong></div>
            <div>&nbsp;&nbsp;Time: <span id="d2-time">00:00.00</span> (Lap <span id="d2-lap">#1</span>)</div>
            <div>&nbsp;&nbsp;Best: <span id="d2-best" class="best-lap-span">--:--.--</span> (Lap <span id="d2-best-lap">#0</span>)</div>
            <div>&nbsp;&nbsp;Split: <span id="d2-split-count">(0)</span> <span id="d2-split">--.--</span> [<span id="d2-best-split">--.--</span>]</div>
        `;
    } else if (mode === 4) {
        html = `
            <div class="driver-block">
                <div><strong>Driver A:</strong> Time: <span id="d1-time">00:00.00</span> (Lap <span id="d1-lap">#1</span>)</div>
                <div class="driver-sub">Diff: <span id="d1-diff">+00.00</span> &nbsp; Best: <span id="d1-best" class="best-lap-span">--:--.--</span> (Lap <span id="d1-best-lap">#0</span>)</div>
                <div class="driver-sub">Split: <span id="d1-split-count">(0)</span> <span id="d1-split">--.--</span> [<span id="d1-best-split">--.--</span>]</div>
            </div>
            <div class="driver-block">
                <div><strong>Driver B:</strong> Time: <span id="d2-time">00:00.00</span> (Lap <span id="d2-lap">#1</span>)</div>
                <div class="driver-sub">Diff: <span id="d2-diff">+00.00</span> &nbsp; Best: <span id="d2-best" class="best-lap-span">--:--.--</span> (Lap <span id="d2-best-lap">#0</span>)</div>
                <div class="driver-sub">Split: <span id="d2-split-count">(0)</span> <span id="d2-split">--.--</span> [<span id="d2-best-split">--.--</span>]</div>
            </div>
            <div class="driver-block">
                <div><strong>Driver C:</strong> Time: <span id="d3-time">00:00.00</span> (Lap <span id="d3-lap">#1</span>)</div>
                <div class="driver-sub">Diff: <span id="d3-diff">+00.00</span> &nbsp; Best: <span id="d3-best" class="best-lap-span">--:--.--</span> (Lap <span id="d3-best-lap">#0</span>)</div>
                <div class="driver-sub">Split: <span id="d3-split-count">(0)</span> <span id="d3-split">--.--</span> [<span id="d3-best-split">--.--</span>]</div>
            </div>
            <div class="driver-block">
                <div><strong>Driver D:</strong> Time: <span id="d4-time">00:00.00</span> (Lap <span id="d4-lap">#1</span>)</div>
                <div class="driver-sub">Diff: <span id="d4-diff">+00.00</span> &nbsp; Best: <span id="d4-best" class="best-lap-span">--:--.--</span> (Lap <span id="d4-best-lap">#0</span>)</div>
                <div class="driver-sub">Split: <span id="d4-split-count">(0)</span> <span id="d4-split">--.--</span> [<span id="d4-best-split">--.--</span>]</div>
            </div>
        `;
    }
    dataWindow.innerHTML = html;
}

function updateButtonGrid() {
    const mode = MODES[currentModeIndex];
    // Enable/disable lap/split buttons according to mode
    for (let i = 0; i < 4; i++) {
        lapBtns[i].style.display = (i < mode) ? '' : 'none';
        splitBtns[i].style.display = (i < mode) ? '' : 'none';
    }
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

// --- 2 DRIVER MODE DATA WINDOW UPDATE ---
function update2DriverDataWindow() {
    // Driver A
    if (document.getElementById('d1-time')) {
        document.getElementById('d1-time').textContent = formatTime(timer2a.running ? Date.now() - timer2a.startTimestamp + timer2a.elapsed : timer2a.elapsed);
        document.getElementById('d1-lap').textContent = `#${timer2a.lapNum}`;
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
    } else {
        // End current lap
        const lapTime = Date.now() - timer.startTimestamp + timer.elapsed;
        timer.laps.push({ time: lapTime, lapNum: timer.lapNum });
        timer.lastLapTime = lapTime;
        if (timer.bestLapTime == null || lapTime < timer.bestLapTime) {
            timer.bestLapTime = lapTime;
            timer.bestLapNum = timer.lapNum;
        }
        timer.diff = timer.bestLapTime != null ? lapTime - timer.bestLapTime : 0;
        timer.lapNum++;
        // Reset timer for next lap
        timer.elapsed = 0;
        timer.startTimestamp = Date.now();
        timer.splitCount = 0;
        timer.lastSplit = null;
        update2DriverDataWindow();
        recomputeGlobalBest2Driver();
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
        // Diff
        if (document.getElementById(prefix + 'diff')) {
            let diff = '';
            if (t.lastLapTime != null && t.bestLapTime != null) {
                const d = t.lastLapTime - t.bestLapTime;
                diff = (d >= 0 ? '+' : '') + (d / 1000).toFixed(2);
            } else {
                diff = '+00.00';
            }
            document.getElementById(prefix + 'diff').textContent = diff;
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
    } else {
        // End current lap
        const lapTime = Date.now() - t.startTimestamp + t.elapsed;
        t.laps.push({ time: lapTime, lapNum: t.lapNum });
        t.lastLapTime = lapTime;
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
        recomputeGlobalBest4Driver();
}


function tick4Driver() {
    if (MODES[currentModeIndex] !== 4) return;
    update4DriverDataWindow();
        recomputeGlobalBest4Driver();
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
    recomputeGlobalBest4Driver();
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
    } else {
        // End current lap
        const lapTime = Date.now() - t.startTimestamp + t.elapsed;
        t.laps.push({ time: lapTime, lapNum: t.lapNum });
        t.lastLapTime = lapTime;
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
        recomputeGlobalBest4Driver();
}

// L1/S1, L2/S2, L3/S3, L4/S4 for 4 Driver Mode
lapBtns[0].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) lap4Driver(0);
});
splitBtns[0].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) split4Driver(0);
});
lapBtns[1].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) lap4Driver(1);
});
splitBtns[1].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) split4Driver(1);
});
lapBtns[2].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) lap4Driver(2);
});
splitBtns[2].addEventListener('click', () => {
    if (MODES[currentModeIndex] === 4) split4Driver(2);
});
lapBtns[3].addEventListener('click', () => {
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
        // End current lap
        const lapTime = Date.now() - timer1.startTimestamp + timer1.elapsed;
        timer1.laps.push({ time: lapTime, lapNum: timer1.lapNum });
        timer1.lastLapTime = lapTime;
        // Best lap logic
        if (timer1.bestLapTime == null || lapTime < timer1.bestLapTime) {
            timer1.bestLapTime = lapTime;
            timer1.bestLapNum = timer1.lapNum;
        }
        timer1.diff = timer1.bestLapTime != null ? lapTime - timer1.bestLapTime : 0;
        timer1.lapNum++;
        // Reset timer for next lap
        timer1.elapsed = 0;
        timer1.startTimestamp = Date.now();
        timer1.splitCount = 0;
        timer1.lastSplit = null;
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

