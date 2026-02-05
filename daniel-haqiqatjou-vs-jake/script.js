let transcriptData = [];
let currentFilter = 'all';
let currentSearch = '';
let currentEntryIndex = -1;

const audioPlayer = document.getElementById('audioPlayer');
const transcriptContainer = document.getElementById('transcript');
const searchBox = document.getElementById('searchBox');
const currentSpeakerEl = document.getElementById('currentSpeaker');
const currentTextEl = document.getElementById('currentText');

// Format milliseconds to HH:MM:SS
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Parse CSV
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const matches = line.match(/"([^"]*)","([^"]*)","([^"]*)","([^"]*)"/);
        if (matches) {
            data.push({
                start: parseInt(matches[1]),
                end: parseInt(matches[2]),
                text: matches[3].trim(),
                speaker: matches[4]
            });
        }
    }
    return data;
}

// Get speaker class
function getSpeakerClass(speaker) {
    if (speaker === 'Host') return 'Host';
    if (speaker.includes('Jake')) return 'Jake';
    if (speaker.includes('Daniel')) return 'Daniel';
    return 'Host';
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Highlight search terms
function highlightText(text, search) {
    if (!search) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
}

// Render transcript
function renderTranscript() {
    const filtered = transcriptData.filter(entry => {
        const matchesFilter = currentFilter === 'all' || entry.speaker === currentFilter;
        const matchesSearch = !currentSearch ||
            entry.text.toLowerCase().includes(currentSearch.toLowerCase()) ||
            entry.speaker.toLowerCase().includes(currentSearch.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
        transcriptContainer.innerHTML = '<div class="loading">No results found</div>';
        return;
    }

    transcriptContainer.innerHTML = filtered.map((entry, idx) => {
        const originalIndex = transcriptData.indexOf(entry);
        return `
            <div class="transcript-entry" data-index="${originalIndex}" data-start="${entry.start}">
                <div class="entry-header">
                    <span class="speaker ${getSpeakerClass(entry.speaker)}">${escapeHtml(entry.speaker)}</span>
                    <span class="timestamp">${formatTime(entry.start)}</span>
                </div>
                <div class="entry-text">${highlightText(entry.text, currentSearch)}</div>
            </div>
        `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.transcript-entry').forEach(entry => {
        entry.addEventListener('click', () => {
            const startMs = parseInt(entry.dataset.start);
            audioPlayer.currentTime = startMs / 1000;
            audioPlayer.play();

            // Update visual state
            document.querySelectorAll('.transcript-entry').forEach(e => e.classList.remove('playing'));
            entry.classList.add('playing');
            currentEntryIndex = parseInt(entry.dataset.index);
        });
    });
}

// Update current playing indicator
function updateCurrentPlaying() {
    const currentTimeMs = audioPlayer.currentTime * 1000;

    for (let i = transcriptData.length - 1; i >= 0; i--) {
        if (currentTimeMs >= transcriptData[i].start) {
            if (currentEntryIndex !== i) {
                currentEntryIndex = i;
                const entry = transcriptData[i];
                currentSpeakerEl.textContent = entry.speaker;
                currentTextEl.textContent = entry.text.substring(0, 80) + (entry.text.length > 80 ? '...' : '');

                // Update visual state
                document.querySelectorAll('.transcript-entry').forEach(e => {
                    e.classList.remove('playing');
                    if (parseInt(e.dataset.index) === i) {
                        e.classList.add('playing');
                    }
                });
            }
            break;
        }
    }
}

// Load transcript
async function loadTranscript() {
    try {
        const response = await fetch('debate-transcript.csv');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const text = await response.text();
        transcriptData = parseCSV(text);
        renderTranscript();
    } catch (error) {
        console.error('Load error:', error);
        transcriptContainer.innerHTML = `<div class="loading">Error loading transcript: ${error.message}</div>`;
    }
}

// Event listeners
audioPlayer.addEventListener('timeupdate', updateCurrentPlaying);

searchBox.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderTranscript();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTranscript();
    });
});

// Initialize
loadTranscript();
