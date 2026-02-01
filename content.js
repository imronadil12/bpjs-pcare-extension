const sleep = ms => new Promise(r => setTimeout(r, ms));

let running = false;

// Helper to add timeout to async functions
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    )
  ]);
}

/* ===============================
   PROGRESS OVERLAY
================================ */
function createProgressOverlay() {
  // Create overlay container
  const overlay = document.createElement("div");
  overlay.id = "pcare-progress-overlay";
  overlay.innerHTML = `
    <div class="progress-card">
      <div class="progress-header">
        <h3>🤖 PCARE Bot</h3>
        <button id="toggleOverlay" class="toggle-btn">−</button>
      </div>
      <div class="progress-content">
        <div class="progress-item">
          <label>Status:</label>
          <span id="overlayStatus">Idle</span>
        </div>
        <div class="progress-item">
          <label>Date:</label>
          <span id="overlayDate">-</span>
        </div>
        <div class="progress-item">
          <label>Current:</label>
          <span id="overlayCurrent">-</span>
        </div>
        <div class="progress-item">
          <label>Progress:</label>
          <span id="overlayProgress">0/0</span>
        </div>
        <div class="progress-bar">
          <div id="overlayProgressBar" class="progress-fill"></div>
        </div>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    body {
      overflow-y: scroll !important;
      padding-right: 0 !important;
      margin-right: 0 !important;
    }

    #pcare-progress-overlay {
      position: fixed;
      bottom: 20px;
      right: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      z-index: 999999;
      margin: 0;
      padding: 0;
      border: none;
    }

    .progress-card {
      background: white;
      border: 2px solid #2563eb;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 280px;
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
      margin: 0;
      padding: 0;
    }

    @keyframes slideIn {
      from {
        transform: translateX(350px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .progress-header {
      background: #2563eb;
      color: white;
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: grab;
      margin: 0;
    }

    .progress-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }

    .toggle-btn {
      background: rgba(255, 255, 255, 0.3);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 0;
    }

    .toggle-btn:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    .progress-content {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
      margin: 0;
    }

    .progress-content.collapsed {
      display: none;
    }

    .progress-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0;
      padding: 0;
    }

    .progress-item label {
      font-weight: 600;
      color: #444;
      min-width: 80px;
      margin: 0;
      padding: 0;
    }

    .progress-item span {
      color: #2563eb;
      font-weight: 500;
      word-break: break-all;
      text-align: right;
      max-width: 160px;
      margin: 0;
      padding: 0;
    }

    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
      margin-bottom: 0;
      padding: 0;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #2563eb, #0891b2);
      width: 0%;
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
      font-weight: 600;
      margin: 0;
      padding: 0;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Toggle collapse
  document.getElementById("toggleOverlay").addEventListener("click", () => {
    const content = overlay.querySelector(".progress-content");
    const btn = document.getElementById("toggleOverlay");
    content.classList.toggle("collapsed");
    btn.textContent = content.classList.contains("collapsed") ? "+" : "−";
  });

  // Make draggable
  makeElementDraggable(overlay);

  return overlay;
}

function makeElementDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = element.querySelector(".progress-header");

  header.addEventListener("mousedown", dragMouseDown);

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener("mouseup", closeDragElement);
    document.addEventListener("mousemove", elementDrag);
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.bottom = (element.offsetParent.offsetHeight - element.offsetTop - element.offsetHeight) - pos2 + "px";
    element.style.right = (element.offsetParent.offsetWidth - element.offsetLeft - element.offsetWidth) - pos1 + "px";
  }

  function closeDragElement() {
    document.removeEventListener("mouseup", closeDragElement);
    document.removeEventListener("mousemove", elementDrag);
  }
}

function updateProgressOverlay(status, date, current, done, total) {
  let overlay = document.getElementById("pcare-progress-overlay");
  
  if (!overlay) {
    overlay = createProgressOverlay();
  }

  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById("overlayStatus").textContent = status;
  document.getElementById("overlayDate").textContent = date || "-";
  document.getElementById("overlayCurrent").textContent = current || "-";
  document.getElementById("overlayProgress").textContent = `${done}/${total}`;
  document.getElementById("overlayProgressBar").style.width = percentage + "%";
  document.getElementById("overlayProgressBar").textContent = percentage > 10 ? percentage + "%" : "";
}

/* ===============================
   DATE HELPERS
================================ */
function formatISODateForDisplay(isoDateStr) {
  try {
    const date = new Date(isoDateStr);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return isoDateStr;
  }
}

/* ===============================
   MESSAGE HANDLER
================================ */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("📨 Message received:", msg);
  if (msg.action === "start" && !running) {
    console.log("▶ Starting bot...");
    run().catch(err => console.error("❌ Run error:", err));
  }
  if (msg.action === "resume" && !running) {
    console.log("▶ Resuming bot...");
    run().catch(err => console.error("❌ Run error:", err));
  }
});

/* ===============================
   MAIN
================================ */
async function run() {
  running = true;

  const { tanggal, delayMs = 1200, progress, dateIndex = 0, dateGoals = {} } =
    await chrome.storage.local.get([
      "tanggal",  
      "delayMs",
      "progress",
      "dateIndex",
      "dateGoals"
    ]);

  // Ensure tanggal is an array
  const dates = Array.isArray(tanggal) ? tanggal : (tanggal ? [tanggal] : []);
  
  if (!dates.length) {
    console.error("❌ No dates found in storage");
    running = false;
    return;
  }

  const currentDate = dates[dateIndex];
  const currentDateDisplay = formatISODateForDisplay(currentDate);
  const goal = dateGoals[currentDate] || 1;

  let index = progress?.done || 0;

  console.log(`📅 Current date: ${currentDateDisplay} | Goal: ${goal}`);

  /* ===============================
     DATE INPUT (ONCE)
  ================================ */
  const dateInput = document.querySelector("#txttanggal");
  if (dateInput) {
    // Convert ISO date to YYYY-MM-DD format for the form
    dateInput.value = "";
    dateInput.focus();
    dateInput.value = currentDateDisplay;
    dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    dateInput.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("📅 Date set to:", currentDateDisplay);
  } else {
    console.warn("⚠️ Date input #txttanggal not found on page");
  }

  await sleep(delayMs);

  for (let i = 0; i < goal; i++) {
    const { paused } = await chrome.storage.local.get("paused");
    if (paused) {
      console.log("⏸️ Bot paused");
      updateProgressOverlay("Paused", currentDateDisplay, "-", index, goal);
      running = false;
      return;
    }

    let nomor;
    try {
      nomor = await fetchNumberFromAPI();
      console.log(`▶ [${index + 1}/${goal}] Fetched from API:`, nomor);
    } catch (e) {
      console.error(`❌ [${index + 1}/${goal}] Failed to fetch from API:`, e);
      updateProgressOverlay("API Error", currentDateDisplay, "-", index, goal);
      await sleep(delayMs);
      continue;
    }

    updateProgressOverlay("Running", currentDateDisplay, nomor, index, goal);

    try {
      await clearPopups();
      await inputNoPencarian(nomor);
      await sleep(delayMs);

      await clickCari();
      await sleep(delayMs);

      await handleUpdateNIKModal();

      await selectOptions();
      await sleep(delayMs * 2);

      index += 1;
      await updateProgress(index, goal, "running");
      console.log(`✅ [${index}/${goal}] Success:`, nomor);
      updateProgressOverlay("Running", currentDateDisplay, nomor, index, goal);
    } catch (e) {
      console.error(`❌ [${index + 1}/${goal}] FAILED:`, nomor, e);
      index += 1;
      await updateProgress(index, goal, "error");
      updateProgressOverlay("Error", currentDateDisplay, nomor, index, goal);
      // Continue to next number instead of stopping
      await sleep(delayMs);
    }
  }

  // Check if goal reached and there are more dates
  if (dateIndex + 1 < dates.length) {
    console.log(`✓ Goal reached for ${currentDateDisplay}. Moving to next date...`);
    updateProgressOverlay("Moving to next date...", currentDateDisplay, "-", goal, goal);
    await chrome.storage.local.set({
      dateIndex: dateIndex + 1,
      paused: false,
      progress: {
        done: 0,
        total: dateGoals[dates[dateIndex + 1]] || 1,
        status: "running"
      }
    });
    
    running = false;
    // Auto-continue to next date
    setTimeout(() => run(), 1000);
  } else {
    await updateProgress(goal, goal, "done");
    updateProgressOverlay("Completed", currentDateDisplay, "-", goal, goal);
    running = false;
  }
}

/* ===============================
   HELPERS
================================ */
async function fetchNumberFromAPI() {
  const API_URL = "https://v0-pcare.vercel.app/api/next-number";
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    if (!data.numbers) {
      throw new Error("No number in API response");
    }
    return data.numbers;
  } catch (err) {
    console.error("❌ Failed to fetch from API:", err);
    throw err;
  }
}

async function updateProgress(done, total, status) {
  await chrome.storage.local.set({
    progress: { done, total, status },
    currentIndex: done
  });
}

async function clearPopups() {
  document.querySelectorAll(".bootbox.modal,.modal-backdrop").forEach(e => e.remove());
  document.body.classList.remove("modal-open");
}

async function handleUpdateNIKModal() {
  await sleep(400);
  const modal = document.querySelector("#updateNIK_modal");
  if (!modal) return;

  modal.querySelector("#batalNIKSubmit_btn")?.click();
  await sleep(300);
  modal.remove();
}

async function inputNoPencarian(nomor) {
  const label = [...document.querySelectorAll("label")]
    .find(l => l.innerText.includes("No. Pencarian"));
  
  if (!label) {
    console.error("❌ Label 'No. Pencarian' not found");
    throw "No. Pencarian not found";
  }

  const input =
    label.closest(".form-group")?.querySelector("input") ||
    label.parentElement?.querySelector("input");

  if (!input) {
    console.error("❌ Input field for No. Pencarian not found");
    throw "Input field not found";
  }

  input.value = "";
  input.focus();
  input.value = nomor;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  console.log("✍️ Input entered:", nomor);
}

async function clickCari() {
  const button = [...document.querySelectorAll("button")]
    .find(b => b.innerText.trim() === "Cari");
  
  if (!button) {
    console.error("❌ 'Cari' button not found");
    throw "Cari button not found";
  }
  
  button.click();
  console.log("🔍 Clicked Cari button");
}

async function selectOptions() {
  try {
    clickRadio("Kunjungan Sehat");
    console.log("✓ Clicked Kunjungan Sehat");
  } catch (e) {
    console.warn("⚠️ Kunjungan Sehat not found:", e);
  }

  try {
    clickRadio("Rawat Jalan");
    console.log("✓ Clicked Rawat Jalan");
  } catch (e) {
    console.warn("⚠️ Rawat Jalan not found:", e);
  }

  try {
    const poli = document.querySelector("#poli");
    if (poli) {
      poli.value = "021";
      poli.dispatchEvent(new Event("change", { bubbles: true }));
      console.log("✓ Set poli to 021");
    }
  } catch (e) {
    console.warn("⚠️ Poli field not found:", e);
  }

  try {
    const saveBtn = document.querySelector("#btnSimpanPendaftaran");
    if (saveBtn) {
      saveBtn.click();
      console.log("✓ Clicked Save button");
    } else {
      console.warn("⚠️ Save button not found");
    }
  } catch (e) {
    console.error("❌ Error clicking save:", e);
  }
}

function clickRadio(text) {
  const lbl = [...document.querySelectorAll("label")]
    .find(l => l.innerText.includes(text));
  
  if (!lbl) {
    console.warn(`⚠️ Label "${text}" not found`);
    return;
  }
  
  const radio = lbl.querySelector("input");
  if (!radio) {
    console.warn(`⚠️ Radio input for "${text}" not found`);
    return;
  }
  
  radio.click();
  console.log(`✓ Clicked radio: ${text}`);
}
