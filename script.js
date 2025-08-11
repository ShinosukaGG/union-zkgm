/* =========================
   CONFIG
========================= */
const SUPABASE_URL   = 'https://bvvlqbtwqetltdcvioie.supabase.co';
const SUPABASE_APIKEY= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dmxxYnR3cWV0bHRkY3Zpb2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMjM4MzMsImV4cCI6MjA2OTU5OTgzM30.d-leDFpzc6uxDvq47_FC0Fqh0ztaL11Oozm-z6T9N_M';
const REST           = `${SUPABASE_URL}/rest/v1`;
const CACHE_VER      = 'v6';
const MAX_ZKGM       = 3000;
const TOP2000_URL    = './top_2000_from_network.json'; // Adjust path accordingly

/* =========================
   DOM
========================= */
const $ = s => document.querySelector(s);
const usernameInput       = $('#username');
const inputCard           = $('#input-box');
const resultCard          = $('#result-box');
const loadingBox          = $('#loading');
const countDisplay        = $('#count-display');
const descriptionDisplay  = $('#description');
const pfpImg              = $('#pfp');
const handleSpan          = $('#handle');
const chips               = $('#chips');
const toast               = $('#toast');
const tweetBtn            = $('#tweet-button');
const recountBtn          = $('#recount-button');
const confettiBtn         = $('#confetti-btn');
const muteToggle          = $('#mute-toggle');
const confettiCanvas      = $('#confetti-canvas');

/* =========================
   STATE
========================= */
let soundsMuted = true;

/* =========================
   HELPERS
========================= */
function showToast(msg){
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 2000);
}
function sanitizeHandle(raw){
  if(!raw) return '';
  const v = raw.trim();
  return (v.startsWith('@') ? v.slice(1) : v).toLowerCase();
}
function parseMS(val, table){
  if(val==null) return 0;
  if(typeof val === 'string') val = val.replace('%','').trim();
  let num = Number(String(val).replace(',','.'));
  if(Number.isNaN(num)) return 0;
  if(table === 'yaps_season_one' && num <= 1) num = num * 100;
  return num;
}
function seededJitter(username, min=60, max=220){
  let h = 2166136261 >>> 0;
  for (let i=0;i<username.length;i++){
    h ^= username.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return min + (h % (max - min + 1));
}
function confettiBurst(duration = 1200){
  if(!window.confetti) return;
  confettiCanvas.style.display = 'block';
  confettiCanvas.style.position = 'fixed';
  confettiCanvas.style.top = '0';
  confettiCanvas.style.left = '0';
  confettiCanvas.style.width = '100%';
  confettiCanvas.style.height = '100%';
  confettiCanvas.style.pointerEvents = 'none';
  confettiCanvas.style.zIndex = '999999';

  const myConfetti = confetti.create(confettiCanvas, { resize: true, useWorker: true });
  const end = Date.now() + duration;

  (function frame(){
    myConfetti({
      particleCount: 40,
      startVelocity: 30,
      spread: 90,
      ticks: 200,
      origin: { y: 0, x: Math.random() }
    });
    if(Date.now() < end) requestAnimationFrame(frame);
    else setTimeout(()=>{ confettiCanvas.style.display = 'none'; }, 100);
  })();
}
function animatePrimaryHover(e){
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left)/rect.width)*100;
  const y = ((e.clientY - rect.top)/rect.height)*100;
  e.currentTarget.style.setProperty('--x', `${x}%`);
  e.currentTarget.style.setProperty('--y', `${y}%`);
}

/* =========================
   LOADING
========================= */
function showLoading(){
  if(!loadingBox) return ()=>{};
  loadingBox.classList.remove('hidden');
  const hints = ['Scanning messages…','Indexing ZKGM traces…','Aggregating signals…','Finalizing your total…'];
  let i=0;
  const t = setInterval(()=>{
    let helper = loadingBox.querySelector('.line-shim.short');
    if(helper){ helper.textContent = hints[i%hints.length]; }
    i++;
  }, 800);
  return ()=>clearInterval(t);
}
function hideLoading(){ loadingBox && loadingBox.classList.add('hidden'); }

/* =========================
   TOP 2000 CHECK
========================= */
async function checkIfInTop2000(username) {
  try {
    const topRes = await fetch(TOP2000_URL);
    const topList = topRes.ok ? await topRes.json() : [];
    // Check if username is in the top_2000.json list
    const isInTop2000 = topList.some(item => item.username.toLowerCase() === username.toLowerCase());
    return isInTop2000;
  } catch(e) {
    console.error('Error loading top_2000_from_network.json', e);
    showToast('User Not Found');
    return false;
  }
}

/* =========================
   SUPABASE FETCH
========================= */
// Season 0: get mindshare + pfp (column) + fallback from jsonInput.pfp/avatar
async function fetchMindshareS0(username){
  const H = { 'apikey': SUPABASE_APIKEY, 'Authorization': `Bearer ${SUPABASE_APIKEY}` };
  let url = `${REST}/yaps_season_zero?select=username,jsonInput,pfp&username=eq.${encodeURIComponent(username)}`;
  let res = await fetch(url, { headers: H });
  let rows = res.ok ? await res.json() : [];
  if(!rows || rows.length === 0){
    url = `${REST}/yaps_season_zero?select=username,jsonInput,pfp&username=ilike.%25${encodeURIComponent(username)}%25`;
    res = await fetch(url, { headers: H });
    rows = res.ok ? await res.json() : [];
  }
  if(!rows || rows.length === 0) return { s0: 0, pfp: null };
  const found = rows.find(d => (d.username||'').toLowerCase() === username.toLowerCase()) || rows[0];
  let val = null, pfp = found?.pfp || null;
  if(found?.jsonInput){
    try{
      const j = typeof found.jsonInput === 'string' ? JSON.parse(found.jsonInput) : found.jsonInput;
      if(j?.mindshare != null) val = j.mindshare;
      if(!pfp && (j?.pfp || j?.avatar)) pfp = j.pfp || j.avatar;
    }catch{}
  }
  return { s0: parseMS(val, 'yaps_season_zero'), pfp: pfp || null };
}

// Season 1: mindshare + try to read pfp from jsonInput as a secondary source
async function fetchMindshareS1(username){
  const H = { 'apikey': SUPABASE_APIKEY, 'Authorization': `Bearer ${SUPABASE_APIKEY}` };
  let url = `${REST}/yaps_season_one?select=username,jsonInput&username=eq.${encodeURIComponent(username)}`;
  let res = await fetch(url, { headers: H });
  let rows = res.ok ? await res.json() : [];
  if(!rows || rows.length === 0){
    url = `${REST}/yaps_season_one?select=username,jsonInput&username=ilike.%25${encodeURIComponent(username)}%25`;
    res = await fetch(url, { headers: H });
    rows = res.ok ? await res.json() : [];
  }
  if(!rows || rows.length === 0) return { s1: 0.03, pfp: null };
  const found = rows.find(d => (d.username||'').toLowerCase() === username.toLowerCase()) || rows[0];
  let val = null, pfp = null;
  if(found?.jsonInput){
    try{
      const j = typeof found.jsonInput === 'string' ? JSON.parse(found.jsonInput) : found.jsonInput;
      if(j?.mindshare != null) val = j.mindshare;
      if(j?.pfp || j?.avatar) pfp = j.pfp || j.avatar;
    }catch{}
  }
  return { s1: parseMS(val ?? 0.03, 'yaps_season_one'), pfp: pfp || null };
}

// Wrapper: prefer S0.pfp, else S1.jsonInput.pfp/avatar, else Unavatar(X)
async function fetchMindshares(username){
  const [s0Obj, s1Obj] = await Promise.all([
    fetchMindshareS0(username),
    fetchMindshareS1(username)
  ]);
  const s0 = Number(s0Obj.s0)||0;
  const s1 = Number(s1Obj.s1)||0;
  const pfp = s0Obj.pfp || s1Obj.pfp || `https://unavatar.io/twitter/${encodeURIComponent(username)}`;
  return { s0, s1, pfp };
}

/* =========================
   CALCS
========================= */
function combineMindshare(s0, s1){
  if(s0 === 0 && s1 === 0) return 0;
  const onlyS0 = s0 > 0 && s1 === 0;
  return (onlyS0 ? (s0*2 + s1) : (s0 + s1)) / 1.7;
}
function computeZkgm(username, combinedPercent){
  if(combinedPercent <= 0) return 0;
  const percentile = Math.min(100, combinedPercent * 100);
  const p = percentile / 100;
  const pCurved = Math.pow(p, 0.8);
  let base = MAX_ZKGM * (0.20 + 0.80 * pCurved);
  const jitter = seededJitter(username, 60, 220);
  let x = Math.round(base + jitter);
  if(x > MAX_ZKGM) x = MAX_ZKGM;
  if(x < 0) x = 0;
  return x;
}

/* =========================
   UI
========================= */
function renderChips(s0, s1, combined){
  if(!chips) return;
  chips.innerHTML = '';
  const mk = (label) => {
    const el = document.createElement('span');
    el.className = 'chip';
    el.textContent = label;
    return el;
  };
  if(s0>0) chips.appendChild(mk(`S0 ${Number(s0).toFixed(2)}%`));
  if(s1>0) chips.appendChild(mk(`S1 ${Number(s1).toFixed(3)}%`));
  chips.appendChild(mk(`Total ${(combined).toFixed(2)}%`));
}
function showResult(username, count, s0, s1, combined, pfp){
  if(pfpImg) pfpImg.src = pfp;
  if(handleSpan) handleSpan.textContent = '@' + username;
  const target = Math.max(0, Math.floor(count));
  const start = 0, dur = 1000, t0 = performance.now();
  function easeOutQuad(t){ return t*(2-t); }
  function step(now){
    const p = Math.min(1, (now - t0)/dur);
    const val = Math.floor(start + (target - start)*easeOutQuad(p));
    countDisplay.textContent = `ZKGM ${val.toLocaleString()}`;
    if(p < 1) requestAnimationFrame(step);
    else countDisplay.textContent = `ZKGM ${target.toLocaleString()}`;
  }
  requestAnimationFrame(step);
  const nextTarget = Math.ceil(target/100)*100;
  descriptionDisplay.textContent = target === 0
    ? 'No ZKGM detected yet.'
    : `You Are a True Union Maxi! Keep Preaching Union.\n\nNext target: ${nextTarget.toLocaleString()}`;
  renderChips(s0, s1, combined);
  inputCard.classList.add('hidden');
  resultCard.classList.remove('hidden');
  if(target > 0) confettiBurst(1200);
  const tweetText =
`I have said the word ZKGM ${target.toLocaleString()} times 🤯
Can anyone beat me?

Check yours: union-zkgm.vercel.app

Lets Hit 1M+ ZKGM this Month

#twit`;
  tweetBtn.onclick = ()=> window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
    '_blank'
  );
  recountBtn.onclick = ()=>{
    resultCard.classList.add('hidden');
    inputCard.classList.remove('hidden');
  };
}

/* =========================
   CONTROLLER with TOP 2000 check
========================= */
async function handleCount(){
  const raw = usernameInput?.value || '';
  const username = sanitizeHandle(raw);
  if(!username){ showToast('Enter a username'); return; }

  // 🔹 New: Check if username in top_2000_from_network.json
  try {
    const topRes = await fetch(TOP2000_URL);
    const topList = topRes.ok ? await topRes.json() : [];
    // Check if username is in the top_2000.json list
    const isInTop2000 = topList.some(item => item.username.toLowerCase() === username.toLowerCase());
    if (!isInTop2000) {
      showToast('Not found in network');
      return;
    }
  } catch(e) {
    console.error('Error loading top_2000_from_network.json', e);
    showToast('Network check failed');
    return;
  }

  const cacheKey = `zkgm_${CACHE_VER}_${username}`;
  const cached = localStorage.getItem(cacheKey);
  if(cached){
    const { count, s0, s1, combined, pfp } = JSON.parse(cached);

    // exceptions override (display + cache path)
    const uname = username.toLowerCase();
    let viewCount = count;
    if (uname === 'corcoder') viewCount = 1679;
    else if (uname === '0xkaiserkarel') viewCount = 2809;

    const stop = showLoading();
    setTimeout(()=>{
      stop && stop();
      hideLoading();
      showResult(username, viewCount, s0, s1, combined, pfp);
    }, 4000);
    return;
  }

  try{
    const stop = showLoading();
    const { s0, s1, pfp } = await fetchMindshares(username);
    const combined = combineMindshare(s0, s1);
    let computed = computeZkgm(username, combined);
    const uname = username.toLowerCase();
    if (uname === 'corcoder') computed = 1679;
    else if (uname === '0xkaiserkarel') computed = 2809;
    localStorage.setItem(cacheKey, JSON.stringify({ count: computed, s0, s1, combined, pfp }));
    setTimeout(()=>{
      stop && stop();
      hideLoading();
      showResult(username, computed, s0, s1, combined, pfp);
    }, 4000);
  }catch(e){
    console.error('[ZKGM] Error:', e);
    hideLoading();
    showToast('Error fetching data. Try again.');
  }
}

/* =========================
   EVENTS
========================= */
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.btn.primary').forEach(btn=>{
    btn.addEventListener('mousemove', animatePrimaryHover);
  });
  $('#count-btn')?.addEventListener('click', handleCount);
  usernameInput?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') handleCount();
  });
  confettiBtn?.addEventListener('click', ()=> confettiBurst(900));
  if(muteToggle){
    const saved = localStorage.getItem('zkgm_mute') === '1';
    soundsMuted = saved;
    muteToggle.setAttribute('aria-pressed', soundsMuted ? 'true' : 'false');
    muteToggle.textContent = soundsMuted ? '🔇' : '🔊';
    muteToggle.addEventListener('click', ()=>{
      soundsMuted = !soundsMuted;
      localStorage.setItem('zkgm_mute', soundsMuted ? '1':'0');
      muteToggle.setAttribute('aria-pressed', soundsMuted ? 'true' : 'false');
      muteToggle.textContent = soundsMuted ? '🔇' : '🔊';
    });
  }
});
