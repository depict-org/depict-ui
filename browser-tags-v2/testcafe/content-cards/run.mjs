import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const cases = [
  { name: "left-five", query: "count=5&row=1", index: 4, row: 1 },
  { name: "center-five", query: "count=5&row=1&position=center", index: 5, row: 1, column: 1 },
  { name: "left-thirteen-landscape", query: "count=13&row=3&ratio=1.93&height=518px", index: 12, row: 3 },
  { name: "four-products-trailing", query: "count=4&row=1", index: 4, row: 1 },
  { name: "three-columns", query: "count=4&row=1&columns=3", index: 3, row: 1 },
  { name: "mobile-full-width", query: "count=5&row=1&columns=2", index: 2, row: 1, mobile: true },
  { name: "percent-spacing", query: "count=5&row=1&gap=2%25", index: 4, row: 1 },
  { name: "full-width-banner", query: "count=5&row=2&banner", index: 5, row: 2, banner: true },
  { name: "custom-footer", query: "count=5&row=1&footer", index: 4, row: 1, footer: true },
  { name: "hidden-later-card", query: "count=5&row=1&hidden", index: 4, row: 1 },
];

async function measure(page) {
  return page.evaluate(() => {
    const grid = document.querySelector(".cards");
    const cards = [...grid.querySelectorAll(":scope > .content-block-wrapper")];
    const card = cards.at(-1);
    const image = card?.querySelector("img");
    const rect = element => {
      if (!element) return null;
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    return {
      rows: getComputedStyle(grid).gridTemplateRows.split(" ").map(parseFloat),
      gap: parseFloat(getComputedStyle(grid).rowGap) || 0,
      margin: card ? parseFloat(getComputedStyle(card).marginTop) || 0 : 0,
      cardCount: cards.length,
      cardIndex: [...grid.children].indexOf(card),
      card: rect(card),
      image: rect(image),
      naturalRatio: image?.naturalWidth / image?.naturalHeight,
      fit: image && getComputedStyle(image).objectFit,
      grid: rect(grid),
      product: rect(grid.querySelector(".fixture-product")),
      footer: rect(grid.querySelector(".fixture-footer")),
      order: [...grid.children].map(e => e.dataset.product || e.className),
    };
  });
}

async function waitForCards(page, count) {
  await page.waitForFunction(
    expected => {
      const cards = [...document.querySelectorAll(".cards > .content-block-wrapper")];
      return (
        cards.length === expected &&
        cards.every(card => {
          const img = card.querySelector("img");
          return img?.complete && img.naturalWidth > 0;
        })
      );
    },
    count,
    { timeout: 15000 }
  );
}

export async function runChecks(page, baseUrl, saveScreenshot, baseline = false) {
  const results = [];
  for (const entry of cases) {
    await page.cdp("Emulation.setDeviceMetricsOverride", {
      width: entry.mobile ? 430 : 1000,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await page.goto(`${baseUrl}/?${entry.query}${baseline ? "&baseline" : ""}`);
    await waitForCards(page, entry.banner ? 2 : 1);
    const result = await measure(page);
    results.push({ name: entry.name, ...result });
    await saveScreenshot(entry.name, result);
    assert.equal(result.cardIndex, entry.index, `${entry.name}: insertion index`);
    assert.equal(result.fit, "cover", `${entry.name}: image fit`);
    assert.ok(Math.abs(result.image.height - result.card.height) < 1, `${entry.name}: image height`);
    if (entry.mobile) {
      assert.ok(Math.abs(result.card.width / result.card.height - 1) < 0.01, "mobile: intrinsic aspect ratio");
    } else {
      assert.ok(result.rows[entry.row + 1] > 150, `${entry.name}: empty row height`);
      assert.ok(Math.abs(result.rows[entry.row] - result.rows[entry.row + 1]) < 1, `${entry.name}: equal product rows`);
      const expectedHeight = result.rows[entry.row] * 2 + result.gap - result.margin;
      assert.ok(Math.abs(result.card.height - expectedHeight) < 1, `${entry.name}: full row span`);
    }
    if (entry.column) {
      assert.ok(result.card.x > result.grid.x + 200, "center: column 2");
    } else {
      assert.ok(Math.abs(result.card.x - result.grid.x) < 1, `${entry.name}: left column`);
    }
    if (entry.banner || entry.footer) {
      assert.ok(Math.abs(result.product.height - 160) < 1, `${entry.name}: product height`);
    }
    if (entry.footer) assert.equal(result.footer.height, 400, "footer: own height");
    if (entry.name === "hidden-later-card") assert.ok(result.grid.height < 1000, "hidden card: no empty rows");
  }

  await page.goto(`${baseUrl}/?count=4&row=1&complete=false`);
  await page.waitForFunction(() => document.querySelectorAll(".fixture-product").length === 4);
  assert.equal((await measure(page)).cardCount, 0, "pagination: wait for the final page");
  await page.evaluate(() => window.contentCardTest.setComplete(true));
  await waitForCards(page, 1);
  assert.equal((await measure(page)).cardIndex, 4, "pagination: trailing card");
  await page.evaluate(() => window.contentCardTest.setCount(5));
  await page.waitForFunction(() => document.querySelectorAll(".fixture-product").length === 5);
  await waitForCards(page, 1);
  const inline = await measure(page);
  assert.equal(inline.cardIndex, 4, "pagination: inline card stays before product 5");
  assert.equal(inline.order[5], "p5", "pagination: product 5 follows the card");
  await saveScreenshot("pagination-inline", inline);
  await page.evaluate(() => window.contentCardTest.setCount(4));
  await page.waitForFunction(() => document.querySelectorAll(".fixture-product").length === 4);
  await waitForCards(page, 1);
  assert.equal((await measure(page)).cardIndex, 4, "pagination: return to a trailing card");
  return results;
}

export async function serveFixture() {
  const root = path.resolve(fileURLToPath(new URL("../../.content-card-visual/modern/", import.meta.url)));
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://localhost").pathname;
      const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!file.startsWith(root + path.sep)) throw new Error("Invalid fixture path");
      const content = await readFile(file);
      response.setHeader(
        "Content-Type",
        file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html"
      );
      response.end(content);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

async function connect(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const pending = new Map();
  let id = 0;
  socket.addEventListener("message", event => {
    const result = JSON.parse(event.data);
    const request = pending.get(result.id);
    if (!request) return;
    pending.delete(result.id);
    clearTimeout(request.timer);
    if (result.error) request.reject(new Error(JSON.stringify(result.error)));
    else request.resolve(result.result);
  });
  const cdp = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`CDP timeout: ${method}`));
      }, 20000);
      pending.set(requestId, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
  const evaluate = async (fn, arg) => {
    const result = await cdp("Runtime.evaluate", {
      expression: `(${fn.toString()})(${JSON.stringify(arg) ?? "undefined"})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await cdp("Page.enable");
  return {
    cdp,
    evaluate,
    goto: async url => {
      const { errorText } = await cdp("Page.navigate", { url });
      if (errorText) throw new Error(errorText);
      await waitForFunction(
        expected => location.href === expected && document.readyState === "complete" && !!window.contentCardTest,
        url
      );
    },
    waitForFunction,
    close: () => socket.close(),
  };

  async function waitForFunction(fn, arg, { timeout = 15000 } = {}) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try {
        if (await evaluate(fn, arg)) return;
      } catch (error) {
        if (!error.message.includes("context")) throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out: ${fn.toString()}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const fixture = await serveFixture();
  if (process.argv.includes("--serve")) {
    console.log(fixture.url);
  } else {
    const { launch } = await import("chrome-launcher");
    const chrome = await launch({
      chromePath: process.env.CHROME_PATH,
      chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
    });
    let page;
    const output = path.resolve(process.env.CONTENT_CARD_ARTIFACTS || "test-results/content-cards");
    await mkdir(output, { recursive: true });
    try {
      page = await connect(chrome.port);
      const results = await runChecks(
        page,
        fixture.url,
        async (name, measurements) => {
          const { cssContentSize } = await page.cdp("Page.getLayoutMetrics");
          const screenshot = await page.cdp("Page.captureScreenshot", {
            format: "png",
            captureBeyondViewport: true,
            clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 },
          });
          await writeFile(path.join(output, `${name}.png`), Buffer.from(screenshot.data, "base64"));
          await writeFile(path.join(output, `${name}.json`), JSON.stringify(measurements, null, 2));
        },
        process.argv.includes("--baseline")
      );
      await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
      console.log(`PASS: ${results.length} visual cases and pagination transitions`);
    } finally {
      page?.close();
      await chrome.kill();
      fixture.server.close();
    }
  }
}
