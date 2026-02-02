const sleep = ms => new Promise(r => setTimeout(r, ms));

let running = false;

/* ===============================
   PROGRESS OVERLAY
================================ */
function createProgressOverlay() {
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
    #pcare-progress-overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: system-ui;
    }
    .progress-card {
      background: white;
      border: 2px solid #2563eb;
      border-radius: 8px;
      min-width: 260px;
      box-shadow: 0 4px 12px rgba(0,0,0,.15);
    }
    .progress-header {
      background: #2563eb;
      color: white;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: grab;
    }
    .toggle-btn {
      border: none;
      background: rgba(255,255,255,.3);
      color: white;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      cursor: pointer;
    }
    .progress-content { padding: 10px; }
    .progress-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .progress-bar {
      height: 18px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg,#2563eb,#0891b2);
      width: 0%;
      color: white;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  document.getElementById("toggleOverlay").onclick = () => {
    const content = overlay.querySelector(".progress-content");
    content.style.display = content.style.display === "none" ? "block" : "none";
  };

  return overlay;
}

function updateProgressOverlay(status, date, current, done, total) {
  let overlay = document.getElementById("pcare-progress-overlay");
  if (!overlay) overlay = createProgressOverlay();

  const percent = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("overlayStatus").textContent = status;
  document.getElementById("overlayDate").textContent = date || "-";
  document.getElementById("overlayCurrent").textContent = current || "-";
  document.getElementById("overlayProgress").textContent = `${done}/${total}`;
  document.getElementById("overlayProgressBar").style.width = percent + "%";
  document.getElementById("overlayProgressBar").textContent = percent > 10 ? percent + "%" : "";
}

/* ===============================
   API FETCH (SIMPLIFIED)
================================ */
async function fetchNumberFromAPI() {
  const res = await fetch(
    "https://v0-pcare.vercel.app/api/next-number",
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  const data = await res.json();

  if (!data?.numbers) {
    throw new Error("Invalid API response");
  }

  return data.numbers;
}

/* ===============================
   MESSAGE HANDLER
================================ */
chrome.runtime.onMessage.addListener(msg => {
  if ((msg.action === "start" || msg.action === "resume") && !running) {
    run().catch(console.error);
  }
});

/* ===============================
   MAIN
================================ */
async function run() {
  running = true;

  const {
    tanggal,
    delayMs = 1200,
    progress,
    dateIndex = 0,
    dateGoals = {}
  } = await chrome.storage.local.get([
    "tanggal",
    "delayMs",
    "progress",
    "dateIndex",
    "dateGoals"
  ]);

  const dates = Array.isArray(tanggal) ? tanggal : [tanggal];
  const currentDate = dates[dateIndex];
  const goal = dateGoals[currentDate] || 1;
  let index = progress?.done || 0;

  updateProgressOverlay("Running", currentDate, "-", index, goal);

  await sleep(delayMs);

  for (; index < goal; index++) {
    const { paused } = await chrome.storage.local.get("paused");
    if (paused) {
      running = false;
      updateProgressOverlay("Paused", currentDate, "-", index, goal);
      return;
    }

    let nomor;
    try {
      nomor = await fetchNumberFromAPI();
    } catch (e) {
      console.error("❌ API error", e);
      await sleep(delayMs);
      continue;
    }

    updateProgressOverlay("Running", currentDate, nomor, index, goal);

    try {
      await clearPopups();
      await inputNoPencarian(nomor);
      await sleep(delayMs);
      await clickCari();
      await sleep(delayMs);
      await handleUpdateNIKModal();
      await selectOptions();
      await sleep(delayMs * 2);
    } catch (e) {
      console.error("❌ Input error", e);
    }

    await chrome.storage.local.set({
      progress: { done: index + 1, total: goal, status: "running" }
    });
  }

  updateProgressOverlay("Completed", currentDate, "-", goal, goal);
  running = false;
}

/* ===============================
   HELPERS
================================ */
async function clearPopups() {
  document.querySelectorAll(".modal,.modal-backdrop").forEach(e => e.remove());
  document.body.classList.remove("modal-open");
}

async function handleUpdateNIKModal() {
  await sleep(400);
  document.querySelector("#batalNIKSubmit_btn")?.click();
}

async function inputNoPencarian(nomor) {
  const label = [...document.querySelectorAll("label")]
    .find(l => l.innerText.includes("No. Pencarian"));
  const input = label?.closest(".form-group")?.querySelector("input");
  if (!input) throw "Input not found";

  input.value = nomor;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function clickCari() {
  [...document.querySelectorAll("button")]
    .find(b => b.innerText.trim() === "Cari")?.click();
}

async function selectOptions() {
  document.querySelector("#btnSimpanPendaftaran")?.click();
}
