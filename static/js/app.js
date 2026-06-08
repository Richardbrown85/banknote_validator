/* =============================================
   Banknote Validator — Interface V2
   app.js
   ============================================= */

const ACCEPT_KEYWORDS = [
    'banknote', 'money', 'currency', 'cash',
    'pound', 'dollar', 'paper currency', 'bank note'
];

const POLL_INTERVAL = 5000;

// ---- Elements ----
const verdictCircle   = document.getElementById('verdictCircle');
const verdictSymbol   = document.getElementById('verdictSymbol');
const verdictText     = document.getElementById('verdictText');
const verdictTimestamp= document.getElementById('verdictTimestamp');
const statusIconWrap  = document.getElementById('statusIconWrap');
const statusIcon      = document.getElementById('statusIcon');
const statusTitle     = document.getElementById('statusTitle');
const statusDetail    = document.getElementById('statusDetail');
const labelTags       = document.getElementById('labelTags');
const historyList     = document.getElementById('historyList');
const logEntries      = document.getElementById('logEntries');
const connDot         = document.getElementById('connDot');
const connLabel       = document.getElementById('connLabel');

// ---- State ----
let lastVerdict  = null;
let scanHistory  = [];
let connected    = false;

// ---- Theme ----
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('themeIcon').textContent = isDark ? '☾' : '☀';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Restore saved theme
(function () {
    const saved = localStorage.getItem('theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        document.getElementById('themeIcon').textContent = saved === 'dark' ? '☀' : '☾';
    }
})();

// ---- Logging ----
function log(message, type = 'info') {
    const now = new Date().toLocaleTimeString('en-GB');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-time">${now}</span><span class="log-msg">${message}</span>`;
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight;
}

// ---- Connection Status ----
function setConnected(isConnected) {
    connected = isConnected;
    connDot.className = 'conn-dot' + (isConnected ? ' live' : ' error');
    connLabel.textContent = isConnected ? 'Connected' : 'Offline';
}

// ---- Status Panel ----
function setStatus(title, detail, state = 'idle') {
    statusTitle.textContent = title;
    statusDetail.textContent = detail;
    statusIconWrap.className = `status-icon-wrap ${state}`;

    const icons = {
        idle:     '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>',
        accept:   '<path d="M20 6L9 17l-5-5"/>',
        reject:   '<path d="M18 6L6 18M6 6l12 12"/>',
        scanning: '<path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/><path d="M12 8v4"/><path d="M12 16h.01"/>'
    };

    statusIcon.innerHTML = icons[state] || icons.idle;
}

// ---- Render Labels ----
function renderLabels(labels) {
    labelTags.innerHTML = '';
    if (!labels || labels.length === 0) {
        labelTags.innerHTML = '<span class="tag-empty">No labels returned</span>';
        return;
    }
    labels.forEach(label => {
        const tag = document.createElement('span');
        tag.className = 'label-tag';
        const isMatch = ACCEPT_KEYWORDS.some(k => label.toLowerCase().includes(k));
        if (isMatch) tag.classList.add('match');
        tag.textContent = label;
        labelTags.appendChild(tag);
    });
}

// ---- Add History Item ----
function addHistory(verdict, timestamp) {
    // Remove empty state
    const empty = historyList.querySelector('.history-empty');
    if (empty) empty.remove();

    const isAccept = verdict === 'accept';
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <div class="history-badge ${isAccept ? 'accept' : 'reject'}">
            ${isAccept ? '✓' : '✗'}
        </div>
        <div class="history-meta">
            <span class="history-verdict">${isAccept ? 'Accepted' : 'Rejected'}</span>
            <span class="history-time">${timestamp}</span>
        </div>
    `;

    // Prepend so newest is at top
    historyList.insertBefore(item, historyList.firstChild);

    // Keep max 10 items
    const items = historyList.querySelectorAll('.history-item');
    if (items.length > 10) items[items.length - 1].remove();
}

// ---- Show Verdict ----
function showVerdict(verdict, labels) {
    const isAccept = verdict === 'accept';
    const now = new Date().toLocaleTimeString('en-GB');

    // Circle
    verdictCircle.className = `verdict-circle ${isAccept ? 'accept' : 'reject'}`;
    verdictSymbol.textContent = isAccept ? '✓' : '✗';

    // Text
    verdictText.className = `verdict-text ${isAccept ? 'accept' : 'reject'}`;
    verdictText.textContent = isAccept ? 'Accepted' : 'Rejected';
    verdictTimestamp.textContent = `Last scan: ${now}`;

    // Status
    setStatus(
        isAccept ? 'Note Accepted' : 'Note Rejected',
        isAccept ? 'Banknote successfully verified' : 'Note could not be verified',
        isAccept ? 'accept' : 'reject'
    );

    // Labels
    renderLabels(labels);

    // History
    addHistory(verdict, now);

    // Log
    log(`Verdict: ${verdict.toUpperCase()} — Labels: ${labels.join(', ')}`, isAccept ? 'success' : 'error');
}

// ---- Set Scanning State ----
function setScanning() {
    verdictCircle.className = 'verdict-circle scanning';
    verdictSymbol.textContent = '...';
    verdictText.className = 'verdict-text';
    verdictText.textContent = 'Scanning...';
    setStatus('Scanning', 'Analysing note via Vision API', 'scanning');
    log('New scan received — processing...', 'warning');
}

// ---- Server-Sent Events ----
function startSSE() {
    const source = new EventSource('/live/');

    source.onopen = function() {
        setConnected(true);
        log('Live connection established', 'success');
    };

    source.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.verdict) {
        lastVerdict = data.verdict;
        setScanning();
        setTimeout(() => showVerdict(data.verdict, data.labels || []), 800);
    }
};

    source.onerror = function() {
        setConnected(false);
        log('Live connection lost — retrying...', 'error');
    };
}

// ---- Init ----
log('System initialised', 'info');
setStatus('Ready', 'System awaiting note scan', 'idle');
setConnected(false);
startSSE();