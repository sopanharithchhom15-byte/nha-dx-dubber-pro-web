// Smart AI Studio Mobile Pro - Full Studio Suite Frontend v2.0
// Universal Multi-Tenant Session Isolation & Persistent Authorization
let clientSessionId = localStorage.getItem('smart_ai_studio_session_id');
if (!clientSessionId) {
  clientSessionId = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  localStorage.setItem('smart_ai_studio_session_id', clientSessionId);
}
try {
  document.cookie = `session_id=${clientSessionId}; path=/; max-age=2592000; SameSite=Lax`;
} catch (e) {}

// Universal Persistent Device ID for 1-Key = 1-Device Lock
let clientDeviceId = localStorage.getItem('smart_device_id');
if (!clientDeviceId) {
  let rand = '';
  if (window.crypto && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    rand = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    rand = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  clientDeviceId = 'dev_' + rand.slice(0, 24);
  try {
    localStorage.setItem('smart_device_id', clientDeviceId);
    document.cookie = `device_id=${clientDeviceId}; path=/; max-age=315360000; SameSite=Lax`;
  } catch (e) {}
}

// Universal fetch interceptor ensuring every request transmits Session-ID, Device-ID and License-Key
const _nativeFetch = window.fetch;
window.fetch = function(input, init = {}) {
  init = init || {};
  let hdrs = init.headers || {};
  if (hdrs instanceof Headers) {
    const obj = {};
    hdrs.forEach((v, k) => { obj[k] = v; });
    hdrs = obj;
  } else {
    hdrs = { ...hdrs };
  }
  const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
  const devId = localStorage.getItem('smart_device_id') || clientDeviceId;
  const licKey = (localStorage.getItem('smart_ai_studio_license_key') || '').trim().toUpperCase();
  hdrs['X-Session-ID'] = sid;
  if (devId) {
    hdrs['X-Device-ID'] = devId;
  }
  if (licKey) {
    hdrs['X-License-Key'] = licKey;
  }
  init.headers = hdrs;
  return _nativeFetch.call(this, input, init);
};

let appState = {
  videoLoaded: false,
  videoPath: '',
  subtitles: [],
  characterVoices: [],
  episodes: [],
  currentEpisodeId: '',
  isGenerating: false,
  isExporting: false,
  isSeparating: false,
  isAiGenerating: false,
  hasIsolatedBgm: false,
  subtitlesVisible: true,
  dubAudioEnabled: true,
  muteOriginalVoice: true,
  currentDubAudio: null,
  currentDubIndex: -1,
  blurConfig: {
    enabled: false,
    strength: 25,
    norm_x: 0.05,
    norm_y: 0.80,
    norm_w: 0.90,
    norm_h: 0.16,
    preset: 'bottom_subtitles',
    tint_opacity: 0
  },
  subFontSize: 16,
  subNormY: 0.82,
  hasCustomBgm: false,
  customBgmTitle: '',
  customBgmUrl: '',
  bgmVolumePercent: 25,
  hasLogo: false,
  logoTitle: '',
  logoUrl: '',
  logoPosition: 'top-right',
  logoScale: 15,
  logoOpacity: 90,
  // Trimming State
  trimStart: 0.0,
  trimEnd: 0.0,
  isTrimmed: false,
  // Video Title Overlay State
  hasTitle: false,
  titleConfig: {
    enabled: false,
    text: '',
    fontFamily: 'Moul',
    fontSize: 36,
    color: '#FACC15',
    strokeColor: '#000000',
    strokeWidth: 4,
    shadowColor: 'rgba(0,0,0,0.8)',
    bgStyle: 'none',
    positionY: 8,
    align: 'center'
  }
};

// Default fallback character voice bank
const DEFAULT_CHARACTER_VOICES = [
  {"id": "សំឡេងអ្នកសម្រាយរឿង", "label": "🎙️ អ្នកសម្រាយរឿង (Recap Narrator Male)", "gender": "male"},
  {"id": "សំឡេងអ្នកសម្រាយស្រី", "label": "🎙️ អ្នកសម្រាយស្រី (Recap Narrator Female)", "gender": "female"},
  {"id": "សំឡេងប្រុស", "label": "👨 តួប្រុស (Hero / Male Adult)", "gender": "male"},
  {"id": "សំឡេងស្រី", "label": "👩 តួស្រី (Heroine / Female Adult)", "gender": "female"},
  {"id": "សំឡេងតាចាស់", "label": "👴 តាចាស់ (Elderly Grandfather)", "gender": "male"},
  {"id": "សំឡេងយាយចាស់", "label": "👵 យាយចាស់ (Elderly Grandmother)", "gender": "female"},
  {"id": "សំឡេងក្មេងប្រុស", "label": "👦 ក្មេងប្រុស (Little Boy)", "gender": "female"},
  {"id": "សំឡេងក្មេងស្រី", "label": "👧 ក្មេងស្រី (Little Girl)", "gender": "female"},
  {"id": "សំឡេងគិតប្រុស", "label": "💭 គិតក្នុងចិត្ត-ប្រុស (Thought Male)", "gender": "male"},
  {"id": "សំឡេងគិតស្រី", "label": "💭 គិតក្នុងចិត្ត-ស្រី (Thought Female)", "gender": "female"},
  {"id": "សំឡេងតួអង្គម្ចាស់_អគ្គនាយក", "label": "👑 អគ្គនាយក / តួអង្គម្ចាស់ (Boss / Emperor)", "gender": "male"},
  {"id": "សំឡេងតួឆ្នាស់_កាចស្រី", "label": "⚡ តួឆ្នាស់ / កាចស្រី (Feisty Female)", "gender": "female"},
  {"id": "សំឡេងប្រុស_ចិន", "label": "🏮 តួប្រុស (រឿងចិន Chinese Drama)", "gender": "male"},
  {"id": "សំឡេងស្រី_ចិន", "label": "🏮 តួស្រី (រឿងចិន Chinese Drama)", "gender": "female"},
  {"id": "សំឡេងព្រះមហាក្សត្រ_ចិន", "label": "🏮 ព្រះមហាក្សត្រ / ព្រឹទ្ធាចារ្យ (ចិន)", "gender": "male"},
  {"id": "សំឡេងមាតា_ចិន", "label": "🏮 មាតា / អ្នកម្តាយ (ចិន)", "gender": "female"},
  {"id": "សំឡេងអគ្គនាយក_ចិន", "label": "🏮 អគ្គនាយកក្រុមហ៊ុន (ចិន)", "gender": "male"},
  {"id": "សំឡេងប្រុស_កូរ៉េ", "label": "🌸 តួប្រុស (រឿងកូរ៉េ Korean Drama)", "gender": "male"},
  {"id": "សំឡេងស្រី_កូរ៉េ", "label": "🌸 តួស្រី (រឿងកូរ៉េ Korean Drama)", "gender": "female"},
  {"id": "សំឡេងប្រុស_ថៃ", "label": "🐘 តួប្រុស (រឿងថៃ Thai Drama)", "gender": "male"},
  {"id": "សំឡេងស្រី_ថៃ", "label": "🐘 តួស្រី (រឿងថៃ Thai Drama)", "gender": "female"},
  {"id": "សំឡេងតួឆ្នាស់_ថៃ", "label": "🐘 តួឆ្នាស់ (រឿងថៃ Thai Drama)", "gender": "female"},
  {"id": "សំឡេងឪពុក_ថៃ", "label": "🐘 ឪពុក (រឿងថៃ Thai Drama)", "gender": "male"},
  {"id": "សំឡេងសម្រាយរឿង_ប្រុស", "label": "🎬 សម្រាយរឿង Cinematic (ប្រុស)", "gender": "male"},
  {"id": "សំឡេងសម្រាយរឿង_ស្រី", "label": "🎬 សម្រាយរឿង Cinematic (ស្រី)", "gender": "female"}
];

document.addEventListener('DOMContentLoaded', () => {
  initPWA();
  loadCharacterVoices();
  loadInitialState();
  loadSettings();
  setupEventListeners();
  setupVideoSubSync();
  setupBlurAndSubInteractions();
});

function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/sw.js')
      .then(() => console.log('PWA ServiceWorker registered'))
      .catch((err) => console.log('SW registration failed:', err));
  }
}

async function loadCharacterVoices() {
  try {
    const res = await fetch('/api/character_voices');
    const data = await res.json();
    if (data.voices && data.voices.length > 0) {
      appState.characterVoices = data.voices;
    } else {
      appState.characterVoices = DEFAULT_CHARACTER_VOICES;
    }
  } catch (err) {
    console.warn('Failed to load character voices, using defaults:', err);
    appState.characterVoices = DEFAULT_CHARACTER_VOICES;
  }
}

let _isMasterDubRetrying = false;
async function ensureMasterDubAudioReady() {
  const masterDub = document.getElementById('masterDubAudio');
  if (!masterDub || _isMasterDubRetrying) return;
  _isMasterDubRetrying = true;
  try {
    const res = await fetch('/api/build_master_dub', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
      masterDub.src = `/api/master_dub_audio?t=${Date.now()}&sid=${encodeURIComponent(sid)}`;
      masterDub.load();
    }
  } catch (e) {
  } finally {
    setTimeout(() => { _isMasterDubRetrying = false; }, 2000);
  }
}

function reloadMasterDubAudio() {
  const masterDub = document.getElementById('masterDubAudio');
  if (masterDub) {
    masterDub.onerror = () => {
      ensureMasterDubAudioReady();
    };
    const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
    masterDub.src = `/api/master_dub_audio?t=${Date.now()}&sid=${encodeURIComponent(sid)}`;
    masterDub.load();
  }
}

async function loadInitialState() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    appState.videoLoaded = data.has_video;
    appState.videoPath = data.video_path || '';
    if (data.subtitles && data.subtitles.length > 0) {
      appState.subtitles = data.subtitles;
    } else if (appState.subtitles && appState.subtitles.length > 0) {
      // Server lost subtitles in memory; sync back from client state
      syncSubtitlesToServer();
    } else {
      appState.subtitles = [];
    }
    appState.hasIsolatedBgm = !!data.has_isolated_bgm;
    if (data.blur_config) {
      appState.blurConfig = Object.assign(appState.blurConfig, data.blur_config);
    }
    if (data.episodes) {
      appState.episodes = data.episodes;
      appState.currentEpisodeId = data.current_episode_id || (data.episodes[0] ? data.episodes[0].id : '');
    }
    if (data.has_custom_bgm !== undefined) {
      appState.hasCustomBgm = !!data.has_custom_bgm;
      appState.customBgmTitle = data.custom_bgm_title || '';
      appState.customBgmUrl = data.custom_bgm_url || '';
      appState.bgmVolumePercent = data.bgm_volume_percent || 25;
    }
    if (data.has_logo !== undefined) {
      appState.hasLogo = !!data.has_logo;
      appState.logoTitle = data.logo_title || '';
      appState.logoUrl = data.logo_url || '';
      appState.logoPosition = data.logo_position || 'top-right';
      appState.logoScale = data.logo_scale || 15;
      appState.logoOpacity = data.logo_opacity || 90;
    }
    if (data.is_trimmed !== undefined) {
      appState.isTrimmed = !!data.is_trimmed;
    }
    if (data.has_title !== undefined) {
      appState.hasTitle = !!data.has_title;
    }
    if (data.title_config) {
      appState.titleConfig = Object.assign(appState.titleConfig, data.title_config);
    }

    updateVideoUI(data);
    renderSubtitlesList();
    renderDramaEpisodeBar();
    updateFoleyBadge();
    applyBlurOverlayToVideo();
    updateSubtitleVisibilityUI();
    reloadMasterDubAudio();
    if (typeof updateBgmUI === 'function') updateBgmUI();
    if (typeof updateLogoUI === 'function') updateLogoUI();
    if (typeof updateTrimUI === 'function') updateTrimUI();
    if (typeof updateTitleUI === 'function') updateTitleUI();
    if (typeof syncCustomBgmAudio === 'function') syncCustomBgmAudio();
    updateStudioToolsState();
    checkLicenseStatus();
  } catch (err) {
    console.error('Failed to load status:', err);
  }
}

function formatTimeDisplay(sec) {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function updatePlayState(isPlaying) {
  const icon = document.getElementById('playPauseIcon');
  const text = document.getElementById('playPauseText');
  const bigBtn = document.getElementById('bigPlayBtn');
  const bigIcon = document.getElementById('bigPlayIcon');

  if (isPlaying) {
    if (icon) icon.textContent = '⏸';
    if (text) text.textContent = 'ផ្អាក';
    if (bigBtn) bigBtn.style.display = 'none';
    if (bigIcon) bigIcon.textContent = '⏸';
  } else {
    const video = document.getElementById('mainVideo');
    if (icon) icon.textContent = '▶';
    if (text) text.textContent = 'ចាក់វីដេអូ';
    if (bigBtn && video && video.src && video.style.display !== 'none') {
      bigBtn.style.display = 'flex';
    }
    if (bigIcon) bigIcon.textContent = '▶';
  }
}

function togglePlayPause(e) {
  if (e) e.stopPropagation();
  const video = document.getElementById('mainVideo');
  if (!video || !video.src) return;
  const masterDub = document.getElementById('masterDubAudio');
  const customBgm = document.getElementById('customBgmAudio');

  if (video.paused) {
    if (masterDub && masterDub.src && appState.dubAudioEnabled) {
      masterDub.currentTime = video.currentTime;
      masterDub.play().catch(err => console.log('masterDub play:', err));
    }
    if (customBgm && customBgm.src && appState.hasCustomBgm) {
      customBgm.volume = (appState.bgmVolumePercent || 25) / 100;
      if (customBgm.duration) {
        customBgm.currentTime = video.currentTime % customBgm.duration;
      }
      customBgm.play().catch(err => console.log('customBgm play:', err));
    }
    video.play().catch(err => {
      console.warn('Playback error:', err);
      updatePlayState(false);
    });
  } else {
    video.pause();
    if (masterDub) masterDub.pause();
    if (customBgm) customBgm.pause();
  }
}

function stepVideo(delta) {
  const video = document.getElementById('mainVideo');
  if (!video || !video.src) return;
  const t = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
  video.currentTime = t;
  const masterDub = document.getElementById('masterDubAudio');
  if (masterDub && masterDub.src) {
    masterDub.currentTime = t;
  }
  const customBgm = document.getElementById('customBgmAudio');
  if (customBgm && customBgm.src && customBgm.duration) {
    customBgm.currentTime = t % customBgm.duration;
  }
}

function onSeekerInput(val) {
  const curLbl = document.getElementById('currentTimeLabel');
  if (curLbl) curLbl.textContent = formatTimeDisplay(val);
}

function onSeekerChange(val) {
  const video = document.getElementById('mainVideo');
  if (!video || !video.src) return;
  const t = parseFloat(val);
  video.currentTime = t;
  const masterDub = document.getElementById('masterDubAudio');
  if (masterDub && masterDub.src) {
    masterDub.currentTime = t;
  }
  const customBgm = document.getElementById('customBgmAudio');
  if (customBgm && customBgm.src && customBgm.duration) {
    customBgm.currentTime = t % customBgm.duration;
  }
}

function toggleMute() {
  const video = document.getElementById('mainVideo');
  const btn = document.getElementById('btnMute');
  if (!video) return;
  video.muted = !video.muted;
  if (btn) btn.textContent = video.muted ? '🔇' : '🔊';
}

function toggleFullscreen() {
  const wrap = document.getElementById('videoContainerWrapper') || document.getElementById('mainVideo');
  if (!wrap) return;
  if (!document.fullscreenElement) {
    if (wrap.requestFullscreen) wrap.requestFullscreen();
    else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function updateVideoUI(data) {
  const videoPlayer = document.getElementById('mainVideo');
  const emptyPlaceholder = document.getElementById('videoPlaceholder');
  const videoTitle = document.getElementById('videoTitle');
  const controlsBar = document.getElementById('videoControlsBar');
  const bigPlayBtn = document.getElementById('bigPlayBtn');
  const btnDelVid = document.getElementById('btnDeleteCurrentVideo');

  if (data.has_video && data.video_stream_url) {
    if (!videoPlayer.src || (videoPlayer.src.indexOf('/api/video_stream') === -1 && !videoPlayer.src.startsWith('blob:'))) {
      const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
      videoPlayer.src = data.video_stream_url + (sid ? `?sid=${encodeURIComponent(sid)}` : '');
      videoPlayer.load();
    }
    videoPlayer.style.display = 'block';
    emptyPlaceholder.style.display = 'none';
    if (controlsBar) controlsBar.style.display = 'block';
    if (bigPlayBtn) bigPlayBtn.style.display = videoPlayer.paused ? 'flex' : 'none';
    videoTitle.textContent = data.video_title || 'Video Active';
    if (btnDelVid) btnDelVid.style.display = 'inline-flex';
  } else if (videoPlayer.src && videoPlayer.src.startsWith('blob:')) {
    // Keep local preview active!
    videoPlayer.style.display = 'block';
    emptyPlaceholder.style.display = 'none';
    if (controlsBar) controlsBar.style.display = 'block';
    if (btnDelVid) btnDelVid.style.display = 'inline-flex';
  } else {
    videoPlayer.style.display = 'none';
    emptyPlaceholder.style.display = 'flex';
    if (controlsBar) controlsBar.style.display = 'none';
    if (bigPlayBtn) bigPlayBtn.style.display = 'none';
    videoTitle.textContent = 'គ្មានវីដេអូ';
    if (btnDelVid) btnDelVid.style.display = 'none';
  }
}

async function clearCurrentVideo() {
  if (!confirm('តើអ្នកពិតជាចង់លុបវីដេអូចាស់ សំឡេងបញ្ចូល និង Subtitle ទាំងអស់ចេញមែនទេ?')) return;

  // 1. Immediately pause and unload media elements so HTTP connections & file handles close cleanly
  const v = document.getElementById('mainVideo');
  if (v) {
    try {
      v.pause();
      v.currentTime = 0;
      v.removeAttribute('src');
      v.load();
    } catch (e) {}
  }
  const md = document.getElementById('masterDubAudio');
  if (md) {
    try {
      md.pause();
      md.currentTime = 0;
      md.removeAttribute('src');
      md.load();
    } catch (e) {}
  }
  if (window._activeMobileAudio) {
    try {
      window._activeMobileAudio.pause();
      window._activeMobileAudio.src = '';
    } catch (e) {}
    window._activeMobileAudio = null;
  }
  if (currentWebAudioSource) {
    try {
      currentWebAudioSource.stop();
      currentWebAudioSource.disconnect();
    } catch (e) {}
    currentWebAudioSource = null;
  }

  // 2. Reset client app state immediately
  appState.hasVideo = false;
  appState.videoLoaded = false;
  appState.videoPath = '';
  appState.videoTitle = '';
  appState.subtitles = [];
  appState.episodes = [];
  appState.currentEpisodeId = '';
  appState.currentDubIndex = -1;
  appState.hasIsolatedBgm = false;
  renderSubtitlesList();
  updateSubCount();
  renderDramaEpisodeBar();
  updateFoleyBadge();
  updateVideoUI({ has_video: false, video_title: '' });

  showProgress('កំពុងលុបវីដេអូ និងទិន្នន័យចាស់ទាំងអស់...', 50);
  try {
    const res = await fetch('/api/clear_video', {
      method: 'POST',
      headers: (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {}
    });
    const data = await res.json().catch(() => ({ success: true }));
    hideProgress();
    showToast('🗑️ បានលុបវីដេអូ សំឡេងបញ្ចូល និង Subtitle ចាស់ទាំងអស់ដោយជោគជ័យ!', 'success');
  } catch (err) {
    hideProgress();
    showToast('🗑️ បានលុបវីដេអូចេញពីអេក្រង់រួចរាល់', 'info');
  }
}

function updateFoleyBadge() {
  const badge = document.getElementById('foleyBadge');
  const vocalStatus = document.getElementById('vocalStatusText');
  if (appState.hasIsolatedBgm) {
    if (badge) badge.style.display = 'inline-block';
    if (vocalStatus) {
      vocalStatus.textContent = '✅ បានបំបែករួចរាល់ (Foley SFX & Music កំពុងសកម្ម)';
      vocalStatus.style.color = '#34d399';
    }
  } else {
    if (badge) badge.style.display = 'none';
    if (vocalStatus) {
      vocalStatus.textContent = '❌ មិនទាន់បានបំបែក';
      vocalStatus.style.color = '#f59e0b';
    }
  }
}

// Convert "00:01:23,456" to seconds float
function timeStrToSeconds(str) {
  if (!str) return 0.0;
  const parts = str.replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return 0.0;
}

// Persistent reusable Audio player for synchronized live video dubbing (prevents browser autoplay blocks)
let liveDubPlayer = null;

function getLiveDubPlayer() {
  if (!liveDubPlayer) {
    liveDubPlayer = new Audio();
    liveDubPlayer.preload = 'auto';
  }
  return liveDubPlayer;
}

// ================= UNIVERSAL MOBILE AUDIO ENGINE =================
// Web Audio API + HTML5 Audio Hybrid: Immune to mobile autoplay restrictions & silent switch bugs
let mobileAudioCtx = null;
let currentWebAudioSource = null;
let currentPlayingBtn = null;
let currentPlayingBtnOrigHtml = '';

function getMobileAudioContext() {
  if (!mobileAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      mobileAudioCtx = new AudioCtx();
    }
  }
  if (mobileAudioCtx && mobileAudioCtx.state === 'suspended') {
    mobileAudioCtx.resume().catch(() => {});
  }
  return mobileAudioCtx;
}

function unlockMobileAudioEngine() {
  const ctx = getMobileAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  // Hardware warm-up silent buffer
  if (ctx) {
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
    } catch(e) {}
  }
}

// Automatically unlock mobile audio on ANY user touch or click gesture
['touchstart', 'touchend', 'click', 'keydown'].forEach(evtName => {
  window.addEventListener(evtName, unlockMobileAudioEngine, { passive: true });
});

let universalAudioEl = null;

function getUniversalAudio() {
  if (!universalAudioEl) {
    universalAudioEl = document.getElementById('universalAudioPlayer');
    if (!universalAudioEl) {
      universalAudioEl = document.createElement('audio');
      universalAudioEl.id = 'universalAudioPlayer';
      universalAudioEl.preload = 'auto';
      universalAudioEl.setAttribute('playsinline', '');
      universalAudioEl.setAttribute('webkit-playsinline', '');
      document.body.appendChild(universalAudioEl);
    }
  }
  return universalAudioEl;
}

function playAudioClipUniversal(url, options = {}) {
  const { title = 'សំឡេង', targetBtn = null, onStart, onEnd, onError } = options;

  unlockMobileAudioEngine();

  // Reset previously playing button UI
  if (currentPlayingBtn && currentPlayingBtnOrigHtml) {
    currentPlayingBtn.innerHTML = currentPlayingBtnOrigHtml;
    currentPlayingBtn = null;
    currentPlayingBtnOrigHtml = '';
  }

  // Set active button UI
  if (targetBtn) {
    currentPlayingBtn = targetBtn;
    currentPlayingBtnOrigHtml = targetBtn.innerHTML;
    targetBtn.innerHTML = '🔊 កំពុងចាក់...';
  }

  const resetBtn = () => {
    if (currentPlayingBtn && currentPlayingBtnOrigHtml) {
      currentPlayingBtn.innerHTML = currentPlayingBtnOrigHtml;
      currentPlayingBtn = null;
      currentPlayingBtnOrigHtml = '';
    }
  };

  showToast(`🔊 កំពុងចាក់: ${title}`, 'info');
  if (typeof onStart === 'function') onStart();

  // Stop previous Web Audio if playing
  if (currentWebAudioSource) {
    try {
      currentWebAudioSource.stop();
      currentWebAudioSource.disconnect();
    } catch(e) {}
    currentWebAudioSource = null;
  }

  // Stop previously active HTML5 audio
  if (window._activeMobileAudio) {
    try {
      window._activeMobileAudio.pause();
      window._activeMobileAudio.src = '';
    } catch(e) {}
    window._activeMobileAudio = null;
  }

  // METHOD 1: Instant Synchronous HTML5 Audio (Direct user-gesture compliant on iOS Safari & Android Chrome)
  const a = new Audio();
  window._activeMobileAudio = a;
  a.crossOrigin = 'anonymous';
  a.preload = 'auto';
  a.volume = 1.0;
  a.muted = false;

  let isTerminated = false;
  const finishPlayback = () => {
    if (isTerminated) return;
    isTerminated = true;
    resetBtn();
    if (typeof onEnd === 'function') onEnd();
  };

  a.onended = finishPlayback;
  a.onerror = () => {
    console.warn('[AudioEngine] HTML5 error, falling back to Web Audio API...');
    playViaWebAudio(url, resetBtn, onEnd, onError);
  };

  a.src = url;

  try {
    const playPromise = a.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log(`[AudioEngine] Synchronous HTML5 playback started for: ${title}`);
      }).catch(err => {
        console.warn('[AudioEngine] Synchronous play rejected, falling back to Web Audio API:', err);
        playViaWebAudio(url, resetBtn, onEnd, onError);
      });
    }
  } catch (errSync) {
    playViaWebAudio(url, resetBtn, onEnd, onError);
  }
}

async function playViaWebAudio(url, resetBtn, onEnd, onError) {
  const ctx = getMobileAudioContext();
  if (!ctx) {
    if (typeof resetBtn === 'function') resetBtn();
    if (typeof onError === 'function') onError(new Error('AudioContext not available'));
    return;
  }
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const arrayBuffer = await resp.arrayBuffer();

    // Decode with 3-second safety timeout so it never hangs on mobile
    const audioBuffer = await Promise.race([
      new Promise((resolve, reject) => {
        ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('decodeAudioData timeout')), 3000))
    ]);

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;
    sourceNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    sourceNode.onended = () => {
      if (currentWebAudioSource === sourceNode) {
        currentWebAudioSource = null;
      }
      if (typeof resetBtn === 'function') resetBtn();
      if (typeof onEnd === 'function') onEnd();
    };

    sourceNode.start(0);
    currentWebAudioSource = sourceNode;
    console.log('[AudioEngine] Web Audio playback started successfully');
  } catch (e) {
    console.error('[AudioEngine] Web Audio failed:', e);
    if (typeof resetBtn === 'function') resetBtn();
    if (typeof onError === 'function') onError(e);
    showToast('⚠️ មិនអាចចាក់សំឡេងបានទេ: សូមពិនិត្យកុងតាក់ Silent/Mute ឬកម្រិតសំឡេងទូរស័ព្ទ!', 'error');
  }
}



// Real-time Subtitle Synchronization with Video Player & Live Dub Audio Engine
function setupVideoSubSync() {
  const video = document.getElementById('mainVideo');
  const overlay = document.getElementById('subOverlay');
  const seeker = document.getElementById('videoSeeker');
  const curLbl = document.getElementById('currentTimeLabel');
  const durLbl = document.getElementById('durationLabel');
  if (!video) return;

  const player = getLiveDubPlayer();

  player.addEventListener('ended', () => {
    // Spoken dialogue ended for this line! Restore video sound so Foley & BGM are always heard!
    if (appState.muteOriginalVoice && !video.paused) {
      video.volume = video.muted ? 0.0 : 0.35;
    }
  });

  player.addEventListener('error', (e) => {
    console.log('Dub audio stream note:', e);
    // Never leave video muted if audio stream had a transient error!
    if (!video.paused) {
      video.volume = video.muted ? 0.0 : (appState.muteOriginalVoice ? 0.35 : 1.0);
    }
  });

  const masterDub = document.getElementById('masterDubAudio');

  function stopDubVoice() {
    try {
      player.pause();
    } catch (e) {}
    appState.currentDubIndex = -1;
  }

  video.addEventListener('play', () => {
    updatePlayState(true);
    if (masterDub && masterDub.src && !masterDub.error && appState.dubAudioEnabled) {
      if (Math.abs(masterDub.currentTime - video.currentTime) > 0.15) {
        masterDub.currentTime = video.currentTime;
      }
      masterDub.play().catch(e => {
        console.log('masterDub play note:', e);
        ensureMasterDubAudioReady();
      });
    } else if (appState.dubAudioEnabled) {
      ensureMasterDubAudioReady();
    }
    const customBgm = document.getElementById('customBgmAudio');
    if (customBgm && customBgm.src && appState.hasCustomBgm) {
      customBgm.volume = (appState.bgmVolumePercent || 25) / 100;
      if (customBgm.duration && Math.abs(customBgm.currentTime - (video.currentTime % customBgm.duration)) > 0.25) {
        customBgm.currentTime = video.currentTime % customBgm.duration;
      }
      customBgm.play().catch(e => console.log('customBgm play note:', e));
    }
  });

  video.addEventListener('pause', () => {
    updatePlayState(false);
    if (masterDub) masterDub.pause();
    const customBgm = document.getElementById('customBgmAudio');
    if (customBgm) customBgm.pause();
    stopDubVoice();
  });

  video.addEventListener('ended', () => {
    updatePlayState(false);
    if (masterDub) masterDub.pause();
    const customBgm = document.getElementById('customBgmAudio');
    if (customBgm) customBgm.pause();
    stopDubVoice();
  });

  video.addEventListener('seeking', () => {
    if (masterDub && masterDub.src) {
      masterDub.currentTime = video.currentTime;
    }
    const customBgm = document.getElementById('customBgmAudio');
    if (customBgm && customBgm.src && customBgm.duration) {
      customBgm.currentTime = video.currentTime % customBgm.duration;
    }
    stopDubVoice();
  });

  video.addEventListener('seeked', () => {
    if (masterDub && masterDub.src) {
      masterDub.currentTime = video.currentTime;
      if (!video.paused && appState.dubAudioEnabled) {
        masterDub.play().catch(e => console.log('masterDub seek play:', e));
      }
    }
    const customBgm = document.getElementById('customBgmAudio');
    if (customBgm && customBgm.src && customBgm.duration) {
      customBgm.currentTime = video.currentTime % customBgm.duration;
      if (!video.paused && appState.hasCustomBgm) {
        customBgm.play().catch(e => console.log('customBgm seek play:', e));
      }
    }
    stopDubVoice();
  });

  function updateDuration() {
    const d = video.duration || 0;
    if (seeker) seeker.max = d;
    if (durLbl) durLbl.textContent = formatTimeDisplay(d);
  }

  video.addEventListener('loadedmetadata', () => {
    updateDuration();
    if (appState.dubAudioEnabled) ensureMasterDubAudioReady();
  });
  video.addEventListener('durationchange', updateDuration);

  video.addEventListener('timeupdate', () => {
    const curTime = video.currentTime;
    if (seeker && !seeker.matches(':active')) {
      seeker.value = curTime;
    }
    if (curLbl) curLbl.textContent = formatTimeDisplay(curTime);

    let activeSub = null;
    let activeIdx = -1;

    for (let i = 0; i < appState.subtitles.length; i++) {
      const s = appState.subtitles[i];
      const startSec = timeStrToSeconds(s.start);
      const endSec = timeStrToSeconds(s.end);
      if (curTime >= startSec && curTime <= endSec) {
        activeSub = s;
        activeIdx = i;
        break;
      }
    }

    // 1. Live Subtitle Visibility & Real-time Sizing/Positioning (Fast Dirty-Check)
    if (overlay) {
      if (appState.subtitlesVisible && activeSub && activeSub.text) {
        if (overlay.textContent !== activeSub.text) {
          overlay.textContent = activeSub.text;
        }
        if (overlay.style.display !== 'block') {
          overlay.style.display = 'block';
        }
      } else {
        if (overlay.style.display !== 'none') {
          overlay.style.display = 'none';
        }
      }
    }

    // 2. Real-time Dub Audio Synchronization (Zero-dropouts & Guaranteed Continuity - No Stutter)
    if (!video.paused && appState.dubAudioEnabled) {
      const isMasterDubUsable = masterDub && masterDub.src && !masterDub.error && (masterDub.readyState >= 1 || !masterDub.paused);
      if (isMasterDubUsable) {
        // Continuous Master Dub Audio Track is active!
        if (masterDub.paused) {
          masterDub.currentTime = curTime;
          masterDub.play().catch(e => console.log('masterDub resume:', e));
        } else {
          const diff = masterDub.currentTime - curTime;
          const absDiff = Math.abs(diff);
          const now = Date.now();
          if (!window._lastAudioSyncCheck || (now - window._lastAudioSyncCheck > 500)) {
            window._lastAudioSyncCheck = now;
            if (absDiff > 1.2) {
              // Large drift (e.g. user jumped timeline): hard seek once
              masterDub.currentTime = curTime;
            } else if (absDiff > 0.18) {
              // Gentle pitch-preserving rate nudge to glide back into sync without buffer flush or stutter
              masterDub.playbackRate = video.playbackRate * (diff > 0 ? 0.98 : 1.02);
            } else {
              masterDub.playbackRate = video.playbackRate;
            }
          }
        }

        // Voice Ducking Automation: Steady volume instead of harsh jumping on every word!
        if (appState.muteOriginalVoice) {
          const isDubActive = masterDub && !masterDub.paused && !masterDub.muted;
          video.volume = isDubActive ? 0.0 : (video.muted ? 0.0 : 0.85);
        } else {
          video.volume = video.muted ? 0.0 : 1.0;
        }
      } else {
        // Per-scene Clip Player Fallback:
        if (activeSub && activeSub.has_audio !== false) {
          if (appState.currentDubIndex !== activeIdx) {
            appState.currentDubIndex = activeIdx;
            const startSec = timeStrToSeconds(activeSub.start);
            const offset = Math.max(0, curTime - startSec);
            const clipUrl = `/api/voice_audio/${activeIdx}`;
            if (!player.src || !player.src.endsWith(clipUrl)) {
              player.src = clipUrl;
            }
            player.currentTime = offset;
            player.volume = 1.0;
            player.play().catch(e => console.log('Live dub voice play note:', e));
          }
        } else {
          if (appState.currentDubIndex !== -1) {
            stopDubVoice();
          }
        }
        if (appState.muteOriginalVoice) {
          const isDubActive = player && !player.paused && !player.muted;
          video.volume = isDubActive ? 0.0 : (video.muted ? 0.0 : 0.85);
        } else {
          video.volume = video.muted ? 0.0 : 1.0;
        }
      }
    } else {
      if (masterDub && !masterDub.paused) {
        masterDub.pause();
      }
      stopDubVoice();
      if (!video.paused) {
        video.volume = video.muted ? 0.0 : 1.0;
      }
    }

    // Highlight active card (Fast O(1) single-element toggle - 0ms overhead)
    if (activeIdx !== window._lastActiveCardIdx) {
      if (window._lastActiveCardIdx !== undefined && window._lastActiveCardIdx >= 0) {
        const prevCard = document.getElementById(`sub-card-${window._lastActiveCardIdx}`);
        if (prevCard) prevCard.classList.remove('active');
      }
      if (activeIdx >= 0) {
        const newCard = document.getElementById(`sub-card-${activeIdx}`);
        if (newCard) newCard.classList.add('active');
      }
      window._lastActiveCardIdx = activeIdx;
    }
  });

  video.addEventListener('click', (e) => {
    togglePlayPause(e);
  });
}

function seekVideoToTime(timeStr) {
  const video = document.getElementById('mainVideo');
  if (video && video.src) {
    const sec = timeStrToSeconds(timeStr);
    video.currentTime = sec;
    video.play().catch(e => console.log('Auto play blocked:', e));
  }
}

// Render Subtitles List with 12 Character Voices and Full Editing
function renderSubtitlesList() {
  const container = document.getElementById('subtitlesList');
  const countBadge = document.getElementById('subCountBadge');
  if (!container || !countBadge) return;

  container.innerHTML = '';
  countBadge.textContent = appState.subtitles.length + ' បន្ទាត់';

  if (appState.subtitles.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 25px 15px; color: #64748b; font-size: 0.85rem; display: flex; flex-direction: column; gap: 10px; align-items: center;">
        <span style="font-weight: 600; color: #94a3b8;">មិនទាន់មានបន្ទាត់ Subtitle នៅក្នុង Timeline ទេ</span>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;">
          <button class="pill-btn gradient" onclick="openAiSubModal()">🤖 បង្កើតជាមួយ Gemini AI</button>
          <button class="pill-btn" style="background: #059669; color: white;" onclick="openPasteSrtModal()">📋 បិទភ្ជាប់ SRT</button>
          <button class="pill-btn" style="background: #1e293b; color: white;" onclick="addSubtitleRow()">➕ បន្ថែមជួរថ្មី</button>
        </div>
      </div>`;
    return;
  }

  const voiceList = appState.characterVoices.length > 0 ? appState.characterVoices : DEFAULT_CHARACTER_VOICES;
  const frag = document.createDocumentFragment();

  appState.subtitles.forEach((sub, idx) => {
    const card = document.createElement('div');
    card.className = 'sub-card';
    card.id = `sub-card-${idx}`;

    const isReady = sub.status === 'done' || sub.has_audio;
    const statusClass = isReady ? 'status-done' : 'status-pending';
    const statusText = isReady ? '✅ រួចរាល់' : '⏳ មិនទាន់';

    // Voice options: accurately match by ID, label, or canonical fallback (NO arbitrary alternating rows!)
    let voiceOptionsHtml = '';
    const currentVoice = (sub.voice || '').trim();
    let matchedId = null;

    for (const v of voiceList) {
      if (currentVoice === v.id || currentVoice === v.label) {
        matchedId = v.id;
        break;
      }
    }
    if (!matchedId && currentVoice) {
      for (const v of voiceList) {
        if (v.id.includes(currentVoice) || currentVoice.includes(v.id)) {
          matchedId = v.id;
          break;
        }
      }
    }
    if (!matchedId) {
      const isFem = (sub.voice_gender === 'female') || currentVoice.includes('ស្រី') || currentVoice.includes('យាយ') || currentVoice.includes('មាតា');
      matchedId = isFem ? 'សំឡេងស្រី' : 'សំឡេងប្រុស';
    }

    voiceList.forEach(v => {
      const isSel = (v.id === matchedId);
      voiceOptionsHtml += `<option value="${v.id}" ${isSel ? 'selected' : ''}>${v.label}</option>`;
    });

    card.innerHTML = `
      <div class="sub-meta-row">
        <div class="sub-meta-left">
          <button class="btn-card-action" onclick="seekVideoToTime('${sub.start}')" title="ចុចដើម្បីលោតវីដេអូទៅវិនាទីនេះ">
            🎬 #${idx + 1}
          </button>
          <div class="time-inputs-row">
            <input type="text" class="sub-time-input" value="${sub.start}" onchange="updateSubTime(${idx}, 'start', this.value)" title="Start Time">
            <span>➔</span>
            <input type="text" class="sub-time-input" value="${sub.end}" onchange="updateSubTime(${idx}, 'end', this.value)" title="End Time">
          </div>
        </div>

        <div class="sub-card-actions">
          <span class="sub-status ${statusClass}">${statusText}</span>
          <button class="btn-card-action" onclick="splitSubtitleRow(${idx})" title="កាត់បំបែកជា ២ ជួរ">✂️</button>
        </div>
      </div>

      <textarea class="sub-text-input" placeholder="សរសេរអត្ថបទ Subtitle..." onchange="updateSubText(${idx}, this.value)">${(sub.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>

      <div class="sub-actions-row">
        <select class="voice-select" id="voice-select-${idx}" onchange="updateSubVoice(${idx}, this.value)">
          ${voiceOptionsHtml}
        </select>
        <div class="sub-actions-buttons">
          <button class="pill-btn" style="padding: 5px 6px; font-size: 0.68rem; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8;" onclick="playVoiceSampleForSub(${idx})" title="ស្តាប់សំឡេងគំរូនៃតួអង្គ">
            🔊 គំរូ
          </button>
          <button class="btn-play-sub" onclick="playSubAudio(${idx})" title="ស្តាប់សំឡេងដែលបានអាន Subtitle">
            ▶ ស្តាប់
          </button>
          <button class="btn-gen-sub" onclick="generateSingleVoice(${idx})" title="ក្លូនសំឡេងអានអក្សរ Subtitle ជួរនេះ">
            ⚡ អាន Sub
          </button>
          <button class="pill-btn" style="padding: 5px 6px; font-size: 0.68rem; background: rgba(234, 88, 12, 0.18); border: 1px solid rgba(234, 88, 12, 0.5); color: #fb923c;" onclick="repairSingleSubAudio(${idx})" title="ជួសជុលសំឡេងជួរនេះឱ្យស៊ីចង្វាក់ ឬបង្កើតប្រសិនបើមិនទាន់មាន">
            ⏱️ ជួសជុល
          </button>
        </div>
      </div>
    `;
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

function updateSubText(idx, val) {
  if (appState.subtitles[idx]) {
    appState.subtitles[idx].text = val;
    syncSubtitlesToServer();
  }
}

function updateSubTime(idx, field, val) {
  if (appState.subtitles[idx]) {
    appState.subtitles[idx][field] = val;
    syncSubtitlesToServer();
  }
}

function updateSubVoice(idx, val) {
  if (appState.subtitles[idx]) {
    appState.subtitles[idx].voice = val;
    const isFemale = val.indexOf('ស្រី') !== -1 || val.indexOf('យាយ') !== -1;
    appState.subtitles[idx].voice_gender = isFemale ? 'female' : 'male';
    syncSubtitlesToServer();
  }
}

async function syncSubtitlesToServer() {
  const saveBtn = document.getElementById('btnSaveSubtitles');
  if (saveBtn) {
    saveBtn.innerHTML = '<span>⏳</span><span>កំពុងរក្សាទុក...</span>';
    saveBtn.style.opacity = '0.7';
  }
  try {
    const res = await fetch('/api/subtitles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtitles: appState.subtitles })
    });
    if (res.ok) {
      showToast('💾 បានរក្សាទុក Subtitles ជោគជ័យ!', 'success');
      if (saveBtn) {
        saveBtn.innerHTML = '<span>✅</span><span>បានរក្សាទុក!</span>';
        setTimeout(() => {
          saveBtn.innerHTML = '<span>💾</span><span>រក្សាទុក</span>';
          saveBtn.style.opacity = '1';
        }, 1500);
      }
    } else {
      showToast('⚠️ មិនអាចរក្សាទុកបានទេ (HTTP ' + res.status + ')', 'error');
      if (saveBtn) {
        saveBtn.innerHTML = '<span>💾</span><span>រក្សាទុក</span>';
        saveBtn.style.opacity = '1';
      }
    }
  } catch (err) {
    console.error('Failed to sync subtitles:', err);
    showToast('⚠️ កំហុសរក្សាទុក: ' + err.message, 'error');
    if (saveBtn) {
      saveBtn.innerHTML = '<span>💾</span><span>រក្សាទុក</span>';
      saveBtn.style.opacity = '1';
    }
  }
}

// Subtitle CRUD Operations
async function addSubtitleRow() {
  showProgress('កំពុងបន្ថែមជួរថ្មី...', 50);
  try {
    const res = await fetch('/api/subtitles/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '', voice: 'សំឡេងប្រុស' })
    });
    const data = await res.json();
    hideProgress();
    if (data.success) {
      appState.subtitles = data.subtitles;
      renderSubtitlesList();
      // Scroll to bottom
      const container = document.getElementById('subtitlesList');
      if (container) container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    hideProgress();
    alert('កំហុសបន្ថែមជួរ: ' + err);
  }
}

async function deleteSubtitleRow(idx) {
  if (!confirm(`តើអ្នកពិតជាចង់លុបជួរ #${idx + 1} មែនទេ?`)) return;

  showProgress('កំពុងលុប...', 50);
  try {
    const res = await fetch(`/api/subtitles/delete/${idx}`, { method: 'DELETE' });
    const data = await res.json();
    hideProgress();
    if (data.success) {
      appState.subtitles = data.subtitles;
      renderSubtitlesList();
    }
  } catch (err) {
    hideProgress();
    alert('កំហុសលុប: ' + err);
  }
}

async function splitSubtitleRow(idx) {
  showProgress('កំពុងកាត់បំបែកជួរ...', 50);
  try {
    const res = await fetch(`/api/subtitles/split/${idx}`, { method: 'POST' });
    const data = await res.json();
    hideProgress();
    if (data.success) {
      appState.subtitles = data.subtitles;
      renderSubtitlesList();
    }
  } catch (err) {
    hideProgress();
    alert('កំហុសបំបែក: ' + err);
  }
}

// Import & Export SRT
function triggerImportSrt() {
  const input = document.getElementById('srtFileInput');
  if (input) input.click();
}

function exportSrtFile() {
  if (!appState.subtitles || appState.subtitles.length === 0) {
    alert('មិនទាន់មាន Subtitle សម្រាប់ទាញយកទេ');
    return;
  }
  window.location.href = '/api/export_srt';
}

// Update subtitle card status dynamically in DOM without full re-render
function updateSubCardLiveStatus(idx, status, num) {
  const card = document.getElementById(`sub-card-${idx}`);
  if (!card) return;

  const statusEl = card.querySelector('.sub-status');
  if (status === 'cloning') {
    card.classList.add('cloning-active');
    if (statusEl) {
      statusEl.className = 'sub-status status-cloning';
      const dispNum = (num !== undefined && num !== null) ? num : (idx + 1);
      statusEl.innerHTML = `<span class="soundwave-anim"><span></span><span></span><span></span></span> 🎙️ កំពុងបញ្ចូល #${dispNum}...`;
    }
  } else if (status === 'done') {
    card.classList.remove('cloning-active');
    if (statusEl) {
      statusEl.className = 'sub-status status-done';
      statusEl.textContent = '✅ រួចរាល់';
    }
    if (appState.subtitles && appState.subtitles[idx]) {
      appState.subtitles[idx].status = 'done';
      appState.subtitles[idx].has_audio = true;
    }
  } else if (status === 'pending') {
    card.classList.remove('cloning-active');
    if (statusEl) {
      statusEl.className = 'sub-status status-pending';
      statusEl.textContent = '⏳ មិនទាន់';
    }
  }
}

// Single and Batch TTS Generation
let batchPollTimer = null;

async function generateSingleVoice(idx) {
  updateSubCardLiveStatus(idx, 'cloning', idx + 1);
  showProgress('🎙️ កំពុងបង្កើតសំឡេងជួរ #' + (idx + 1) + '...', 35);

  const sub = (appState.subtitles && appState.subtitles[idx]) ? appState.subtitles[idx] : null;
  const trackerEl = document.getElementById('timelineLiveTracker');
  if (trackerEl && sub) {
    trackerEl.style.display = 'flex';
    const badgeEl = document.getElementById('trackerNumberBadge');
    const rangeEl = document.getElementById('trackerTimeRange');
    const voiceEl = document.getElementById('trackerVoiceName');
    const textEl = document.getElementById('trackerTextPreview');
    const fillEl = document.getElementById('trackerProgressBarFill');
    if (badgeEl) badgeEl.textContent = `ជួរទី #${idx + 1} / ${appState.subtitles.length}`;
    if (rangeEl) rangeEl.textContent = `${sub.start} ➔ ${sub.end}`;
    if (voiceEl) voiceEl.textContent = sub.voice;
    if (textEl) textEl.textContent = sub.text ? `«${sub.text.substring(0, 85)}»` : '';
    if (fillEl) fillEl.style.width = '50%';
  }

  // Live timeline sync: jump video player to start timestamp
  if (sub && sub.start) {
    const targetSec = timeStrToSeconds(sub.start);
    const video = document.getElementById('mainVideo');
    const seeker = document.getElementById('videoSeeker');
    const curLbl = document.getElementById('currentTimeLabel');
    if (video && video.src && !isNaN(targetSec)) {
      try { video.currentTime = targetSec; } catch (e) {}
    }
    if (seeker && !isNaN(targetSec)) seeker.value = targetSec;
    if (curLbl && !isNaN(targetSec)) curLbl.textContent = formatTimeDisplay(targetSec);
  }

  try {
    if (appState.subtitles && appState.subtitles.length > 0) {
      await fetch('/api/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles: appState.subtitles })
      }).catch(() => {});
    }

    const res = await fetch('/api/generate_tts_single', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        index: idx,
        text: sub ? (sub.text || '') : '',
        voice: sub ? (sub.voice || '') : ''
      })
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const result = await res.json();
    hideProgress();
    if (result.success) {
      if (appState.subtitles && appState.subtitles[idx]) {
        appState.subtitles[idx].status = 'done';
        appState.subtitles[idx].has_audio = true;
      }
      updateSubCardLiveStatus(idx, 'done');
      if (trackerEl) {
        const badgeEl = document.getElementById('trackerNumberBadge');
        const fillEl = document.getElementById('trackerProgressBarFill');
        if (badgeEl) badgeEl.textContent = `ជួរទី #${idx + 1} រួចរាល់`;
        if (fillEl) fillEl.style.width = '100%';
        setTimeout(() => { if (trackerEl) trackerEl.style.display = 'none'; }, 2000);
      }
      playSubAudio(idx);
      showToast(`🎉 បានបញ្ចូលសំឡេងជួរ #${idx + 1} ជោគជ័យ!`, 'success');
    } else {
      updateSubCardLiveStatus(idx, 'pending');
      if (trackerEl) trackerEl.style.display = 'none';
      showToast('⚠️ កំហុស TTS: ' + (result.error || 'បរាជ័យ'), 'error');
    }
  } catch (err) {
    updateSubCardLiveStatus(idx, 'pending');
    if (trackerEl) trackerEl.style.display = 'none';
    hideProgress();
    showToast('⚠️ កំហុសតភ្ជាប់ TTS: ' + err.message, 'error');
  }
}

async function generateAllPendingVoices(optProvider, forceAll = false) {
  if (appState.isGenerating) {
    const shouldReset = confirm('⚡ ប្រព័ន្ធកំពុងដំណើរការបង្កើតសំឡេង។ តើអ្នកចង់ចាប់ផ្តើមឡើងវិញ (Reset) មែនទេ?');
    if (shouldReset) {
      if (batchPollTimer) {
        clearInterval(batchPollTimer);
        batchPollTimer = null;
      }
      appState.isGenerating = false;
      hideProgress();
    } else {
      return;
    }
  }

  if (!appState.subtitles || appState.subtitles.length === 0) {
    showToast('⚠️ មិនទាន់មាន Subtitle ទេ! សូមបញ្ចូល ឬបិទភ្ជាប់ Subtitle ជាមុនសិន', 'error');
    return;
  }

  // Count subtitles that already have synthesized audio
  const totalSubs = appState.subtitles.length;
  const missingCount = appState.subtitles.filter(s => !s.has_audio).length;
  let isForce = forceAll || !!window.forceRegenerateAll;
  window.forceRegenerateAll = false;

  if (missingCount === 0 && !isForce) {
    const regen = confirm(`🎉 គ្រប់ជួរទាំង ${totalSubs} មានសំឡេងរួចរាល់ហើយ!\n\nតើអ្នកចង់បង្កើតឡើងវិញទាំងអស់ពីដើម (Regenerate All) មែនទេ?`);
    if (regen) {
      isForce = true;
    } else {
      showToast('✅ សំឡេងគ្រប់ជួរត្រូវបានបង្កើតរួចជាស្រេច!', 'success');
      return;
    }
  }

  appState.isGenerating = true;
  if (batchPollTimer) {
    clearInterval(batchPollTimer);
    batchPollTimer = null;
  }

  let savedProvider = (document.getElementById('settingsTtsProvider') ? document.getElementById('settingsTtsProvider').value : '') || 'VoxCPM-HuggingFace';
  const chosenProvider = optProvider || savedProvider;
  const startMsg = chosenProvider.includes('Edge')
    ? '⚡ កំពុងបញ្ចូលសំឡេង Studio Edge-TTS Turbo តាមលេខរៀង...'
    : (isForce ? '🌐 កំពុងក្លូនសំឡេងឡើងវិញគ្រប់ជួរ...' : `🌐 កំពុងក្លូនសំឡេងជួរដែលខ្វះ (${missingCount} ជួរ)...`);
  showProgress(startMsg, 10);

  try {
    const res = await fetch('/api/generate_tts_batch_pending', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        force: isForce,
        provider: chosenProvider,
        subtitles: appState.subtitles
      })
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    if (!data.success) {
      hideProgress();
      appState.isGenerating = false;
      if (data.license_required) {
        openLicenseModal();
        showToast(data.error || '🔒 សូមធ្វើការ Activate Key កម្មវិធីជាមុនសិន!', 'warning');
      } else {
        showToast('⚠️ ' + (data.error || 'បរាជ័យក្នុងការចាប់ផ្តើម'), 'error');
      }
      return;
    }

    const currentBatchId = data.batch_id;
    let pollFailures = 0;
    let localTick = 0;
    let lastActiveIdx = -1;
    let itemTick = 0;

    batchPollTimer = setInterval(async () => {
      try {
        const pRes = await fetch('/api/tts_progress');
        if (!pRes.ok) {
          pollFailures++;
          if (pollFailures > 12) {
            clearInterval(batchPollTimer);
            batchPollTimer = null;
            hideProgress();
            appState.isGenerating = false;
            showToast('⚠️ ការតភ្ជាប់មានបញ្ហា សូមព្យាយាមម្តងទៀត', 'error');
          }
          return;
        }
        pollFailures = 0;
        localTick++;

        const pData = await pRes.json();

        // 1. Skip stale progress from prior batch
        if (pData.batch_id && currentBatchId && pData.batch_id !== currentBatchId) {
          return;
        }

        const total = pData.total || (appState.subtitles ? appState.subtitles.length : 1);
        const curr = pData.current || 0;

        // 2. Prevent premature cutoff: ignore done on very first tick if batch is supposed to run
        if (pData.done && localTick < 2 && total > 0 && curr < total) {
          return;
        }

        // Update all completed subtitle cards in real-time
        if (pData.completed_indices && Array.isArray(pData.completed_indices)) {
          pData.completed_indices.forEach(compIdx => {
            updateSubCardLiveStatus(compIdx, 'done');
          });
        }

        // Highlight and auto-scroll to the line currently being cloned
        if (pData.active_index !== undefined && pData.active_index !== null && pData.active_index >= 0) {
          const curActiveNum = pData.active_num || (pData.active_index + 1);
          if (pData.active_index !== lastActiveIdx) {
            if (lastActiveIdx >= 0) {
              const wasDone = pData.completed_indices && pData.completed_indices.includes(lastActiveIdx);
              updateSubCardLiveStatus(lastActiveIdx, wasDone ? 'done' : 'pending');
            }
            itemTick = 0;
            lastActiveIdx = pData.active_index;
            updateSubCardLiveStatus(lastActiveIdx, 'cloning', curActiveNum);

            // Auto-scroll subtitle card into view smoothly to center
            const activeCard = document.getElementById(`sub-card-${lastActiveIdx}`);
            if (activeCard) {
              activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Live Timeline Scrubber sync: jump video player to subtitle start timestamp
            const video = document.getElementById('mainVideo');
            const seeker = document.getElementById('videoSeeker');
            const curLbl = document.getElementById('currentTimeLabel');
            const targetSec = (pData.start_sec !== undefined && pData.start_sec !== null) ? pData.start_sec : ((appState.subtitles && appState.subtitles[lastActiveIdx]) ? timeStrToSeconds(appState.subtitles[lastActiveIdx].start) : 0);
            if (!isNaN(targetSec) && targetSec >= 0) {
              if (video && video.src) {
                try { video.currentTime = targetSec; } catch (e) {}
              }
              if (seeker) seeker.value = targetSec;
              if (curLbl) curLbl.textContent = formatTimeDisplay(targetSec);
            }
          } else {
            itemTick++;
          }

          // Dedicated Timeline Live Tracker Banner update
          const trackerEl = document.getElementById('timelineLiveTracker');
          if (trackerEl) {
            trackerEl.style.display = 'flex';
            const badgeEl = document.getElementById('trackerNumberBadge');
            const rangeEl = document.getElementById('trackerTimeRange');
            const voiceEl = document.getElementById('trackerVoiceName');
            const textEl = document.getElementById('trackerTextPreview');
            const fillEl = document.getElementById('trackerProgressBarFill');

            const totalSubs = pData.total_subs || (appState.subtitles ? appState.subtitles.length : total);
            if (badgeEl) badgeEl.textContent = `ជួរទី #${curActiveNum} / ${totalSubs}`;

            const sTime = pData.start_time || ((appState.subtitles && appState.subtitles[lastActiveIdx]) ? appState.subtitles[lastActiveIdx].start : '');
            const eTime = pData.end_time || ((appState.subtitles && appState.subtitles[lastActiveIdx]) ? appState.subtitles[lastActiveIdx].end : '');
            if (rangeEl && sTime && eTime) rangeEl.textContent = `${sTime} ➔ ${eTime}`;

            const vName = pData.voice || ((appState.subtitles && appState.subtitles[lastActiveIdx]) ? appState.subtitles[lastActiveIdx].voice : 'សំឡេង');
            if (voiceEl) voiceEl.textContent = vName;

            const rawText = pData.text || ((appState.subtitles && appState.subtitles[lastActiveIdx]) ? appState.subtitles[lastActiveIdx].text : '');
            if (textEl) textEl.textContent = rawText ? `«${rawText.substring(0, 85)}»` : '';

            if (fillEl) fillEl.style.width = `${pct}%`;
          }
        }

        // Dynamic fluid percentage calculation that advances on every tick and leaps forward on completions
        const basePct = (curr / total) * 100;
        const slicePct = (1 / total) * 100;
        const intraProgress = Math.min(0.92, 0.15 + (itemTick * 0.15));
        let pct = Math.round(basePct + (slicePct * intraProgress));
        if (pData.percent && pData.percent > pct) {
          pct = pData.percent;
        }
        if (curr > 0) {
          pct = Math.max(pct, Math.round((curr / total) * 100));
        }
        pct = Math.max(10, Math.min(98, pct));

        const activeNum = (pData.active_index !== undefined && pData.active_index >= 0) ? (pData.active_index + 1) : (curr + 1);
        const activeName = (appState.subtitles && appState.subtitles[activeNum - 1]) ? appState.subtitles[activeNum - 1].voice : '';
        const actionVerb = 'កំពុងក្លូនសំឡេងអាន';
        const statusMsg = pData.message || `🎙️ ${actionVerb}ជួរ #${activeNum}/${total}${nameSuffix}...`;
        showProgress(`${statusMsg} [${curr}/${total} រួចរាល់]`, pct);

        if (pData.done) {
          clearInterval(batchPollTimer);
          batchPollTimer = null;
          if (lastActiveIdx >= 0) {
            updateSubCardLiveStatus(lastActiveIdx, 'done');
          }
          // Remove any lingering active styling on cards
          document.querySelectorAll('.sub-card.cloning-active').forEach(c => c.classList.remove('cloning-active'));

          const trackerEl = document.getElementById('timelineLiveTracker');
          if (trackerEl) {
            const badgeEl = document.getElementById('trackerNumberBadge');
            const rangeEl = document.getElementById('trackerTimeRange');
            const fillEl = document.getElementById('trackerProgressBarFill');
            if (badgeEl) badgeEl.textContent = `រួចរាល់ 100%`;
            if (rangeEl) rangeEl.textContent = `🎉 បានបញ្ចូលគ្រប់ជួរតាមលេខរៀងជោគជ័យ!`;
            if (fillEl) fillEl.style.width = `100%`;
            setTimeout(() => {
              if (trackerEl) trackerEl.style.display = 'none';
            }, 3500);
          }

          showProgress('🎉 រួចរាល់ 100%!', 100);
          setTimeout(async () => {
            hideProgress();
            appState.isGenerating = false;
            try {
              await loadInitialState();
            } catch (eInit) {
              console.warn('Post-batch loadInitialState note:', eInit);
            }
            reloadMasterDubAudio();
            const doneMsg = '🎉 បានក្លូនសំឡេងគំរូតួអង្គអាន Subtitle គ្រប់ជួរតាមលេខរៀងជោគជ័យ 100%!';
            showToast(doneMsg, 'success');
          }, 600);
        }
      } catch (ePoll) {
        pollFailures++;
        if (pollFailures > 12) {
          clearInterval(batchPollTimer);
          batchPollTimer = null;
          hideProgress();
          appState.isGenerating = false;
        }
      }
    }, 1200);
  } catch (err) {
    showToast('⚠️ កំហុសបង្កើតសំឡេង: ' + err.message, 'error');
    hideProgress();
    appState.isGenerating = false;
    if (batchPollTimer) {
      clearInterval(batchPollTimer);
      batchPollTimer = null;
    }
  }
}

function playSubAudio(idx) {
  const card = document.querySelector(`.sub-card[data-index="${idx}"]`);
  const playBtn = card ? card.querySelector('.btn-play-sub') : null;
  const sub = appState.subtitles && appState.subtitles[idx];
  const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
  const url = `/api/voice_audio/${idx}?t=${Date.now()}&sid=${encodeURIComponent(sid)}`;
  playAudioClipUniversal(url, {
    title: `អាន Subtitle ជួរ #${idx + 1} (${charLabel})`,
    targetBtn: playBtn,
    onError: () => {
      showToast('⚠️ មិនទាន់មានសំឡេងបញ្ចូលទេ។ សូមចុច "⚡ អាន Sub" ឬ "🎙️ ដាក់សំឡេងគំរូ"!', 'info');
    }
  });
}

function playVoiceSampleForSub(idx) {
  unlockMobileAudioEngine();
  const sub = appState.subtitles && appState.subtitles[idx];
  const sel = document.getElementById(`voice-select-${idx}`);
  const vName = (sel ? sel.value : null) || (sub ? sub.voice : 'សំឡេងប្រុស');
  const card = document.querySelector(`.sub-card[data-index="${idx}"]`);
  const btn = card ? card.querySelector('.sub-actions-buttons .pill-btn') : null;
  playCharacterSampleVoice(vName, btn);
}


function playCharacterSampleVoice(voiceId, targetBtn = null) {
  if (!voiceId) voiceId = 'សំឡេងប្រុស';
  const cleanId = encodeURIComponent(voiceId);
  const url = `/api/voice_bank_sample/${cleanId}?t=${Date.now()}`;
  playAudioClipUniversal(url, {
    title: `គំរូតួអង្គ "${voiceId}"`,
    targetBtn: targetBtn
  });
}


// Modal Management
function openAiSubModal() {
  const modal = document.getElementById('aiSubModal');
  if (modal) modal.style.display = 'flex';
  const savedKey = (localStorage.getItem('user_gemini_api_key') || '').trim();
  const geminiInput = document.getElementById('settingsGeminiKey');
  const aiKeyInput = document.getElementById('aiApiKeyInput');
  if (savedKey) {
    if (aiKeyInput && !aiKeyInput.value) aiKeyInput.value = savedKey;
    if (geminiInput && !geminiInput.value) geminiInput.value = savedKey;
  } else if (geminiInput && aiKeyInput && geminiInput.value && !aiKeyInput.value) {
    aiKeyInput.value = geminiInput.value;
  }
}

function openVocalModal() {
  const modal = document.getElementById('vocalModal');
  if (modal) modal.style.display = 'flex';
}

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.style.display = 'flex';
  loadSettings();
}

function openExportModal() {
  const modal = document.getElementById('exportModal');
  if (modal) modal.style.display = 'flex';
  const chkBlur = document.getElementById('chkEnableBlurExport');
  if (chkBlur) chkBlur.checked = appState.blurConfig.enabled;
  const chkSub = document.getElementById('chkBurnSubs');
  if (chkSub) chkSub.checked = appState.subtitlesVisible;
}

function openUrlDownloadModal() {
  const modal = document.getElementById('urlDownloadModal');
  if (modal) modal.style.display = 'flex';
  const statusEl = document.getElementById('urlDownloadStatus');
  if (statusEl) statusEl.textContent = '';
}

function openVoiceBankModal() {
  const modal = document.getElementById('voiceBankModal');
  if (modal) modal.style.display = 'flex';
  loadVoiceBank();
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

// ================= SUBTITLE, DUB, AND BLUR CONTROLS =================

function toggleSubtitleVisibility() {
  appState.subtitlesVisible = !appState.subtitlesVisible;
  updateSubtitleVisibilityUI();
}

function onSubVisibilityCheckboxChanged(checked) {
  appState.subtitlesVisible = checked;
  updateSubtitleVisibilityUI();
}

function updateSubtitleVisibilityUI() {
  const chk = document.getElementById('chkShowSubsOnVideo');
  if (chk) chk.checked = appState.subtitlesVisible;
  const btn = document.getElementById('btnToggleSubView');
  const icon = document.getElementById('subViewIcon');
  if (btn) {
    btn.style.color = appState.subtitlesVisible ? '#38bdf8' : '#64748b';
  }
  if (icon) {
    icon.textContent = appState.subtitlesVisible ? '👁️' : '🙈';
  }
  const overlay = document.getElementById('subOverlay');
  if (overlay && !appState.subtitlesVisible) {
    overlay.style.display = 'none';
  }
  updateStudioToolsState();
}

function toggleDubAudio() {
  appState.dubAudioEnabled = !appState.dubAudioEnabled;
  const masterDub = document.getElementById('masterDubAudio');
  if (!appState.dubAudioEnabled) {
    if (masterDub) masterDub.pause();
    if (appState.currentDubAudio) {
      appState.currentDubAudio.pause();
      appState.currentDubAudio = null;
      appState.currentDubIndex = -1;
    }
  } else {
    const video = document.getElementById('mainVideo');
    if (video && !video.paused && masterDub && masterDub.src) {
      masterDub.currentTime = video.currentTime;
      masterDub.play().catch(e => console.log('masterDub play error:', e));
    }
  }
  updateStudioToolsState();
}

function toggleMuteOriginalVoice() {
  appState.muteOriginalVoice = !appState.muteOriginalVoice;
  const video = document.getElementById('mainVideo');
  if (video) {
    if (appState.muteOriginalVoice) {
      video.volume = 0.0;
    } else {
      video.volume = video.muted ? 0.0 : 1.0;
    }
  }
  updateStudioToolsState();
}

function updateStudioToolsState() {
  const toolSub = document.getElementById('toolBtnSub');
  const toolDub = document.getElementById('toolBtnDub');
  const toolMute = document.getElementById('toolBtnMuteOrig');
  const toolBlur = document.getElementById('toolBtnBlur');

  if (toolSub) {
    if (appState.subtitlesVisible) {
      toolSub.classList.add('active');
    } else {
      toolSub.classList.remove('active');
    }
  }
  if (toolDub) {
    if (appState.dubAudioEnabled) {
      toolDub.classList.add('active');
    } else {
      toolDub.classList.remove('active');
    }
  }
  if (toolMute) {
    if (appState.muteOriginalVoice) {
      toolMute.classList.add('active');
    } else {
      toolMute.classList.remove('active');
    }
  }
  if (toolBlur) {
    if (appState.blurConfig && appState.blurConfig.enabled) {
      toolBlur.classList.add('active');
    } else {
      toolBlur.classList.remove('active');
    }
  }
}

// ================= LIVE BLUR & SUBTITLE MANUAL RESIZING CONTROLS =================

function openBlurModal() {
  openModal('blurModal');
  syncBlurModalUI();
  syncBlurSlidersFromState();
}

function syncBlurModalUI() {
  const chk = document.getElementById('chkBlurModalEnabled');
  const sSlider = document.getElementById('sliderBlurStrength');
  const tSlider = document.getElementById('sliderBlurTint');
  const sLbl = document.getElementById('lblBlurStrengthVal');
  const tLbl = document.getElementById('lblBlurTintVal');

  if (chk) chk.checked = appState.blurConfig.enabled;
  if (sSlider) sSlider.value = appState.blurConfig.strength || 25;
  if (tSlider) tSlider.value = appState.blurConfig.tint_opacity || 0;
  if (sLbl) sLbl.textContent = (appState.blurConfig.strength || 25) + 'px';
  if (tLbl) tLbl.textContent = (appState.blurConfig.tint_opacity || 0) + '%';

  // Highlight active preset button
  ['btnPresetBottom', 'btnPresetTopRight', 'btnPresetTopLeft', 'btnPresetCenter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('primary');
  });
  const p = appState.blurConfig.preset;
  if (p === 'bottom_subtitles' && document.getElementById('btnPresetBottom')) {
    document.getElementById('btnPresetBottom').classList.add('primary');
  } else if (p === 'top_right' && document.getElementById('btnPresetTopRight')) {
    document.getElementById('btnPresetTopRight').classList.add('primary');
  } else if (p === 'top_left' && document.getElementById('btnPresetTopLeft')) {
    document.getElementById('btnPresetTopLeft').classList.add('primary');
  } else if (p === 'center_banner' && document.getElementById('btnPresetCenter')) {
    document.getElementById('btnPresetCenter').classList.add('primary');
  }
}

function syncBlurSlidersFromState() {
  const wSlider = document.getElementById('sliderBlurWidth');
  const hSlider = document.getElementById('sliderBlurHeight');
  const xSlider = document.getElementById('sliderBlurX');
  const ySlider = document.getElementById('sliderBlurY');
  const cfg = appState.blurConfig;

  const wPct = Math.round((cfg.norm_w || 0.90) * 100);
  const hPct = Math.round((cfg.norm_h || 0.14) * 100);
  const xPct = Math.round((cfg.norm_x || 0.05) * 100);
  const yPct = Math.round((cfg.norm_y || 0.82) * 100);

  if (wSlider) wSlider.value = wPct;
  if (hSlider) hSlider.value = hPct;
  if (xSlider) xSlider.value = xPct;
  if (ySlider) ySlider.value = yPct;

  const wLbl = document.getElementById('lblBlurWidthVal');
  const hLbl = document.getElementById('lblBlurHeightVal');
  const xLbl = document.getElementById('lblBlurXVal');
  const yLbl = document.getElementById('lblBlurYVal');
  if (wLbl) wLbl.textContent = wPct + '%';
  if (hLbl) hLbl.textContent = hPct + '%';
  if (xLbl) xLbl.textContent = xPct + '%';
  if (yLbl) yLbl.textContent = yPct + '%';

  const badge = document.getElementById('blurDimensionsBadge');
  if (badge) badge.textContent = `${wPct}%×${hPct}%`;
}

function setBlurPreset(presetName) {
  appState.blurConfig.preset = presetName;
  if (presetName === 'bottom_subtitles') {
    appState.blurConfig.norm_x = 0.05;
    appState.blurConfig.norm_y = 0.80;
    appState.blurConfig.norm_w = 0.90;
    appState.blurConfig.norm_h = 0.16;
  } else if (presetName === 'top_right') {
    appState.blurConfig.norm_x = 0.68;
    appState.blurConfig.norm_y = 0.04;
    appState.blurConfig.norm_w = 0.28;
    appState.blurConfig.norm_h = 0.12;
  } else if (presetName === 'top_left') {
    appState.blurConfig.norm_x = 0.04;
    appState.blurConfig.norm_y = 0.04;
    appState.blurConfig.norm_w = 0.28;
    appState.blurConfig.norm_h = 0.12;
  } else if (presetName === 'center_banner') {
    appState.blurConfig.norm_x = 0.05;
    appState.blurConfig.norm_y = 0.42;
    appState.blurConfig.norm_w = 0.90;
    appState.blurConfig.norm_h = 0.16;
  }
  appState.blurConfig.enabled = true;
  syncBlurModalUI();
  syncBlurSlidersFromState();
  applyBlurOverlayToVideo();
}

function onBlurToggleChanged(checked) {
  appState.blurConfig.enabled = checked;
  applyBlurOverlayToVideo();
}

function updateBlurConfigFromSliders() {
  const sSlider = document.getElementById('sliderBlurStrength');
  const tSlider = document.getElementById('sliderBlurTint');
  const wSlider = document.getElementById('sliderBlurWidth');
  const hSlider = document.getElementById('sliderBlurHeight');
  const xSlider = document.getElementById('sliderBlurX');
  const ySlider = document.getElementById('sliderBlurY');

  if (sSlider) {
    appState.blurConfig.strength = parseInt(sSlider.value);
    const sLbl = document.getElementById('lblBlurStrengthVal');
    if (sLbl) sLbl.textContent = sSlider.value + 'px';
  }
  if (tSlider) {
    appState.blurConfig.tint_opacity = parseInt(tSlider.value);
    const tLbl = document.getElementById('lblBlurTintVal');
    if (tLbl) tLbl.textContent = tSlider.value + '%';
  }
  if (wSlider) {
    appState.blurConfig.norm_w = parseInt(wSlider.value) / 100.0;
    const wLbl = document.getElementById('lblBlurWidthVal');
    if (wLbl) wLbl.textContent = wSlider.value + '%';
  }
  if (hSlider) {
    appState.blurConfig.norm_h = parseInt(hSlider.value) / 100.0;
    const hLbl = document.getElementById('lblBlurHeightVal');
    if (hLbl) hLbl.textContent = hSlider.value + '%';
  }
  if (xSlider) {
    appState.blurConfig.norm_x = parseInt(xSlider.value) / 100.0;
    const xLbl = document.getElementById('lblBlurXVal');
    if (xLbl) xLbl.textContent = xSlider.value + '%';
  }
  if (ySlider) {
    appState.blurConfig.norm_y = parseInt(ySlider.value) / 100.0;
    const yLbl = document.getElementById('lblBlurYVal');
    if (yLbl) yLbl.textContent = ySlider.value + '%';
  }
  applyBlurOverlayToVideo();
}

function applyBlurOverlayToVideo() {
  const overlay = document.getElementById('blurOverlayBox');
  const badge = document.getElementById('blurBadge');
  const dimBadge = document.getElementById('blurDimensionsBadge');
  if (!overlay) return;

  if (!appState.blurConfig.enabled) {
    overlay.style.display = 'none';
    if (badge) badge.style.display = 'none';
    return;
  }

  overlay.style.display = 'block';
  if (badge) badge.style.display = 'inline-block';

  const cfg = appState.blurConfig;
  const wPct = Math.round((cfg.norm_w || 0.90) * 100);
  const hPct = Math.round((cfg.norm_h || 0.14) * 100);
  const xPct = Math.round((cfg.norm_x || 0.05) * 100);
  const yPct = Math.round((cfg.norm_y || 0.82) * 100);

  overlay.style.left = xPct + '%';
  overlay.style.top = yPct + '%';
  overlay.style.width = wPct + '%';
  overlay.style.height = hPct + '%';
  overlay.style.backdropFilter = `blur(${cfg.strength || 20}px)`;
  overlay.style.webkitBackdropFilter = `blur(${cfg.strength || 20}px)`;
  const tintOp = (cfg.tint_opacity || 0) / 100.0;
  overlay.style.background = `rgba(15, 23, 42, ${Math.max(0.35, tintOp)})`;

  if (dimBadge) dimBadge.textContent = `${wPct}%×${hPct}%`;
}

async function saveBlurSettingsAndClose() {
  closeModal('blurModal');
  applyBlurOverlayToVideo();
  try {
    await fetch('/api/blur_config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState.blurConfig)
    });
  } catch (e) {
    console.warn('Failed to save blur config:', e);
  }
}

// Interactive Touch/Pointer Drag & Resize for Blur and Subtitles
function setupBlurAndSubInteractions() {
  const container = document.getElementById('videoContainerWrapper');
  const blurBox = document.getElementById('blurOverlayBox');
  const resizeHandle = document.getElementById('blurResizeHandle');
  const subOverlay = document.getElementById('subOverlay');
  if (!container || !blurBox) return;

  let isDraggingBlur = false;
  let isResizingBlur = false;
  let startX = 0, startY = 0;
  let initialNormX = 0, initialNormY = 0;
  let initialNormW = 0, initialNormH = 0;

  blurBox.addEventListener('pointerdown', (e) => {
    if (e.target === resizeHandle) return;
    isDraggingBlur = true;
    startX = e.clientX;
    startY = e.clientY;
    initialNormX = appState.blurConfig.norm_x || 0.05;
    initialNormY = appState.blurConfig.norm_y || 0.82;
    blurBox.setPointerCapture(e.pointerId);
    e.stopPropagation();
  });

  if (resizeHandle) {
    resizeHandle.addEventListener('pointerdown', (e) => {
      isResizingBlur = true;
      startX = e.clientX;
      startY = e.clientY;
      initialNormW = appState.blurConfig.norm_w || 0.90;
      initialNormH = appState.blurConfig.norm_h || 0.14;
      resizeHandle.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
  }

  window.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (isDraggingBlur) {
      const dx = (e.clientX - startX) / rect.width;
      const dy = (e.clientY - startY) / rect.height;
      const maxNormX = 1.0 - (appState.blurConfig.norm_w || 0.90);
      const maxNormY = 1.0 - (appState.blurConfig.norm_h || 0.14);
      appState.blurConfig.norm_x = Math.max(0.0, Math.min(maxNormX, initialNormX + dx));
      appState.blurConfig.norm_y = Math.max(0.0, Math.min(maxNormY, initialNormY + dy));
      applyBlurOverlayToVideo();
      syncBlurSlidersFromState();
    } else if (isResizingBlur) {
      const dw = (e.clientX - startX) / rect.width;
      const dh = (e.clientY - startY) / rect.height;
      const maxW = 1.0 - (appState.blurConfig.norm_x || 0.05);
      const maxH = 1.0 - (appState.blurConfig.norm_y || 0.82);
      appState.blurConfig.norm_w = Math.max(0.05, Math.min(maxW, initialNormW + dw));
      appState.blurConfig.norm_h = Math.max(0.03, Math.min(maxH, initialNormH + dh));
      applyBlurOverlayToVideo();
      syncBlurSlidersFromState();
    }
  });

  window.addEventListener('pointerup', () => {
    isDraggingBlur = false;
    isResizingBlur = false;
  });

  // Vertical dragging for Subtitles
  if (subOverlay) {
    let isDraggingSub = false;
    let startSubY = 0;
    let initialSubNormY = 0;

    subOverlay.addEventListener('pointerdown', (e) => {
      isDraggingSub = true;
      startSubY = e.clientY;
      initialSubNormY = appState.subNormY || 0.82;
      subOverlay.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });

    window.addEventListener('pointermove', (e) => {
      if (isDraggingSub) {
        const rect = container.getBoundingClientRect();
        if (rect.height <= 0) return;
        const dy = (e.clientY - startSubY) / rect.height;
        appState.subNormY = Math.max(0.15, Math.min(0.95, initialSubNormY + dy));
        updateSubOverlayVisuals();
        const slider = document.getElementById('sliderSubPosYManual');
        if (slider) slider.value = Math.round(appState.subNormY * 100);
        const lbl = document.getElementById('lblSubPosYVal');
        if (lbl) lbl.textContent = Math.round(appState.subNormY * 100) + '%';
      }
    });

    window.addEventListener('pointerup', () => {
      isDraggingSub = false;
    });
  }
}

// ================= SUBTITLE STYLE & MANUAL RESIZING =================

function openSubStyleModal() {
  openModal('subStyleModal');
  const fSlider = document.getElementById('sliderSubFontSizeManual');
  const ySlider = document.getElementById('sliderSubPosYManual');
  const fLbl = document.getElementById('lblSubFontSizeVal');
  const yLbl = document.getElementById('lblSubPosYVal');
  if (fSlider) fSlider.value = appState.subFontSize || 16;
  if (fLbl) fLbl.textContent = (appState.subFontSize || 16) + 'px';
  const yVal = Math.round((appState.subNormY || 0.82) * 100);
  if (ySlider) ySlider.value = yVal;
  if (yLbl) yLbl.textContent = yVal + '%';
}

function onSubFontSizeSlider(val) {
  appState.subFontSize = parseInt(val) || 16;
  const lbl = document.getElementById('lblSubFontSizeVal');
  if (lbl) lbl.textContent = appState.subFontSize + 'px';
  const expSlider = document.getElementById('sliderFontSize');
  if (expSlider) expSlider.value = appState.subFontSize;
  const expLbl = document.getElementById('lblFontVal');
  if (expLbl) expLbl.textContent = appState.subFontSize + 'px';
  updateSubOverlayVisuals();
}

function adjustSubFontSize(delta) {
  const current = appState.subFontSize || 16;
  const next = Math.max(12, Math.min(38, current + delta));
  const slider = document.getElementById('sliderSubFontSizeManual');
  if (slider) slider.value = next;
  onSubFontSizeSlider(next);
}

function onSubPosYSlider(val) {
  const pct = parseInt(val) || 82;
  appState.subNormY = pct / 100.0;
  const lbl = document.getElementById('lblSubPosYVal');
  if (lbl) lbl.textContent = pct + '%';
  updateSubOverlayVisuals();
}

function updateSubOverlayVisuals() {
  const overlay = document.getElementById('subOverlay');
  if (!overlay) return;
  overlay.style.fontSize = (appState.subFontSize || 16) + 'px';
  const bottomPct = Math.max(5, Math.min(85, Math.round((1.0 - (appState.subNormY || 0.82)) * 100)));
  overlay.style.bottom = bottomPct + '%';
}

// Live Subtitle Search & Filter
function filterSubtitles(query) {
  const cleanQ = (query || '').toLowerCase().trim();
  const cards = document.querySelectorAll('.sub-card');
  cards.forEach(card => {
    const text = (card.querySelector('.sub-text-input')?.value || '').toLowerCase();
    const voice = (card.querySelector('.voice-select')?.value || '').toLowerCase();
    if (!cleanQ || text.includes(cleanQ) || voice.includes(cleanQ)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// URL Video Downloader (YouTube, TikTok, Facebook Reels, Douyin, DramaBox)
async function startUrlVideoDownload() {
  const input = document.getElementById('urlInput');
  const statusEl = document.getElementById('urlDownloadStatus');
  const url = (input ? input.value : '').trim();
  if (!url) {
    alert('សូមបញ្ចូល Link វីដេអូ!');
    return;
  }

  showProgress('កំពុងចាប់ផ្តើមទាញយកតាម Link...', 10);
  if (statusEl) statusEl.textContent = '⚡ កំពុងតភ្ជាប់ និងវិភាគ Link...';

  try {
    const res = await fetch('/api/download_video_url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    });
    const data = await res.json();
    if (!data.success) {
      hideProgress();
      if (statusEl) statusEl.textContent = '❌ ' + (data.error || 'កំហុស');
      alert('កំហុសទាញយក: ' + data.error);
      return;
    }

    const timer = setInterval(async () => {
      try {
        const pRes = await fetch('/api/download_url_progress');
        const pData = await pRes.json();
        showProgress(pData.message || 'កំពុងទាញយក...', pData.percent || 20);
        if (statusEl) statusEl.textContent = pData.message;

        if (pData.done) {
          clearInterval(timer);
          hideProgress();
          if (pData.error) {
            if (statusEl) statusEl.textContent = '❌ ' + pData.error;
            alert('កំហុសទាញយក: ' + pData.error);
          } else {
            closeModal('urlDownloadModal');
            if (input) input.value = '';
            loadInitialState();
            alert('✅ ទាញយកវីដេអូជោគជ័យ ១០០%!');
          }
        }
      } catch (err_p) {
        console.error(err_p);
      }
    }, 1000);
  } catch (err) {
    hideProgress();
    alert('កំហុស Server: ' + err);
  }
}

// AI Voice Diarizer / Auto-Assign Characters
async function autoAssignVoices() {
  if (!appState.subtitles || appState.subtitles.length === 0) {
    alert('សូមបញ្ចូល ឬ បង្កើត Subtitle ជាមុនសិន!');
    return;
  }
  showProgress('🤖 AI កំពុងវិភាគ និងបែងចែកតួអង្គទាំង ១២...', 50);
  try {
    const res = await fetch('/api/auto_assign_voices', { method: 'POST' });
    const data = await res.json();
    hideProgress();
    if (data.success) {
      appState.subtitles = data.subtitles;
      renderSubtitlesList();
      alert(`🎭 AI បានបែងចែកតួអង្គជោគជ័យចំនួន ${data.count} បន្ទាត់!`);
    } else {
      alert('កំហុសបែងចែកតួអង្គ: ' + data.error);
    }
  } catch (err) {
    hideProgress();
    alert('កំហុស Auto-Assign: ' + err);
  }
}

// Character Voice Bank Manager
let currentUploadChar = '';

async function loadVoiceBank() {
  const listEl = document.getElementById('voiceBankList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:15px;">កំពុងផ្ទុកបញ្ជីសំឡេង...</div>';

  try {
    const res = await fetch('/api/character_voice_bank');
    const data = await res.json();
    listEl.innerHTML = '';

    (data.characters || []).forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px;';
      
      const hasSample = c.has_sample;
      item.innerHTML = `
        <div style="overflow: hidden; flex: 1;">
          <div style="font-weight: 700; font-size: 0.85rem; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${c.label}
          </div>
          <div style="font-size: 0.72rem; color: ${hasSample ? '#34d399' : '#f59e0b'};">
            ${hasSample ? '✅ មានសំឡេងគំរូ (.mp3)' : '⚠️ មិនទាន់មានគំរូ'}
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          ${hasSample ? `<button class="pill-btn primary" style="padding: 4px 8px; font-size: 0.72rem;" onclick="playVoiceBankSample('${encodeURIComponent(c.id)}', this)">▶ ស្តាប់</button>` : ''}
          <button class="pill-btn" style="padding: 4px 8px; font-size: 0.72rem;" onclick="triggerVoiceBankUpload('${c.id}')">📁 Upload</button>
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    listEl.innerHTML = `<div style="color:#ef4444; padding:10px;">កំហុសផ្ទុកបញ្ជី: ${err}</div>`;
  }
}

function playVoiceBankSample(charNameEncoded, btn = null) {
  const decoded = decodeURIComponent(charNameEncoded);
  const url = `/api/voice_bank_sample/${charNameEncoded}?t=${Date.now()}`;
  playAudioClipUniversal(url, {
    title: `គំរូតួអង្គ "${decoded}"`,
    targetBtn: btn
  });
}


function triggerVoiceBankUpload(charId) {
  currentUploadChar = charId;
  const input = document.getElementById('voiceBankFileInput');
  if (input) {
    input.value = '';
    input.click();
  }
}

async function handleVoiceBankUpload(inputEl) {
  if (!inputEl.files || !inputEl.files[0] || !currentUploadChar) return;
  const file = inputEl.files[0];
  showProgress(`កំពុង Upload សំឡេងសម្រាប់ ${currentUploadChar}...`, 40);

  const fd = new FormData();
  fd.append('audio_file', file);

  try {
    const res = await fetch(`/api/upload_character_voice_sample/${encodeURIComponent(currentUploadChar)}`, {
      method: 'POST',
      body: fd
    });
    const data = await res.json();
    hideProgress();
    if (data.success) {
      alert(`✅ Upload សំឡេងសម្រាប់ "${currentUploadChar}" ជោគជ័យ!`);
      loadVoiceBank();
    } else {
      alert('Upload បរាជ័យ: ' + data.error);
    }
  } catch (err) {
    hideProgress();
    alert('កំហុស Upload: ' + err);
  }
}

// AI Subtitle Generator
async function startAiSubtitleGeneration() {
  if (appState.isUploadingVideo) {
    alert('⏳ វីដេអូកំពុងតែ Upload ទៅកាន់ប្រព័ន្ធ... សូមរង់ចាំការ Upload បញ្ចប់ជាមុនសិន!');
    return;
  }

  let key = (document.getElementById('aiApiKeyInput') ? document.getElementById('aiApiKeyInput').value.trim() : '') ||
            (document.getElementById('settingsGeminiKey') ? document.getElementById('settingsGeminiKey').value.trim() : '') ||
            (localStorage.getItem('user_gemini_api_key') || '').trim();

  if (!key) {
    alert('⚠️ សូមបញ្ចូល Gemini API Key ផ្ទាល់ខ្លួនរបស់អ្នកជាមុនសិន!\n\nលោកអ្នកអាចចុចបង្កើត Key ឥតគិតថ្លៃ (Free 100%) នៅ៖\nhttps://aistudio.google.com/app/apikey');
    openAiSubModal();
    const keyField = document.getElementById('aiApiKeyInput');
    if (keyField) {
      keyField.focus();
      keyField.style.borderColor = '#ef4444';
    }
    return;
  }

  // Save guest key in local browser storage so it is remembered on this device
  localStorage.setItem('user_gemini_api_key', key);

  closeModal('aiSubModal');
  showProgress('⚡ កំពុងចាប់ផ្តើម Gemini AI Subtitles...', 10);
  appState.isAiGenerating = true;

  const mode = document.getElementById('aiModeSelect').value;
  let model = document.getElementById('aiModelSelect').value;
  if (['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'].includes(model)) {
    model = 'gemini-3.5-flash-lite';
  }

  try {
    const res = await fetch('/api/ai_generate_subtitles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: mode,
        gemini_model: model,
        gemini_api_key: key,
        video_path: appState.videoPath || '',
        episode_id: appState.currentEpisodeId || ''
      })
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || 'កំហុស AI');
      hideProgress();
      appState.isAiGenerating = false;
      return;
    }

    const timer = setInterval(async () => {
      const pRes = await fetch('/api/ai_sub_progress');
      const pData = await pRes.json();
      showProgress(pData.message || 'កំពុងដំណើរការ...', pData.percent);

      if (pData.done) {
        clearInterval(timer);
        hideProgress();
        appState.isAiGenerating = false;
        if (pData.error) {
          alert('កំហុស AI: ' + pData.error);
        } else {
          loadInitialState();
        }
      }
    }, 1200);
  } catch (err) {
    alert('កំហុសតភ្ជាប់ AI: ' + err);
    hideProgress();
    appState.isAiGenerating = false;
  }
}

// Vocal Separation & Foley SFX Extractor
async function startVocalSeparation() {
  closeModal('vocalModal');
  showProgress('⚡ កំពុងកាត់សំឡេងនិយាយដើមចោល ១០០% និងស្រង់ Foley SFX...', 20);

  try {
    const res = await fetch('/api/separate_vocals', { method: 'POST' });
    const data = await res.json();
    if (!data.success) {
      alert('កំហុសបំបែក: ' + data.error);
      hideProgress();
      return;
    }

    const timer = setInterval(async () => {
      const pRes = await fetch('/api/vocal_separation_progress');
      const pData = await pRes.json();
      showProgress(pData.message || 'កំពុងបំបែក...', pData.percent);

      if (pData.done) {
        clearInterval(timer);
        hideProgress();
        loadInitialState();
      }
    }, 1000);
  } catch (err) {
    alert('កំហុសបំបែកសំឡេង: ' + err);
    hideProgress();
  }
}

// Settings Loading and Saving
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (document.getElementById('settingsTtsProvider')) {
      document.getElementById('settingsTtsProvider').value = data.tts_provider || 'VoiceClone';
    }
    if (document.getElementById('settingsVoxcpmUrl')) {
      document.getElementById('settingsVoxcpmUrl').value = data.voxcpm_hf_url || 'https://huggingface.co/spaces/Papdrone22/aster-voxcpm';
    }
    const localGuestKey = (localStorage.getItem('user_gemini_api_key') || '').trim();
    if (document.getElementById('settingsGeminiKey')) {
      document.getElementById('settingsGeminiKey').value = localGuestKey;
      document.getElementById('settingsGeminiKey').placeholder = '🔑 បញ្ចូល Gemini API Key របស់អ្នក (AIzaSy...)';
    }
    if (document.getElementById('aiApiKeyInput')) {
      document.getElementById('aiApiKeyInput').value = localGuestKey;
      document.getElementById('aiApiKeyInput').placeholder = '🔑 បញ្ចូល Gemini API Key របស់អ្នក (AIzaSy...)';
    }
    if (document.getElementById('settingsHfToken')) {
      document.getElementById('settingsHfToken').value = data.hf_token || '';
      if (data.has_hf_token) {
        document.getElementById('settingsHfToken').placeholder = '🔑 បានភ្ជាប់ Token រួចរាល់';
      }
    }
    let currentModel = data.gemini_model || 'gemini-3.5-flash-lite';
    if (['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'].includes(currentModel)) {
      currentModel = 'gemini-3.5-flash-lite';
    }
    if (document.getElementById('settingsGeminiModel')) {
      document.getElementById('settingsGeminiModel').value = currentModel;
    }
    if (document.getElementById('aiModelSelect')) {
      document.getElementById('aiModelSelect').value = currentModel;
    }
    if (document.getElementById('settingsBgmSlider')) {
      document.getElementById('settingsBgmSlider').value = data.bg_vol_percent || 25;
    }
    if (document.getElementById('sliderBgmVol')) {
      document.getElementById('sliderBgmVol').value = data.bg_vol_percent || 25;
      const lbl = document.getElementById('lblBgmVal');
      if (lbl) lbl.textContent = (data.bg_vol_percent || 25) + '%';
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function saveSettingsFromModal() {
  const provider = document.getElementById('settingsTtsProvider').value;
  const hfUrl = document.getElementById('settingsVoxcpmUrl').value;
  const hfToken = document.getElementById('settingsHfToken') ? document.getElementById('settingsHfToken').value : '';
  const key = document.getElementById('settingsGeminiKey') ? document.getElementById('settingsGeminiKey').value.trim() : '';
  if (key) {
    localStorage.setItem('user_gemini_api_key', key);
    if (document.getElementById('aiApiKeyInput')) {
      document.getElementById('aiApiKeyInput').value = key;
    }
  }
  let model = document.getElementById('settingsGeminiModel') ? document.getElementById('settingsGeminiModel').value : 'gemini-3.5-flash-lite';
  if (['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'].includes(model)) {
    model = 'gemini-3.5-flash-lite';
  }
  const bgm = parseInt(document.getElementById('settingsBgmSlider').value);

  showProgress('កំពុងរក្សាទុកការកំណត់...', 70);

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tts_provider: provider,
        voxcpm_hf_url: hfUrl,
        hf_token: hfToken,
        gemini_model: model,
        bg_vol_percent: bgm
      })
    });
    const data = await res.json();
    hideProgress();
    if (data.success) {
      closeModal('settingsModal');
      alert('រក្សាទុកការកំណត់បានជោគជ័យ!');
    }
  } catch (err) {
    hideProgress();
    alert('កំហុសរក្សាទុក: ' + err);
  }
}

// Video Export
async function startExportVideo() {
  closeModal('exportModal');
  showProgress('⚡ កំពុងចាប់ផ្តើម Turbo Video Export...', 5);
  appState.isExporting = true;

  const resSelect = document.getElementById('selectResolution');
  const speedSelect = document.getElementById('selectSpeedPreset');
  const fontSlider = document.getElementById('sliderFontSize');
  const dubSlider = document.getElementById('sliderDubVol');

  const chkBlur = document.getElementById('chkEnableBlurExport');
  const enableBlur = chkBlur ? chkBlur.checked : appState.blurConfig.enabled;

  const chkAntiMaster = document.getElementById('chkAntiCopyrightMaster');
  const antiEnabled = chkAntiMaster ? chkAntiMaster.checked : true;
  const flip = document.getElementById('chkFlipVideo') ? document.getElementById('chkFlipVideo').checked : true;
  const crop = document.getElementById('chkCropZoom') ? document.getElementById('chkCropZoom').checked : true;
  const color = document.getElementById('chkColorGrade') ? document.getElementById('chkColorGrade').checked : true;
  const speed = document.getElementById('chkSpeedShift') ? document.getElementById('chkSpeedShift').checked : true;
  const cleanSfx = document.getElementById('chkCleanSfxFoley') ? document.getElementById('chkCleanSfxFoley').checked : true;

  const cfg = {
    resolution: resSelect ? resSelect.value : '1080p',
    speed_preset: speedSelect ? speedSelect.value : 'ultrafast',
    font_size: fontSlider ? parseInt(fontSlider.value) : 16,
    dub_vol_percent: dubSlider ? parseInt(dubSlider.value) : 130,
    mute_original_audio: document.getElementById('chkMuteOrig').checked,
    bg_music_vol_percent: parseInt(document.getElementById('sliderBgmVol').value),
    aspect_ratio: document.getElementById('selectAspect').value,
    burn_subtitles: document.getElementById('chkBurnSubs').checked,
    sub_norm_y: appState.subNormY || 0.82,
    enable_blur: enableBlur,
    blur_strength: appState.blurConfig.strength || 25,
    blur_norm_x: appState.blurConfig.norm_x || 0.05,
    blur_norm_y: appState.blurConfig.norm_y || 0.82,
    blur_norm_w: appState.blurConfig.norm_w || 0.90,
    blur_norm_h: appState.blurConfig.norm_h || 0.14,
    anti_copyright: antiEnabled,
    flip_horizontal: flip,
    crop_zoom: crop,
    color_grade: color,
    speed_shift: speed,
    clean_sfx_only: cleanSfx,
    enable_custom_bgm: !!appState.hasCustomBgm,
    custom_bgm_vol_percent: appState.bgmVolumePercent || 25,
    enable_logo: !!appState.hasLogo,
    logo_position: appState.logoPosition || 'top-right',
    logo_scale: appState.logoScale || 15,
    logo_opacity: appState.logoOpacity || 90,
    enable_title_overlay: !!(appState.titleConfig && appState.titleConfig.enabled && appState.titleConfig.text),
    video_path: appState.videoPath || localStorage.getItem('smart_ai_studio_last_video_path') || '',
    session_id: localStorage.getItem('smart_ai_studio_session_id') || clientSessionId
  };

  try {
    const res = await fetch('/api/export_video', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      hideProgress();
      appState.isExporting = false;
      if (data.license_required) {
        openLicenseModal();
        if (typeof showToast === 'function') {
          showToast(data.error || '🔒 សូមធ្វើការ Activate Key កម្មវិធីជាមុនសិន!', 'warning');
        }
      } else {
        const errMsg = data.error || data.detail || (res.status ? `HTTP ${res.status}: ${res.statusText}` : 'កំហុសម៉ាស៊ីនបម្រើ (Server Error)');
        alert('កំហុសចាប់ផ្តើម Render: ' + errMsg);
      }
      return;
    }

    const timer = setInterval(async () => {
      const pRes = await fetch('/api/export_progress');
      const pData = await pRes.json();
      showProgress(pData.message || 'កំពុង Render...', pData.percent);

      if (pData.done) {
        clearInterval(timer);
        hideProgress();
        appState.isExporting = false;
        if (pData.success && pData.download_url) {
          autoSaveVideoToPhonePhotos(pData.download_url, pData.filename);
          showDownloadSuccess(pData.download_url, pData.filename);
        } else {
          alert('កំហុស Render: ' + (pData.error || 'FFmpeg មិនបានបង្កើតវីដេអូបានជោគជ័យ'));
        }
      }
    }, 1000);

  } catch (err) {
    alert('កំហុស Export: ' + err);
    hideProgress();
    appState.isExporting = false;
  }
}

// Pre-cached video blob for instant 0ms native mobile Web Share gesture
window.cachedExportBlob = null;
window.cachedExportFile = null;
window.cachedExportBlobUrl = null;

async function autoSaveVideoToPhonePhotos(url, filename) {
  // Pre-fetch blob into memory in background for fast share sheet if supported
  try {
    const resp = await fetch(url);
    if (resp.ok) {
      const blob = await resp.blob();
      if (blob && blob.size > 500) {
        window.cachedExportBlob = blob;
        window.cachedExportFile = new File([blob], filename || 'Smart_AI_Video.mp4', { type: 'video/mp4' });
        window.cachedExportBlobUrl = URL.createObjectURL(blob);
        const btn = document.getElementById('btnSavePhotosDirect');
        if (btn) {
          btn.innerHTML = `<span>📲</span><span>Save ចូល Camera Roll (Share Sheet) - រួចរាល់</span>`;
        }
      }
    }
  } catch (e) {
    console.warn('Auto prefetch error:', e);
  }
}

function triggerNativeShareOrDownload(dlUrl, streamUrl, filename) {
  if (window.cachedExportFile && navigator.share && navigator.canShare && navigator.canShare({ files: [window.cachedExportFile] })) {
    navigator.share({
      files: [window.cachedExportFile],
      title: filename || 'Smart AI Studio Video'
    }).then(() => {
      if (typeof showToast === 'function') {
        showToast('✅ បានបើកផ្ទាំង Save Video ចូល Camera Roll!', 'success');
      }
    }).catch(e => {
      if (e.name !== 'AbortError') {
        window.location.href = dlUrl;
      }
    });
    return;
  }
  // If not pre-cached yet, trigger immediate direct native download without blocking user gesture
  window.location.href = dlUrl;
  if (typeof showToast === 'function') {
    showToast('✅ កំពុងទាញយកវីដេអូ MP4 ទុកក្នុងទូរសព្ទ!', 'success');
  }
}

async function saveVideoDirectlyToPhotos(url, filename) {
  const dlUrl = url + (url.indexOf('?') === -1 ? '?dl=1' : '&dl=1');
  triggerNativeShareOrDownload(dlUrl, url, filename);
}

function openVideoFullscreen(url) {
  const full = url.startsWith('http') ? url : (window.location.origin + url);
  window.open(full, '_blank');
}

function showDownloadSuccess(url, filename) {
  const modal = document.getElementById('exportModal');
  if (!modal) return;
  modal.style.display = 'flex';
  const content = modal.querySelector('.modal-content');
  if (!content) return;

  const dlUrl = url + (url.indexOf('?') === -1 ? '?dl=1' : '&dl=1');

  // Immediately kick off background fetch for Share Sheet
  autoSaveVideoToPhonePhotos(url, filename);

  const isInApp = /Telegram|FBAN|FBAV|Instagram|Messenger|Line/i.test(navigator.userAgent);

  content.innerHTML = `
    <div style="text-align: center; display: flex; flex-direction: column; gap: 12px; padding: 10px;">
      <div style="font-size: 2.6rem;">🎉</div>
      <h3 style="color: #38bdf8; font-size: 1.15rem; font-weight: 700; margin: 0;">នាំចេញវីដេអូបានជោគជ័យ!</h3>
      <p style="color: #94a3b8; font-size: 0.8rem; word-break: break-all; margin: 0;">${filename}</p>

      <!-- Video preview player on mobile so user can watch & long-press Save Video immediately -->
      <video src="${url}" controls playsinline preload="auto" style="width: 100%; max-height: 220px; border-radius: 8px; background: #000; box-shadow: 0 4px 14px rgba(0,0,0,0.6); margin: 4px 0;"></video>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
        <!-- Primary 100% Reliable Native Download Anchor Tag -->
        <a id="btnDirectDownloadMp4" href="${dlUrl}" download="${filename}" class="btn-action-main dub" style="display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 1.05rem; font-weight: 700; padding: 14px; background: linear-gradient(135deg, #059669, #10b981); border: none; border-radius: 12px; color: white; text-decoration: none; cursor: pointer; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
          <span>📥</span>
          <span>ចុចទាញយកវីដេអូទុកក្នុងទូរសព្ទ (Download to Phone)</span>
        </a>

        <!-- Secondary Share Sheet Button (Save to Photos / Camera Roll) -->
        <button id="btnSavePhotosDirect" onclick="triggerNativeShareOrDownload('${dlUrl}', '${url}', '${filename}')" class="pill-btn" style="display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 0.92rem; font-weight: 600; padding: 11px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 10px; cursor: pointer;">
          <span>📲</span>
          <span>Save ចូល Camera Roll (Share Sheet)</span>
        </button>

        <button onclick="openVideoFullscreen('${url}')" class="pill-btn" style="display: flex; justify-content: center; align-items: center; gap: 6px; font-size: 0.88rem; padding: 10px; background: var(--bg-card); color: #cbd5e1; border: 1px solid var(--border-color); border-radius: 8px;">
          <span>🎬</span>
          <span>បើកមើលពេញអេក្រង់ (Open Fullscreen)</span>
        </button>
      </div>

      ${isInApp ? `
      <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 8px; padding: 8px 10px; font-size: 0.74rem; color: #fde68a; text-align: left;">
        💡 <b>ប្រសិនបើប្រើលើ Telegram / Facebook:</b> សូមចុចសញ្ញា ⋯ (Menu) ខាងលើស្តាំ ➔ ជ្រើស <b>"Open in Safari"</b> ឬ <b>"Open in Chrome"</b> ដើម្បីទាញយក និងរក្សាទុកក្នុងរូបថត Camera Roll បាន ១០០%!
      </div>` : ''}

      <div style="background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 10px; text-align: left; font-size: 0.74rem; color: #cbd5e1; line-height: 1.5; margin-top: 4px;">
        <div style="font-weight: 700; color: #38bdf8; margin-bottom: 4px;">💡 របៀបរក្សាទុកក្នុង Camera Roll (Photos):</div>
        <div>• <b>iPhone / iPad:</b> ចុចប៊ូតុងពណ៌បៃតង <b>"Download to Phone"</b> រួចចុច Download! ឬចុចសង្កត់ (Long Press) លើវីដេអូខាងលើ រួចជ្រើស <b>"Save Video"</b> (វានឹងចូល Photos ភ្លាមៗ)។</div>
        <div>• <b>Android:</b> ចុចប៊ូតុងពណ៌បៃតង <b>"Download to Phone"</b> វីដេអូនឹង Save ចូល Download / Gallery / Google Photos ដោយស្វ័យប្រវត្តិ!</div>
      </div>

      <button onclick="closeModal('exportModal');" class="pill-btn" style="justify-content: center; margin-top: 4px;">បិទ</button>
    </div>
  `;
}

function showProgress(msg, pct) {
  const container = document.getElementById('progressContainer');
  const msgEl = document.getElementById('progressMsg');
  const fillEl = document.getElementById('progressBarFill');
  const pctEl = document.getElementById('progressPct');

  if (container) container.style.display = 'flex';
  if (msgEl) msgEl.textContent = msg;
  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

function hideProgress() {
  const container = document.getElementById('progressContainer');
  if (container) container.style.display = 'none';
}

function uploadWithProgress(url, formData, progressMsgPrefix, headers = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        if (ev.loaded >= ev.total) {
          showProgress('⚡ កំពុងរក្សាទុកវីដេអូចូល Server...', 98);
        } else {
          const pct = Math.min(95, Math.round((ev.loaded / ev.total) * 90) + 5);
          const loadedMb = (ev.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (ev.total / (1024 * 1024)).toFixed(1);
          showProgress(`${progressMsgPrefix} (${loadedMb}/${totalMb} MB)...`, pct);
        }
      } else {
        showProgress(`${progressMsgPrefix}...`, 50);
      }
    };
    xhr.onload = () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error(`Server error: ${xhr.status}`));
          }
        }
      } catch (e) {
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timeout'));
    xhr.send(formData);
  });
}

function setupEventListeners() {
  // Video upload from phone
  const fileInput = document.getElementById('mobileFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // 1. INSTANT LOCAL DISPLAY ON SCREEN (0.01 seconds!)
      const videoPlayer = document.getElementById('mainVideo');
      const emptyPlaceholder = document.getElementById('videoPlaceholder');
      const videoTitle = document.getElementById('videoTitle');
      const controlsBar = document.getElementById('videoControlsBar');
      const bigPlayBtn = document.getElementById('bigPlayBtn');

      try {
        const localUrl = URL.createObjectURL(file);
        videoPlayer.src = localUrl;
        videoPlayer.style.display = 'block';
        if (emptyPlaceholder) emptyPlaceholder.style.display = 'none';
        if (controlsBar) controlsBar.style.display = 'block';
        if (bigPlayBtn) bigPlayBtn.style.display = 'none';
        if (videoTitle) videoTitle.textContent = file.name;
        videoPlayer.load();
        videoPlayer.play().catch(e_play => {
          console.log('Autoplay prevented, showing play icon:', e_play);
          updatePlayState(false);
        });
      } catch (err_preview) {
        console.warn('Local preview error:', err_preview);
      }

      // 2. Upload to Server with real-time percentage
      appState.isUploadingVideo = true;
      showProgress('⚡ កំពុងរៀបចំ Upload វីដេអូ...', 5);
      const formData = new FormData();
      formData.append('video_file', file);

      try {
        const data = await uploadWithProgress('/api/upload_video', formData, '⚡ កំពុង Upload វីដេអូ');
        hideProgress();
        appState.isUploadingVideo = false;
        if (data.success) {
          appState.videoLoaded = true;
          appState.hasVideo = true;
          appState.videoPath = data.video_path;
          const btnDelVid = document.getElementById('btnDeleteCurrentVideo');
          if (btnDelVid) btnDelVid.style.display = 'inline-flex';
          showToast('✅ បាននាំចូលវីដេអូដោយជោគជ័យ!', 'success');
          console.log('Video saved to server:', data.video_path);
        } else {
          showToast('⚠️ ការនាំចូលវីដេអូជួបបញ្ហា: ' + (data.error || 'Server error'), 'error');
        }
      } catch (err) {
        hideProgress();
        appState.isUploadingVideo = false;
        showToast('⚠️ ការបញ្ចូលវីដេអូមានបញ្ហា Network: ' + err.message, 'error');
        console.warn('Upload network error:', err);
      }
    });
  }

  // SRT file import
  const srtInput = document.getElementById('srtFileInput');
  if (srtInput) {
    srtInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      showProgress('កំពុងនាំចូលឯកសារ SRT...', 30);
      const formData = new FormData();
      formData.append('srt_file', file);

      try {
        const res = await fetch('/api/import_srt', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        hideProgress();
        if (data.success) {
          if (data.subtitles && data.subtitles.length > 0) {
            appState.subtitles = data.subtitles;
            renderSubtitlesList();
          }
          await loadInitialState();
          if (typeof showToast === 'function') {
            showToast(`✅ បាននាំចូល Subtitle ${data.count} បន្ទាត់ជោគជ័យ!`, 'success');
          } else {
            alert(`✅ បាននាំចូល Subtitle ${data.count} បន្ទាត់ជោគជ័យ!`);
          }
        } else {
          alert('Import SRT បរាជ័យ: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        hideProgress();
        alert('Import error: ' + err);
      } finally {
        try { e.target.value = ''; } catch (_) {}
      }
    });
  }
}

// ================= PASTE SRT DIRECTLY HANDLERS =================

function openPasteSrtModal() {
  openModal('pasteSrtModal');
  const txtArea = document.getElementById('pasteSrtInput');
  if (txtArea) {
    txtArea.focus();
    // Try auto-paste from clipboard if empty and permitted
    if (!txtArea.value.trim() && navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(text => {
        if (text && (text.includes('-->') || text.includes(':'))) {
          txtArea.value = text;
        }
      }).catch(() => {});
    }
  }
}

async function pasteFromClipboardToSrtArea() {
  const txtArea = document.getElementById('pasteSrtInput');
  if (!txtArea) return;
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text) {
        txtArea.value = text;
        return;
      }
    }
    txtArea.focus();
    alert('💡 សូមចុចសង្កត់លើប្រអប់ (Long Press) រួចជ្រើសរើស «Paste» ឬចុច Ctrl+V');
  } catch (err) {
    txtArea.focus();
    alert('💡 សូមចុចសង្កត់លើប្រអប់ (Long Press) រួចជ្រើសរើស «Paste» ឬចុច Ctrl+V');
  }
}

function clearPasteSrtArea() {
  const txtArea = document.getElementById('pasteSrtInput');
  if (txtArea) {
    txtArea.value = '';
    txtArea.focus();
  }
}

async function submitPastedSrt() {
  const txtArea = document.getElementById('pasteSrtInput');
  if (!txtArea) return;
  const srtText = txtArea.value.trim();

  if (!srtText) {
    alert('⚠️ សូមបញ្ចូល ឬបិទភ្ជាប់អត្ថបទ SRT ជាមុនសិន!');
    txtArea.focus();
    return;
  }

  showProgress('កំពុងវិភាគ និងនាំចូល Subtitle...', 40);

  try {
    const res = await fetch('/api/paste_srt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ srt_text: srtText })
    });
    const data = await res.json();
    hideProgress();

    if (data.success) {
      closeModal('pasteSrtModal');
      txtArea.value = '';
      if (data.subtitles && data.subtitles.length > 0) {
        appState.subtitles = data.subtitles;
        renderSubtitlesList();
      }
      await loadInitialState();
      if (typeof showToast === 'function') {
        showToast(`🎉 បាននាំចូល Subtitle ចំនួន ${data.count} បន្ទាត់ជោគជ័យ!`, 'success');
      } else {
        alert(`🎉 បាននាំចូល Subtitle ចំនួន ${data.count} បន្ទាត់ជោគជ័យ!`);
      }
    } else {
      alert('កំហុសនាំចូល SRT: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    hideProgress();
    alert('កំហុស Server: ' + err);
  }
}

// ----------------------------------------------------
// 10. Authentic Character Voice Clone Engine (Reads Subtitles)
// ----------------------------------------------------
async function applySampleVoiceDirectly(idx) {
  return generateSingleVoice(idx);
}

async function applySampleVoiceToAllSubtitles() {
  return generateAllPendingVoices('VoxCPM-HuggingFace');
}

async function repairOutOfSyncAudio() {
  unlockMobileAudioEngine();
  if (!appState.subtitles || appState.subtitles.length === 0) {
    showToast('⚠️ មិនទាន់មានបន្ទាត់ Subtitle ទេ!', 'error');
    return;
  }
  showProgress('⏱️ កំពុងជួសជុលសំឡេងមិនទាន់ និងតម្រឹមឱ្យស៊ីចង្វាក់ Subtitle...', 30);
  try {
    const res = await fetch('/api/repair_audio_timing', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_all: true })
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    hideProgress();
    if (data.success) {
      if (data.subtitles) {
        appState.subtitles = data.subtitles;
      }
      renderSubtitlesList();
      setTimeout(() => reloadMasterDubAudio(), 600);
      showToast(data.message || '🎉 បានជួសជុលសំឡេងមិនទាន់រួចរាល់ ១០០%!', 'success');
    } else {
      showToast('⚠️ ' + (data.error || 'បរាជ័យក្នុងការជួសជុល'), 'error');
    }
  } catch (err) {
    hideProgress();
    showToast('⚠️ កំហុសជួសជុល: ' + (err.message || err), 'error');
  }
}

async function repairSingleSubAudio(idx) {
  unlockMobileAudioEngine();
  const sub = appState.subtitles && appState.subtitles[idx];
  if (!sub) return;

  const card = document.querySelector(`.sub-card[data-index="${idx}"]`);
  const btn = card ? card.querySelector('.sub-actions-buttons .pill-btn:last-child') : null;
  const origText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '⏳...';

  try {
    showToast(`⏱️ កំពុងជួសជុលសំឡេងជួរ #${idx + 1}...`, 'info');
    const res = await fetch('/api/repair_audio_timing', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: idx })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (btn) btn.innerHTML = origText;
    if (data.success) {
      if (appState.subtitles && appState.subtitles[idx]) {
        appState.subtitles[idx].has_audio = true;
        appState.subtitles[idx].status = 'done';
      }
      updateSubCardLiveStatus(idx, 'done');
      setTimeout(() => reloadMasterDubAudio(), 600);
      showToast(`🎉 បានជួសជុលសំឡេងជួរ #${idx + 1} ឱ្យស៊ីចង្វាក់ជោគជ័យ!`, 'success');
      playSubAudio(idx);
    } else {
      showToast('⚠️ ' + (data.error || 'មិនអាចជួសជុលបាន'), 'error');
    }
  } catch (err) {
    if (btn) btn.innerHTML = origText;
    showToast('⚠️ កំហុស: ' + (err.message || err), 'error');
  }
}

// ----------------------------------------------------
// 11. Commercial License & Activation Key System (Multi-Device Persistent)
// ----------------------------------------------------
function getAuthHeaders(extraHeaders = {}) {
  let sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
  let devId = localStorage.getItem('smart_device_id') || clientDeviceId;
  const key = (localStorage.getItem('smart_ai_studio_license_key') || '').trim().toUpperCase();
  const headers = {
    ...extraHeaders,
    'X-Session-ID': sid
  };
  if (devId) {
    headers['X-Device-ID'] = devId;
  }
  if (key) {
    headers['X-License-Key'] = key;
  }
  return headers;
}

async function checkLicenseStatus() {
  try {
    // 1. Check URL parameters for ?key=... to allow instant activation link sharing
    const urlParams = new URLSearchParams(window.location.search);
    const urlKey = urlParams.get('key') || urlParams.get('activate');
    if (urlKey && urlKey.trim()) {
      try {
        const cleanKey = urlKey.trim().toUpperCase();
        const aRes = await fetch('/api/activate_license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: cleanKey, device_id: clientDeviceId })
        });
        const aData = await aRes.json();
        if (aData.success) {
          localStorage.setItem('smart_ai_studio_license_key', cleanKey);
          if (typeof showToast === 'function') {
            showToast('🎉 បាន Activate កញ្ចប់ ' + (aData.plan_name || 'VIP') + ' ជោគជ័យ!', 'success');
          }
          // Remove key from address bar so it cannot be accidentally leaked
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          if (typeof showToast === 'function') {
            showToast('⚠️ Activation Key មិនត្រឹមត្រូវ: ' + (aData.error || ''), 'error');
          }
        }
      } catch (e) {}
    }

    // 2. Fetch server license status with this client's stored key
    const res = await fetch(`/api/license_status?t=${Date.now()}`);
    const data = await res.json();

    // 3. If server reports not licensed, check if we need to clean or keep
    if (!data.is_licensed) {
      const storedKey = (localStorage.getItem('smart_ai_studio_license_key') || '').trim();
      if (storedKey) {
        try {
          const autoRes = await fetch('/api/activate_license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: storedKey.toUpperCase(), device_id: clientDeviceId })
          });
          const autoData = await autoRes.json();
          if (autoData.success) {
            data.is_licensed = true;
            data.license_info = autoData.license_info || {};
            data.plan_name = autoData.plan_name || 'Pro VIP';
            data.expiry_date = autoData.expiry_date || '';
          } else {
            localStorage.removeItem('smart_ai_studio_license_key');
          }
        } catch (e) {}
      }
    }

    appState.license = data;
    updateLicenseUI(data);

    // 4. Automatically pop up the activation key modal for guest / unlicensed clients!
    if (!data.is_licensed) {
      const promptShown = sessionStorage.getItem('smart_ai_studio_lic_prompt_shown');
      if (!promptShown) {
        sessionStorage.setItem('smart_ai_studio_lic_prompt_shown', 'true');
        setTimeout(() => {
          openLicenseModal();
          if (typeof showToast === 'function') {
            showToast('🔑 សូមបញ្ចូល Key Activate (គម្រោង ២ថ្ងៃ, ៣០ថ្ងៃ ឬ VIP) ដើម្បីដំណើរការ!', 'info');
          }
        }, 700);
      }
    }
  } catch (err) {
    console.warn('License check note:', err);
  }
}

function updateLicenseUI(lic) {
  const badgeBtn = document.getElementById('vipLicenseBtn');
  const badgeText = document.getElementById('vipBadgeText');
  const badgeIcon = document.getElementById('vipBadgeIcon');
  const statusEmoji = document.getElementById('licStatusEmoji');
  const statusPlan = document.getElementById('licStatusPlan');
  const statusBadge = document.getElementById('licStatusBadge');

  if (lic && lic.is_licensed) {
    if (badgeText) badgeText.textContent = lic.is_lifetime ? 'VIP 👑' : 'PRO 🌟';
    if (badgeIcon) badgeIcon.textContent = '👑';
    if (badgeBtn) {
      badgeBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      badgeBtn.title = 'Activated: ' + lic.plan_name;
    }
    if (statusEmoji) statusEmoji.textContent = '👑';
    if (statusPlan) statusPlan.textContent = lic.plan_name + (lic.expiry_date ? ` (${lic.expiry_date})` : '');
    if (statusBadge) {
      statusBadge.textContent = 'Active ✅';
      statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      statusBadge.style.color = '#34d399';
    }
  } else {
    if (badgeText) badgeText.textContent = 'Activate';
    if (badgeIcon) badgeIcon.textContent = '🔑';
    if (badgeBtn) {
      badgeBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
      badgeBtn.title = 'Click to activate';
    }
    if (statusEmoji) statusEmoji.textContent = '🔒';
    if (statusPlan) statusPlan.textContent = 'មិនទាន់ Activate Key (Free Preview)';
    if (statusBadge) {
      statusBadge.textContent = 'Unlicensed';
      statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      statusBadge.style.color = '#f87171';
    }
  }
}

function openLicenseModal() {
  const modal = document.getElementById('licenseModal');
  if (modal) modal.style.display = 'flex';
  const adminCont = document.getElementById('creatorAdminContainer');
  if (adminCont) adminCont.style.display = 'block';
  const input = document.getElementById('licenseKeyInput');
  if (input) setTimeout(() => input.focus(), 150);
}

async function submitActivationKey() {
  const input = document.getElementById('licenseKeyInput');
  const alertBox = document.getElementById('licenseResultAlert');
  const btn = document.getElementById('btnSubmitLicense');
  if (!input) return;

  const keyVal = input.value.trim().toUpperCase();
  if (!keyVal) {
    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
      alertBox.style.border = '1px solid #ef4444';
      alertBox.style.color = '#fca5a5';
      alertBox.textContent = '⚠️ សូមបញ្ចូល Activation Key!';
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'កំពុងផ្ទៀងផ្ទាត់...';
  }

  try {
    const res = await fetch('/api/activate_license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: keyVal, device_id: clientDeviceId })
    });
    const data = await res.json();
    if (data.success) {
      // Save key permanently in phone's browser storage
      try {
        localStorage.setItem('smart_ai_studio_license_key', keyVal);
      } catch (e) {}

      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(16, 185, 129, 0.2)';
        alertBox.style.border = '1px solid #10b981';
        alertBox.style.color = '#86efac';
        alertBox.style.whiteSpace = 'pre-line';
        alertBox.textContent = data.message || '🎉 បាន Activate ជោគជ័យ!';
      }
      input.value = '';
      checkLicenseStatus();
      setTimeout(() => {
        closeModal('licenseModal');
        if (typeof showToast === 'function') {
          showToast('👑 គណនីរបស់អ្នកបាន Active រួចរាល់!', 'success');
        }
      }, 1500);
    } else {
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
        alertBox.style.border = '1px solid #ef4444';
        alertBox.style.color = '#fca5a5';
        alertBox.style.whiteSpace = 'pre-line';
        alertBox.textContent = (data.error || 'Activation Key មិនត្រឹមត្រូវ!');
      }
    }
  } catch (err) {
    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.style.background = 'rgba(239, 68, 68, 0.2)';
      alertBox.style.border = '1px solid #ef4444';
      alertBox.style.color = '#fca5a5';
      alertBox.textContent = 'កំហុស៖ ' + err;
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚡ ធ្វើឱ្យសកម្ម (Activate Key)';
    }
  }
}

// ----------------------------------------------------
// 12. Creator Admin Key Generator Tool (Rin Makara Only)
// ----------------------------------------------------
let _secretTapCount = 0;
let _secretTapTimer = null;
function handleSecretAdminUnlock() {
  _secretTapCount++;
  clearTimeout(_secretTapTimer);
  _secretTapTimer = setTimeout(() => { _secretTapCount = 0; }, 2000);
  if (_secretTapCount >= 3) {
    _secretTapCount = 0;
    const adminCont = document.getElementById('creatorAdminContainer');
    if (adminCont) {
      adminCont.style.display = adminCont.style.display === 'none' ? 'block' : 'none';
      if (adminCont.style.display === 'block' && typeof showToast === 'function') {
        showToast('👑 បានបើកផ្ទាំង Creator Key Generator!', 'info');
      }
    }
  }
}

function toggleAdminKeyGenPanel() {
  const panel = document.getElementById('adminKeyGenPanel');
  const icon = document.getElementById('adminToggleIcon');
  const pinInput = document.getElementById('adminPinInput');
  if (panel) {
    const isShowing = panel.style.display === 'block';
    panel.style.display = isShowing ? 'none' : 'block';
    if (icon) icon.textContent = isShowing ? '▾' : '▴';
    if (!isShowing && pinInput && !pinInput.value) {
      try {
        const saved = localStorage.getItem('makara_admin_pin');
        if (saved) pinInput.value = saved;
      } catch (e) {}
    }
  }
}

async function adminGenerateClientKey() {
  const pinInput = document.getElementById('adminPinInput');
  const planSelect = document.getElementById('adminPlanSelect');
  const keyBox = document.getElementById('adminGeneratedKeyBox');
  const keyText = document.getElementById('adminGeneratedKeyText');

  const pin = (pinInput ? pinInput.value : '').trim();
  const plan = planSelect ? planSelect.value : '2DAY';

  if (!pin) {
    alert('សូមបញ្ចូល Admin PIN ឬ Master Key របស់អ្នក!');
    return;
  }

  try {
    const res = await fetch('/api/admin/generate_license_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_pin: pin, plan_code: plan, count: 1 })
    });
    const data = await res.json();
    if (data.success && data.keys && data.keys.length > 0) {
      try {
        localStorage.setItem('makara_admin_pin', pin);
      } catch (e) {}
      if (keyBox) keyBox.style.display = 'block';
      if (keyText) keyText.textContent = data.keys[0];
      if (typeof showToast === 'function') {
        showToast('🎉 បានបង្កើត Key ជោគជ័យ!', 'success');
      }
    } else {
      alert('កំហុស៖ ' + (data.error || 'Admin PIN មិនត្រឹមត្រូវ!'));
    }
  } catch (e) {
    alert('កំហុស Server: ' + e);
  }
}

function copyAdminGeneratedKey() {
  const keyText = document.getElementById('adminGeneratedKeyText');
  if (keyText && keyText.textContent) {
    const val = keyText.textContent.trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).then(() => {
        if (typeof showToast === 'function') {
          showToast('📋 បាន Copy Key ជោគជ័យ!', 'success');
        } else {
          alert('បាន Copy Key: ' + val);
        }
      });
    } else {
      alert('Key: ' + val);
    }
  }
}

async function adminResetCustomerDeviceLock() {
  const pinInput = document.getElementById('adminPinInput');
  const resetKeyInput = document.getElementById('adminResetKeyInput');
  const pin = (pinInput ? pinInput.value : '').trim();
  const targetKey = (resetKeyInput ? resetKeyInput.value : '').trim().toUpperCase();

  if (!pin) {
    alert('សូមបញ្ចូល Admin PIN ឬ Master Key ជាមុនសិន!');
    return;
  }
  if (!targetKey) {
    alert('សូមបញ្ចូល Key របស់ភ្ញៀវដែលត្រូវ Reset Device-Lock!');
    return;
  }

  try {
    const res = await fetch('/api/admin/reset_device_lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_pin: pin, key: targetKey })
    });
    const data = await res.json();
    if (data.success) {
      if (typeof showToast === 'function') {
        showToast(data.message, 'success');
      } else {
        alert(data.message);
      }
      if (resetKeyInput) resetKeyInput.value = '';
    } else {
      alert('កំហុស៖ ' + (data.error || 'បរាជ័យក្នុងការ Reset Device-Lock'));
    }
  } catch (e) {
    alert('កំហុស Server: ' + e);
  }
}

// ================= ANTI-COPYRIGHT CONTROLS =================
function toggleAntiCopyrightOptions(enabled) {
  const panel = document.getElementById('antiCopyrightOptionsPanel');
  if (panel) {
    panel.style.opacity = enabled ? '1' : '0.4';
    panel.style.pointerEvents = enabled ? 'auto' : 'none';
  }
}

// ================= MULTI-EPISODE DRAMA SERIES MANAGEMENT =================
function renderDramaEpisodeBar() {
  const container = document.getElementById('dramaEpisodeBarContainer');
  const pillsList = document.getElementById('dramaEpisodePillsList');
  if (!container || !pillsList) return;

  const episodes = appState.episodes || [];
  if (episodes.length === 0) {
    pillsList.innerHTML = `<span style="font-size: 0.72rem; color: #94a3b8; font-style: italic;">មិនទាន់មានភាគរឿង...</span>`;
    return;
  }

  pillsList.innerHTML = '';
  episodes.forEach((ep, idx) => {
    const isActive = ep.id === appState.currentEpisodeId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pill-btn ${isActive ? 'primary' : ''}`;
    btn.style.cssText = `padding: 4px 10px; font-size: 0.73rem; white-space: nowrap; font-weight: ${isActive ? 'bold' : 'normal'}; border-radius: 6px; ${isActive ? 'background: #0284c7; color: white;' : 'background: rgba(30, 41, 59, 0.8); color: #cbd5e1;'}`;
    const subCount = (ep.subtitles && ep.subtitles.length > 0) ? ` (${ep.subtitles.length})` : '';
    btn.innerHTML = `<span>${ep.title || `ភាគ ${idx + 1}`}</span><span style="font-size: 0.65rem; opacity: 0.8;">${subCount}</span>`;
    btn.onclick = () => switchDramaEpisode(ep.id);
    pillsList.appendChild(btn);
  });

  const manageBtn = document.createElement('button');
  manageBtn.type = 'button';
  manageBtn.className = 'pill-btn';
  manageBtn.style.cssText = 'padding: 4px 8px; font-size: 0.7rem; background: rgba(51, 65, 85, 0.6); color: #94a3b8; border-radius: 6px;';
  manageBtn.title = 'គ្រប់គ្រងភាគទាំងអស់';
  manageBtn.innerHTML = '⚙️ គ្រប់គ្រង';
  manageBtn.onclick = () => openEpisodesModal();
  pillsList.appendChild(manageBtn);
}

function openEpisodesModal() {
  openModal('episodesModal');
  renderEpisodesModalList();
}

function renderEpisodesModalList() {
  const list = document.getElementById('episodesModalList');
  if (!list) return;

  const episodes = appState.episodes || [];
  if (episodes.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 20px 0; font-size: 0.8rem;">មិនទាន់មានភាគរឿងនៅឡើយទេ។ សូមចុច "បន្ថែមវីដេអូភាគថ្មី..." ខាងក្រោម!</div>`;
    return;
  }

  list.innerHTML = '';
  episodes.forEach((ep, idx) => {
    const isActive = ep.id === appState.currentEpisodeId;
    const item = document.createElement('div');
    item.style.cssText = `display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px; border-radius: 8px; background: ${isActive ? 'rgba(2, 132, 199, 0.15)' : 'rgba(30, 41, 59, 0.6)'}; border: 1px solid ${isActive ? '#38bdf8' : 'rgba(255,255,255,0.08)'};`;

    const subCount = ep.subtitles ? ep.subtitles.length : 0;
    const durStr = ep.duration ? `${Math.round(ep.duration)}s` : '';

    item.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <input type="text" value="${ep.title || `ភាគ ${idx + 1}`}" 
                 style="background: transparent; border: 1px dashed rgba(255,255,255,0.2); color: ${isActive ? '#38bdf8' : '#f8fafc'}; font-size: 0.85rem; font-weight: bold; border-radius: 4px; padding: 2px 6px; width: 140px;"
                 onchange="updateDramaEpisodeTitle('${ep.id}', this.value)">
          ${isActive ? '<span style="font-size: 0.65rem; background: #0284c7; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">កំពុងកែ</span>' : ''}
        </div>
        <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px; display: flex; align-items: center; gap: 8px;">
          <span>💬 ${subCount} Subtitles</span>
          ${durStr ? `<span>⏱️ ${durStr}</span>` : ''}
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px;">📁 ${ep.video_title || ''}</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 5px; flex-shrink: 0;">
        ${!isActive ? `<button type="button" class="pill-btn primary" onclick="switchDramaEpisode('${ep.id}')" style="padding: 4px 8px; font-size: 0.72rem;">ជ្រើសរើស</button>` : ''}
        <button type="button" class="pill-btn" onclick="moveEpisodeOrder('${ep.id}', -1)" ${idx === 0 ? 'disabled style="opacity: 0.3; padding: 4px 6px;"' : 'style="padding: 4px 6px;"'} title="រំកិលឡើងលើ">⬆️</button>
        <button type="button" class="pill-btn" onclick="moveEpisodeOrder('${ep.id}', 1)" ${idx === episodes.length - 1 ? 'disabled style="opacity: 0.3; padding: 4px 6px;"' : 'style="padding: 4px 6px;"'} title="រំកិលចុះក្រោម">⬇️</button>
        <button type="button" class="pill-btn" onclick="deleteDramaEpisode('${ep.id}')" style="padding: 4px 6px; background: rgba(239, 68, 68, 0.2); color: #f87171;" title="លុបភាគនេះ">🗑️</button>
      </div>
    `;
    list.appendChild(item);
  });
}

async function updateDramaEpisodeTitle(epId, newTitle) {
  if (!newTitle.trim()) return;
  try {
    const res = await fetch(`/api/episodes/update_title/${epId}`, {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() })
    });
    const data = await res.json();
    if (data.success) {
      const ep = (appState.episodes || []).find(e => e.id === epId);
      if (ep) ep.title = newTitle.trim();
      renderDramaEpisodeBar();
    }
  } catch (e) {
    console.error('Update title error:', e);
  }
}

async function switchDramaEpisode(epId) {
  if (epId === appState.currentEpisodeId) {
    closeModal('episodesModal');
    return;
  }

  showProgress('🔄 កំពុងប្តូរទៅកាន់ភាគរឿង...', 10);
  try {
    const res = await fetch(`/api/episodes/select/${epId}`, {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });
    const data = await res.json();
    hideProgress();

    if (data.success) {
      appState.currentEpisodeId = data.active_episode.id;
      appState.videoLoaded = data.has_video;
      appState.videoPath = data.video_path || '';
      appState.subtitles = data.subtitles || [];
      appState.episodes = data.episodes || appState.episodes;

      updateVideoUI(data);
      renderSubtitlesList();
      renderDramaEpisodeBar();
      reloadMasterDubAudio();
      closeModal('episodesModal');

      if (typeof showToast === 'function') {
        showToast(`📺 បានប្តូរទៅកាន់ ${data.active_episode.title}!`, 'success');
      }
    } else {
      alert('កំហុសប្តូរភាគ៖ ' + (data.error || 'Unknown'));
    }
  } catch (err) {
    hideProgress();
    alert('កំហុស៖ ' + err);
  }
}

async function handleEpisodeFileInput(files) {
  if (!files || files.length === 0) return;
  const file = files[0];

  appState.isUploadingVideo = true;
  showProgress(`⚡ កំពុងរៀបចំ Upload ${file.name}...`, 5);

  const formData = new FormData();
  formData.append('video_file', file);
  const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

  try {
    const data = await uploadWithProgress('/api/episodes/add', formData, `⚡ កំពុង Upload ${file.name}`, headers);
    hideProgress();
    appState.isUploadingVideo = false;

    if (data.success) {
      appState.episodes = data.episodes || [];
      appState.currentEpisodeId = data.active_episode ? data.active_episode.id : (data.current_episode_id || '');
      appState.videoLoaded = true;
      appState.hasVideo = true;
      appState.videoPath = data.video_path || (data.active_episode ? data.active_episode.video_path : '');
      appState.subtitles = data.subtitles || [];

      updateVideoUI(data);
      renderSubtitlesList();
      renderDramaEpisodeBar();
      reloadMasterDubAudio();
      renderEpisodesModalList();

      if (typeof showToast === 'function') {
        showToast(`🎉 បានបញ្ចូល ${data.active_episode.title} ជោគជ័យ!`, 'success');
      }
    } else {
      alert('កំហុសបញ្ចូលភាគ៖ ' + (data.error || 'Unknown'));
    }
  } catch (err) {
    hideProgress();
    appState.isUploadingVideo = false;
    alert('កំហុស Upload: ' + err);
  }
}

async function deleteDramaEpisode(epId) {
  if (!confirm('តើលោកអ្នកពិតជាចង់លុបភាគនេះមែនទេ?')) return;

  try {
    const res = await fetch(`/api/episodes/delete/${epId}`, {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });
    const data = await res.json();
    if (data.success) {
      appState.episodes = data.episodes || [];
      appState.currentEpisodeId = data.current_episode_id || '';
      appState.videoLoaded = data.has_video;
      appState.videoPath = data.video_path || '';
      appState.subtitles = data.subtitles || [];

      updateVideoUI(data);
      renderSubtitlesList();
      renderDramaEpisodeBar();
      renderEpisodesModalList();
      reloadMasterDubAudio();

      if (typeof showToast === 'function') {
        showToast('🗑️ បានលុបភាគរឿងជោគជ័យ', 'info');
      }
    } else {
      alert('កំហុសលុបភាគ៖ ' + (data.error || 'Unknown'));
    }
  } catch (e) {
    alert('កំហុស៖ ' + e);
  }
}

async function moveEpisodeOrder(epId, direction) {
  const episodes = [...(appState.episodes || [])];
  const idx = episodes.findIndex(e => e.id === epId);
  if (idx < 0) return;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= episodes.length) return;

  // Swap
  const temp = episodes[idx];
  episodes[idx] = episodes[targetIdx];
  episodes[targetIdx] = temp;

  const newIds = episodes.map(e => e.id);

  try {
    const res = await fetch('/api/episodes/reorder', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode_ids: newIds })
    });
    const data = await res.json();
    if (data.success) {
      appState.episodes = data.episodes;
      renderDramaEpisodeBar();
      renderEpisodesModalList();
    }
  } catch (e) {
    console.error('Reorder error:', e);
  }
}

function openMergeDramaModal() {
  openModal('mergeDramaModal');
  renderMergeDramaChecklist();
  const progBox = document.getElementById('mergeProgressBox');
  if (progBox) progBox.style.display = 'none';
  const dlArea = document.getElementById('mergeDownloadArea');
  if (dlArea) dlArea.style.display = 'none';
  const btnStart = document.getElementById('btnStartMergeEpisodes');
  if (btnStart) btnStart.disabled = false;
}

function renderMergeDramaChecklist() {
  const container = document.getElementById('mergeDramaChecklist');
  if (!container) return;

  const episodes = appState.episodes || [];
  if (episodes.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 12px; font-size: 0.78rem;">គ្មានភាគរឿងសម្រាប់ច្របាច់បញ្ចូលគ្នាឡើយ</div>`;
    return;
  }

  container.innerHTML = '';
  episodes.forEach((ep, idx) => {
    const label = document.createElement('label');
    label.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.78rem; color: #f1f5f9; cursor: pointer; padding: 4px 6px; border-radius: 6px; background: rgba(15, 23, 42, 0.4);';
    label.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" class="merge-ep-chk" value="${ep.id}" checked style="accent-color: #e11d48; width: 16px; height: 16px;">
        <span style="font-weight: bold; color: #38bdf8;">${ep.title || `ភាគ ${idx + 1}`}</span>
      </div>
      <span style="font-size: 0.7rem; color: #94a3b8;">${ep.subtitles ? `${ep.subtitles.length} subs` : ''}</span>
    `;
    container.appendChild(label);
  });
}

async function startMergeDramaEpisodes() {
  const checkedBoxes = document.querySelectorAll('.merge-ep-chk:checked');
  const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);

  if (selectedIds.length < 2) {
    alert('សូមជ្រើសរើសយ៉ាងហោចណាស់ ២ ភាគដើម្បីច្របាច់បញ្ចូលគ្នា!');
    return;
  }

  const outNameInput = document.getElementById('mergeOutputFilename');
  const filename = (outNameInput ? outNameInput.value.trim() : '') || 'Drama_Full_Movie_Merged.mp4';

  const btnStart = document.getElementById('btnStartMergeEpisodes');
  if (btnStart) btnStart.disabled = true;

  const progBox = document.getElementById('mergeProgressBox');
  const progText = document.getElementById('mergeProgressText');
  const progBar = document.getElementById('mergeProgressBar');
  const dlArea = document.getElementById('mergeDownloadArea');
  const dlBtn = document.getElementById('btnDownloadMergedMovie');

  if (progBox) progBox.style.display = 'block';
  if (progText) progText.textContent = '🚀 កំពុងចាប់ផ្តើមច្របាច់បញ្ចូលគ្នា (FFmpeg Concat)...';
  if (progBar) progBar.style.width = '10%';
  if (dlArea) dlArea.style.display = 'none';

  try {
    const res = await fetch('/api/episodes/merge', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episode_ids: selectedIds,
        output_filename: filename
      })
    });
    const data = await res.json();

    if (!data.success) {
      if (progBox) progBox.style.display = 'none';
      if (btnStart) btnStart.disabled = false;
      if (data.license_required) {
        openLicenseModal();
        if (typeof showToast === 'function') {
          showToast(data.error || '🔒 សូមធ្វើការ Activate Key កម្មវិធីជាមុនសិន!', 'warning');
        }
      } else {
        alert('កំហុស៖ ' + (data.error || 'Failed to start merge'));
      }
      return;
    }

    const timer = setInterval(async () => {
      try {
        const pRes = await fetch('/api/episodes/merge_progress');
        const pData = await pRes.json();

        if (progText) progText.textContent = pData.message || 'កំពុងដំណើរការ...';
        if (progBar) progBar.style.width = `${pData.percent || 10}%`;

        if (pData.done) {
          clearInterval(timer);
          if (btnStart) btnStart.disabled = false;
          if (pData.success && pData.download_url) {
            if (progText) progText.innerHTML = '🎉 ច្របាច់បញ្ចូលរឿងពេញបានជោគជ័យ ១០០%!';
            if (progBar) progBar.style.width = '100%';
            if (dlBtn) {
              dlBtn.href = pData.download_url;
              dlBtn.setAttribute('download', pData.filename || filename);
              dlBtn.onclick = () => {
                if (typeof showToast === 'function') {
                  showToast('📥 កំពុងទាញយកវីដេអូរឿងពេញ...', 'info');
                }
              };
            }
            if (dlArea) dlArea.style.display = 'block';
            if (typeof autoSaveVideoToPhonePhotos === 'function') {
              autoSaveVideoToPhonePhotos(pData.download_url, pData.filename);
            }
            if (typeof showToast === 'function') {
              showToast('🎬 រឿងពេញត្រូវបានច្របាច់បញ្ចូលគ្នាជោគជ័យ!', 'success');
            }
          } else {
            alert('កំហុសច្របាច់បញ្ចូល៖ ' + (pData.error || 'Unknown error'));
            if (progBox) progBox.style.display = 'none';
          }
        }
      } catch (err) {
        console.error('Polling merge progress error:', err);
      }
    }, 1000);

  } catch (err) {
    if (progBox) progBox.style.display = 'none';
    if (btnStart) btnStart.disabled = false;
    alert('កំហុស Merge: ' + err);
  }
}

// ================= CUSTOM BGM (ភ្លេងកំដរ) & LOGO WATERMARK =================

function openBgmModal() {
  updateBgmUI();
  openModal('bgmModal');
}

function updateBgmUI() {
  const card = document.getElementById('bgmStatusCard');
  const fileName = document.getElementById('bgmFileName');
  const fileSize = document.getElementById('bgmFileSize');
  const btnRemove = document.getElementById('btnRemoveBgm');
  const slider = document.getElementById('sliderCustomBgmVol');
  const lblVol = document.getElementById('lblCustomBgmVolVal');
  const previewBox = document.getElementById('bgmAudioPreviewBox');
  const previewAudio = document.getElementById('bgmPreviewAudio');
  const badgeInfo = document.getElementById('bgmBadgeInfo');
  const pillBadge = document.getElementById('bgmPillBadge');

  if (slider) slider.value = appState.bgmVolumePercent || 25;
  if (lblVol) lblVol.textContent = (appState.bgmVolumePercent || 25) + '%';

  if (appState.hasCustomBgm) {
    if (fileName) fileName.textContent = appState.customBgmTitle || 'ភ្លេងកំដរផ្ទាល់ខ្លួន';
    if (fileSize) fileSize.textContent = '✅ កំពុងដំណើរការភ្ជាប់ជាមួយវីដេអូ';
    if (btnRemove) btnRemove.style.display = 'inline-block';
    if (previewBox && previewAudio) {
      previewBox.style.display = 'block';
      const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
      const audioUrl = (appState.customBgmUrl || '/api/custom_bgm_audio') + (sid ? `?sid=${encodeURIComponent(sid)}` : '');
      if (previewAudio.src !== audioUrl) {
        previewAudio.src = audioUrl;
      }
    }
    if (badgeInfo) {
      badgeInfo.style.display = 'inline-flex';
      badgeInfo.title = `ភ្លេងកំដរ៖ ${appState.customBgmTitle || 'Active'}`;
    }
    if (pillBadge) pillBadge.style.display = 'inline-block';
  } else {
    if (fileName) fileName.textContent = 'មិនទាន់មានភ្លេងកំដរ';
    if (fileSize) fileSize.textContent = 'សូម Upload បទចម្រៀង ឬភ្លេង (MP3, WAV, M4A)';
    if (btnRemove) btnRemove.style.display = 'none';
    if (previewBox) previewBox.style.display = 'none';
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.removeAttribute('src');
    }
    if (badgeInfo) badgeInfo.style.display = 'none';
    if (pillBadge) pillBadge.style.display = 'none';
  }
}

function syncCustomBgmAudio() {
  const customBgm = document.getElementById('customBgmAudio');
  if (!customBgm) return;
  if (appState.hasCustomBgm) {
    const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
    const audioUrl = (appState.customBgmUrl || '/api/custom_bgm_audio') + (sid ? `?sid=${encodeURIComponent(sid)}` : '');
    if (customBgm.src !== audioUrl) {
      customBgm.src = audioUrl;
      customBgm.loop = true;
      customBgm.load();
    }
    customBgm.volume = (appState.bgmVolumePercent || 25) / 100;
  } else {
    customBgm.pause();
    customBgm.removeAttribute('src');
  }
}

async function handleCustomBgmUpload(input) {
  if (!input || !input.files || input.files.length === 0) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('bgm_file', file);

  if (typeof showProgress === 'function') {
    showProgress('កំពុងបញ្ចូលភ្លេងកំដរ...', 30);
  }

  try {
    const res = await fetch('/api/upload_custom_bgm', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (typeof hideProgress === 'function') hideProgress();

    if (data.success) {
      appState.hasCustomBgm = true;
      appState.customBgmTitle = data.title || file.name;
      appState.customBgmUrl = data.url;
      appState.bgmVolumePercent = data.volume_percent || 25;
      updateBgmUI();
      syncCustomBgmAudio();
      if (typeof showToast === 'function') {
        showToast('🎵 បានបញ្ចូលភ្លេងកំដរជោគជ័យ!', 'success');
      }
    } else {
      alert('កំហុសបញ្ចូលភ្លេង៖ ' + (data.error || 'Upload failed'));
    }
  } catch (err) {
    if (typeof hideProgress === 'function') hideProgress();
    alert('កំហុស៖ ' + err);
  } finally {
    input.value = '';
  }
}

async function onCustomBgmVolChange(val) {
  const vol = parseInt(val) || 0;
  appState.bgmVolumePercent = vol;
  const lbl = document.getElementById('lblCustomBgmVolVal');
  if (lbl) lbl.textContent = vol + '%';

  const customBgm = document.getElementById('customBgmAudio');
  if (customBgm) {
    customBgm.volume = vol / 100;
  }

  try {
    await fetch('/api/set_bgm_config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume_percent: vol })
    });
  } catch (e) {}
}

async function deleteCustomBgm() {
  if (!confirm('តើអ្នកពិតជាចង់លុបភ្លេងកំដរនេះចេញមែនទេ?')) return;
  try {
    const res = await fetch('/api/delete_custom_bgm', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      appState.hasCustomBgm = false;
      appState.customBgmTitle = '';
      appState.customBgmUrl = '';
      updateBgmUI();
      syncCustomBgmAudio();
      if (typeof showToast === 'function') {
        showToast('🗑️ បានលុបភ្លេងកំដររួចរាល់', 'info');
      }
    }
  } catch (err) {
    alert('កំហុសលុបភ្លេង៖ ' + err);
  }
}

function openLogoModal() {
  updateLogoUI();
  openModal('logoModal');
}

function updateLogoUI() {
  const card = document.getElementById('logoStatusCard');
  const fileName = document.getElementById('logoFileName');
  const fileSize = document.getElementById('logoFileSize');
  const btnRemove = document.getElementById('btnRemoveLogo');
  const previewImg = document.getElementById('logoPreviewImg');
  const placeholder = document.getElementById('logoPreviewPlaceholder');
  const badgeInfo = document.getElementById('logoBadgeInfo');
  const pillBadge = document.getElementById('logoPillBadge');

  const sliderScale = document.getElementById('sliderLogoScale');
  const lblScale = document.getElementById('lblLogoScaleVal');
  const sliderOpacity = document.getElementById('sliderLogoOpacity');
  const lblOpacity = document.getElementById('lblLogoOpacityVal');

  if (sliderScale) sliderScale.value = appState.logoScale || 15;
  if (lblScale) lblScale.textContent = (appState.logoScale || 15) + '%';
  if (sliderOpacity) sliderOpacity.value = appState.logoOpacity || 90;
  if (lblOpacity) lblOpacity.textContent = (appState.logoOpacity || 90) + '%';

  updateLogoPositionButtons();

  if (appState.hasLogo) {
    if (fileName) fileName.textContent = appState.logoTitle || 'Logo / Watermark';
    if (fileSize) fileSize.textContent = '✅ កំពុងបង្ហាញលើវីដេអូ';
    if (btnRemove) btnRemove.style.display = 'inline-block';
    if (previewImg) {
      const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
      previewImg.src = (appState.logoUrl || '/api/logo_image') + (sid ? `?sid=${encodeURIComponent(sid)}` : '');
      previewImg.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (badgeInfo) {
      badgeInfo.style.display = 'inline-flex';
      badgeInfo.title = `Logo៖ ${appState.logoTitle || 'Active'}`;
    }
    if (pillBadge) pillBadge.style.display = 'inline-block';
  } else {
    if (fileName) fileName.textContent = 'មិនទាន់មាន Logo';
    if (fileSize) fileSize.textContent = 'សូម Upload រូបភាព PNG (បាតថ្លា) ឬ JPG';
    if (btnRemove) btnRemove.style.display = 'none';
    if (previewImg) {
      previewImg.style.display = 'none';
      previewImg.removeAttribute('src');
    }
    if (placeholder) placeholder.style.display = 'block';
    if (badgeInfo) badgeInfo.style.display = 'none';
    if (pillBadge) pillBadge.style.display = 'none';
  }

  applyLogoOverlayToVideo();
}

function updateLogoPositionButtons() {
  const pos = appState.logoPosition || 'top-right';
  const btns = {
    'top-right': document.getElementById('btnLogoPosTopRight'),
    'top-left': document.getElementById('btnLogoPosTopLeft'),
    'bottom-right': document.getElementById('btnLogoPosBottomRight'),
    'bottom-left': document.getElementById('btnLogoPosBottomLeft')
  };
  Object.keys(btns).forEach(k => {
    const b = btns[k];
    if (b) {
      if (k === pos) {
        b.className = 'pill-btn primary';
      } else {
        b.className = 'pill-btn';
      }
    }
  });
}

function applyLogoOverlayToVideo() {
  const overlay = document.getElementById('videoLogoOverlay');
  if (!overlay) return;

  if (!appState.hasLogo) {
    overlay.style.display = 'none';
    overlay.removeAttribute('src');
    return;
  }

  const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
  const logoUrl = (appState.logoUrl || '/api/logo_image') + (sid ? `?sid=${encodeURIComponent(sid)}` : '');
  if (overlay.src !== logoUrl) {
    overlay.src = logoUrl;
  }

  overlay.style.display = 'block';
  overlay.style.width = `${appState.logoScale || 15}%`;
  overlay.style.opacity = `${(appState.logoOpacity || 90) / 100}`;

  // Reset positioning styles
  overlay.style.top = 'auto';
  overlay.style.bottom = 'auto';
  overlay.style.left = 'auto';
  overlay.style.right = 'auto';

  const pos = appState.logoPosition || 'top-right';
  if (pos === 'top-left') {
    overlay.style.top = '12px';
    overlay.style.left = '12px';
  } else if (pos === 'bottom-right') {
    overlay.style.bottom = '18px';
    overlay.style.right = '12px';
  } else if (pos === 'bottom-left') {
    overlay.style.bottom = '18px';
    overlay.style.left = '12px';
  } else {
    // Default: top-right
    overlay.style.top = '12px';
    overlay.style.right = '12px';
  }
}

async function handleCustomLogoUpload(input) {
  if (!input || !input.files || input.files.length === 0) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('logo_file', file);

  if (typeof showProgress === 'function') {
    showProgress('កំពុងបញ្ចូល Logo...', 30);
  }

  try {
    const res = await fetch('/api/upload_logo', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (typeof hideProgress === 'function') hideProgress();

    if (data.success) {
      appState.hasLogo = true;
      appState.logoTitle = data.title || file.name;
      appState.logoUrl = data.url;
      appState.logoPosition = data.position || 'top-right';
      appState.logoScale = data.scale || 15;
      appState.logoOpacity = data.opacity || 90;
      updateLogoUI();
      if (typeof showToast === 'function') {
        showToast('🏷️ បានបញ្ចូល Logo លើវីដេអូជោគជ័យ!', 'success');
      }
    } else {
      alert('កំហុសបញ្ចូល Logo៖ ' + (data.error || 'Upload failed'));
    }
  } catch (err) {
    if (typeof hideProgress === 'function') hideProgress();
    alert('កំហុស៖ ' + err);
  } finally {
    input.value = '';
  }
}

async function setLogoPosition(pos) {
  appState.logoPosition = pos;
  updateLogoPositionButtons();
  applyLogoOverlayToVideo();
  saveLogoConfigToServer();
}

function onLogoConfigChange() {
  const sliderScale = document.getElementById('sliderLogoScale');
  const lblScale = document.getElementById('lblLogoScaleVal');
  const sliderOpacity = document.getElementById('sliderLogoOpacity');
  const lblOpacity = document.getElementById('lblLogoOpacityVal');

  if (sliderScale && lblScale) {
    appState.logoScale = parseInt(sliderScale.value) || 15;
    lblScale.textContent = appState.logoScale + '%';
  }
  if (sliderOpacity && lblOpacity) {
    appState.logoOpacity = parseInt(sliderOpacity.value) || 90;
    lblOpacity.textContent = appState.logoOpacity + '%';
  }

  applyLogoOverlayToVideo();
  saveLogoConfigToServer();
}

async function saveLogoConfigToServer() {
  try {
    await fetch('/api/set_logo_config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        position: appState.logoPosition,
        scale: appState.logoScale,
        opacity: appState.logoOpacity
      })
    });
  } catch (e) {}
}

async function deleteCustomLogo() {
  if (!confirm('តើអ្នកពិតជាចង់លុប Logo នេះចេញពីវីដេអូមែនទេ?')) return;
  try {
    const res = await fetch('/api/delete_logo', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      appState.hasLogo = false;
      appState.logoTitle = '';
      appState.logoUrl = '';
      updateLogoUI();
      if (typeof showToast === 'function') {
        showToast('🗑️ បានលុប Logo រួចរាល់', 'info');
      }
    }
  } catch (err) {
    alert('កំហុសលុប Logo៖ ' + err);
  }
}

function updateBgmAndLogoBadges() {
  updateBgmUI();
  updateLogoUI();
}

// ================= VIDEO TRIMMING (កាត់តម្រឹមវីដេអូ) =================

function openTrimModal() {
  const video = document.getElementById('mainVideo');
  const dur = (video && video.duration) ? video.duration : (appState.duration || 0);
  const cur = (video && !isNaN(video.currentTime)) ? video.currentTime : 0;

  const totalLbl = document.getElementById('trimTotalDurationLbl');
  const curLbl = document.getElementById('trimCurrentPosLbl');
  const inStart = document.getElementById('inputTrimStart');
  const inEnd = document.getElementById('inputTrimEnd');

  if (totalLbl) totalLbl.textContent = formatTimeDisplay(dur);
  if (curLbl) curLbl.textContent = formatTimeDisplay(cur);

  if (inStart && inEnd) {
    if (appState.trimEnd <= 0 || appState.trimEnd > dur) {
      inStart.value = 0.0;
      inEnd.value = dur > 0 ? dur.toFixed(1) : 10.0;
      appState.trimStart = 0.0;
      appState.trimEnd = dur > 0 ? dur : 10.0;
    }
  }

  updateTrimDisplay();
  openModal('trimModal');
}

function updateTrimDisplay() {
  const inStart = document.getElementById('inputTrimStart');
  const inEnd = document.getElementById('inputTrimEnd');
  const startFmt = document.getElementById('trimStartFormatted');
  const endFmt = document.getElementById('trimEndFormatted');
  const calcDur = document.getElementById('trimCalculatedDuration');
  const btnRestore = document.getElementById('btnRestoreOriginalVideo');
  const trimBadge = document.getElementById('trimBadgeInfo');
  const trimPill = document.getElementById('trimPillBadge');

  const s = parseFloat(inStart ? inStart.value : 0) || 0;
  const e = parseFloat(inEnd ? inEnd.value : 0) || 0;
  const diff = Math.max(0, e - s);

  if (startFmt) startFmt.textContent = formatTimeDisplayWithMillis(s);
  if (endFmt) endFmt.textContent = formatTimeDisplayWithMillis(e);
  if (calcDur) calcDur.textContent = `${formatTimeDisplay(diff)} (${diff.toFixed(1)} វិនាទី)`;

  if (btnRestore) {
    btnRestore.style.display = appState.isTrimmed ? 'inline-flex' : 'none';
  }
  if (trimBadge) {
    trimBadge.style.display = appState.isTrimmed ? 'inline-flex' : 'none';
  }
  if (trimPill) {
    trimPill.style.display = appState.isTrimmed ? 'inline-block' : 'none';
  }
}

function formatTimeDisplayWithMillis(sec) {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 100);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
}

function setTrimStartToCurrent() {
  const video = document.getElementById('mainVideo');
  if (!video) return;
  const t = Math.max(0, video.currentTime || 0);
  const inStart = document.getElementById('inputTrimStart');
  if (inStart) {
    inStart.value = t.toFixed(1);
    appState.trimStart = t;
  }
  updateTrimDisplay();
}

function setTrimEndToCurrent() {
  const video = document.getElementById('mainVideo');
  if (!video) return;
  const t = Math.max(0, video.currentTime || 0);
  const inEnd = document.getElementById('inputTrimEnd');
  if (inEnd) {
    inEnd.value = t.toFixed(1);
    appState.trimEnd = t;
  }
  updateTrimDisplay();
}

function stepTrimTime(field, delta) {
  const input = field === 'start' ? document.getElementById('inputTrimStart') : document.getElementById('inputTrimEnd');
  if (!input) return;
  let val = parseFloat(input.value) || 0;
  val = Math.max(0, val + delta);
  input.value = val.toFixed(1);
  if (field === 'start') appState.trimStart = val;
  else appState.trimEnd = val;
  updateTrimDisplay();
}

function onTrimInputChange() {
  const inStart = document.getElementById('inputTrimStart');
  const inEnd = document.getElementById('inputTrimEnd');
  if (inStart) appState.trimStart = parseFloat(inStart.value) || 0;
  if (inEnd) appState.trimEnd = parseFloat(inEnd.value) || 0;
  updateTrimDisplay();
}

let _trimPreviewTimer = null;
function previewTrimRange() {
  const video = document.getElementById('mainVideo');
  if (!video || !video.src) {
    alert('មិនទាន់មានវីដេអូសម្រាប់ចាក់ Preview ឡើយ!');
    return;
  }
  const s = appState.trimStart || 0;
  const e = appState.trimEnd || video.duration || 10;
  if (e <= s) {
    alert('ម៉ោងបញ្ចប់ត្រូវតែធំជាងម៉ោងចាប់ផ្តើម!');
    return;
  }

  if (_trimPreviewTimer) clearInterval(_trimPreviewTimer);

  video.currentTime = s;
  video.play().catch(e => console.log('preview play:', e));

  _trimPreviewTimer = setInterval(() => {
    if (video.currentTime >= e || video.paused) {
      video.pause();
      clearInterval(_trimPreviewTimer);
      _trimPreviewTimer = null;
    }
  }, 100);

  if (typeof showToast === 'function') {
    showToast(`▶️ កំពុងចាក់សាកល្បងពី ${formatTimeDisplay(s)} ទៅ ${formatTimeDisplay(e)}`, 'info');
  }
}

async function executeTrimVideo() {
  const video = document.getElementById('mainVideo');
  const dur = (video && video.duration) ? video.duration : (appState.duration || 0);
  const inStart = document.getElementById('inputTrimStart');
  const inEnd = document.getElementById('inputTrimEnd');
  const s = parseFloat(inStart ? inStart.value : 0) || 0;
  const e = parseFloat(inEnd ? inEnd.value : dur) || dur;

  if (e <= s + 0.3) {
    alert('ម៉ោងបញ្ចប់ត្រូវតែធំជាងម៉ោងចាប់ផ្តើមយ៉ាងហោចណាស់ 0.5 វិនាទី!');
    return;
  }

  if (!confirm(`តើអ្នកពិតជាចង់កាត់តម្រឹមវីដេអូចន្លោះពី ${formatTimeDisplay(s)} ទៅ ${formatTimeDisplay(e)} មែនទេ?\n(ប្រព័ន្ធនឹងកាត់តម្រឹម និងរំកិល Subtitle ស្វ័យប្រវត្តិ)`)) {
    return;
  }

  if (typeof showProgress === 'function') {
    showProgress('⚡ កំពុងកាត់តម្រឹមវីដេអូ និងរំកិល Subtitle...', 35);
  }

  try {
    const res = await fetch('/api/trim_video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: s, end_time: e })
    });
    const data = await res.json();
    if (typeof hideProgress === 'function') hideProgress();

    if (data.success) {
      appState.isTrimmed = true;
      appState.duration = data.duration;
      if (data.subtitles) {
        appState.subtitles = data.subtitles;
      }
      closeModal('trimModal');

      // Reload video with cache busting
      if (video) {
        const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
        video.src = (data.video_stream_url || '/api/video_stream') + `?sid=${encodeURIComponent(sid)}&t=${Date.now()}`;
        video.load();
      }

      renderSubtitlesList();
      reloadMasterDubAudio();
      updateTrimDisplay();
      if (typeof showToast === 'function') {
        showToast('✂️ បានកាត់តម្រឹមវីដេអូដោយជោគជ័យ!', 'success');
      }
    } else {
      alert('កំហុសកាត់តម្រឹម៖ ' + (data.error || 'Trim failed'));
    }
  } catch (err) {
    if (typeof hideProgress === 'function') hideProgress();
    alert('កំហុស៖ ' + err);
  }
}

async function restoreOriginalVideo() {
  if (!confirm('តើអ្នកចង់ស្តារវីដេអូដើមពេញលេញ (Uncut) ឡើងវិញមែនទេ?')) return;
  if (typeof showProgress === 'function') {
    showProgress('🔄 កំពុងស្តារវីដេអូដើម...', 40);
  }
  try {
    const res = await fetch('/api/restore_original_video', { method: 'POST' });
    const data = await res.json();
    if (typeof hideProgress === 'function') hideProgress();

    if (data.success) {
      appState.isTrimmed = false;
      appState.duration = data.duration;
      closeModal('trimModal');

      const video = document.getElementById('mainVideo');
      if (video) {
        const sid = localStorage.getItem('smart_ai_studio_session_id') || clientSessionId;
        video.src = (data.video_stream_url || '/api/video_stream') + `?sid=${encodeURIComponent(sid)}&t=${Date.now()}`;
        video.load();
      }

      updateTrimDisplay();
      if (typeof showToast === 'function') {
        showToast('🔄 បានស្តារវីដេអូដើមជោគជ័យ!', 'success');
      }
    } else {
      alert('កំហុសស្តារវីដេអូ៖ ' + (data.error || 'Restore failed'));
    }
  } catch (err) {
    if (typeof hideProgress === 'function') hideProgress();
    alert('កំហុស៖ ' + err);
  }
}

function updateTrimUI() {
  updateTrimDisplay();
}

// ================= VIDEO TITLE / HEADLINE OVERLAY =================

function openTitleModal() {
  loadTitleConfigToInputs();
  renderTitleModalPreview();
  openModal('titleModal');
}

function loadTitleConfigToInputs() {
  const cfg = appState.titleConfig || {};
  const chk = document.getElementById('chkEnableTitle');
  const inText = document.getElementById('inputTitleText');
  const selFont = document.getElementById('selectTitleFont');
  const sliderSize = document.getElementById('sliderTitleSize');
  const lblSize = document.getElementById('lblTitleSizeVal');
  const inColor = document.getElementById('inputTitleColor');
  const sliderStroke = document.getElementById('sliderTitleStroke');
  const lblStroke = document.getElementById('lblTitleStrokeVal');
  const inStrokeColor = document.getElementById('inputTitleStrokeColor');
  const sliderPosY = document.getElementById('sliderTitlePosY');
  const lblPosY = document.getElementById('lblTitlePosYVal');

  if (chk) chk.checked = !!cfg.enabled;
  if (inText) inText.value = cfg.text || '';
  if (selFont) selFont.value = cfg.fontFamily || 'Moul';
  if (sliderSize) sliderSize.value = cfg.fontSize || 36;
  if (lblSize) lblSize.textContent = (cfg.fontSize || 36) + 'px';
  if (inColor) inColor.value = cfg.color || '#FACC15';
  if (sliderStroke) sliderStroke.value = cfg.strokeWidth !== undefined ? cfg.strokeWidth : 4;
  if (lblStroke) lblStroke.textContent = (cfg.strokeWidth !== undefined ? cfg.strokeWidth : 4) + 'px';
  if (inStrokeColor) inStrokeColor.value = cfg.strokeColor || '#000000';
  if (sliderPosY) sliderPosY.value = cfg.positionY || 8;
  if (lblPosY) lblPosY.textContent = (cfg.positionY || 8) + '%';

  highlightActiveRibbonButton(cfg.bgStyle || 'none');
}

function highlightActiveRibbonButton(style) {
  const btnMap = {
    'none': document.getElementById('btnRibbonNone'),
    'dark_50': document.getElementById('btnRibbonDark50'),
    'dark_85': document.getElementById('btnRibbonDark85'),
    'red_ribbon': document.getElementById('btnRibbonRed'),
    'blue_ribbon': document.getElementById('btnRibbonBlue'),
    'gold_ribbon': document.getElementById('btnRibbonGold')
  };
  Object.keys(btnMap).forEach(k => {
    const b = btnMap[k];
    if (b) {
      if (k === style) b.className = 'pill-btn primary';
      else b.className = 'pill-btn';
    }
  });
}

function onTitleToggleChange(checked) {
  appState.titleConfig.enabled = !!checked;
  onTitleConfigChanged();
}

function setTitleQuickColor(hex) {
  const inColor = document.getElementById('inputTitleColor');
  if (inColor) inColor.value = hex;
  appState.titleConfig.color = hex;
  onTitleConfigChanged();
}

function setTitleRibbonStyle(style) {
  appState.titleConfig.bgStyle = style;
  highlightActiveRibbonButton(style);
  onTitleConfigChanged();
}

function setTitleQuickPos(y) {
  const sliderPosY = document.getElementById('sliderTitlePosY');
  const lblPosY = document.getElementById('lblTitlePosYVal');
  if (sliderPosY) sliderPosY.value = y;
  if (lblPosY) lblPosY.textContent = y + '%';
  appState.titleConfig.positionY = y;
  onTitleConfigChanged();
}

let _titleDebounceTimer = null;
function onTitleConfigChanged() {
  const chk = document.getElementById('chkEnableTitle');
  const inText = document.getElementById('inputTitleText');
  const selFont = document.getElementById('selectTitleFont');
  const sliderSize = document.getElementById('sliderTitleSize');
  const lblSize = document.getElementById('lblTitleSizeVal');
  const inColor = document.getElementById('inputTitleColor');
  const sliderStroke = document.getElementById('sliderTitleStroke');
  const lblStroke = document.getElementById('lblTitleStrokeVal');
  const inStrokeColor = document.getElementById('inputTitleStrokeColor');
  const sliderPosY = document.getElementById('sliderTitlePosY');
  const lblPosY = document.getElementById('lblTitlePosYVal');

  appState.titleConfig = {
    enabled: chk ? chk.checked : true,
    text: inText ? inText.value.trim() : '',
    fontFamily: selFont ? selFont.value : 'Moul',
    fontSize: sliderSize ? parseInt(sliderSize.value) : 36,
    color: inColor ? inColor.value : '#FACC15',
    strokeColor: inStrokeColor ? inStrokeColor.value : '#000000',
    strokeWidth: sliderStroke ? parseInt(sliderStroke.value) : 4,
    shadowColor: 'rgba(0,0,0,0.85)',
    bgStyle: appState.titleConfig.bgStyle || 'none',
    positionY: sliderPosY ? parseInt(sliderPosY.value) : 8,
    align: 'center'
  };

  if (lblSize) lblSize.textContent = appState.titleConfig.fontSize + 'px';
  if (lblStroke) lblStroke.textContent = appState.titleConfig.strokeWidth + 'px';
  if (lblPosY) lblPosY.textContent = appState.titleConfig.positionY + '%';

  renderTitleModalPreview();
  applyTitleOverlayToVideo();
  updateTitleBadges();

  if (_titleDebounceTimer) clearTimeout(_titleDebounceTimer);
  _titleDebounceTimer = setTimeout(() => {
    generateAndUploadTitleCanvasOverlay();
  }, 400);
}

function renderTitleModalPreview() {
  const box = document.getElementById('titleModalPreviewBox');
  if (!box) return;
  const cfg = appState.titleConfig || {};
  const txt = cfg.text || 'រឿង៖ មហាសេដ្ឋីលាក់មុខ [ភាគទី ០១]';
  box.textContent = txt;
  box.style.fontFamily = `"${cfg.fontFamily || 'Moul'}", "Khmer OS Muol Light", sans-serif`;
  box.style.color = cfg.color || '#FACC15';
  box.style.fontSize = `${Math.min(32, Math.max(16, (cfg.fontSize || 36) * 0.75))}px`;

  // Stroke
  const sw = cfg.strokeWidth || 0;
  const sc = cfg.strokeColor || '#000000';
  if (sw > 0) {
    box.style.webkitTextStroke = `${sw}px ${sc}`;
    box.style.textShadow = `0 2px 8px rgba(0,0,0,0.8), 0 0 ${sw*2}px ${sc}`;
  } else {
    box.style.webkitTextStroke = 'none';
    box.style.textShadow = '0 2px 8px rgba(0,0,0,0.8)';
  }

  // Ribbon banner preview
  applyRibbonStyleToElement(box, cfg.bgStyle || 'none');
}

function applyRibbonStyleToElement(el, bgStyle) {
  el.style.borderRadius = '8px';
  el.style.padding = '4px 14px';
  if (bgStyle === 'dark_50') {
    el.style.background = 'rgba(0, 0, 0, 0.55)';
    el.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    el.style.backdropFilter = 'blur(6px)';
  } else if (bgStyle === 'dark_85') {
    el.style.background = 'rgba(0, 0, 0, 0.88)';
    el.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    el.style.backdropFilter = 'blur(8px)';
  } else if (bgStyle === 'red_ribbon') {
    el.style.background = 'linear-gradient(135deg, rgba(185, 28, 28, 0.95), rgba(220, 38, 38, 0.95))';
    el.style.border = '1px solid #f87171';
    el.style.boxShadow = '0 4px 14px rgba(220, 38, 38, 0.5)';
  } else if (bgStyle === 'blue_ribbon') {
    el.style.background = 'linear-gradient(135deg, rgba(29, 78, 216, 0.95), rgba(37, 99, 235, 0.95))';
    el.style.border = '1px solid #60a5fa';
    el.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.5)';
  } else if (bgStyle === 'gold_ribbon') {
    el.style.background = 'linear-gradient(135deg, rgba(217, 119, 6, 0.95), rgba(245, 158, 11, 0.95))';
    el.style.border = '1px solid #fde047';
    el.style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.5)';
  } else {
    el.style.background = 'transparent';
    el.style.border = 'none';
    el.style.backdropFilter = 'none';
    el.style.boxShadow = 'none';
  }
}

function applyTitleOverlayToVideo() {
  const overlay = document.getElementById('videoTitleOverlay');
  const span = document.getElementById('videoTitleTextSpan');
  if (!overlay || !span) return;

  const cfg = appState.titleConfig || {};
  if (!cfg.enabled || !cfg.text) {
    overlay.style.display = 'none';
    span.textContent = '';
    return;
  }

  overlay.style.display = 'block';
  overlay.style.top = `${cfg.positionY || 8}%`;

  span.textContent = cfg.text;
  span.style.fontFamily = `"${cfg.fontFamily || 'Moul'}", "Khmer OS Muol Light", sans-serif`;
  span.style.color = cfg.color || '#FACC15';

  // Responsive font size scaling
  const video = document.getElementById('mainVideo');
  const vHeight = video ? (video.clientHeight || 280) : 280;
  const scaleRatio = vHeight / 480;
  const scaledSize = Math.max(13, Math.round((cfg.fontSize || 36) * scaleRatio));
  span.style.fontSize = `${scaledSize}px`;

  const sw = cfg.strokeWidth || 0;
  const sc = cfg.strokeColor || '#000000';
  if (sw > 0) {
    const scaledStroke = Math.max(1, Math.round(sw * scaleRatio));
    span.style.webkitTextStroke = `${scaledStroke}px ${sc}`;
    span.style.textShadow = `0 2px 8px rgba(0,0,0,0.85), 0 0 ${scaledStroke * 2}px ${sc}`;
  } else {
    span.style.webkitTextStroke = 'none';
    span.style.textShadow = '0 2px 8px rgba(0,0,0,0.85)';
  }

  applyRibbonStyleToElement(span, cfg.bgStyle || 'none');
}

function updateTitleBadges() {
  const badgeInfo = document.getElementById('titleBadgeInfo');
  const pillBadge = document.getElementById('titlePillBadge');
  const cfg = appState.titleConfig || {};
  const has = !!(cfg.enabled && cfg.text);

  if (badgeInfo) badgeInfo.style.display = has ? 'inline-flex' : 'none';
  if (pillBadge) pillBadge.style.display = has ? 'inline-block' : 'none';
}

function updateTitleUI() {
  loadTitleConfigToInputs();
  applyTitleOverlayToVideo();
  updateTitleBadges();
}

async function generateAndUploadTitleCanvasOverlay() {
  const cfg = appState.titleConfig || {};
  if (!cfg.enabled || !cfg.text) {
    try {
      await fetch('/api/delete_title_overlay', { method: 'DELETE' });
    } catch (e) {}
    return;
  }

  // 1. Determine target resolution (matching full video or 1920x1080)
  const video = document.getElementById('mainVideo');
  const tw = (video && video.videoWidth) ? video.videoWidth : 1920;
  const th = (video && video.videoHeight) ? video.videoHeight : 1080;

  // 2. Offscreen Canvas for pixel-perfect font rendering
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, tw, th);

  // Scaled font size relative to video height
  const baseScale = th / 720;
  const fontSizePx = Math.round((cfg.fontSize || 36) * baseScale * 1.5);
  const fontFamily = cfg.fontFamily || 'Moul';

  ctx.font = `bold ${fontSizePx}px "${fontFamily}", "Khmer OS Muol Light", "Khmer OS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textY = Math.round(th * ((cfg.positionY || 8) / 100)) + Math.round(fontSizePx / 2);
  const textX = Math.round(tw / 2);

  const textMetrics = ctx.measureText(cfg.text);
  const textW = textMetrics.width;
  const textH = fontSizePx * 1.25;

  // 3. Draw Background Ribbon if enabled
  const bgStyle = cfg.bgStyle || 'none';
  if (bgStyle !== 'none') {
    const padX = Math.round(fontSizePx * 0.7);
    const padY = Math.round(fontSizePx * 0.28);
    const boxX = textX - textW / 2 - padX;
    const boxY = textY - textH / 2 - padY;
    const boxW = textW + padX * 2;
    const boxH = textH + padY * 2;
    const rad = Math.round(fontSizePx * 0.25);

    ctx.save();
    if (bgStyle === 'dark_50') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    } else if (bgStyle === 'dark_85') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    } else if (bgStyle === 'red_ribbon') {
      const grad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      grad.addColorStop(0, '#b91c1c');
      grad.addColorStop(1, '#dc2626');
      ctx.fillStyle = grad;
    } else if (bgStyle === 'blue_ribbon') {
      const grad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      grad.addColorStop(0, '#1d4ed8');
      grad.addColorStop(1, '#2563eb');
      ctx.fillStyle = grad;
    } else if (bgStyle === 'gold_ribbon') {
      const grad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      grad.addColorStop(0, '#d97706');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
    }

    // Rounded rectangle
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, rad);
    ctx.fill();
    ctx.restore();
  }

  // 4. Draw Stroke
  const strokeW = Math.round((cfg.strokeWidth || 4) * baseScale * 1.5);
  if (strokeW > 0) {
    ctx.save();
    ctx.strokeStyle = cfg.strokeColor || '#000000';
    ctx.lineWidth = strokeW;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(cfg.text, textX, textY);
    ctx.restore();
  }

  // 5. Draw Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = Math.round(8 * baseScale);
  ctx.shadowOffsetY = Math.round(3 * baseScale);

  // 6. Draw Text Fill
  ctx.fillStyle = cfg.color || '#FACC15';
  ctx.fillText(cfg.text, textX, textY);
  ctx.restore();

  // 7. Export PNG DataURL and upload to server
  const dataUrl = canvas.toDataURL('image/png');
  try {
    await fetch('/api/upload_title_overlay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_data: dataUrl })
    });
    await fetch('/api/set_title_config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appState.titleConfig)
    });
  } catch (e) {
    console.warn('Title upload warning:', e);
  }
}

async function deleteTitleOverlay() {
  if (!confirm('តើអ្នកពិតជាចង់លុបចំណងជើងនេះចេញមែនទេ?')) return;
  try {
    await fetch('/api/delete_title_overlay', { method: 'DELETE' });
    appState.titleConfig.enabled = false;
    appState.titleConfig.text = '';
    const inText = document.getElementById('inputTitleText');
    if (inText) inText.value = '';
    applyTitleOverlayToVideo();
    renderTitleModalPreview();
    updateTitleBadges();
    closeModal('titleModal');
    if (typeof showToast === 'function') {
      showToast('🗑️ បានលុបចំណងជើងរួចរាល់', 'info');
    }
  } catch (err) {
    alert('កំហុសលុបចំណងជើង៖ ' + err);
  }
}

const MASTER_AI_DUB_PROMPT = `ចាប់ពីពេលនេះតទៅ សូមអ្នកដើរតួជា អ្នកបកប្រែខ្សែភាពយន្តនិងរឿងភាគអាជីព (Expert Subtitler & Dubbing Translator)។ ភារកិច្ចចម្បងរបស់អ្នកគឺទាញយកសំឡេងសន្ទនាពីវីដេអូដែលខ្ញុំបានភ្ជាប់ ឬបកប្រែរាល់អត្ថបទដែលខ្ញុំផ្តល់ឲ្យ មកជាភាសាខ្មែរឲ្យបានស្តង់ដារបំផុត ដោយផ្តោតសំខាន់លើ'ភាសានិយាយ' ដែលរលូន ស៊ីអារម្មណ៍ និងត្រូវសំឡេងតួអង្គ ១០០%។

សូមអនុវត្តតាមច្បាប់ទាំង ៤ នេះយ៉ាងតឹងរ៉ឹងបំផុត៖

1. ភាសានិយាយធម្មជាតិ (Natural Spoken Language): ហាមដាច់ខាតការបកប្រែតាមបែបសរសេរស្ងួតៗ (Word-for-word)។ ត្រូវប្រើប្រាស់ពាក្យពេចន៍ដែលប្រជាជនខ្មែរនិយមនិយាយប្រចាំថ្ងៃ។ សូមប្រើកន្ទុយពាក្យបញ្ជាក់អារម្មណ៍ (ឧទាហរណ៍៖ ណា, ណ៎, ហ្មង, តើ, អញ្ចឹង, វើយ, ហាស, ចា៎, ចុះ) ឲ្យសក្ដិសមនឹងបរិបទសន្ទនា។

2. វិភាគតួអង្គ និងបែងចែកស្លាកសំឡេងឱ្យត្រូវ ១០០% (Accurate Character & Voice Classification):
ត្រូវពិនិត្យរូបភាពវីដេអូជាក់ស្តែង (Visual Keyframes) រួមជាមួយសំឡេងនិយាយ ដើម្បីបែងចែកតួអង្គ និងដាក់ស្លាកនៅដើមបន្ទាត់នីមួយៗឱ្យបានត្រឹមត្រូវបំផុត៖
- [សំឡេងប្រុស] : បុរសពេញវ័យ (យុវជន, កម្លោះ, មនុស្សប្រុសវ័យធ្វើការ អាយុ ១៨-៥៩ ឆ្នាំ)
- [សំឡេងស្រី] : នារីពេញវ័យ (យុវតី, នារីក្រមុំ, ស្ត្រីវ័យធ្វើការ អាយុ ១៨-៥៩ ឆ្នាំ)
- [សំឡេងតាចាស់] : មនុស្សចាស់ប្រុស (លោកតា, ឪពុកចាស់, សក់ស្កូវ/ស ឬមានស្នាមជ្រីវជ្រួញ អាយុ ៦០ ឆ្នាំឡើងទៅ)
- [សំឡេងយាយចាស់] : មនុស្សចាស់ស្រី (លោកយាយ, ម្ដាយចាស់, សក់ស្កូវ/ស ឬមានស្នាមជ្រីវជ្រួញ អាយុ ៦០ ឆ្នាំឡើងទៅ)
- [សំឡេងក្មេងប្រុស] : កុមារា/កូនប្រុសតូច (អាយុក្រោម ១៥ ឆ្នាំ សំឡេងកូនក្មេងស្រួយស្រាល)
- [សំឡេងក្មេងស្រី] : កុមារី/កូនស្រីតូច (អាយុក្រោម ១៥ ឆ្នាំ សំឡេងកូនក្មេងស្រួយស្រាល)
- [សំឡេងគិតប្រុស] : ការគិតក្នុងចិត្តរបស់តួអង្គប្រុស (មាត់មិនកម្រើក តែមានសំឡេងបន្លឺឡើង)
- [សំឡេងគិតស្រី] : ការគិតក្នុងចិត្តរបស់តួអង្គស្រី (មាត់មិនកម្រើក តែមានសំឡេងបន្លឺឡើង)
- [សំឡេងអ្នកសម្រាយរឿង] : សំឡេងអ្នកនិទាន/សម្រាយរឿងប្រុស (ពេលគ្មានតួអង្គណាកំពុងនិយាយលើកញ្ចក់វីដេអូ)
- [សំឡេងអ្នកសម្រាយស្រី] : សំឡេងអ្នកនិទាន/សម្រាយរឿងស្រី (ពេលគ្មានតួអង្គណាកំពុងនិយាយលើកញ្ចក់វីដេអូ)
⚠️ ហាមដាច់ខាតច្រឡំមនុស្សចាស់ ឬកុមារតូច ទៅជាមនុស្សពេញវ័យធម្មតា! ត្រូវពិនិត្យមើលរូបរាង មុខមាត់ សក់ និងវ័យរបស់តួអង្គក្នុងវីដេអូឱ្យច្បាស់លាស់។ តួអង្គនីមួយៗត្រូវរក្សាស្លាកសំឡេងដដែលជាប់លាប់រហូត ហាមប្តូរសំឡេងធំតូចចុះឡើង។

3. បញ្ចេញមនោសញ្ចេតនា (Emotional Depth): អានការបកប្រែរួច ត្រូវតែមានអារម្មណ៍ (ខឹង, សើច, យំ, ផ្អែមល្ហែម, ចំអក, ភ័យស្លន់ស្លោ) ដូចទៅនឹងអត្ថបទដើម។ បើអត្ថបទដើមមានន័យបង្កប់ ឬការលេងពាក្យ ត្រូវបត់បែនពាក្យខ្មែរឲ្យចេញន័យនោះដោយរលូន។

៤. ទម្រង់លទ្ធផល និង ថេរវេលា (Output Format & Timing): រាល់លទ្ធផលនៃការបកប្រែទាំងអស់ សូមផ្តល់ឲ្យខ្ញុំជាទម្រង់ហ្វាល SRT ដោយដាក់វានៅក្នុង Code Block (\`\`\`srt ... \`\`\`)។ ថេរវេលា Start --> End ត្រូវតែស៊ីគ្នាជាក់លាក់ទៅនឹងពេលតួអង្គកំពុងនិយាយ និងឈប់និយាយ (ចលនាមាត់) ហាមបកប្រែត្រួតលើពេលស្ងាត់ដែលតួអង្គមិនបាននិយាយ។
ត្រូវដាក់ស្លាកសំឡេងតួអង្គ [សំឡេង...] នៅដើមបន្ទាត់នីមួយៗជាដាច់ខាត (ឧទាហរណ៍៖ [សំឡេងតាចាស់] ឯងឆាប់ចេញពីផ្ទះខ្ញុំភ្លាមទៅ!)។

៥. ហាមកាត់ផ្ដាច់ប្រយោគ ឬបកប្រែពាក់កណ្ដាលប្រយោគជាដាច់ខាត (Translate Full & Complete Sentences - Zero Truncation):
រាល់ប្រយោគដែលតួអង្គនិយាយ ត្រូវតែបកប្រែឱ្យចប់ចុងចប់ដើមពេញលេញ ១០០% ដោយមិនត្រូវកាត់ចោលកន្ទុយប្រយោគ មិនត្រូវកាត់ពាក្យចុងក្រោយ ឬសង្ខេបឡើយ។ រាល់កន្ទុយពាក្យ (ណា, ទេ, ចាស, បាទ, ដែរ, ហ្នឹង, អញ្ចឹង, ទៅ, មក) ត្រូវតែរក្សាទុកឱ្យពេញលេញទាំងអស់។ ហាមទុកប្រយោគកំបុតដាច់ខាត!`;

function copyMasterAiDubPrompt() {
  const btn = document.getElementById('btnCopyMasterPrompt');
  function onDone() {
    if (typeof showToast === 'function') {
      showToast('✅ បានចម្លង Master AI Prompt រួចរាល់!', 'success');
    }
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '✅ បានចម្លងរួចរាល់ (Copied)!';
      setTimeout(() => { btn.innerHTML = orig; }, 2500);
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(MASTER_AI_DUB_PROMPT).then(onDone).catch(() => {
      fallbackCopyText(MASTER_AI_DUB_PROMPT, onDone);
    });
  } else {
    fallbackCopyText(MASTER_AI_DUB_PROMPT, onDone);
  }
}

function fallbackCopyText(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (cb) cb();
  } catch (e) {
    prompt('សូមចម្លង Prompt នេះ:', text);
  }
  document.body.removeChild(ta);
}





