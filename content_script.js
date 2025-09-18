(() => {
  function extractSentences() {
    const text = document.body.innerText || "";
    const raw = text.replace(/\u00A0/g, " ");
    return raw
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .slice(0, 500);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "get_page_content") {
      sendResponse({
        url: location.href,
        title: document.title,
        sentences: extractSentences()
      });
      return true;
    }
    if (msg.action === "highlight_snippet") {
      highlightText(msg.snippet);
      sendResponse({ ok: true });
      return true;
    }
  });

  function highlightText(snippet) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    while(walker.nextNode()){
      const node = walker.currentNode;
      const idx = node.nodeValue.indexOf(snippet);
      if (idx >= 0) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + snippet.length);
        const span = document.createElement("span");
        span.style.background = "yellow";
        span.style.borderRadius = "3px";
        range.surroundContents(span);
        span.scrollIntoView({behavior:"smooth", block:"center"});
        break;
      }
    }
  }
})();