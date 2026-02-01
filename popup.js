const el = id => document.getElementById(id);

let dates = [];
let dateGoals = {}; // { date: ISO string, goal: number }

const API_URL = "https://v0-pcare.vercel.app/api/next-number";

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

// Fetch a number from API
async function fetchNumberFromAPI() {
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

/* ===============================
   LOAD SAVED STATE
================================ */
chrome.storage.local.get(
  ["tanggal", "dateGoals", "delayMs", "progress", "dateIndex"],
  data => {
    dates = Array.isArray(data.tanggal) ? data.tanggal : [];
    dateGoals = data.dateGoals || {};
    el("tanggal").value = dates.map(d => displayDate(d)).join("\n");
    
    if (data.delayMs) el("delay").value = data.delayMs;

    if (data.progress) {
      el("status").innerText = data.progress.status || "Idle";
      el("counter").innerText =
        `${data.progress.done || 0} / ${data.progress.total || 0}`;
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
   START
================================ */
el("start").onclick = async () => {
  if (!dates.length) {
    alert("Pilih tanggal terlebih dahulu");
    return;
  }

  const delayMs = parseInt(el("delay").value, 10) || 1200;
  const goal = dates.length > 0 ? dateGoals[dates[0]] || 0 : 0;

  if (!goal) {
    alert("Goal harus diset");
    return;
  }

  await chrome.storage.local.set({
    tanggal: dates,
    dateGoals: dateGoals,
    delayMs,
    paused: false,
    dateIndex: 0,
    progress: {
      done: 0,
      total: goal,
      status: "running"
    }
  });

  el("status").innerText = "running";
  el("currentDate").innerText = `Date: ${displayDate(dates[0])}`;
  el("counter").innerText = `0 / ${goal}`;

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
  const data = await chrome.storage.local.get(["tanggal", "dateIndex", "dateGoals"]);
  const datesToUse = data.tanggal || [];
  let dateIdx = data.dateIndex || 0;
  const goalMap = data.dateGoals || {};

  if (dateIdx + 1 >= datesToUse.length) {
    alert("No more dates");
    return;
  }

  dateIdx += 1;
  const nextDate = datesToUse[dateIdx];
  const nextGoal = goalMap[nextDate] || 0;

  await chrome.storage.local.set({
    dateIndex: dateIdx,
    paused: false,
    progress: {
      done: 0,
      total: nextGoal,
      status: "running"
    }
  });

  el("status").innerText = "running";
  el("currentDate").innerText = `Date: ${displayDate(nextDate)}`;
  el("counter").innerText = `0 / ${nextGoal}`;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "start" });
};
