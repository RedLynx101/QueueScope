import { classifyWithRules } from "../src/core/rules";
import { DEFAULT_RULES } from "../src/core/defaults";
import type { Observation, RuntimeResponse } from "../src/core/types";
import "./lab.css";

type Stage = "product" | "queue" | "challenge" | "available" | "admitted";
const copy: Record<Stage, { code: string; title: string; body: string; signal: string; position: string; eta: string }> = {
  product: { code: "01", title: "Product page observed", body: "The page is loaded and no configured attention signal is present.", signal: "A neutral product page is visible.", position: "—", eta: "—" },
  queue: { code: "02", title: "Waiting room detected", body: "Configured queue evidence is visible. Guarded navigation should lock immediately.", signal: "You are now in the waiting room. Position 428. Estimated wait 00:08:30.", position: "428", eta: "00:08:30" },
  challenge: { code: "03", title: "Manual verification needed", body: "A challenge signal requires attention. QueueScope preserves the tab and does not interact.", signal: "Please verify you are human before continuing.", position: "—", eta: "—" },
  available: { code: "04", title: "Configured action is available", body: "The availability selector is present and enabled. QueueScope should notify, not click it.", signal: "The configured product view has changed.", position: "—", eta: "—" },
  admitted: { code: "05", title: "Post-queue admission detected", body: "Admission is valid only because the run previously observed queue evidence.", signal: "Access granted. Your session is ready.", position: "—", eta: "—" }
};

let stage: Stage = "product";
let priorQueueLock = false;

function element<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T; }

async function report() {
  const available = element<HTMLButtonElement>("available-control");
  const observation: Observation = classifyWithRules(DEFAULT_RULES, {
    url: location.href,
    title: document.title,
    text: document.body.innerText,
    availableSelectorMatched: !available.disabled,
    priorQueueLock
  });
  if (["queue", "challenge"].includes(observation.classification)) priorQueueLock = true;
  element("classification").textContent = observation.classification;
  try {
    const result = await chrome.runtime.sendMessage({ type: "LAB_OBSERVATION", observation }) as RuntimeResponse;
    if (!result?.ok) throw new Error(result?.error || "Observation was not accepted.");
  } catch (error) {
    document.body.dataset.runtime = "unavailable";
    console.info("Queue Lab preview mode", error);
  }
}

function setStage(next: Stage) {
  stage = next;
  const value = copy[next];
  element("stage-code").textContent = value.code;
  element("stage-title").textContent = value.title;
  element("stage-body").textContent = value.body;
  element("signal").textContent = value.signal;
  element("position").textContent = value.position;
  element("eta").textContent = value.eta;
  const available = element<HTMLButtonElement>("available-control");
  available.disabled = next !== "available";
  available.dataset.queuescopeAvailable = String(next === "available");
  document.querySelectorAll<HTMLButtonElement>("[data-stage]").forEach((button) => button.classList.toggle("active", button.dataset.stage === next));
  document.body.dataset.stage = next;
  void report();
}

document.querySelectorAll<HTMLButtonElement>("[data-stage]").forEach((button) => button.addEventListener("click", () => setStage(button.dataset.stage as Stage)));
setStage(stage);
