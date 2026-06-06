import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pagesDir = path.join(root, 'dev', 'pages')

const sharedStyles = `
  body {
    font-family: system-ui, sans-serif;
    max-width: 640px;
    margin: 2rem auto;
    padding: 0 1rem;
    line-height: 1.5;
  }
  a { color: #2563eb; }
  button {
    display: block;
    width: 100%;
    margin: 0.5rem 0;
    padding: 0.75rem;
    font-size: 1rem;
    cursor: pointer;
  }
  .tag {
    display: inline-block;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #e0e7ff;
    color: #3730a3;
    margin-bottom: 1rem;
  }
  .tag.soon { background: #f3f4f6; color: #6b7280; }
`

const pages = {
  'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Hostile Web Cleaner — Dev Tests</title>
    <style>${sharedStyles}
      ul { padding-left: 1.25rem; }
      li { margin: 0.5rem 0; }
    </style>
  </head>
  <body>
    <p class="tag">Local dev only — gitignored</p>
    <h1>Phase test pages</h1>
    <p>Run <code>npm run dev</code>, load the extension from <code>dist/</code>, then open these URLs.</p>
    <ul>
      <li><a href="/dev/phase1-popup-spam.html">Phase 1 — Popup confirmation toasts</a></li>
      <li><a href="/dev/phase2-overlays.html">Phase 2 — Fake overlays</a></li>
      <li><a href="/dev/phase2b-downloads.html">Phase 2.5 — Fake download buttons</a></li>
      <li><a href="/dev/phase3-countdown.html">Phase 3 — Countdown bypass</a> <span class="tag soon">coming soon</span></li>
    </ul>
    <p><small>Base URL: <code>http://localhost:5173/dev/</code> (port may differ if 5173 is in use)</small></p>
  </body>
</html>`,

  'phase1-popup-spam.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Phase 1 — Popup Spam Test</title>
    <style>${sharedStyles}
      .link-btn {
        display: inline-block;
        width: 100%;
        margin: 0.5rem 0;
        padding: 0.75rem;
        font-size: 1rem;
        cursor: pointer;
        text-align: center;
        background: #f3f4f6;
        border-radius: 6px;
        text-decoration: none;
        color: inherit;
        box-sizing: border-box;
      }
    </style>
  </head>
  <body>
    <p class="tag">Phase 1</p>
    <h1>Popup confirmation toasts</h1>
    <p>Click anything below — a toast should appear with the URL. Choose <strong>Block domain</strong> (session), <strong>Block</strong> (once), or <strong>Open tab</strong>. Auto-closes in 5s with no tab opened.</p>
    <p><a href="/dev/">← All phase tests</a></p>

    <h2>window.open</h2>
    <button id="spam" type="button">Open 5 tabs (spam)</button>
    <button id="single" type="button">Open 1 tab</button>
    <button id="delayed" type="button">Open tab after 2s (silent block, no toast)</button>

    <h2>Link new tab</h2>
    <a class="link-btn" href="https://example.com/link-tab" target="_blank">target=_blank link</a>
    <a class="link-btn" href="https://example.com/wrapped-link" target="_blank">
      <span>Ad-style wrapped link (target=_blank)</span>
    </a>

    <script>
      document.getElementById('spam').onclick = () => {
        for (let i = 0; i < 5; i++) window.open('https://example.com/page-' + (i + 1))
      }
      document.getElementById('single').onclick = () => {
        window.open('https://example.com/single')
      }
      document.getElementById('delayed').onclick = () => {
        setTimeout(() => window.open('https://example.com/delayed-spam'), 2000)
      }
    </script>
  </body>
</html>`,

  'phase2-overlays.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Phase 2 — Overlays</title>
    <style>${sharedStyles}
      .scroll-content { min-height: 200vh; padding-bottom: 4rem; }
      .hostile-overlay {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 99999;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem;
        box-sizing: border-box;
      }
      .hostile-overlay h2 { font-size: 1.5rem; margin-bottom: 1rem; }
      .legit-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .legit-modal {
        background: #fff;
        border-radius: 8px;
        padding: 1.5rem;
        max-width: 400px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.2);
      }
      .note { background: #fef3c7; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <p class="tag">Phase 2</p>
    <h1>Fake overlay test</h1>
    <p>With the extension enabled, hostile overlays should be removed within ~1s and the page should scroll. Legitimate modals must survive.</p>
    <p><a href="/dev/">← All phase tests</a></p>

    <div class="note">
      <strong>Extension off test:</strong> Disable the extension in the popup, reload — the hostile overlay below should remain and scroll should stay locked.
    </div>

    <h2>Scrollable content underneath</h2>
    <div class="scroll-content">
      <p>This paragraph is below a hostile overlay. If repair works, you can scroll to read this and click the link below.</p>
      <p><a href="https://example.com/under-overlay">Test link under overlay</a></p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Keep scrolling to verify body scroll was restored.</p>
      <p>More content at the bottom of the page to confirm scrolling works after overlay removal.</p>
    </div>

    <div id="hostile-overlay" class="hostile-overlay">
      <div>
        <h2>Please disable your ad blocker</h2>
        <p>This site requires ads to stay free. Whitelist this site to continue.</p>
      </div>
    </div>

    <div class="legit-modal-backdrop">
      <div class="legit-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Legitimate modal</h2>
        <p>This dialog should <strong>not</strong> be removed — it has role="dialog" and aria-modal="true".</p>
        <button type="button" onclick="this.closest('.legit-modal-backdrop').style.display='none'">Close</button>
      </div>
    </div>

    <script>
      document.body.style.overflow = 'hidden';

      setTimeout(function () {
        if (document.getElementById('delayed-overlay')) return;
        var el = document.createElement('div');
        el.id = 'delayed-overlay';
        el.className = 'hostile-overlay';
        el.style.zIndex = '999999';
        el.innerHTML = '<div><h2>Ad blocker detected</h2><p>Delayed overlay — injected after 2s. Should be removed by observer.</p></div>';
        document.body.appendChild(el);
      }, 2000);
    </script>
  </body>
</html>`,

  'phase2b-downloads.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Phase 2.5 — Downloads</title>
    <style>${sharedStyles}
      .fake-download {
        display: block;
        width: 100%;
        margin: 0.75rem 0;
        padding: 1.25rem;
        font-size: 1.25rem;
        font-weight: bold;
        text-align: center;
        text-decoration: none;
        color: #fff;
        background: linear-gradient(#22c55e, #16a34a);
        border-radius: 8px;
        cursor: pointer;
        box-sizing: border-box;
      }
      .real-download {
        display: inline-block;
        margin: 0.5rem 0;
        font-size: 0.9rem;
      }
      .note { background: #fef3c7; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; margin: 1rem 0; }
      .legit-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .legit-modal {
        background: #fff;
        border-radius: 8px;
        padding: 1.5rem;
        max-width: 400px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.2);
      }
      #delayed-fake-slot:empty::before {
        content: "Waiting for delayed fake button (2s)…";
        color: #6b7280;
        font-size: 0.9rem;
      }
    </style>
  </head>
  <body>
    <p class="tag">Phase 2.5</p>
    <h1>Fake download button test</h1>
    <p>With the extension enabled, fake download CTAs should show a red badge and be unclickable. The real same-origin file link should stay clickable (green badge).</p>
    <p><a href="/dev/">← All phase tests</a></p>

    <div class="note">
      <strong>Expected:</strong> Three large fake buttons suppressed; real <code>sample.zip</code> link works; ambiguous single button untouched; dialog download untouched; delayed fake suppressed after ~2s.
    </div>

    <h2>1 — Three fake + one real</h2>
    <a class="fake-download" href="https://example-affiliate.test/offer1" target="_blank">DOWNLOAD NOW</a>
    <a class="fake-download" href="https://example-affiliate.test/offer2" target="_blank">FREE DOWNLOAD</a>
    <button class="fake-download" type="button" onclick="window.open('https://example-affiliate.test/offer3')">CLICK HERE</button>
    <p class="real-download">
      <a download href="/dev/fixture/sample.zip">Download sample.zip (real)</a>
    </p>

    <h2>2 — Same-tab affiliate link</h2>
    <a href="https://example-affiliate.test/offer-same-tab">Download</a>

    <h2>3 — Single ambiguous button</h2>
    <button type="button" id="ambiguous">Download file</button>

    <h2>4 — Legitimate dialog (allowlisted)</h2>
    <div class="legit-modal-backdrop">
      <div class="legit-modal" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title">Software update</h2>
        <p>A new version is available.</p>
        <a download href="/dev/fixture/sample.zip">Download update</a>
      </div>
    </div>

    <h2>5 — Delayed fake (observer re-scan)</h2>
    <div id="delayed-fake-slot"></div>

    <script>
      setTimeout(function () {
        var slot = document.getElementById('delayed-fake-slot');
        if (!slot || slot.querySelector('.fake-download')) return;
        var el = document.createElement('a');
        el.className = 'fake-download';
        el.href = 'https://example-affiliate.test/delayed';
        el.target = '_blank';
        el.textContent = 'DOWNLOAD NOW (delayed)';
        slot.appendChild(el);
      }, 2000);
    </script>
  </body>
</html>`,

  'phase3-countdown.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Phase 3 — Countdown (placeholder)</title>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <p class="tag soon">Phase 3 — not implemented yet</p>
    <h1>Countdown bypass test</h1>
    <p>Placeholder for artificial wait timer scenarios.</p>
    <p><a href="/dev/">← All phase tests</a></p>
  </body>
</html>`,
}

fs.mkdirSync(pagesDir, { recursive: true })

const fixtureDir = path.join(pagesDir, 'fixture')
fs.mkdirSync(fixtureDir, { recursive: true })
fs.writeFileSync(
  path.join(fixtureDir, 'sample.zip'),
  'Hostile Web Cleaner — Phase 2.5 test fixture\n',
  'utf8',
)

for (const [filename, content] of Object.entries(pages)) {
  fs.writeFileSync(path.join(pagesDir, filename), content, 'utf8')
}

console.log('[dev] Test pages ready at dev/pages/ → http://localhost:5173/dev/')
