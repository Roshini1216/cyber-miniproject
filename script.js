const CONTROLS = [
 {id:'enc', d:'c', t:'Data is encrypted (at rest and in transit)', r:'Enable AES-256 encryption for stored data and HTTPS/TLS for data in transit.'},
 {id:'mfa', d:'c', t:'Multi-factor authentication is used', r:'Turn on multi-factor authentication for all user and admin accounts.'},
 {id:'rbac', d:'c', t:'Role-based access control is enforced', r:'Apply least-privilege access with role-based permissions.'},
 {id:'pol', d:'c', t:'Strong password policy is enforced', r:'Enforce minimum length, complexity and periodic password checks.'},
 {id:'hash', d:'i', t:'Hashing or digital signatures verify data', r:'Use SHA-256 hashes or digital signatures to detect tampering.'},
 {id:'log', d:'i', t:'Audit logs are kept and reviewed', r:'Enable tamper-resistant audit logging and review logs regularly.'},
 {id:'val', d:'i', t:'Input validation is implemented', r:'Validate and sanitize all inputs to block SQL injection and XSS.'},
 {id:'bak', d:'a', t:'Regular backups are taken and tested', r:'Schedule automatic backups (3-2-1 rule) and test restoring them.'},
 {id:'red', d:'a', t:'Redundancy / failover is available', r:'Add redundant servers or failover so one failure does not stop service.'},
 {id:'ddos', d:'a', t:'DDoS / firewall protection is active', r:'Deploy a firewall, rate limiting and DDoS protection.'}
];
const NAMES = {c:'Confidentiality', i:'Integrity', a:'Availability'};
const COLORS = {c:'var(--c)', i:'var(--i)', a:'var(--a)'};
let assets = [];
let current = 0; // index of the asset currently selected
const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clamp = v => Math.min(5, Math.max(1, parseInt(v) || 1));

// tabs
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== b.dataset.tab);
});

// controls checklist
$('controls').innerHTML = ['c','i','a'].map(d =>
  `<div class="group ${d}"><h3>${NAMES[d]}</h3>` +
  CONTROLS.filter(x => x.d === d).map(x => `<label><input type="checkbox" id="k_${x.id}"> ${x.t}</label>`).join('') + '</div>'
).join('');

// assets table + asset selector
function drawAssets() {
  $('assetTable').tBodies[0].innerHTML = assets.length ? assets.map((a, n) =>
    `<tr><td>${esc(a.name)}</td><td>${a.c}</td><td>${a.i}</td><td>${a.a}</td><td><button class="ghost" onclick="del(${n})">Remove</button></td></tr>`).join('')
    : '<tr><td colspan="5" class="hint">No assets yet. Add one above or load the samples.</td></tr>';
  if (current >= assets.length) current = Math.max(0, assets.length - 1);
  $('assetSelect').innerHTML = assets.length
    ? assets.map((a, n) => `<option value="${n}">${esc(a.name)}</option>`).join('')
    : '<option>No assets yet</option>';
  $('assetSelect').value = current;
  $('results').hidden = true;
}
window.del = n => {
  assets.splice(n, 1);
  if (current >= n) current = Math.max(0, current - 1);
  drawAssets();
};
$('addAsset').onclick = () => {
  const name = $('aname').value.trim();
  if (!name) { $('aname').focus(); return; }
  assets.push({name, c: clamp($('ac').value), i: clamp($('ai').value), a: clamp($('aa').value)});
  current = assets.length - 1;
  $('aname').value = ''; drawAssets();
};
$('sample').onclick = () => {
  assets = [
    {name:'Student database', c:5, i:5, a:4},
    {name:'College website', c:2, i:4, a:5},
    {name:'Staff laptops', c:4, i:3, a:3}
  ]; current = 0; drawAssets();
};
$('assetSelect').onchange = e => { current = parseInt(e.target.value); $('results').hidden = true; };
$('prevAsset').onclick = () => { if (assets.length) { current = (current - 1 + assets.length) % assets.length; drawAssets(); } };
$('nextAsset').onclick = () => { if (assets.length) { current = (current + 1) % assets.length; drawAssets(); } };
drawAssets();

// risk engine
const level = r => r <= 5 ? 'Low' : r <= 10 ? 'Medium' : r <= 15 ? 'High' : 'Critical';
const lvlColor = l => ({Low:'var(--low)', Medium:'var(--med)', High:'var(--high)', Critical:'var(--crit)'}[l]);

function likelihood(d) {
  const list = CONTROLS.filter(x => x.d === d);
  const missing = list.filter(x => !$('k_' + x.id).checked).length;
  return 1 + 4 * missing / list.length;   // 1 (all controls) to 5 (none)
}

$('run').onclick = () => {
  if (!assets.length) { alert('Add at least one asset first.'); return; }
  const a = assets[current];
  const L = {c: likelihood('c'), i: likelihood('i'), a: likelihood('a')};
  const r = {c: a.c * L.c, i: a.i * L.i, a: a.a * L.a};
  const overall = (r.c + r.i + r.a) / 3;
  const lvl = level(overall);

  $('resultTitle').textContent = 'Result for: ' + a.name;
  $('overall').innerHTML = `<div class="ring" style="--p:${overall / 25 * 100};--col:${lvlColor(lvl)}"><span>${overall.toFixed(1)}</span></div>
    <div><span class="chip ${lvl}">${lvl} risk</span><p class="hint">Risk score out of 25 for this asset</p></div>`;
  $('bars').innerHTML = ['c','i','a'].map(d =>
    `<div class="bar"><b style="color:${COLORS[d]}">${NAMES[d]}</b>
     <div class="track"><div class="fill" style="width:${r[d] / 25 * 100}%;background:${COLORS[d]}"></div></div>
     <span>${r[d].toFixed(1)} (${level(r[d])})</span></div>`).join('');

  const missing = CONTROLS.filter(x => !$('k_' + x.id).checked);
  $('recs').innerHTML = missing.length
    ? missing.map(x => `<li><b style="color:${COLORS[x.d]}">${NAMES[x.d]}:</b> ${x.r}</li>`).join('')
    : '<li>All controls are in place. Keep reviewing them regularly.</li>';
  $('results').hidden = false;
  $('results').scrollIntoView({behavior: 'smooth'});
};
$('print').onclick = () => window.print();

// live check: password strength
$('pw').oninput = e => {
  const p = e.target.value;
  let s = 0;
  if (p.length >= 8) s++; if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  if (/password|1234|qwerty/i.test(p)) s = Math.min(s, 1);
  const L = [['Very weak','#B3261E'],['Weak','#B3261E'],['Fair','#D9622B'],['Good','#B58900'],['Strong','#2E7D4F'],['Very strong','#2E7D4F']][p ? s : 0];
  $('pwBar').style.width = (p ? Math.max(s, 1) / 5 * 100 : 0) + '%';
  $('pwBar').style.background = L[1];
  $('pwText').textContent = p ? `${L[0]}. Use 12+ characters with upper, lower, digits and symbols.` : '';
};

// live check: SHA-256 integrity
let currentHash = '';
async function sha256(file) {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function compare() {
  const old = $('oldHash').value.trim().toLowerCase();
  if (!old || !currentHash) { $('hashResult').textContent = ''; return; }
  $('hashResult').innerHTML = old === currentHash
    ? '<span class="ok">Integrity verified: file is unchanged.</span>'
    : '<span class="bad">Integrity violated: file has been modified.</span>';
}
$('file').onchange = async e => {
  if (!e.target.files[0]) return;
  currentHash = await sha256(e.target.files[0]);
  $('hash').textContent = currentHash; compare();
};
$('oldHash').oninput = compare;

// live check: availability
$('ping').onclick = async () => {
  const out = $('pingResult'); out.textContent = 'Checking...';
  const t = performance.now();
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 5000);
    await fetch($('url').value, {mode: 'no-cors', cache: 'no-store', signal: ctl.signal});
    const ms = Math.round(performance.now() - t);
    out.innerHTML = `<span class="ok">Available</span>: responded in ${ms} ms.`;
  } catch {
    out.innerHTML = '<span class="bad">Unavailable</span>: no response within 5 seconds.';
  }
};