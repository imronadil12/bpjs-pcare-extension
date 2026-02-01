const el = id => document.getElementById(id);

let dates = [];
let dateGoals = {}; // { date: ISO string, goal: number }

// Convert YYYY-MM-DD string to ISO date string
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toISOString();
}

// Convert ISO date string to YYYY-MM-DD for input
function parseDateForInput(isoDateStr) {
  const date = new Date(isoDateStr);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format ISO date for display (DD-MM-YYYY)
function displayDate(isoDateStr) {
  const date = new Date(isoDateStr);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

/* ===============================
   LOAD SAVED STATE
================================ */
chrome.storage.local.get(
  ["tanggal", "dateGoals", "numbers", "delayMs", "progress", "dateIndex", "startIndex", "currentIndex"],
  data => {
    dates = Array.isArray(data.tanggal) ? data.tanggal : [];
    dateGoals = data.dateGoals || {};
    el("tanggal").value = dates.map(d => displayDate(d)).join("\n");
    
    if (data.numbers) el("numbers").value = data.numbers.join("\n");
    if (data.delayMs) el("delay").value = data.delayMs;

    if (data.progress) {
      el("status").innerText = data.progress.status || "Idle";
      el("counter").innerText =
        `${data.progress.done || 0} / ${data.progress.total || 0}`;
    }
    
    // Set start index
    if (data.startIndex !== undefined) {
      el("startIndex").value = data.startIndex;
    } else {
      el("startIndex").value = 0;
    }
    
    // Set current running index
    if (data.currentIndex !== undefined) {
      el("currentIndex").value = data.currentIndex;
    } else {
      el("currentIndex").value = 0;
    }

    const dateIdx = data.dateIndex || 0;
    if (dates[dateIdx]) {
      el("currentDate").innerText = `Date: ${displayDate(dates[dateIdx])}`;
    }

    renderDateTags();
  }
);

/* ===============================
   RENDER DATE TAGS
================================ */
function renderDateTags() {
  const container = el("dateTagsContainer");
  container.innerHTML = "";
  
  dates.forEach((date, idx) => {
    const goal = dateGoals[date] || "-";
    const tag = document.createElement("div");
    tag.className = "date-tag";
    
    const tagText = document.createElement("span");
    tagText.textContent = `${displayDate(date)} (Goal: ${goal})`;
    
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeDate(idx);
    };
    
    tag.appendChild(tagText);
    tag.appendChild(removeBtn);
    container.appendChild(tag);
  });
}

/* ===============================
   ADD DATE
================================ */
el("addDateBtn").onclick = () => {
  const dateValue = el("datePickerInput").value;
  const goalValue = el("goalInput").value;
  
  if (!dateValue) {
    alert("Pilih tanggal terlebih dahulu");
    return;
  }
  
  if (!goalValue) {
    alert("Masukkan goal terlebih dahulu");
    return;
  }
  
  const formattedDate = formatDate(dateValue);
  
  if (!dates.includes(formattedDate)) {
    dates.push(formattedDate);
    dateGoals[formattedDate] = parseInt(goalValue, 10);
    el("tanggal").value = dates.map(d => displayDate(d)).join("\n");
    renderDateTags();
    el("datePickerInput").value = "";
    el("goalInput").value = "";
    
    // Save to Chrome storage
    chrome.storage.local.set({
      tanggal: dates,
      dateGoals: dateGoals
    });
    
    console.log(`✅ Date added: ${displayDate(formattedDate)}`);
  }
};

/* ===============================
   REMOVE DATE
================================ */
function removeDate(idx) {
  if (idx < 0 || idx >= dates.length) {
    console.error(`❌ Invalid index: ${idx}`);
    return;
  }
  
  const dateToRemove = dates[idx];
  const displayDateRemoved = displayDate(dateToRemove);
  
  // Remove from dates array
  dates.splice(idx, 1);
  
  // Remove from goals object
  delete dateGoals[dateToRemove];
  
  // Update UI
  el("tanggal").value = dates.map(d => displayDate(d)).join("\n");
  renderDateTags();
  
  // Save to Chrome storage
  chrome.storage.local.set({
    tanggal: dates,
    dateGoals: dateGoals
  }, () => {
    console.log(`✅ Date removed: ${displayDateRemoved}`);
  });
}

/* ===============================
   FILE UPLOAD
================================ */
el("uploadBtn").onclick = () => {
  el("fileInput").click();
};

el("fileInput").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const numbers = text
    .split("\n")
    .map(n => n.trim())
    .filter(Boolean);

  el("numbers").value = numbers.join("\n");
  console.log(`✅ Loaded ${numbers.length} numbers from file`);
};

/* ===============================
   LOAD FROM URL
================================ */
el("loadUrlBtn").onclick = async () => {
  const url = el("urlInput").value.trim();
  
  if (!url) {
    alert("Masukkan URL terlebih dahulu");
    return;
  }

  try {
    el("loadUrlBtn").disabled = true;
    el("loadUrlBtn").innerText = "⏳ Loading...";
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    const numbers = text
      .split("\n")
      .map(n => n.trim())
      .filter(Boolean);

    el("numbers").value = numbers.join("\n");
    el("urlInput").value = "";
    console.log(`✅ Loaded ${numbers.length} numbers from URL`);
    alert(`✅ Loaded ${numbers.length} numbers`);
  } catch (err) {
    console.error("❌ Error loading URL:", err);
    alert(`❌ Error: ${err.message}`);
  } finally {
    el("loadUrlBtn").disabled = false;
    el("loadUrlBtn").innerText = "🔗 Load";
  }
}

/* ===============================
   START
================================ */
el("start").onclick = async () => {
  const numbers = el("numbers").value
    .split("\n")
    .map(n => n.trim())
    .filter(Boolean);

  if (!dates.length || !numbers.length) {
    alert("Tanggal & nomor wajib diisi");
    return;
  }

  const delayMs = parseInt(el("delay").value, 10) || 1200;
  const startIndex = parseInt(el("startIndex").value, 10) || 0;

  if (startIndex >= numbers.length) {
    alert(`Start index (${startIndex}) must be less than total numbers (${numbers.length})`);
    return;
  }

  await chrome.storage.local.set({
    tanggal: dates,
    dateGoals: dateGoals,
    delayMs,
    numbers,
    paused: false,
    dateIndex: 0,
    startIndex: startIndex,
    currentIndex: startIndex,
    progress: {
      done: startIndex,
      total: dates.length > 0 ? dateGoals[dates[0]] || numbers.length : numbers.length,
      status: "running"
    }
  });

  el("status").innerText = "running";
  el("currentDate").innerText = `Date: ${displayDate(dates[0])}`;
  el("currentIndex").value = startIndex;
  el("counter").innerText = `${startIndex} / ${dateGoals[dates[0]] || numbers.length}`;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "start" });
};

/* ===============================
   PAUSE / RESUME
================================ */
el("pause").onclick = () =>
  chrome.storage.local.set({ paused: true });

el("resume").onclick = async () => {
  await chrome.storage.local.set({ paused: false });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "resume" });
};

/* ===============================
   NEXT DATE
================================ */
el("nextDate").onclick = async () => {
  const data = await chrome.storage.local.get(["tanggal", "dateIndex", "numbers"]);
  const datesToUse = data.tanggal || [];
  let dateIdx = data.dateIndex || 0;

  if (dateIdx + 1 >= datesToUse.length) {
    alert("No more dates");
    return;
  }

  dateIdx += 1;

  await chrome.storage.local.set({
    dateIndex: dateIdx,
    currentIndex: 0,
    paused: false,
    progress: {
      done: 0,
      total: data.numbers?.length || 0,
      status: "running"
    }
  });

  el("status").innerText = "running";
  el("currentDate").innerText = `Date: ${displayDate(datesToUse[dateIdx])}`;
  el("currentIndex").value = 0;
  el("counter").innerText = `0 / ${data.numbers?.length || 0}`;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "start" });
};
