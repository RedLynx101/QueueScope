/* QueueScope's self-contained MV3 observer. Keep behavior aligned with src/core/rules.ts. */
(() => {
  if (window.__queueScopeObserverInstalled) return;
  window.__queueScopeObserverInstalled = true;
  let rules;
  let priorQueueLock = false;
  let lastSignature = "";
  let lastSentAt = 0;
  let timer;

  const firstMatch = (text, values) => values.find((value) => text.includes(value));
  const safePattern = (value) => {
    if (!value || value.length > 200 || /\([^)]*[+*][^)]*\)[+*{]/.test(value)) return undefined;
    try { return new RegExp(value, "i"); } catch { return undefined; }
  };
  const parseDuration = (value) => {
    const clock = value.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
    if (clock) return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
    const minutes = value.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
    if (minutes) return Number(minutes[1]) * 60;
    const seconds = value.match(/(\d+)\s*(?:s|sec|secs|second|seconds)\b/i);
    return seconds ? Number(seconds[1]) : undefined;
  };
  const available = () => {
    if (!rules?.availableSelector || rules.availableSelector.length > 200 || /[\r\n{}]/.test(rules.availableSelector)) return false;
    try {
      const node = document.querySelector(rules.availableSelector);
      return Boolean(node && !node.hasAttribute("disabled") && node.getAttribute("aria-disabled") !== "true");
    } catch { return false; }
  };
  const classify = () => {
    const observedAt = Date.now();
    const text = (document.body?.innerText ?? "").slice(0, 100_000).toLowerCase();
    const challenge = firstMatch(text, rules.challengeText);
    const queue = firstMatch(text, rules.queueText);
    const admitted = priorQueueLock ? firstMatch(text, rules.admittedText) : undefined;
    const unavailable = firstMatch(text, rules.unavailableText);
    let classification = "unknown";
    let evidence = "No configured signal matched.";
    let confidence = 0.25;
    if (challenge) { classification = "challenge"; evidence = `Challenge text matched: ${challenge}`; confidence = 0.98; }
    else if (queue) { classification = "queue"; evidence = `Queue text matched: ${queue}`; confidence = 0.98; }
    else if (admitted) { classification = "admitted"; evidence = `Post-queue admission text matched: ${admitted}`; confidence = 0.97; }
    else if (available()) { classification = "available"; evidence = `Availability selector matched: ${rules.availableSelector}`; confidence = 0.94; }
    else if (unavailable) { classification = "unavailable"; evidence = `Unavailable text matched: ${unavailable}`; confidence = 0.9; }
    else if (text) { classification = "product"; evidence = "Page loaded; no attention signal matched."; confidence = 0.55; }
    const observation = { observedAt, url: location.href, title: document.title.slice(0, 180), classification, confidence, evidence: [evidence.slice(0, 240)] };
    if (classification === "queue") {
      const positionMatch = safePattern(rules.positionPattern)?.exec(text);
      const position = positionMatch?.[1] ? Number(positionMatch[1].replaceAll(",", "")) : undefined;
      if (Number.isFinite(position) && position >= 0 && position <= 1_000_000_000) observation.position = position;
      const etaMatch = safePattern(rules.etaPattern)?.exec(text);
      const duration = etaMatch?.[1] ? parseDuration(etaMatch[1]) : undefined;
      if (duration !== undefined && duration >= 0 && duration <= 604_800) {
        observation.providerEtaAt = observedAt + duration * 1000;
        observation.providerEtaLabel = etaMatch[1].slice(0, 80);
      }
    }
    return observation;
  };
  const load = async () => {
    const response = await chrome.runtime.sendMessage({ type: "GET_TAB_CONFIG" });
    if (response?.ok && response.data) { rules = response.data.rules; priorQueueLock = response.data.priorQueueLock; }
  };
  const scan = async () => {
    if (!rules) await load();
    if (!rules) return;
    const observation = classify();
    if (["queue", "challenge"].includes(observation.classification)) priorQueueLock = true;
    const signature = JSON.stringify([observation.url, observation.classification, observation.position, observation.providerEtaAt ? Math.round(observation.providerEtaAt / 30_000) : undefined, observation.evidence[0]]);
    if (signature !== lastSignature || Date.now() - lastSentAt >= 30_000) {
      lastSignature = signature; lastSentAt = Date.now();
      await chrome.runtime.sendMessage({ type: "OBSERVATION", observation });
    }
  };
  const schedule = () => { if (timer !== undefined) clearTimeout(timer); timer = setTimeout(() => void scan(), 350); };
  new MutationObserver(schedule).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  addEventListener("pageshow", schedule); addEventListener("popstate", schedule);
  void chrome.runtime.sendMessage({ type: "CONTENT_READY", url: location.href });
  schedule();
})();
