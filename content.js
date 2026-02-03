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
        <h3>⚡ PCARE Turbo</h3>
        <button id="toggleOverlay" class="toggle-btn">−</button>
      </div>
      <div class="progress-content">
        <div class="progress-item"><label>Status:</label><span id="overlayStatus">Idle</span></div>
        <div class="progress-item"><label>Date:</label><span id="overlayDate">-</span></div>
        <div class="progress-item"><label>Remaining:</label><span id="overlayGoal" style="font-weight:bold; color:red;">0</span></div>
        <div class="progress-item"><label>Current:</label><span id="overlayCurrent">-</span></div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #pcare-progress-overlay { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: system-ui; }
    .progress-card { background: white; border: 2px solid #ef4444; border-radius: 8px; min-width: 260px; box-shadow: 0 4px 12px rgba(0,0,0,.15); overflow: hidden; }
    .progress-header { background: #ef4444; color: white; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
    .toggle-btn { border: none; background: rgba(255,255,255,.3); color: white; width: 22px; height: 22px; border-radius: 4px; cursor: pointer; }
    .progress-content { padding: 10px; }
    .progress-item { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; color: #333; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  overlay.querySelector("#toggleOverlay").onclick = () => {
    const content = overlay.querySelector(".progress-content");
    content.style.display = content.style.display === "none" ? "block" : "none";
  };

  return overlay;
}

function updateProgressOverlay(status, date, current, goal) {
  createProgressOverlay();
  
  let displayDate = "-";
  if (date) {
    const d = new Date(date);
    displayDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()}`;
  }

  document.getElementById("overlayStatus").textContent = status;
  document.getElementById("overlayDate").textContent = displayDate;
  document.getElementById("overlayCurrent").textContent = current || "-";
  document.getElementById("overlayGoal").textContent = goal;
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
   DOM HELPERS
================================ */

function inputTanggal(isoDate) {
  const input = document.getElementById("txttanggal");
  if (!input) return;
  const d = new Date(isoDate);
  const val = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  input.value = val;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new Event("blur", { bubbles: true }));
}

function inputNoPencarian(nomor) {
  const input = document.getElementById("txtnokartu");
  if (!input) return;
  input.value = nomor;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function clickCari() {
  document.getElementById("btnCariPeserta")?.click();
}

function clickSimpan() {
  const btn = document.getElementById("btnSimpanPendaftaran");
  if (btn && !btn.disabled) btn.click();
}

function handleUpdateNIKModal() {
  document.querySelector("#batalNIKSubmit_btn")?.click();
}

function setOptions() {
  const sehat = document.querySelector('input[name="kunjSakitF"][value="false"]');
  if (sehat) { sehat.click(); sehat.dispatchEvent(new Event("change", { bubbles: true })); }
  
  const promotif = document.getElementById("tkp50");
  if (promotif) { promotif.click(); promotif.dispatchEvent(new Event("change", { bubbles: true })); }

  const select = document.getElementById("poli");
  if (select) { select.value = "021"; select.dispatchEvent(new Event("change", { bubbles: true })); }
}

/* ===============================
   SMART WAITERS
================================ */

function deleteBlockingModals() {
  const modals = document.querySelectorAll(".modal.in, .modal.show, .bootbox");
  if (modals.length > 0) {
    let deleted = false;
    modals.forEach(m => {
      const t = m.innerText.toUpperCase();
      if (t.includes("SKRINING") || t.includes("WARNING") || t.includes("SIP") || 
          t.includes("PAKTA") || t.includes("BERHASIL") || t.includes("SUCCESS") ||
          t.includes("TIDAK AKTIF") || t.includes("NON AKTIF") || t.includes("MENGHAPUS") || t.includes("TIDAK TERDAFTAR")) {
        m.remove();
        deleted = true;
      }
    });
    
    if (deleted) {
      document.querySelectorAll(".modal-backdrop").forEach(e => e.remove());
      document.body.classList.remove("modal-open");
      return true;
    }
  }
  return false;
}

async function waitForSearchLoad() {
  return new Promise(resolve => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const nameLabel = document.getElementById("lblnmpst");
      if ((nameLabel && nameLabel.innerText.length > 1 && nameLabel.innerText !== "-") || deleteBlockingModals()) {
        clearInterval(interval);
        resolve();
      }
      if (attempts > 30) { clearInterval(interval); resolve(); }
    }, 100);
  });
}

async function waitForSaveCompletion() {
  return new Promise(resolve => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (deleteBlockingModals()) {
        clearInterval(interval);
        resolve();
      }
      if (attempts > 40) { clearInterval(interval); resolve(); }
    }, 100);
  });
}

/* ===============================
   MAIN LOGIC
================================ */
async function run() {
  if (running) return;
  running = true;

  deleteBlockingModals();

  while (running) {
    const data = await chrome.storage.local.get(null);
    let { tanggal = [], dateGoals = {}, paused } = data;

    // Check Pause
    if (paused) {
      running = false;
      const current = tanggal.length > 0 ? tanggal[0] : "-";
      updateProgressOverlay("Paused", current, "PAUSED", dateGoals[current] || 0);
      return;
    }

    // Check if list is empty
    if (tanggal.length === 0) {
      updateProgressOverlay("All Finished!", null, "DONE", 0);
      running = false;
      return;
    }

    // Get First Date and Goal
    const currentDate = tanggal[0];
    let currentGoal = dateGoals[currentDate] || 0;

    // --- CHECK COMPLETION (Countdown Logic) ---
    // If goal is 0 or less, we are done with this date
    if (currentGoal <= 0) {
      // 1. Remove date from list
      tanggal.shift();
      // 2. Remove goal from storage object
      delete dateGoals[currentDate];

      // 3. Save clean state
      await chrome.storage.local.set({
        tanggal: tanggal,
        dateGoals: dateGoals
      });

      updateProgressOverlay("Date Done!", currentDate, "Moving Next...", 0);
      await sleep(1000);
      continue;
    }

    // --- PROCESS PATIENT ---
    try {
      updateProgressOverlay("Fetching...", currentDate, "-", currentGoal);
      const nomor = await fetchNumberFromAPI();
      
      updateProgressOverlay("Working...", currentDate, nomor, currentGoal);
      deleteBlockingModals();

      // Input
      inputTanggal(currentDate);
      inputNoPencarian(nomor);
      
      // Search
      clickCari();
      await waitForSearchLoad(); 
      handleUpdateNIKModal();

      // Options
      setOptions();

      // Save
      clickSimpan();
      await waitForSaveCompletion();

      // --- DECREMENT GOAL ---
      currentGoal--;
      dateGoals[currentDate] = currentGoal;

      await chrome.storage.local.set({
        dateGoals: dateGoals
      });

    } catch (e) {
      console.error("Bot Error:", e);
      await sleep(2000); 
    }
  }
}

chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === "start" || msg.action === "resume") {
    run().catch(console.error);
  }
});