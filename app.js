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
const indClear = document.getElementById('indClear');
const indLogout = document.getElementById('indLogout');

/**********************
 * INIT DEFAULTS
 **********************/
const storedTone = load(SETTINGS.toneKey, 'concise');
if (toneSelect) toneSelect.value = storedTone;
updateToneIndicator(storedTone);

applyInvisible(!!load(SETTINGS.invisibleKey, false));
applyAutoCopy(!!load(SETTINGS.autoCopyKey, true));

/**********************
 * INDICATORS
 **********************/
function updateToneIndicator(tone){
  const letter = (tone || 'concise').charAt(0).toUpperCase();
  indTone.textContent = letter;
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
  inputEl.classList.toggle('invisible', !!on);
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
 * CLEAR input (X)
 **********************/
function clearInput() {
  indClear?.classList.add('active'); setTimeout(()=> indClear?.classList.remove('active'), 200);
  inputEl.value = '';
  try { inputEl.setSelectionRange(0, 0); } catch {}
  inputEl.placeholder = '';
}
indClear?.addEventListener('click', clearInput);

/**********************
 * REWRITE (uses /api/rewrite)
 * - DOES NOT overwrite your prompt
 * - Copies rewritten text to clipboard (and pulses Copy)
 **********************/
async function rewriteText(){
  const original = inputEl.value;
  const tone = toneSelect.value || 'concise';

  if (!original.trim()){
    inputEl.placeholder = 'Type something to rewrite…';
    return;
  }

  indRewrite.classList.add('active'); setTimeout(()=> indRewrite.classList.remove('active'), 200);

  try{
    const res = await fetch('/api/rewrite', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ text: original, tone })
    });

    let data = {};
    try { data = await res.json(); } catch {}
    const rewritten = (data && typeof data.rewritten_text === 'string') ? data.rewritten_text : '';

    const output = rewritten || cleanupLocal(original);

    // ✅ Always copy the output to clipboard; do NOT replace the input box
    try{
      await navigator.clipboard.writeText(output);
      indCopy.classList.add('active'); setTimeout(()=> indCopy.classList.remove('active'), 450);
    }catch{
      // ignore clipboard errors quietly
    }

  }catch(err){
    console.error(err);
    // graceful fallback: try to copy the cleaned version
    const fallback = cleanupLocal(original);
    try{
      await navigator.clipboard.writeText(fallback);
      indCopy.classList.add('active'); setTimeout(()=> indCopy.classList.remove('active'), 450);
    }catch{}
  }
}

// Wire indicators
indRewrite.addEventListener('click', rewriteText);
indCopy.addEventListener('click', async ()=>{
  const t = inputEl.value;
  if (!t) return;
  try{
    await navigator.clipboard.writeText(t);
    indCopy.classList.add('active'); setTimeout(()=> indCopy.classList.remove('active'), 350);
  }catch{}
});

/**********************
 * KEYBOARD
 * Enter = Rewrite (no Shift+Enter newline), keeps original text
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

// Export (if anything else calls these)
window.rewriteText = rewriteText;

