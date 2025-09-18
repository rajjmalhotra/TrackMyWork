function renderRiskMeter(level, confidence) {
  const el = document.getElementById("riskMeter");
  let color = level === "High" ? "red" : level === "Medium" ? "orange" : "green";
  const percent = Math.round(confidence * 100);
  let textColor = document.body.classList.contains("dark") ? "#fff" : "#000";
  el.innerHTML = `
    <svg width="120" height="120">
      <circle cx="60" cy="60" r="50" stroke="#444" stroke-width="12" fill="none"/>
      <circle cx="60" cy="60" r="50"
        stroke="${color}" stroke-width="12" fill="none"
        stroke-dasharray="${(percent/100)*314},314"
        stroke-linecap="round"
        transform="rotate(-90 60 60)"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="20" fill="${textColor}">${percent}%</text>
    </svg>`;
}

function renderResults(resp, tabId) {
  document.getElementById("verdict").textContent = `Risk: ${resp.risk_level}`;
  renderRiskMeter(resp.risk_level, resp.confidence);

  // Advice
  const adviceDiv = document.getElementById("advice");
  adviceDiv.innerHTML = "";
  if (resp.advice) {
    adviceDiv.innerHTML = `<div><b>Advice:</b> ${resp.advice}</div>`;
  }

  // Evidence list
  const evDiv = document.getElementById("evidence");
  evDiv.innerHTML = "";
  if (resp.evidence && resp.evidence.length) {
    evDiv.innerHTML = "<b>Evidence:</b>";
    resp.evidence.forEach(snippet => {
      const li = document.createElement("div");
      li.textContent = snippet;
      const btn = document.createElement("button");
      btn.textContent = "Highlight";
      btn.onclick = () => {
        chrome.tabs.sendMessage(tabId, { action: "highlight_snippet", snippet });
      };
      li.appendChild(btn);
      evDiv.appendChild(li);
    });
  }

  // Export report
  document.getElementById("exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(resp, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: "trackmywork-report.json",
      saveAs: true
    }, () => {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
  };
}

document.getElementById("scanBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: "get_page_content" }, async (page) => {
    if (chrome.runtime.lastError) {
      document.getElementById("verdict").textContent = "⚠️ Content script not loaded. Refresh the page.";
      return;
    }
    if (!page || !page.sentences) {
      document.getElementById("verdict").textContent = "⚠️ No content extracted.";
      return;
    }

    const resp = await chrome.runtime.sendMessage({
      action: "evaluate_page",
      payload: { page }
    });

    renderResults(resp, tab.id);
  });
});

// Theme toggle
document.getElementById("themeBtn").addEventListener("click", () => {
  const body = document.body;
  if (body.classList.contains("dark")) {
    body.classList.remove("dark"); body.classList.add("light");
  } else {
    body.classList.remove("light"); body.classList.add("dark");
  }
  // Refresh meter text color
  const verdictDiv = document.getElementById("verdict").textContent;
  if (verdictDiv.includes("Risk:")) {
    const risk = verdictDiv.split("Risk: ")[1].split(" ")[0];
    const confidence = 0.3; // fallback to 30% if no data
    renderRiskMeter(risk, confidence);
  }
});