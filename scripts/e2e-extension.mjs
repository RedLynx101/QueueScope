import { access, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { chromium } from "playwright-core";

async function browserPath() {
  if (process.env.QUEUESCOPE_CHROME_PATH) return process.env.QUEUESCOPE_CHROME_PATH;
  const root = join(process.env.LOCALAPPDATA ?? "", "ms-playwright");
  try {
    for (const name of (await readdir(root)).filter((value) => value.startsWith("chromium-")).sort().reverse()) {
      const candidate = join(root, name, "chrome-win64", "chrome.exe");
      try { await access(candidate); return candidate; } catch { /* next */ }
    }
  } catch { /* use system browser */ }
  const programFiles = process.env.PROGRAMFILES;
  if (!programFiles) throw new Error("No Playwright Chromium or PROGRAMFILES browser root is available.");
  return join(programFiles, "Google", "Chrome", "Application", "chrome.exe");
}

const dist = resolve("dist");
const results = resolve("test-results");
const profile = await mkdtemp(join(tmpdir(), "queuescope-public-e2e-"));
if (!profile.startsWith(tmpdir()) || !basename(profile).startsWith("queuescope-public-e2e-")) throw new Error("Unsafe E2E profile path.");
await mkdir(results, { recursive: true });
let context;
const browserErrors = [];
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: await browserPath(), headless: false, viewport: { width: 1440, height: 1000 },
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, "--no-first-run", "--no-default-browser-check", "--disable-component-update"]
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker", { timeout: 15_000 });
  const id = new URL(worker.url()).host;
  if (!id) throw new Error("Extension service worker did not load.");

  const dashboard = await context.newPage();
  dashboard.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  dashboard.on("pageerror", (error) => browserErrors.push(error.message));
  await dashboard.goto(`chrome-extension://${id}/dashboard.html`);
  await dashboard.getByRole("heading", { name: "Observe the moment. Preserve the tab." }).waitFor();
  if ((await dashboard.title()) !== "QueueScope") throw new Error("Dashboard tab title is not QueueScope.");
  const dashboardBrand = await dashboard.locator(".brand-mark img").first().evaluate((image) => ({
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    file: new URL(image.src).pathname
  }));
  if (!dashboardBrand.complete || dashboardBrand.naturalWidth !== 128 || dashboardBrand.naturalHeight !== 128 || dashboardBrand.file !== "/icons/icon-128.png") {
    throw new Error(`Dashboard did not render the canonical app icon: ${JSON.stringify(dashboardBrand)}`);
  }
  await dashboard.screenshot({ path: join(results, "command-center.png"), fullPage: true });

  await dashboard.getByRole("button", { name: "Queue Lab", exact: true }).click();
  await dashboard.getByRole("heading", { name: "Rehearse the state machine before it matters." }).waitFor();
  await dashboard.waitForTimeout(500);
  const orbit = await dashboard.locator(".lab-orbit").boundingBox();
  const dot = await dashboard.locator(".orbiter").boundingBox();
  if (!orbit || !dot) throw new Error("Queue Lab orbit geometry is missing.");
  const distance = Math.hypot(dot.x + dot.width / 2 - (orbit.x + orbit.width / 2), dot.y + dot.height / 2 - (orbit.y + orbit.height / 2));
  if (Math.abs(distance - orbit.width / 2) > 3) throw new Error(`Queue Lab orbit dot drifted by ${Math.abs(distance - orbit.width / 2).toFixed(2)}px.`);
  await dashboard.screenshot({ path: join(results, "queue-lab.png"), fullPage: true });

  const opened = await dashboard.evaluate(async () => chrome.runtime.sendMessage({ type: "OPEN_QUEUE_LAB" }));
  if (!opened?.ok) throw new Error(`Queue Lab did not open: ${opened?.error || "unknown runtime error"}`);
  let lab = context.pages().find((page) => page.url().includes("/harness/index.html"));
  for (let attempt = 0; !lab && attempt < 40; attempt += 1) {
    await dashboard.waitForTimeout(250);
    lab = context.pages().find((page) => page.url().includes("/harness/index.html"));
  }
  if (!lab) throw new Error(`Queue Lab tab was not exposed to Playwright. Pages: ${context.pages().map((page) => page.url()).join(", ")}`);
  await lab.getByRole("heading", { name: "Product page observed" }).waitFor();
  const labBrand = await lab.locator(".scope-mark img").evaluate((image) => ({
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    file: new URL(image.src).pathname
  }));
  if (!labBrand.complete || labBrand.naturalWidth !== 128 || labBrand.naturalHeight !== 128 || labBrand.file !== "/icons/icon-128.png") {
    throw new Error(`Queue Lab did not render the canonical app icon: ${JSON.stringify(labBrand)}`);
  }
  await lab.getByRole("button", { name: /Queue Lock navigation/ }).click();
  await lab.getByRole("heading", { name: "Waiting room detected" }).waitFor();
  await lab.screenshot({ path: join(results, "queue-lab-waiting.png"), fullPage: true });

  await dashboard.bringToFront();
  await dashboard.getByRole("button", { name: "Live runs", exact: true }).click();
  await dashboard.getByText("LOCKED", { exact: true }).waitFor({ timeout: 10_000 });
  if (await dashboard.locator(".run-card.is-open").count()) throw new Error("Live runs were not collapsed by default.");
  await dashboard.locator(".run-card-head").first().click();
  await dashboard.getByText("Queue lock armed", { exact: true }).waitFor();
  const stored = await dashboard.evaluate(async () => (await chrome.runtime.sendMessage({ type: "GET_SNAPSHOT" })).data);
  if (!stored.activeRuns[0]?.queueLocked || stored.activeRuns[0].lastObservation?.position !== 428) throw new Error("Queue Lab state was not persisted with position 428.");
  const tab = await dashboard.evaluate(async (tabId) => chrome.tabs.get(tabId), stored.activeRuns[0].tabId);
  if (tab.autoDiscardable !== false) throw new Error("Queue-locked tab was not protected from background discard.");
  await dashboard.screenshot({ path: join(results, "live-run.png"), fullPage: true });

  await lab.bringToFront();
  await lab.getByRole("button", { name: /Admitted After queue only/ }).click();
  await dashboard.bringToFront();
  await dashboard.waitForFunction(async () => (await chrome.runtime.sendMessage({ type: "GET_SNAPSHOT" })).data.activeRuns[0]?.state === "ADMITTED");

  const panel = await context.newPage();
  await panel.setViewportSize({ width: 420, height: 840 });
  panel.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  panel.on("pageerror", (error) => browserErrors.push(error.message));
  await panel.goto(`chrome-extension://${id}/sidepanel.html`);
  await panel.getByText("ADMITTED", { exact: true }).waitFor();
  if (await panel.locator(".run-card.is-open").count()) throw new Error("Side-panel run was not collapsed by default.");
  const footer = await panel.locator(".panel-footer").boundingBox();
  const viewport = panel.viewportSize();
  if (!footer || !viewport || Math.abs(footer.y + footer.height - viewport.height) > 2) throw new Error("Side-panel footer is not pinned to the viewport.");
  await panel.screenshot({ path: join(results, "side-panel.png") });

  const panelWatchName = "Synthetic recurring watch";
  const savedWatch = await dashboard.evaluate(async (name) => {
    const now = Date.now();
    return chrome.runtime.sendMessage({ type: "SAVE_WATCH", watch: {
      id: crypto.randomUUID(), name, url: "https://example.test/product", profile: "scheduled", mode: "observe-only",
      schedule: { type: "once", enabled: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", weekdays: [], startAt: now + 600_000, expectedAt: now + 900_000, stopAt: now + 1_800_000 },
      cadenceSeconds: 60, activeCadenceSeconds: 15, fastWindowBeforeMinutes: 10, fastWindowAfterMinutes: 10, jitterPercent: 5,
      rules: { queueText: ["you are now in the waiting room"], admittedText: ["access granted. your session is ready"], challengeText: ["please verify you are human"], unavailableText: ["not available yet"], availableSelector: "[data-queuescope-available='true']", positionPattern: "position\\s+(\\d+)", etaPattern: "estimated wait\\s+(\\d{2}:\\d{2}:\\d{2})" },
      createdAt: now, updatedAt: now
    } });
  }, panelWatchName);
  if (!savedWatch?.ok) throw new Error(`Could not seed panel watch: ${savedWatch?.error}`);
  await panel.getByRole("button", { name: "Watches", exact: true }).click();
  const panelWatch = panel.locator(".watch-card").filter({ hasText: panelWatchName });
  await panelWatch.waitFor();
  await panelWatch.getByTitle("Auto-start off; click to toggle").click();
  await panelWatch.getByTitle("Auto-start on; click to toggle").waitFor();
  await panelWatch.getByTitle("Copy watch").click();
  const panelCopy = panel.locator(".watch-card").filter({ hasText: `${panelWatchName} — copy` });
  await panelCopy.waitFor();
  panel.once("dialog", (dialog) => dialog.accept());
  await panelCopy.getByTitle("Delete watch").click();
  await panelCopy.waitFor({ state: "detached" });
  await panel.waitForTimeout(4_200);
  await panel.goto(`chrome-extension://${id}/sidepanel.html`);
  await panel.getByRole("button", { name: "Watches", exact: true }).evaluate((button) => button.click());
  await panel.locator(".watch-card").filter({ hasText: panelWatchName }).waitFor();
  await panel.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const watchViewport = await panel.evaluate(() => ({
    scrollY: window.scrollY,
    documentTop: document.documentElement.scrollTop,
    bodyTop: document.body.scrollTop,
    visualTop: window.visualViewport?.pageTop ?? 0
  }));
  if (Object.values(watchViewport).some((value) => Math.abs(value) > 1)) throw new Error(`Side-panel watch viewport was not reset: ${JSON.stringify(watchViewport)}`);
  const watchHeader = await panel.locator(".panel-header").boundingBox();
  if (!watchHeader || Math.abs(watchHeader.y) > 2) throw new Error(`Side-panel watch capture retained a ${watchHeader?.y ?? "missing"}px header offset.`);
  const watchFooter = await panel.locator(".panel-footer").boundingBox();
  if (!watchFooter || !viewport || Math.abs(watchFooter.y + watchFooter.height - viewport.height) > 2) throw new Error("Side-panel watch footer is not pinned to the viewport.");
  await panel.screenshot({ path: join(results, "side-panel-watches.png") });

  await dashboard.getByRole("button", { name: "Watches", exact: true }).click();
  await dashboard.getByRole("button", { name: "New watch" }).click();
  await dashboard.getByRole("button", { name: /Passive scout/ }).click();
  await dashboard.getByRole("button", { name: /Continue/ }).click();
  await dashboard.getByText("Passive watches have no attempt ceiling.").waitFor();
  await dashboard.screenshot({ path: join(results, "watch-builder.png"), fullPage: true });

  if (browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join(" | ")}`);
  console.log(JSON.stringify({ extensionId: id, queueLocked: true, position: 428, admission: "ADMITTED", screenshots: await readdir(results) }, null, 2));
} finally {
  if (context) await context.close();
  await rm(profile, { recursive: true, force: true });
}
