// Configuration API
const API_BASE_URL = 'https://lyrics-sync-tool-backend-production.up.railway.app';

// État global
let lyrics = [];
let timestamps = [];
let currentLineIndex = 0;
let audioPlayer = null;
let isSyncing = false;
let mainAudioVideoFile = null; // Fichier principal chargé
let progressInterval = null;

// Helpers
const $ = id => document.getElementById(id);

function sanitizeInput(text) {
    return (text || '').replace(/\r/g, '');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function estimateProcessingTime(fileSize) {
    // 5MB = 240 secondes (4 minutes)
    // Donc 48 secondes par MB
    const mbSize = fileSize / (1024 * 1024);
    const estimatedSeconds = Math.ceil(mbSize * 48);
    
    if (estimatedSeconds < 60) {
        return estimatedSeconds;
    } else {
        return estimatedSeconds;
    }
}

const MAX_FILE_SIZE = 80 * 1024 * 1024; // 80 MB en bytes

function validateFileSize(file) {
    if (file.size > MAX_FILE_SIZE) {
        alert(`❌ Fichier trop volumineux !\n\nTaille : ${formatFileSize(file.size)}\nLimite : ${formatFileSize(MAX_FILE_SIZE)}\n\nVeuillez sélectionner un fichier plus petit.`);
        return false;
    }
    return true;
}

function getFileType(file) {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'unknown';
}

// ===== SYSTÈME D'ONGLETS =====
function switchTab(tabName) {
    // Désactiver tous les onglets et contenus
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activer l'onglet sélectionné
    event.target.classList.add('active');
    $('tab-' + tabName).classList.add('active');
}

// ===== RECHERCHE DE PAROLES =====
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

    results.forEach((result) => {
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
            </div>
            <p style="margin-top:8px;font-size:0.9em;color:#666;">Copiez les paroles et collez-les dans l'onglet "Coller les paroles".</p>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', googleHtml);
}

function getLogoForSource(source) {
    const logos = {
        'tononkira': './assets/tononkira.jpg',
        'ovh': './assets/lyrics.ovh.png',
        'lrclib': 'https://lrclib.net/favicon.ico'
    };
    return logos[source.toLowerCase()] || './assets/default.png';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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
                    ✅ Paroles chargées avec succès depuis ${from} ! Passez à l'onglet "Coller les paroles" pour les voir.
                </div>
            `;
            
            // Basculer vers l'onglet "Coller"
            setTimeout(() => {
                document.querySelectorAll('.tab-btn')[1].click();
            }, 1500);
        } else {
            throw new Error('Aucune parole trouvée');
        }
    } catch (error) {
        console.error('Erreur chargement paroles:', error);
        resultsDiv.innerHTML = `
            <div style="padding:12px;background:#ffe0e0;border-radius:8px;color:#c00;">
                ❌ Impossible de charger les paroles.
            </div>
        `;
    }
}

// ===== CHARGEMENT FICHIERS =====
function loadLyricsFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    $('lyricsFileInfo').innerHTML = `
        <div style="text-align:center; padding:10px; background:#d4edda; border-radius:6px; color:#155724;">
            ✅ ${file.name} (${formatFileSize(file.size)})
        </div>
    `;
    
    const reader = new FileReader();
    reader.onload = e => { 
        $('lyricsText').value = e.target.result;
        // Basculer vers l'onglet "Coller" pour voir les paroles
        setTimeout(() => {
            document.querySelectorAll('.tab-btn')[1].click();
        }, 500);
    };
    reader.readAsText(file);
}

function loadAudio(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validation de la taille
    if (!validateFileSize(file)) {
        event.target.value = ''; // Reset input
        return;
    }
    
    mainAudioVideoFile = file;
    audioPlayer = $('audioPlayer');
    audioPlayer.src = URL.createObjectURL(file);
    
    // Afficher les infos du fichier avec le nouveau style
    const infoDiv = $('mainAudioFileInfo');
    infoDiv.className = 'file-info-selected show';
    infoDiv.innerHTML = `
        <div class="file-details">
            <span class="file-name">✅ ${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
        </div>
    `;
    
    // Mettre à jour la section export
    updateExportSection();
}

function updateExportSection() {
    if (!mainAudioVideoFile) return;
    
    const fileType = getFileType(mainAudioVideoFile);
    
    // Mise à jour pour la fusion vidéo
    if (fileType === 'video') {
        $('videoSourceInfo').style.display = 'block';
        $('videoSourceDetails').innerHTML = `
            <span class="filename">📹 ${mainAudioVideoFile.name}</span>
            <span class="filesize">${formatFileSize(mainAudioVideoFile.size)}</span>
        `;
        $('videoUploadSection').style.display = 'none';
        $('noVideoWarning').style.display = 'none';
    } else {
        $('videoSourceInfo').style.display = 'none';
        $('videoUploadSection').style.display = 'block';
        $('noVideoWarning').style.display = 'block';
    }
    
    // Mise à jour pour la création vidéo avec paroles
    $('audioSourceInfo').style.display = 'block';
    $('audioSourceDetails').innerHTML = `
        <span class="filename">🎵 ${mainAudioVideoFile.name}</span>
        <span class="filesize">${formatFileSize(mainAudioVideoFile.size)}</span>
    `;
    $('audioUploadSection').style.display = 'none';
}

function updateVideoFileInfo() {
    const file = $('videoFileForMerge').files[0];
    if (!file) return;
    
    // Validation de la taille
    if (!validateFileSize(file)) {
        $('videoFileForMerge').value = ''; // Reset input
        return;
    }
    
    const infoDiv = $('videoFileInfo');
    infoDiv.className = 'file-info-selected show';
    infoDiv.innerHTML = `
        <div class="file-details">
            <span class="file-name">✅ ${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
        </div>
    `;
}

function updateAudioFileInfo() {
    const file = $('audioFileForVideo').files[0];
    if (!file) return;
    
    // Validation de la taille
    if (!validateFileSize(file)) {
        $('audioFileForVideo').value = ''; // Reset input
        return;
    }
    
    const infoDiv = $('audioFileInfo');
    infoDiv.className = 'file-info-selected show';
    infoDiv.innerHTML = `
        <div class="file-details">
            <span class="file-name">✅ ${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
        </div>
    `;
}

function changeAudioSource() {
    $('audioSourceInfo').style.display = 'none';
    $('audioUploadSection').style.display = 'block';
}

function previewBackground(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = $('bgPreview');
    const reader = new FileReader();
    
    reader.onload = (e) => {
        preview.className = 'bg-preview show';
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Background preview">
            <div class="preview-info">
                ${file.name} • ${formatFileSize(file.size)}
            </div>
        `;
    };
    
    reader.readAsDataURL(file);
}

// ===== SYNCHRONISATION =====
function startSync() {
    const lyricsText = $('lyricsText').value || '';
    const lines = lyricsText.split('\n').map(l => l.trim()).filter(l => l !== '');
    
    if (lines.length === 0) { 
        alert('❌ Veuillez entrer les paroles dans l\'onglet "Coller les paroles" ou "Uploader fichier"'); 
        return; 
    }
    
    audioPlayer = $('audioPlayer');
    if (!audioPlayer || !audioPlayer.src) { 
        alert('❌ Veuillez charger un fichier audio/vidéo'); 
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
    
    // Scroll vers la zone de sync
    $('syncArea').scrollIntoView({ behavior: 'smooth' });
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

// ===== EXPORT BASIQUE =====
function formatTimeLRC(seconds) {
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
        lrc += `[${formatTimeLRC(t)}]${lyrics[i]}\n`;
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

// ===== FFMPEG - FUSION VIDÉO =====
async function mergeVideoWithSubtitles() {
    let videoFile;
    
    // Vérifier si on a une vidéo dans le fichier principal
    if (mainAudioVideoFile && getFileType(mainAudioVideoFile) === 'video') {
        videoFile = mainAudioVideoFile;
    } else {
        videoFile = $('videoFileForMerge').files[0];
    }
    
    if (!videoFile) {
        alert('❌ Veuillez sélectionner une vidéo');
        return;
    }
    
    // Validation de la taille
    if (!validateFileSize(videoFile)) {
        return;
    }
    
    if (lyrics.length === 0 || timestamps.length === 0) {
        alert('❌ Veuillez d\'abord synchroniser les paroles');
        return;
    }
    
    // Créer le SRT
    const srtContent = generateSRT();
    const srtBlob = new Blob([srtContent], { type: 'text/plain' });
    
    // Afficher la modal de progression
    showProgressModal('🎬 Fusion vidéo + sous-titres', videoFile.size);
    
    // Préparer FormData
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('srt', srtBlob, 'subtitles.srt');
    
    try {
        const response = await fetch(`${API_BASE_URL}/merge`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de la fusion');
        }
        
        // Télécharger le résultat
        const blob = await response.blob();
        const filename = `${($('songTitle').value || 'video').replace(/\s+/g, '_')}_with_subtitles.mp4`;
        
        hideProgressModal();
        showResultModal('✅ Fusion réussie !', blob, filename, true);
        
    } catch (error) {
        console.error('Erreur fusion:', error);
        hideProgressModal();
        showResultModal('❌ Erreur', null, null, false, 'La fusion a échoué. Veuillez réessayer.');
    }
}

// ===== FFMPEG - CRÉER VIDÉO AVEC PAROLES =====
async function createLyricsVideo() {
    let audioFile;
    
    // Vérifier si on a un audio/vidéo dans le fichier principal
    if (mainAudioVideoFile) {
        audioFile = mainAudioVideoFile;
    } else if ($('audioUploadSection').style.display !== 'none') {
        audioFile = $('audioFileForVideo').files[0];
    }
    
    const bgFile = $('backgroundImage').files[0];
    
    if (!audioFile) {
        alert('❌ Aucun fichier audio disponible');
        return;
    }
    
    // Validation de la taille de l'audio
    if (!validateFileSize(audioFile)) {
        return;
    }
    
    if (!bgFile) {
        alert('❌ Veuillez sélectionner une image de fond');
        return;
    }
    
    if (lyrics.length === 0 || timestamps.length === 0) {
        alert('❌ Veuillez d\'abord synchroniser les paroles');
        return;
    }
    
    // Créer le SRT
    const srtContent = generateSRT();
    const srtBlob = new Blob([srtContent], { type: 'text/plain' });
    
    // Afficher la modal de progression
    const totalSize = audioFile.size + bgFile.size;
    showProgressModal('🎨 Création de la vidéo avec paroles', totalSize);
    
    // Préparer FormData
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('bg', bgFile);
    formData.append('srt', srtBlob, 'subtitles.srt');
    
    try {
        const response = await fetch(`${API_BASE_URL}/get_video_lyrics`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors de la création');
        }
        
        // Télécharger le résultat
        const blob = await response.blob();
        const filename = `${($('songTitle').value || 'lyrics_video').replace(/\s+/g, '_')}_lyrics.mp4`;
        
        hideProgressModal();
        showResultModal('✅ Vidéo créée avec succès !', blob, filename, true);
        
    } catch (error) {
        console.error('Erreur création vidéo:', error);
        hideProgressModal();
        showResultModal('❌ Erreur', null, null, false, 'La création de la vidéo a échoué. Veuillez réessayer.');
    }
}

// ===== MODALS =====
function showProgressModal(title, fileSize) {
    const modal = $('progressModal');
    const titleElem = $('progressTitle');
    const messageElem = $('progressMessage');
    const timeElem = $('progressTime');
    const detailsElem = $('progressDetails');
    
    titleElem.textContent = title;
    messageElem.textContent = 'Envoi du fichier au serveur...';
    
    const estimatedSeconds = estimateProcessingTime(fileSize);
    timeElem.textContent = `Temps estimé : ${formatTime(estimatedSeconds)}`;
    
    detailsElem.innerHTML = `
        <strong>Taille du fichier :</strong> ${formatFileSize(fileSize)}<br>
        <strong>Estimation :</strong> Environ ${formatTime(estimatedSeconds)} de traitement<br>
        <strong>Note :</strong> 5 MB ≈ 4 minutes • Le temps réel peut varier selon la charge du serveur
    `;
    
    modal.style.display = 'flex';
    
    // Démarrer la progression réaliste
    startRealisticProgress(estimatedSeconds);
}

function startRealisticProgress(totalSeconds) {
    const progressBar = $('progressBar');
    const progressPercent = $('progressPercent');
    const progressMessage = $('progressMessage');
    const progressTime = $('progressTime');
    const progressBarText = $('progressBarText');
    
    let elapsed = 0;
    const updateInterval = 1000; // Mise à jour chaque seconde
    
    const messages = [
        { threshold: 0, text: 'Envoi du fichier au serveur...' },
        { threshold: 10, text: 'Traitement vidéo en cours...' },
        { threshold: 30, text: 'Encodage et intégration des sous-titres...' },
        { threshold: 60, text: 'Finalisation de la vidéo...' },
        { threshold: 85, text: 'Presque terminé...' }
    ];
    
    if (progressInterval) clearInterval(progressInterval);
    
    progressInterval = setInterval(() => {
        elapsed += 1;
        const progress = Math.min((elapsed / totalSeconds) * 100, 95);
        
        progressBar.style.width = `${progress}%`;
        progressPercent.textContent = `${Math.round(progress)}%`;
        progressBarText.textContent = `${Math.round(progress)}%`;
        
        const remaining = Math.max(0, totalSeconds - elapsed);
        progressTime.textContent = `Temps restant : ${formatTime(remaining)}`;
        
        // Mettre à jour le message selon la progression
        for (let i = messages.length - 1; i >= 0; i--) {
            if (progress >= messages[i].threshold) {
                progressMessage.textContent = messages[i].text;
                break;
            }
        }
        
        if (elapsed >= totalSeconds * 0.95) {
            clearInterval(progressInterval);
        }
        
    }, updateInterval);
}

function hideProgressModal() {
    const modal = $('progressModal');
    modal.style.display = 'none';
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    // Réinitialiser à 100%
    const progressBar = $('progressBar');
    const progressPercent = $('progressPercent');
    const progressBarText = $('progressBarText');
    
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressBarText.textContent = '100%';
    
    // Puis réinitialiser après un court délai
    setTimeout(() => {
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressBarText.textContent = '';
    }, 500);
}

function showResultModal(title, blob, filename, success, errorMessage = '') {
    const modal = $('resultModal');
    const titleElem = $('resultTitle');
    const messageElem = $('resultMessage');
    const previewElem = $('resultPreview');
    const downloadBtn = $('downloadResultBtn');
    
    titleElem.textContent = title;
    modal.style.display = 'flex';
    
    if (success && blob) {
        const videoUrl = URL.createObjectURL(blob);
        
        messageElem.innerHTML = `
            <div class="info-box success">
                <p>✅ Votre vidéo est prête ! Vous pouvez la prévisualiser ci-dessous et la télécharger.</p>
                <p style="margin-top:8px; font-size:0.9em;">Taille du fichier : ${formatFileSize(blob.size)}</p>
            </div>
        `;
        
        previewElem.innerHTML = `
            <video controls style="max-width:100%; border-radius:8px;">
                <source src="${videoUrl}" type="video/mp4">
            </video>
        `;
        
        downloadBtn.style.display = 'inline-block';
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
    } else {
        messageElem.innerHTML = `
            <div class="info-box error">
                <p>${errorMessage || 'Une erreur est survenue lors du traitement.'}</p>
                <p style="margin-top:8px;">Veuillez vérifier :</p>
                <ul style="margin-left:20px; margin-top:8px;">
                    <li>La taille et le format de vos fichiers</li>
                    <li>Votre connexion Internet</li>
                    <li>Que vous avez bien synchronisé les paroles</li>
                </ul>
            </div>
        `;
        
        previewElem.innerHTML = '';
        downloadBtn.style.display = 'none';
    }
}

function closeResultModal() {
    const modal = $('resultModal');
    modal.style.display = 'none';
    
    const previewElem = $('resultPreview');
    const videos = previewElem.querySelectorAll('video');
    videos.forEach(video => {
        if (video.src) {
            URL.revokeObjectURL(video.src);
        }
    });
    previewElem.innerHTML = '';
}