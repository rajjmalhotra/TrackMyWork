async function runSummarize(text) {
  if (window.ai && window.ai.summarize) {
    try {
      const res = await window.ai.summarize({ text, mode: "short" });
      return res.summary || text.slice(0, 2000);
    } catch(e) { return text.slice(0,2000); }
  }
  return text.slice(0,2000);
}

async function runPrompt(prompt) {
  if (window.ai && window.ai.prompt) {
    try {
      const out = await window.ai.prompt({ input: prompt });
      return out.output || out;
    } catch(e) { return null; }
  }
  return null;
}

window.__TRACKMYWORK_RUNNER__ = { runSummarize, runPrompt };