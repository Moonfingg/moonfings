// ---------- Audio (Web Audio, no files needed) ----------
let ctx, master, on = true, waveNode;
const $ = s => document.querySelector(s);
function initAudio() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
}
function tone(f, d = .25, type = 'sine', v = .2, at = 0, to = null) {
  if (!ctx || !on) return;
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02);
  g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05);
}
function noise(d, f0, f1, v = .25, at = 0) {
  if (!ctx || !on) return;
  const t = ctx.currentTime + at, n = ctx.sampleRate * d, b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0);
  for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = b;
  const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 1.2;
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d * .4); g.gain.linearRampToValueAtTime(0, t + d);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t);
}
function startWaves() { // soft looping sea
  if (!ctx || waveNode) return;
  const n = ctx.sampleRate * 4, b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0);
  let l = 0; for (let i = 0; i < n; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; x[i] = l * 3.5; }
  const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 500;
  const g = ctx.createGain(); g.gain.value = .35;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .15; lg.gain.value = .2;
  lfo.connect(lg); lg.connect(g.gain); lfo.start();
  s.connect(fl); fl.connect(g); g.connect(master); s.start(); waveNode = g;
}
const SCALE = [392, 440, 523, 587, 659, 784, 880, 1046];
const ping = i => { tone(SCALE[i % 8], .5, 'triangle', .18); tone(SCALE[i % 8] * 2, .3, 'sine', .07, .05); };

$('#snd').onclick = () => {
  on = !on; $('#snd').textContent = on ? '🔊' : '🔇';
  if (master) master.gain.value = on ? .5 : 0;
};

// ---------- Intro ----------
const title = 'UNITED KINGDOM';
$('#ititle').innerHTML = [...title].map((c, i) => `<i style="animation-delay:${i * .08 + .3}s">${c === ' ' ? '&nbsp;' : c}</i>`).join('');
$('#ititle').style.visibility = 'hidden';

// starfield canvas
const cv = $('#fx'), g2 = cv.getContext('2d'); let stars = [], speed = .4;
function fit() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener('resize', fit); fit();
for (let i = 0; i < 160; i++) stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });
(function loop() {
  if ($('#intro').classList.contains('done')) return;
  g2.fillStyle = 'rgba(5,8,19,.35)'; g2.fillRect(0, 0, cv.width, cv.height);
  stars.forEach(s => {
    s.z -= speed * .01; if (s.z <= .02) { s.z = 1; s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; }
    const px = cv.width / 2 + s.x / s.z * cv.width * .15, py = cv.height / 2 + s.y / s.z * cv.height * .15;
    g2.fillStyle = Math.random() < .1 ? '#e63950' : '#cfe0ff';
    g2.fillRect(px, py, 2 * (1 - s.z) + .5, 2 * (1 - s.z) + .5);
  });
  requestAnimationFrame(loop);
})();

$('#enter').onclick = () => {
  initAudio();
  $('#intro').classList.add('go'); $('#ititle').style.visibility = 'visible'; speed = 6;
  noise(1.6, 200, 4000, .35);                 // whoosh
  tone(60, 1.2, 'sawtooth', .2, 0, 30);       // bass drop
  [...title].forEach((c, i) => c !== ' ' && tone(SCALE[i % 8], .18, 'square', .06, .3 + i * .08));
  setTimeout(() => { speed = .4; tone(1046, 1.2, 'sine', .15); tone(1568, 1.2, 'sine', .1, .1); }, 1700);
  setTimeout(() => { $('#intro').classList.add('done'); startMap(); }, 3200);
};

// ---------- Map ----------
const ALL = UK.gb.concat(UK.ni), la0 = 54.5, kx = Math.cos(la0 * Math.PI / 180), S = 62, PAD = 30;
const minLon = Math.min(...ALL.map(p => p[0])), maxLat = Math.max(...ALL.map(p => p[1])),
  minLat = Math.min(...ALL.map(p => p[1])), maxLon = Math.max(...ALL.map(p => p[0]));
const prj = (lo, la) => [(lo - minLon) * kx * S + PAD, (maxLat - la) * S + PAD];
const W = (maxLon - minLon) * kx * S + PAD * 2 + 60, H = (maxLat - minLat) * S + PAD * 2;
const path = pts => 'M' + pts.map(p => prj(p[0], p[1]).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
const dGB = path(UK.gb), dNI = path(UK.ni);
const seas = [['Atlantic Ocean', -8.4, 52.0], ['North Sea', 1.0, 55.4], ['English Channel', -2.2, 49.75], ['Irish Sea', -5.2, 53.7]];
$('#mapwrap').innerHTML = `<svg viewBox="0 0 ${W} ${H}">
  <path class="glow" d="${dGB} ${dNI}" stroke-width="14"/><path class="glow g2" d="${dGB} ${dNI}" stroke-width="26"/>
  <path class="land" id="gb" d="${dGB}"/><path class="land" id="ni" d="${dNI}"/>
  ${seas.map(s => { const [x, y] = prj(s[1], s[2]); return `<text class="sea" x="${x}" y="${y}">${s[0]}</text>`; }).join('')}
  ${UK.cities.map((c, i) => { const [x, y] = prj(c.lon, c.lat); return `<g class="city" data-i="${i}"><circle class="pulse" cx="${x}" cy="${y}" r="5"/><circle cx="${x}" cy="${y}" r="6"/><text x="${x + 11}" y="${y + 4}">${c.n}</text></g>`; }).join('')}
</svg>`;
document.querySelectorAll('.land').forEach(p => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
document.querySelectorAll('.city').forEach(c => c.onclick = () => {
  const i = +c.dataset.i, p = c.querySelector('.pulse'); p.classList.remove('p'); void p.getBBox(); p.classList.add('p'); ping(i + 3);
});

function startMap() {
  startWaves();
  noise(3, 300, 1800, .15);                  // drawing sweep
  tone(220, 3, 'sine', .08, 0, 660);
  document.querySelectorAll('.land').forEach(p => {
    p.style.transition = 'stroke-dashoffset 3.2s ease-in-out, fill-opacity 1.4s 2.6s'; p.style.strokeDashoffset = 0; p.classList.add('fill');
  });
  setTimeout(() => document.querySelectorAll('.city').forEach((c, i) => setTimeout(() => { c.classList.add('show'); ping(i * 2); }, i * 450)), 3000);
  setTimeout(() => document.querySelectorAll('.sea').forEach((s, i) => setTimeout(() => { s.classList.add('show'); tone(300 + i * 60, .8, 'sine', .06); noise(.9, 400, 900, .08); }, i * 600)), 4200);
  reveal();
}

// ---------- Content ----------
$('#pos').innerHTML = UK.position.map(p => `<div class="card rv"><b>${p.k}</b>${p.t}</div>`).join('');
$('#nat').innerHTML = UK.nature.map(n => `<div class="row rv"><div class="c">${n.cause}</div><div class="ar">→</div><div class="e">${n.effect}<small>${n.num}</small></div></div>`).join('');

function reveal() {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target); e.target.classList.add('in');
    tone(700 + Math.random() * 300, .08, 'sine', .04);
    const b = e.target.querySelector('b[data-n]'); if (b) count(b);
  }), { threshold: .25 });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
}
function count(b) {
  const to = +b.dataset.n, t0 = performance.now();
  (function f(t) { const k = Math.min(1, (t - t0) / 1500); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(f); })(t0);
}
