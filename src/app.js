(() => {
  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d');
  const duration = 12;
  const palettes = {
    gold: { image: 'assets/fingerprint-gold.png', color: '#bd9651', deep: '#142236', glow: 'rgba(194,154,82,.16)' },
    teal: { image: 'assets/fingerprint-teal.png', color: '#167a7d', deep: '#102a31', glow: 'rgba(22,122,125,.16)' },
    ink: { image: 'assets/fingerprint-ink.png', color: '#142236', deep: '#101a27', glow: 'rgba(20,34,54,.13)' }
  };
  const images = {};
  Object.entries(palettes).forEach(([name, palette]) => {
    const image = new Image(); image.src = palette.image; images[name] = image;
  });
  let paletteName = 'gold';
  let playhead = 4;
  let playing = true;
  let previousTick = performance.now();
  let titleLines = ['للإبداع بصمة', 'ولكل بصمة أثر'];
  let exportBusy = false;

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
  const smooth = (t, start, end) => ease((t - start) / (end - start));

  function draw(t) {
    const w = canvas.width, h = canvas.height, p = palettes[paletteName];
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#f6f3ed'); bg.addColorStop(.52, '#f2efe8'); bg.addColorStop(1, '#eeeae2');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // Subtle fingerprint rings, echoing the supplied brand artwork.
    ctx.save(); ctx.globalAlpha = .34;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(-104, 820, 180 + i * 125, -Math.PI / 2, Math.PI * 1.3);
      ctx.lineWidth = 55; ctx.strokeStyle = i % 2 ? '#f8f6f1' : '#eae7df'; ctx.stroke();
    }
    ctx.restore();

    // Editorial frame and quiet corner registration marks.
    ctx.save(); ctx.strokeStyle = 'rgba(20,34,54,.12)'; ctx.lineWidth = 1;
    ctx.strokeRect(49, 49, w - 98, h - 98);
    ctx.restore();
    ctx.fillStyle = p.color; ctx.globalAlpha = .8;
    ctx.fillRect(78, 79, 38, 2); ctx.globalAlpha = 1;

    // Opening identity lockup.
    ctx.direction = 'rtl'; ctx.textAlign = 'right';
    ctx.fillStyle = p.deep; ctx.font = '600 25px "IBM Plex Sans Arabic", Tahoma, Arial';
    ctx.fillText('إبداع', w - 78, 100);
    ctx.direction = 'ltr'; ctx.textAlign = 'left';
    ctx.fillStyle = '#85847f'; ctx.font = '500 11px Manrope, Arial'; ctx.letterSpacing = '3px';
    ctx.fillText('IMPRINT   /   CREATIVE STUDIO', 78, 128); ctx.letterSpacing = '0px';

    // Fingerprint mark — a gentle rise, scale-in, and scanning highlight.
    const markIn = smooth(t, .25, 1.5);
    const markOut = 1 - smooth(t, 10.8, 11.8) * .14;
    const markSize = 476 * (.92 + .08 * markIn);
    const markY = 345 + (1 - markIn) * 32;
    const img = images[paletteName];
    if (img && img.complete && img.naturalWidth) {
      ctx.save(); ctx.globalAlpha = markIn * markOut;
      ctx.shadowColor = p.glow; ctx.shadowBlur = 35;
      ctx.drawImage(img, (w - markSize) / 2, markY, markSize, markSize);
      ctx.restore();
      const scanY = markY + 30 + ((t * 190) % 420);
      if (t > .7 && t < 8.5) {
        ctx.save(); ctx.globalAlpha = .27 * (1 - smooth(t, 7.3, 8.5));
        ctx.fillStyle = p.color; ctx.fillRect(275, scanY, 530, 2); ctx.restore();
      }
    }

    // Brand statement, appearing as two considered typographic beats.
    const first = smooth(t, 1.05, 2.25);
    const second = smooth(t, 2.0, 3.25);
    const endHold = 1 - smooth(t, 10.9, 11.8) * .12;
    ctx.save(); ctx.textAlign = 'center'; ctx.direction = 'rtl';
    ctx.globalAlpha = first * endHold;
    ctx.fillStyle = p.deep; ctx.font = '700 78px "IBM Plex Sans Arabic", Tahoma, Arial';
    ctx.fillText(titleLines[0], w / 2, 1040 + (1 - first) * 28);
    ctx.globalAlpha = second * endHold;
    ctx.fillStyle = p.deep; ctx.font = '700 83px "IBM Plex Sans Arabic", Tahoma, Arial';
    ctx.fillText(titleLines[1], w / 2, 1160 + (1 - second) * 28);
    ctx.restore();

    const captionIn = smooth(t, 3.0, 4.0);
    ctx.save(); ctx.globalAlpha = captionIn; ctx.textAlign = 'center'; ctx.direction = 'rtl';
    ctx.fillStyle = '#77776f'; ctx.font = '400 25px "IBM Plex Sans Arabic", Tahoma, Arial';
    ctx.fillText('من فكرةٍ صغيرة، يبدأ أثرٌ كبير.', w / 2, 1260);
    ctx.restore();

    // Lower signature and restrained gold detail.
    const signature = smooth(t, 4.2, 5.1);
    ctx.save(); ctx.globalAlpha = signature; ctx.fillStyle = p.color; ctx.fillRect(492, 1352, 96, 2);
    ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillStyle = '#77776f';
    ctx.font = '500 20px "IBM Plex Sans Arabic", Tahoma, Arial'; ctx.fillText('بصمتك .. حكايتك', w / 2, 1400);
    ctx.restore();

    // Minimal footer.
    ctx.fillStyle = '#8a8982'; ctx.font = '500 12px Manrope, Arial'; ctx.textAlign = 'left'; ctx.direction = 'ltr';
    ctx.fillText('IDEAS LEAVE A TRACE', 78, h - 82);
    ctx.textAlign = 'right'; ctx.fillText('01  /  01', w - 78, h - 82);
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(w - 79, h - 54, 3, 0, Math.PI * 2); ctx.fill();
  }

  const playButton = document.getElementById('playToggle');
  const timeline = document.getElementById('timeline');
  const progress = document.querySelector('.timeline-progress');
  const thumb = document.querySelector('.timeline-thumb');
  const currentLabel = document.getElementById('timeCurrent');
  function formatTime(seconds) { const n = Math.floor(seconds); return `00:${String(n).padStart(2, '0')}`; }
  function updatePlayer() {
    const percent = (playhead / duration) * 100;
    progress.style.width = `${percent}%`; thumb.style.left = `${percent}%`;
    currentLabel.textContent = formatTime(playhead);
    timeline.setAttribute('aria-valuenow', String(Math.floor(playhead)));
    playButton.classList.toggle('paused', !playing);
    playButton.setAttribute('aria-label', playing ? 'إيقاف مؤقت' : 'تشغيل');
  }
  function loop(now) {
    const delta = Math.min((now - previousTick) / 1000, .1); previousTick = now;
    if (playing && !exportBusy) {
      playhead += delta;
      if (playhead >= duration) playhead = 0;
    }
    draw(playhead); updatePlayer(); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  playButton.addEventListener('click', () => { playing = !playing; previousTick = performance.now(); });
  document.getElementById('replay').addEventListener('click', () => { playhead = 0; playing = true; previousTick = performance.now(); });
  function seekAt(clientX) {
    const rect = timeline.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width);
    playhead = x * duration; previousTick = performance.now();
  }
  timeline.addEventListener('pointerdown', e => seekAt(e.clientX));
  timeline.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); playhead = clamp(playhead + (e.key === 'ArrowRight' ? 1 : -1), 0, duration); }
    if (e.key === 'Home') playhead = 0; if (e.key === 'End') playhead = duration;
  });
  document.querySelectorAll('.palette').forEach(button => button.addEventListener('click', () => {
    paletteName = button.dataset.palette;
    document.querySelectorAll('.palette').forEach(item => item.classList.toggle('active', item === button));
    document.querySelectorAll('.mini-mark img,.thumb-mark img').forEach(image => image.src = palettes[paletteName].image);
  }));

  const toast = document.getElementById('toast'); let toastTimer;
  function showToast(message) { toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800); }
  document.getElementById('editCopy').addEventListener('click', () => {
    const first = window.prompt('اكتب السطر الأول من العبارة:', titleLines[0]);
    if (first === null) return;
    const second = window.prompt('اكتب السطر الثاني من العبارة:', titleLines[1]);
    if (second === null) return;
    titleLines = [first.trim() || titleLines[0], second.trim() || titleLines[1]];
    document.querySelector('.quote-card p').innerHTML = `${escapeHtml(titleLines[0])}<br>${escapeHtml(titleLines[1])}`;
    showToast('تم تحديث العبارة في معاينة الفيلم');
  });
  function escapeHtml(value) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }

  document.getElementById('expandPreview').addEventListener('click', () => {
    document.querySelector('.preview-area').classList.toggle('is-expanded');
  });

  async function exportVideo(button) {
    if (exportBusy) return;
    if (!canvas.captureStream || !window.MediaRecorder) {
      showToast('تصدير الفيديو غير مدعوم في هذا المتصفح'); return;
    }
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(candidate => MediaRecorder.isTypeSupported(candidate));
    if (!type) { showToast('تعذر بدء التصدير. جرّب متصفحًا حديثًا.'); return; }
    exportBusy = true; playing = true; playhead = 0; previousTick = performance.now();
    button.disabled = true; button.dataset.original = button.innerHTML;
    button.innerHTML = '<span>◌</span> جارٍ إنشاء الفيديو…';
    showToast('جاري تسجيل الفيلم بجودة عمودية عالية');
    await new Promise(resolve => setTimeout(resolve, 250));
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { exportBusy = false; button.disabled = false; button.innerHTML = button.dataset.original; showToast('حدث خطأ أثناء إنشاء الفيديو'); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type }); const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'imprint-creative-film.webm'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      stream.getTracks().forEach(track => track.stop()); exportBusy = false; button.disabled = false; button.innerHTML = button.dataset.original;
      showToast('اكتمل الفيلم — تم تنزيل نسخة WebM');
    };
    recorder.start(250);
    setTimeout(() => { recorder.stop(); playing = false; playhead = duration; }, duration * 1000);
  }
  document.getElementById('exportTop').addEventListener('click', e => exportVideo(e.currentTarget));
})();
