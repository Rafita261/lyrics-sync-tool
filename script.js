// état
        let lyrics = [];
        let timestamps = [];
        let currentLineIndex = 0;
        let audioPlayer = null;
        let isSyncing = false;
        let selectedLyrics = null;

        // helpers
        const $ = id => document.getElementById(id);

        function sanitizeInput(text) {
            return (text || '').replace(/\r/g, '');
        }

        // Recherche (ouvre Google)
        function searchLyrics() {
            const title = sanitizeInput($('songTitle').value);
            const artist = sanitizeInput($('artistName').value);

            if (!title || !artist) {
                alert('Veuillez entrer le titre et l\'artiste');
                return;
            }

            const q = encodeURIComponent(`${artist} ${title} lyrics`);
            const html = `
                <div style="padding:12px;background:#eef7ff;border-radius:8px;">
                    <strong>🔎 Recherche en ligne</strong>
                    <p style="margin-top:8px;color:#444;">Ouvrir les résultats Google dans un nouvel onglet ; choisissez Genius / AZLyrics / Musixmatch, copiez les paroles et collez-les ici.</p>
                    <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
                        <button onclick="window.open('https://www.google.com/search?q=${q}', '_blank')">🌐 Google</button>
                        <button onclick="window.open('https://www.google.com/search?q=${encodeURIComponent('site:genius.com ' + artist + ' ' + title + ' lyrics')}', '_blank')">🎓 Genius</button>
                        <button onclick="window.open('https://www.google.com/search?q=${encodeURIComponent('site:azlyrics.com ' + artist + ' ' + title + ' lyrics')}', '_blank')">🎵 AZLyrics</button>
                        <button onclick="window.open('https://www.google.com/search?q=${encodeURIComponent('site:musixmatch.com ' + artist + ' ' + title + ' lyrics')}', '_blank')">🎶 Musixmatch</button>
                    </div>
                </div>
            `;
            $('searchResults').innerHTML = html;
            $('searchResults').style.display = 'block';
        }

        // import local lyrics file
        function loadLyricsFile(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => { $('lyricsText').value = e.target.result; };
            reader.readAsText(file);
        }

        // load audio
        function loadAudio(event) {
            const file = event.target.files[0];
            if (!file) return;
            audioPlayer = $('audioPlayer');
            audioPlayer.src = URL.createObjectURL(file);
        }

        // START SYNC — CRITICAL: first line @ 00:00.00
        function startSync() {
            const lyricsText = $('lyricsText').value || '';
            const lines = lyricsText.split('\n').map(l => l.trim()).filter(l => l !== '');
            if (lines.length === 0) { alert('Veuillez entrer les paroles'); return; }

            audioPlayer = $('audioPlayer');
            if (!audioPlayer || !audioPlayer.src) { alert('Veuillez charger un fichier audio/vidéo'); return; }

            lyrics = lines.slice();
            timestamps = new Array(lyrics.length).fill(null);

            // === FIX: ensure first line starts at 00:00.00 ===
            timestamps[0] = 0.0;
            currentLineIndex = 0;
            isSyncing = true;

            $('totalLines').textContent = lyrics.length;
            $('syncArea').style.display = 'block';

            displayLyrics();
            // attach keyboard handler
            window.addEventListener('keydown', handleKeyPress);
            // focus player if available
            try { audioPlayer.focus(); } catch (e) { }
            // set audio to start at 0 to be consistent
            try { audioPlayer.currentTime = 0; } catch (e) { }
        }

        function displayLyrics() {
            const display = $('lyricsDisplay');
            display.innerHTML = '';

            const startIdx = Math.max(0, currentLineIndex - 2);
            const endIdx = Math.min(lyrics.length, currentLineIndex + 3);

            for (let i = startIdx; i < endIdx; i++) {
                const div = document.createElement('div');
                div.className = 'lyric-line';
                div.textContent = lyrics[i];

                if (i < currentLineIndex) div.classList.add('past');
                else if (i === currentLineIndex) div.classList.add('current');
                else div.classList.add('future');

                display.appendChild(div);
            }

            $('currentLineNumber').textContent = (currentLineIndex + 1);
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
                // record the beginning of the next line (fixes the off-by-one)
                captureNextLineStart();
            }
        }

        // core fix: record the START of the next line
        function captureNextLineStart() {
            if (!audioPlayer) return;
            const nextIndex = currentLineIndex + 1;

            // if already on last line, finish
            if (nextIndex >= lyrics.length) {
                finishSync();
                return;
            }

            timestamps[nextIndex] = audioPlayer.currentTime;
            currentLineIndex = nextIndex;
            displayLyrics();
        }

        // exposed for mobile button
        function markNextLineStart() { captureNextLineStart(); }

        function resetSync() {
            currentLineIndex = 0;
            timestamps = new Array(lyrics.length).fill(null);
            timestamps[0] = 0.0; // keep first line at 00:00
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

            // fill any missing timestamps with a fallback (prev + 3s) to ensure export completeness
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

        // --- Export / format
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

            // we assume timestamps[0] is set to 0.0 (start)
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

        // Modal helpers
        function showLyricsPreview(title, artist, lyricsText) {
            selectedLyrics = lyricsText;
            $('modalTitle').textContent = title;
            $('modalArtist').textContent = 'Par ' + artist;
            $('modalLyrics').textContent = lyricsText;
            $('lyricsPreviewModal').style.display = 'flex';
        }

        function closeLyricsModal() {
            $('lyricsPreviewModal').style.display = 'none';
            selectedLyrics = null;
        }

        function acceptLyrics() {
            if (selectedLyrics) {
                $('lyricsText').value = selectedLyrics;
                closeLyricsModal();
                alert('✅ Paroles importées avec succès !');
            }
        }

        // bind paste cleanup 
        $('lyricsText')?.addEventListener('paste', (e) => {
            // Functionnality under implementation
        });