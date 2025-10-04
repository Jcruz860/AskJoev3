// ========== LIGHTWEIGHT SETTINGS (persisted) ==========
const SETTINGS_KEYS = {
  autoCopy: 'askjoe.autoCopy',
  visMode: 'askjoe.visMode', // 'normal' | 'invisible'
};

function getSetting(k, fallback) {
  try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); }
  catch { return fallback; }
}
function setSetting(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ========== UI HELPERS ==========
function showCopyButton(show) {
  const copyBtn = document.getElementById('copyBtn');
  if (!copyBtn) return;
  copyBtn.style.display = show ? 'inline-block' : 'none';
}

function setInvisible(on) {
  const input = document.getElementById('inputText');
  if (!input) return;
  input.classList.toggle('invisible', !!on);
  setSetting(SETTINGS_KEYS.visMode, on ? 'invisible' : 'normal');
  // update toggle UI text if present
  const t = document.getElementById('toggleInvisible');
  if (t) t.textContent = on ? '👁️‍🗨️ Invisible: ON' : '👁️ Invisible: OFF';
}

function getAutoCopy() {
  return !!getSetting(SETTINGS_KEYS.autoCopy, true);
}
function setAutoCopy(on) {
  setSetting(SETTINGS_KEYS.autoCopy, !!on);
  const ac = document.getElementById('toggleAutoCopy');
  if (ac) ac.textContent = on ? '📎 Auto-copy: ON' : '📎 Auto-copy: OFF';
}

// ========== TOOLBAR (injected, so no HTML edits needed) ==========
function ensureToolbar() {
  const host = document.querySelector('.ameriask');
  const before = document.getElementById('outputContainer');
  if (!host || !before) return;

  if (document.getElementById('inlineToolbar')) return; // already added

  const bar = document.createElement('div');
  bar.id = 'inlineToolbar';
  bar.style.display = 'flex';
  bar.style.flexWrap = 'wrap';
  bar.style.gap = '8px';
  bar.style.margin = '8px 0';

  const inv = document.createElement('button');
  inv.id = 'toggleInvisible';
  inv.type = 'button';
  inv.className = 'inline-btn';
  inv.addEventListener('click', () => setInvisible(!document.getElementById('inputText').classList.contains('invisible')));

  const ac = document.createElement('button');
  ac.id = 'toggleAutoCopy';
  ac.type = 'button';
  ac.className = 'inline-btn';
  ac.addEventListener('click', () => setAutoCopy(!getAutoCopy()));

  const hint = document.createElement('div');
  hint.className = 'inline-hint';
  hint.textContent = '↵ = Rewrite • Shift+↵ = newline';

  bar.append(inv, ac, hint);
  host.insertBefore(bar, before);

  // initial states
  setInvisible(getSetting(SETTINGS_KEYS.visMode, 'normal') === 'invisible');
  setAutoCopy(getAutoCopy());
}

// Optional minimal styles for toolbar buttons (inline so we don’t depend on CSS file)
(function injectInlineToolbarStyles(){
  const css = `
    .inline-btn{
      appearance:none; border:1px solid #263452; background:#14203a; color:#cfe1ff;
      padding:6px 10px; border-radius:8px; cursor:pointer; font-weight:700; font-size:12px;
    }
    .inline-btn:hover{ filter:brightness(1.1) }
    .inline-hint{ color:#9aa3b2; font-size:12px; padding:6px 0 0 4px }
  `;
  const tag = document.createElement('style'); tag.textContent = css; document.head.appendChild(tag);
})();

// ========== YOUR EXISTING FLOW, ENHANCED ==========
async function rewriteText() {
    const inputText = document.getElementById('inputText').value;
    const selectedTone = document.getElementById('tone').value;
    const output = document.getElementById('outputText');

    if (!selectedTone) {
        alert("Please select a tone before rewriting.");
        return;
    }
    if (!inputText.trim()) {
        alert("Please enter a message to rewrite.");
        return;
    }

    output.innerText = 'Rewriting... ✍️';
    showCopyButton(false);

    try {
        const response = await fetch('/api/rewrite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: inputText, tone: selectedTone })
        });

        // Graceful fallback if server returns non-JSON
        let data = {};
        try { data = await response.json(); } catch { data = {}; }

        if (data.rewritten_text && typeof data.rewritten_text === 'string') {
            output.innerText = data.rewritten_text;
            showCopyButton(true);

            // ✅ Auto-copy after success (if enabled)
            if (getAutoCopy()) {
              try {
                await navigator.clipboard.writeText(data.rewritten_text);
                const btn = document.getElementById('copyBtn');
                if (btn) {
                  const prev = btn.innerText;
                  btn.innerText = "Copied ✅";
                  setTimeout(() => { btn.innerText = prev || "Copy ✂️"; }, 1200);
                }
              } catch {
                // silently ignore clipboard errors; user can press Copy manually
              }
            }
        } else {
            output.innerText = 'Something went wrong. Please try again.';
        }
    } catch (err) {
        console.error(err);
        output.innerText = 'An error occurred while rewriting the message.';
    }
}

function copyOutput() {
    const text = document.getElementById('outputText').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        const prev = btn.innerText;
        btn.innerText = "Copied ✅";
        setTimeout(() => { btn.innerText = prev || "Copy ✂️"; }, 1500);
    }).catch(() => {
        alert("Failed to copy text. Please try again.");
    });
}

// ========== KEYBOARD: Enter = rewrite | Shift+Enter = newline ==========
function bindEnterToRewrite() {
  const input = document.getElementById('inputText');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      rewriteText();
    }
  });
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  ensureToolbar();
  bindEnterToRewrite();
});
