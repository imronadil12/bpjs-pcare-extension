const API_URL = "https://v0-pcare.vercel.app/api/next-number";

console.log("✅ PCARE background service worker started");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== "fetchNextNumber") return;

  console.log("📩 BG received fetchNextNumber");

  const xhr = new XMLHttpRequest();
  xhr.open("GET", API_URL, true);
  xhr.responseType = "json";

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      const data = xhr.response;
      if (!data?.numbers) {
        sendResponse({ success: false, error: "Invalid API payload" });
      } else {
        sendResponse({ success: true, number: data.numbers });
      }
    } else {
      sendResponse({
        success: false,
        error: `API status ${xhr.status}`
      });
    }
  };

  xhr.onerror = () => {
    sendResponse({
      success: false,
      error: "Network error (XHR)"
    });
  };

  xhr.send();

  return true; // 🔴 REQUIRED
});
