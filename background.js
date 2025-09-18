async function callInPage(tabId, fnName, arg) {
  try {
    await chrome.scripting.executeScript({ target:{tabId}, files:["injected_ai_runner.js"] });
    const res = await chrome.scripting.executeScript({
      target:{tabId},
      func: (name, arg) => {
        return window.__TRACKMYWORK_RUNNER__ ? window.__TRACKMYWORK_RUNNER__[name](arg) : null;
      },
      args: [fnName, arg]
    });
    return res && res[0] && res[0].result;
  } catch(e) {
    console.warn("callInPage error", e);
    return null;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "evaluate_page") {
    (async () => {
      try {
        const { page } = msg.payload || {};
        if (!page || !page.sentences) {
          sendResponse({ risk_level: "Low", evidence: [], confidence: 0, advice: "No content found" });
          return;
        }

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs?.[0]?.id;
        if (!tabId) {
          sendResponse({ risk_level: "Low", evidence: [], confidence: 0, advice: "No active tab" });
          return;
        }

        const joined = page.sentences.join("\n\n").slice(0, 20000);
        let summary = await callInPage(tabId, "runSummarize", joined);
        if (!summary) summary = joined.slice(0,2000);

        const prompt = `You are a security auditor. Analyze the following page summary and decide if it exploits user data.\nPageSummary:\n\"\"\"${summary}\"\"\"\n\nReturn ONLY JSON with keys: risk_level (High|Medium|Low), evidence (array of short snippets), confidence (0-1), advice (string).`;

        const raw = await callInPage(tabId, "runPrompt", prompt);
        let parsed = null;
        try { parsed = raw ? JSON.parse(raw) : null; } catch(e) {}

        if (!parsed) {
          const riskyWords = ["track","cookie","analytics","beacon","fingerprint","data broker","pixel","session","consent"];
          const matches = page.sentences.filter(s =>
            riskyWords.some(word => s.toLowerCase().includes(word))
          );
          sendResponse({
            risk_level: matches.length > 5 ? "High" : matches.length > 2 ? "Medium" : "Low",
            evidence: matches.slice(0, 10),
            confidence: matches.length > 0 ? 0.6 : 0.3,
            advice: matches.length > 0
              ? "This site may track you. Consider blocking trackers, reviewing permissions, or using privacy tools."
              : "No clear signs of data exploitation detected."
          });
          return;
        }

        sendResponse(parsed);

      } catch (err) {
        console.error("evaluate_page error", err);
        sendResponse({ risk_level: "Low", evidence: [], confidence: 0, advice: "Error scanning page" });
      }
    })();
    return true;
  }
});