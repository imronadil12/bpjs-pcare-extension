const el = id => document.getElementById(id);
let dates = [];
let dateGoals = {};

// Helpers
const formatDateISO = (dateStr) => new Date(dateStr).toISOString();
const displayDate = (isoDateStr) => {
  const d = new Date(isoDateStr);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()}`;
};

// Update UI from Storage
function updateUI() {
  chrome.storage.local.get(null, (data) => {
    dates = data.tanggal || [];
    dateGoals = data.dateGoals || {};
    const idx = data.dateIndex || 0;
    const prog = data.progress || { done: 0, total: 0, status: "Idle" };

    el("status").innerText = prog.status;
    el("counter").innerText = `${prog.done} / ${prog.total}`;
    el("currentDate").innerText = dates[idx] ? `Date: ${displayDate(dates[idx])}` : "Date: -";
    el("delay").value = data.delayMs || 1200;

    renderTags();
  });
}

function renderTags() {
  const container = el("dateTagsContainer");
  container.innerHTML = "";
  dates.forEach((d, i) => {
    const div = document.createElement("div");
    div.className = "date-tag";
    div.innerHTML = `<span>${displayDate(d)} (Goal: ${dateGoals[d]||0})</span> <button data-idx="${i}">×</button>`;
    div.querySelector("button").onclick = () => removeDate(i);
    container.appendChild(div);
  });
}

// Actions
el("addDateBtn").onclick = () => {
  const dVal = el("datePickerInput").value;
  const gVal = parseInt(el("goalInput").value);
  if (!dVal || isNaN(gVal)) return alert("Invalid Input");

  const iso = formatDateISO(dVal);
  chrome.storage.local.get(["tanggal", "dateGoals"], data => {
    const newDates = data.tanggal || [];
    const newGoals = data.dateGoals || {};
    if (!newDates.includes(iso)) {
      newDates.push(iso);
      newGoals[iso] = gVal;
      chrome.storage.local.set({ tanggal: newDates, dateGoals: newGoals }, () => {
        updateUI();
        el("datePickerInput").value = "";
      });
    }
  });
};

function removeDate(index) {
  chrome.storage.local.get(["tanggal", "dateGoals"], data => {
    const newDates = [...(data.tanggal || [])];
    const newGoals = {...(data.dateGoals || {})};
    const removed = newDates.splice(index, 1)[0];
    delete newGoals[removed];
    chrome.storage.local.set({ tanggal: newDates, dateGoals: newGoals }, updateUI);
  });
}

el("start").onclick = () => {
  chrome.storage.local.get(["tanggal", "dateGoals"], data => {
    if (!data.tanggal?.length) return alert("No dates!");
    const first = data.tanggal[0];
    const goal = data.dateGoals[first];
    const delay = parseInt(el("delay").value) || 1200;

    chrome.storage.local.set({
      paused: false,
      dateIndex: 0,
      delayMs: delay,
      progress: { done: 0, total: goal, status: "running" }
    }, () => {
      chrome.tabs.query({active:true, currentWindow:true}, tabs => {
        if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id, {action: "start"});
      });
      updateUI();
    });
  });
};

el("pause").onclick = () => chrome.storage.local.set({paused: true}, updateUI);
el("resume").onclick = () => {
  chrome.storage.local.set({paused: false}, () => {
    chrome.tabs.query({active:true, currentWindow:true}, tabs => {
      if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id, {action: "resume"});
    });
    updateUI();
  });
};

el("nextDate").onclick = () => {
  chrome.storage.local.get(["tanggal", "dateIndex", "dateGoals"], data => {
    const nextIdx = (data.dateIndex || 0) + 1;
    if (nextIdx >= (data.tanggal || []).length) return alert("No more dates");
    
    const nextDate = data.tanggal[nextIdx];
    chrome.storage.local.set({
      paused: false,
      dateIndex: nextIdx,
      progress: { done: 0, total: data.dateGoals[nextDate], status: "running" }
    }, () => {
       chrome.tabs.query({active:true, currentWindow:true}, tabs => {
        if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id, {action: "start"});
      });
      updateUI();
    });
  });
};

document.addEventListener("DOMContentLoaded", updateUI);