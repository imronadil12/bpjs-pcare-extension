const sleep = ms => new Promise(r => setTimeout(r, ms));
let running = false;

/* ===============================
   PROGRESS OVERLAY
================================ */
function createProgressOverlay() {
  if (document.getElementById("pcare-progress-overlay")) return document.getElementById("pcare-progress-overlay");

  const overlay = document.createElement("div");
  overlay.id = "pcare-progress-overlay";
  overlay.innerHTML = `
    <div class="progress-card">
      <div class="progress-header">
        <h3>🤖 PCARE Bot</h3>
        <button id="toggleOverlay" class="toggle-btn">−</button>
      </div>
      <div class="progress-content">
        <div class="progress-item"><label>Status:</label><span id="overlayStatus">Idle</span></div>
        <div class="progress-item"><label>Date:</label><span id="overlayDate">-</span></div>
        <div class="progress-item"><label>Current:</label><span id="overlayCurrent">-</span></div>
        <div class="progress-item"><label>Progress:</label><span id="overlayProgress">0/0</span></div>
        <div class="progress-bar">
          <div id="overlayProgressBar" class="progress-fill"></div>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #pcare-progress-overlay { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: system-ui; }
    .progress-card { background: white; border: 2px solid #2563eb; border-radius: 8px; min-width: 260px; box-shadow: 0 4px 12px rgba(0,0,0,.15); overflow: hidden; }
    .progress-header { background: #2563eb; color: white; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
    .toggle-btn { border: none; background: rgba(255,255,255,.3); color: white; width: 22px; height: 22px; border-radius: 4px; cursor: pointer; }
    .progress-content { padding: 10px; }
    .progress-item { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; color: #333; }
    .progress-bar { height: 18px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg,#2563eb,#0891b2); width: 0%; color: white; font-size: 10px; display: flex; align-items: center; justify-content: center; transition: width 0.3s ease; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  overlay.querySelector("#toggleOverlay").onclick = () => {
    const content = overlay.querySelector(".progress-content");
    content.style.display = content.style.display === "none" ? "block" : "none";
  };

  return overlay;
}

function updateProgressOverlay(status, date, current, done, total) {
  createProgressOverlay();
  const percent = total ? Math.round((done / total) * 100) : 0;
  
  // Display Date as dd-mm-yyyy
  let displayDate = "-";
  if (date) {
    const d = new Date(date);
    displayDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()}`;
  }

  document.getElementById("overlayStatus").textContent = status;
  document.getElementById("overlayDate").textContent = displayDate;
  document.getElementById("overlayCurrent").textContent = current || "-";
  document.getElementById("overlayProgress").textContent = `${done}/${total}`;
  const bar = document.getElementById("overlayProgressBar");
  bar.style.width = percent + "%";
  bar.textContent = percent > 10 ? percent + "%" : "";
}

/* ===============================
   API FETCH
================================ */
async function fetchNumberFromAPI() {
  const res = await fetch("https://v0-pcare.vercel.app/api/next-number", { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.numbers; 
}

/* ===============================
   DOM HELPERS (TARGETED)
================================ */

// UPDATED: Format is now dd-mm-yyyy
async function inputTanggal(isoDate) {
  const input = document.getElementById("txttanggal");
  if (!input) throw new Error("Date input (#txttanggal) not found");

  const d = new Date(isoDate);
  // Format: dd-MM-yyyy (e.g., 25-10-2023)
  const val = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  
  input.value = val;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
}

async function inputNoPencarian(nomor) {
  const input = document.getElementById("txtnokartu");
  if (!input) throw new Error("Input (#txtnokartu) not found");

  input.value = nomor;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function clickCari() {
  const btn = document.getElementById("btnCariPeserta");
  if (btn) btn.click();
}

async function handleUpdateNIKModal() {
  const btn = document.querySelector("#batalNIKSubmit_btn");
  if (btn) btn.click();
}

async function selectKunjunganOptions() {
  // 1. Kunjungan Sehat (value="false")
  const sehat = document.querySelector('input[name="kunjSakitF"][value="false"]');
  if (sehat) {
    sehat.click();
    sehat.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 2. Promotif Preventif (value="50")
  const promotif = document.getElementById("tkp50");
  if (promotif) {
    promotif.click();
    promotif.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

async function selectPoli() {
  const select = document.getElementById("poli");
  if (select) {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

async function clickSimpan() {
  const btn = document.getElementById("btnSimpanPendaftaran");
  if (btn && !btn.disabled) {
    btn.click();
  }
}

async function clearPopups() {
  document.querySelectorAll(".modal-backdrop, .modal.show").forEach(e => e.remove());
  document.body.classList.remove("modal-open");
}

/* ===============================
   MAIN LOGIC
================================ */
async function run() {
  if (running) return;
  running = true;

  while (running) {
    const data = await chrome.storage.local.get(null);
    const { tanggal = [], delayMs = 1200, progress, dateIndex = 0, dateGoals = {}, paused } = data;

    if (paused) {
      running = false;
      updateProgressOverlay("Paused", tanggal[dateIndex], "PAUSED", progress?.done || 0, dateGoals[tanggal[dateIndex]] || 0);
      return;
    }

    const currentDate = tanggal[dateIndex];
    if (!currentDate) {
      updateProgressOverlay("Finished", null, "DONE", 0, 0);
      running = false;
      return;
    }

    const goal = dateGoals[currentDate] || 0;
    let done = progress?.done || 0;

    if (done >= goal) {
      if (dateIndex + 1 < tanggal.length) {
        await chrome.storage.local.set({
          dateIndex: dateIndex + 1,
          progress: { done: 0, total: dateGoals[tanggal[dateIndex + 1]], status: "running" }
        });
        continue;
      } else {
        updateProgressOverlay("All Done", null, "DONE", goal, goal);
        running = false;
        return;
      }
    }

    try {
      updateProgressOverlay("Fetching...", currentDate, "-", done, goal);
      const nomor = await fetchNumberFromAPI();
      updateProgressOverlay("Working...", currentDate, nomor, done, goal);

      await clearPopups();

      // 1. Set Date (dd-mm-yyyy)
      await inputTanggal(currentDate);
      await sleep(500);

      // 2. Input Number & Search
      await inputNoPencarian(nomor);
      await sleep(delayMs);
      await clickCari();
      
      // 3. Wait for load
      await sleep(delayMs * 1.5);
      await handleUpdateNIKModal();

      // 4. Set Options
      await selectKunjunganOptions();
      await sleep(500);
      await selectPoli();
      await sleep(delayMs);

      // 5. Save
      await clickSimpan();
      await sleep(delayMs);

      done++;
      await chrome.storage.local.set({
        progress: { done: done, total: goal, status: "running" }
      });

    } catch (e) {
      console.error("Bot Error:", e);
      updateProgressOverlay("Error", currentDate, "Retry", done, goal);
      await sleep(3000);
    }
  }
}

chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === "start" || msg.action === "resume") {
    run().catch(console.error);
  }
});