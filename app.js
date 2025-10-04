/**********************
 * SETTINGS / PERSIST
 **********************/
const SETTINGS = {
  autoCopyKey: 'askjoe.autoCopy',
  invisibleKey: 'askjoe.invisible',
  toneKey: 'askjoe.tone'
};
const TONES = ['concise','professional','friendly','relatable','funny','strict','supportive'];

function load(k, d){ try{ const v = localStorage.getItem(k); return v===null? d : JSON.parse(v); }catch{ return d; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }

/**********************
 * ELEMENTS
 **********************/
const inputEl = document.getElementById('inputText');
const toneSelect = document.getElementById('tone'); // hidden, still used for API value

const indTone = document.getElementById('indTone');
const indRewrite = document.getElementById('indRewrite');
const indCopy = document.getElementById('indCopy');
const indInvisible = document.getElementById('indInvisible');
const indAutoCopy = document.getElementById('indAutoCopy');
const indLogout = document.getElementById('indLogout');

// Optional legacy buttons (ok to remove later)
const rewriteBtn = document.getElementById('rewriteBtn');
const logoutBtn = document.getElementById('logoutBtn');

/**********************
 * INIT DEFAULTS
 **********************/
// Tone defaults to concise
const storedTone = load(SETTINGS.toneKey, 'concise');
if (toneSelect) toneSelect.value = storedTone;
updateToneIndicator(storedTone);

// Invisible initial state
applyInvisible(!!load(SETTINGS.invisibleKey, false));

// Auto-copy initial state (default ON)
applyAutoCopy(!!load(SETTINGS.autoCopyKey, true));

/**********************
 * INDICATORS: handlers
 **********************/
function updateToneIndicator(tone){
  const letter = (tone || 'concise').charAt(0).toUpperCase();
  indTone.textContent = letter;
  // quick flash
  indTone.classList.add('active'); setTimeout(()=>indTone.classList.remove('active'), 200);
}
function cycleTone(){
  const current = toneSelect.value || 'concise';
  const idx = TONES.indexOf(current);
  const next = TONES[(idx+1) % TONES.length];
  toneSelect.value = next;
  save(SETTINGS.toneKey, next);
  updateToneIndicator(next);
}
indTone.addEventListener('click', cycleTone);

function applyInvisible(on){
  if (on) inputEl.classList.add('invisible'); else inputEl.classList.remove('invisible');
  save(SETTINGS.invisibleKey, !!on);
  indInvisible.classList.toggle('active', !!on);
}
indInvisible.addEventListener('click', ()=> applyInvisible(!inputEl.classList.contains('invisible')));

function applyAutoCopy(on){
  save(SETTINGS.autoCopyKey, !!on);
  indAutoCopy.classList.toggle('active', !!on);
}
indAutoCopy.addEventListener('click', ()=> applyAutoCopy(!indAutoCopy.classList.contains('active')));

indLogout.addEventListener('click', ()=> { localStorage.removeItem('authenticated'); window.location.href='login.html'; });

/**********************
 * REWRITE (uses /api/rewrite)
 * - Replaces textarea value
 * - Auto-copies if AC is active
 **********************/
async function rewriteText(){
  const text = inputEl.value;
  const tone = toneSelect.value || 'concise';

  if (!text.trim()){
    inputEl.placeholder = 'Type something to rewrite…';
    return;
  }

  // pulse R
  indRewrite.classList.add('active'); setTimeout(()=> indRewrite.classList.remove('active'), 200);

  try{
    const res = await fetch('/api/rewrite', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ text, tone })
    });

    let data = {};
    try { data = await res.json(); } catch {/* leave empty */}
    const rewritten = (data && typeof data.rewritten_text === 'string') ? data.rewritten_text : '';

    if (rewritten){
      inputEl.value = rewritten;

      if (indAutoCopy.classList.contains('active')){
        try{
          await navigator.clipboard.writeText(rewritten);
          indCopy.classList.add('active'); setTimeout(()=> indCopy.classList.remove('active'), 350);
        }catch{/* ignore clipboard errors */}
      }
    } else {
      // fallback mini-cleanup so you still get something
      inputEl.value = cleanupLocal(text);
    }
  }catch(err){
    console.error(err);
    inputEl.value = cleanupLocal(text);
  }
}

// Wire indicators + legacy buttons
indRewrite.addEventListener('click', rewriteText);
rewriteBtn?.addEventListener('click', rewriteText);

// Copy indicator
indCopy.addEventListener('click', async ()=>{
  const t = inputEl.value;
  if (!t) return;
  try{
    await navigator.clipboard.writeText(t);
    indCopy.classList.add('active'); setTimeout(()=> indCopy.classList.remove('active'), 350);
  }catch{/* ignore */}
});

/**********************
 * KEYBOARD
 * Enter = Rewrite (no Shift+Enter newline)
 **********************/
inputEl.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter'){
    e.preventDefault();
    rewriteText();
  }
});

/**********************
 * LIGHT FALLBACK CLEANUP
 **********************/
function cleanupLocal(txt){
  let t = txt.replace(/\s+\n/g, '\n')
             .replace(/[ \t]+/g, ' ')
             .replace(/\n{3,}/g, '\n\n')
             .trim();
  t = t.replace(/([.,!?;:])([^\s])/g, '$1 $2');
  t = t.replace(/\bi\b/g, 'I');
  t = t.replace(/(^|[.!?]\s+)([a-z])/g, (m,p1,p2)=> p1 + p2.toUpperCase());
  return t;
}

/**********************
 * OPTIONAL: legacy copyOutput() if something else calls it
 **********************/
function copyOutput(){
  const t = inputEl.value || '';
  if (!t) return;
  navigator.clipboard.writeText(t).then(()=>{
    indCopy.classList.add('active'); setTimeout(()=> indCopy.classList.remove('active'), 350);
  }).catch(()=>{ /* ignore */ });
}

// Keep a couple of globals if other scripts expect them
window.rewriteText = rewriteText;
window.copyOutput = copyOutput;
