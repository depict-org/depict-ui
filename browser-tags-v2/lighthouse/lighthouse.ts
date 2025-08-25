import * as lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import * as tenants from "./tenants.json";

const test = async () => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });

  for (const tenant of tenants) {
    const runnerResult1 = await lighthouse(tenant.site, {
      // logLevel: "info",
      output: "html",
      onlyCategories: ["performance"],
      port: chrome.port,
      blockedUrlPaths: ["*/depict-ai.js", "*://proxy.demo.depict.ai/*"],
    });

    const r2 = await lighthouse(tenant.site, {
      // logLevel: "info",
      output: "html",
      onlyCategories: ["performance"],
      port: chrome.port,
    });

    const diff = runnerResult1.lhr.categories.performance.score - r2.lhr.categories.performance.score;
    console.log("Diff on", tenant.name, "is", Math.round(diff * 1e2), "(lower is better)");
  }
  await chrome.kill();
};

test();
