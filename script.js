// Configuration API
const API_BASE_URL = 'https://lyrics-sync-tool-backend-production.up.railway.app';

// État
let lyrics = [];
let timestamps = [];
let currentLineIndex = 0;
let audioPlayer = null;
let isSyncing = false;
let selectedLyrics = null;

// Helpers
const $ = id => document.getElementById(id);

function sanitizeInput(text) {
    return (text || '').replace(/\r/g, '');
}

// Recherche via API
async function searchLyrics() {
    const title = sanitizeInput($('songTitle').value);
    const artist = sanitizeInput($('artistName').value);
    
    if (!title || !artist) {
        alert('Veuillez entrer le titre et l\'artiste');
        return;
    }

    const resultsDiv = $('searchResults');
    resultsDiv.innerHTML = '<div style="padding:12px;text-align:center;color:#667eea;">🔍 Recherche en cours...</div>';
    resultsDiv.style.display = 'block';

    try {
        const response = await fetch(`${API_BASE_URL}/get_lyrics_list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artiste: artist, titre: title })
        });

        if (!response.ok) throw new Error('Erreur API');

        const results = await response.json();
        displaySearchResults(results, artist, title);
    } catch (error) {
        console.error('Erreur recherche:', error);
        resultsDiv.innerHTML = `
            <div style="padding:12px;background:#ffe0e0;border-radius:8px;color:#c00;">
                ❌ Erreur lors de la recherche. Veuillez réessayer.
            </div>
        `;
    }
}

function displaySearchResults(results, artist, title) {
    const resultsDiv = $('searchResults');
    
    if (!results || results.length === 0) {
        resultsDiv.innerHTML = `
            <div style="padding:12px;background:#fff3cd;border-radius:8px;">
                ⚠️ Aucun résultat trouvé. Essayez la recherche Google ci-dessous.
            </div>
        `;
        addGoogleSearchOption(resultsDiv, artist, title);
        return;
    }

    let html = '<div style="padding:12px;background:#eef7ff;border-radius:8px;">';
    html += '<strong>🔎 Résultats trouvés :</strong>';
    html += '<div style="margin-top:12px;">';

    // Afficher chaque résultat
    results.forEach((result, index) => {
        const logoSrc = getLogoForSource(result.from);
        html += `
            <div class="search-result-item" onclick="loadLyricsFromAPI('${escapeHtml(result.url)}', '${escapeHtml(result.from)}')" 
                 style="display:flex;align-items:center;gap:10px;padding:10px;margin:8px 0;background:white;border-radius:6px;cursor:pointer;border:2px solid #e0e0e0;transition:all .2s;"
                 onmouseover="this.style.borderColor='#667eea';this.style.transform='translateX(4px)'"
                 onmouseout="this.style.borderColor='#e0e0e0';this.style.transform='translateX(0)'">
                <img src="${logoSrc}" alt="${result.from}" style="width:32px;height:32px;object-fit:contain;border-radius:4px;">
                <div style="flex:1;">
                    <div style="font-weight:600;color:#333;">${escapeHtml(result.titre)}</div>
                    <div style="font-size:0.9em;color:#666;">${escapeHtml(result.artiste)} • ${result.from}</div>
                </div>
                <span style="color:#667eea;">→</span>
            </div>
        `;
    });

    html += '</div></div>';
    resultsDiv.innerHTML = html;

    // Ajouter l'option Google à la fin
    addGoogleSearchOption(resultsDiv, artist, title);
}

function addGoogleSearchOption(container, artist, title) {
    const q = encodeURIComponent(`${artist} ${title} lyrics`);
    const googleHtml = `
        <div style="margin-top:12px;padding:12px;background:#f5f5f5;border-radius:8px;">
            <strong>🌐 Recherche manuelle</strong>
            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
                <button onclick="window.open('https://www.google.com/search?q=${q}', '_blank')">🔍 Google</button>
                <button onclick="window.open('https://www.google.com/search?q=${encodeURIComponent('site:genius.com ' + artist + ' ' + title + ' lyrics')}', '_blank')">🎓 Genius</button>
                <button onclick="window.open('https://www.google.com/search?q=${encodeURIComponent('site:azlyrics.com ' + artist + ' ' + title + ' lyrics')}', '_blank')">🎵 AZLyrics</button>
                <button onclick="window.open('https://www.google.com/search?q=${encodeURIComponent('site:musixmatch.com ' + artist + ' ' + title + ' lyrics')}', '_blank')">🎶 Musixmatch</button>
            </div>
            <p style="margin-top:8px;font-size:0.9em;color:#666;">Copiez les paroles et collez-les dans la zone de texte ci-dessous.</p>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', googleHtml);
}

function getLogoForSource(source) {
    const logos = {
        'tononkira': './assets/tononkira.jpg',
        'ovh': './assets/lyrics.ovh.png',
        'lrclib' : 'https://lrclib.net/favicon.ico                                                  '
    };
    return logos[source.toLowerCase()] || './assets/default.png';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Charger les paroles depuis l'API
async function loadLyricsFromAPI(url, from) {
    const resultsDiv = $('searchResults');
    resultsDiv.innerHTML = '<div style="padding:12px;text-align:center;color:#667eea;">📥 Chargement des paroles...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/get_lyrics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url, from: from })
        });

        if (!response.ok) throw new Error('Erreur API');

        const data = await response.json();
        
        if (data.lyrics) {
            $('lyricsText').value = data.lyrics;
            resultsDiv.innerHTML = `
                <div style="padding:12px;background:#d4edda;border-radius:8px;color:#155724;">
                    ✅ Paroles chargées avec succès depuis ${from} !
                </div>
            `;
            // Scroll vers la zone de paroles
            $('lyricsText').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            throw new Error('Aucune parole trouvée');
        }
    } catch (error) {
        console.error('Erreur chargement paroles:', error);
        resultsDiv.innerHTML = `
            <div style="padding:12px;background:#ffe0e0;border-radius:8px;color:#c00;">
                ❌ Impossible de charger les paroles. Veuillez réessayer ou utiliser la recherche manuelle.
            </div>
        `;
    }
}

// Import local lyrics file
function loadLyricsFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { $('lyricsText').value = e.target.result; };
    reader.readAsText(file);
}

// Load audio
function loadAudio(event) {
    const file = event.target.files[0];
    if (!file) return;
    audioPlayer = $('audioPlayer');
    audioPlayer.src = URL.createObjectURL(file);
}

// START SYNC
function startSync() {
    const lyricsText = $('lyricsText').value || '';
    const lines = lyricsText.split('\n').map(l => l.trim()).filter(l => l !== '');
    
    if (lines.length === 0) { 
        alert('Veuillez entrer les paroles'); 
        return; 
    }
    
    audioPlayer = $('audioPlayer');
    if (!audioPlayer || !audioPlayer.src) { 
        alert('Veuillez charger un fichier audio/vidéo'); 
        return; 
    }
    
    lyrics = lines.slice();
    timestamps = new Array(lyrics.length).fill(null);
    timestamps[0] = 0.0;
    currentLineIndex = 0;
    isSyncing = true;
    
    $('totalLines').textContent = lyrics.length;
    $('syncArea').style.display = 'block';
    displayLyrics();
    
    window.addEventListener('keydown', handleKeyPress);
    
    try { audioPlayer.focus(); } catch (e) { }
    try { audioPlayer.currentTime = 0; } catch (e) { }
}

function displayLyrics() {
    const display = $('lyricsDisplay');
    display.innerHTML = '';
    const endIdx = Math.min(lyrics.length - 1, currentLineIndex + 2);
    
    for (let i = 0; i <= endIdx; i++) {
        const div = document.createElement('div');
        div.className = 'lyric-line';
        let content = lyrics[i];
        
        if (i < currentLineIndex) {
            div.classList.add('past');
            div.textContent = content;
            div.style.cursor = 'pointer';
            div.onclick = () => {
                audioPlayer.currentTime = timestamps[i] || 0;
                for (let j = i + 1; j < lyrics.length; j++) {
                    timestamps[j] = null;
                }
                currentLineIndex = i;
                displayLyrics();
                if (!audioPlayer.paused) audioPlayer.play();
            };
        } else if (i === currentLineIndex) {
            div.classList.add('current');
            div.textContent = content;
        } else {
            div.classList.add('future');
            div.textContent = content;
        }
        
        display.appendChild(div);
    }
    
    $('currentLineNumber').textContent = (currentLineIndex + 1);
    
    const currentElem = display.querySelector('.current');
    if (currentElem) {
        currentElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function handleKeyPress(e) {
    if (!isSyncing) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        if (audioPlayer.paused) {
            audioPlayer.play();
            $('status').textContent = '▶️ Lecture en cours... Appuyez sur ENTRÉE à chaque changement de ligne';
            $('status').className = 'status syncing';
        } else {
            audioPlayer.pause();
            $('status').textContent = '⏸️ Pause - Appuyez sur ESPACE pour reprendre';
            $('status').className = 'status ready';
        }
    } else if (e.code === 'Enter') {
        e.preventDefault();
        captureNextLineStart();
    }
}

function captureNextLineStart() {
    if (!audioPlayer) return;
    const nextIndex = currentLineIndex + 1;
    
    if (nextIndex >= lyrics.length) {
        finishSync();
        return;
    }
    
    timestamps[nextIndex] = audioPlayer.currentTime;
    currentLineIndex = nextIndex;
    displayLyrics();
}

function markNextLineStart() { 
    captureNextLineStart(); 
}

function resetSync() {
    currentLineIndex = 0;
    timestamps = new Array(lyrics.length).fill(null);
    timestamps[0] = 0.0;
    
    if (audioPlayer) {
        try { audioPlayer.currentTime = 0; } catch (e) { }
        audioPlayer.pause();
    }
    
    displayLyrics();
    $('status').textContent = 'Synchronisation réinitialisée';
    $('status').className = 'status ready';
}

function finishSync() {
    isSyncing = false;
    if (audioPlayer) audioPlayer.pause();
    window.removeEventListener('keydown', handleKeyPress);
    
    for (let i = 0; i < lyrics.length; i++) {
        if (timestamps[i] === null || typeof timestamps[i] === 'undefined') {
            const prev = i > 0 ? timestamps[i - 1] || 0 : 0;
            timestamps[i] = prev + 3.0;
        }
    }
    
    $('status').textContent = '✅ Synchronisation terminée ! Vous pouvez maintenant exporter vos fichiers.';
    $('status').className = 'status complete';
    $('exportSection').style.display = 'block';
    $('exportSection').scrollIntoView({ behavior: 'smooth' });
}

// Export functions
function formatTime(seconds) {
    const total = Math.max(0, seconds || 0);
    const minutes = Math.floor(total / 60);
    const secs = Math.floor(total % 60);
    const centisecs = Math.floor((total - Math.floor(total)) * 100);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centisecs).padStart(2, '0')}`;
}

function formatTimeSRT(seconds) {
    const total = Math.max(0, seconds || 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = Math.floor(total % 60);
    const millisecs = Math.floor((total - Math.floor(total)) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millisecs).padStart(3, '0')}`;
}

function generateLRC() {
    let lrc = '';
    const title = $('songTitle').value || 'Unknown';
    const artist = $('artistName').value || 'Unknown';
    
    lrc += `[ti:${title}]\n`;
    lrc += `[ar:${artist}]\n`;
    lrc += `[by:Lyrics Sync Tool]\n\n`;
    
    for (let i = 0; i < lyrics.length; i++) {
        const t = (typeof timestamps[i] === 'number') ? timestamps[i] : (i === 0 ? 0 : (timestamps[i - 1] + 3));
        lrc += `[${formatTime(t)}]${lyrics[i]}\n`;
    }
    
    return lrc;
}

function generateSRT() {
    let srt = '';
    
    for (let i = 0; i < lyrics.length; i++) {
        const startTime = (typeof timestamps[i] === 'number') ? timestamps[i] : (i === 0 ? 0 : (timestamps[i - 1] + 3));
        const endTime = (i + 1 < lyrics.length) ? ((typeof timestamps[i + 1] === 'number') ? timestamps[i + 1] : (startTime + 3)) : (startTime + 3);
        
        srt += `${i + 1}\n`;
        srt += `${formatTimeSRT(startTime)} --> ${formatTimeSRT(endTime)}\n`;
        srt += `${lyrics[i]}\n\n`;
    }
    
    return srt;
}

function exportLRC() {
    const lrc = generateLRC();
    downloadFile(lrc, `${(($('artistName').value || 'artist').replace(/\s+/g, '_'))}-${(($('songTitle').value || 'title').replace(/\s+/g, '_'))}.lrc`, 'text/plain');
}

function exportSRT() {
    const srt = generateSRT();
    downloadFile(srt, `${(($('artistName').value || 'artist').replace(/\s+/g, '_'))}-${(($('songTitle').value || 'title').replace(/\s+/g, '_'))}.srt`, 'text/plain');
}

function previewLRC() {
    const lrc = generateLRC();
    const preview = $('previewArea');
    preview.textContent = lrc;
    preview.style.display = 'block';
}

function previewSRT() {
    const srt = generateSRT();
    const preview = $('previewArea');
    preview.textContent = srt;
    preview.style.display = 'block';
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Gestion du paste dans le textarea (optionnel)
$('lyricsText')?.addEventListener('paste', (e) => {
    // Fonctionnalité future
});