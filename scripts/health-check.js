/**
 * يمين — Platform Health Check
 *
 * Visits each supported platform, injects the content script,
 * creates a test element with Arabic text, and verifies that
 * the RTL attribute gets applied. Reports failures.
 *
 * Usage: node scripts/health-check.js
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// Platforms to check (only ones that don't require auth to load)
const PLATFORMS = [
  { name: "Claude", url: "https://claude.ai", expectLoad: true },
  { name: "ChatGPT", url: "https://chatgpt.com", expectLoad: true },
  { name: "Gemini", url: "https://gemini.google.com", expectLoad: true },
  { name: "DeepSeek", url: "https://chat.deepseek.com", expectLoad: true },
  { name: "Perplexity", url: "https://www.perplexity.ai", expectLoad: true },
  { name: "Grok", url: "https://grok.com", expectLoad: true },
];

const ARABIC_TEST = "هذا نص تجريبي باللغة العربية لاختبار اتجاه النص";

const CONTENT_JS = fs.readFileSync(
  path.join(__dirname, "..", "extension", "content.js"),
  "utf-8"
);
const CONTENT_CSS = fs.readFileSync(
  path.join(__dirname, "..", "extension", "content.css"),
  "utf-8"
);

async function checkPlatform(browser, platform) {
  const page = await browser.newPage();
  const result = { name: platform.name, url: platform.url, status: "unknown", error: null };

  try {
    // Set a reasonable timeout
    await page.goto(platform.url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Inject the CSS
    await page.addStyleTag({ content: CONTENT_CSS });

    // Inject a test element with Arabic text
    await page.evaluate((text) => {
      const div = document.createElement("div");
      div.id = "yameen-health-test";
      div.innerHTML = `<p id="yameen-test-p">${text}</p>`;
      document.body.appendChild(div);
    }, ARABIC_TEST);

    // Inject and run the content script
    await page.evaluate(CONTENT_JS);

    // Wait for the scan to run
    await new Promise((r) => setTimeout(r, 2000));

    // Check if RTL was applied
    const applied = await page.evaluate(() => {
      const el = document.getElementById("yameen-test-p");
      if (!el) return { found: false, attr: null };
      return {
        found: true,
        attr: el.getAttribute("data-ymn"),
        computedDir: getComputedStyle(el).direction,
      };
    });

    if (!applied.found) {
      result.status = "fail";
      result.error = "Test element not found after injection";
    } else if (applied.attr === "rtl" || applied.computedDir === "rtl") {
      result.status = "pass";
    } else {
      result.status = "fail";
      result.error = `data-ymn="${applied.attr}", direction="${applied.computedDir}" — expected RTL`;
    }
  } catch (e) {
    // Auth redirects, timeouts, etc. are expected for some platforms
    if (e.message.includes("timeout") || e.message.includes("ERR_")) {
      result.status = "skip";
      result.error = "Page did not load (auth required or timeout)";
    } else {
      result.status = "fail";
      result.error = e.message.substring(0, 200);
    }
  } finally {
    await page.close();
  }

  return result;
}

async function main() {
  console.log("يمين — Platform Health Check\n");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];

  for (const platform of PLATFORMS) {
    process.stdout.write(`  Checking ${platform.name}... `);
    const result = await checkPlatform(browser, platform);
    results.push(result);

    const icon = result.status === "pass" ? "PASS" : result.status === "skip" ? "SKIP" : "FAIL";
    console.log(`${icon} ${result.error || ""}`);
  }

  await browser.close();

  // Generate report
  const failures = results.filter((r) => r.status === "fail");
  const passes = results.filter((r) => r.status === "pass");
  const skips = results.filter((r) => r.status === "skip");

  let report = `| Platform | Status | Details |\n|----------|--------|----------|\n`;
  for (const r of results) {
    const icon = r.status === "pass" ? "PASS" : r.status === "skip" ? "SKIP" : "FAIL";
    report += `| ${r.name} | ${icon} | ${r.error || "RTL applied correctly"} |\n`;
  }
  report += `\n**${passes.length} passed, ${failures.length} failed, ${skips.length} skipped**\n`;

  fs.writeFileSync("health-report.md", report);

  console.log(`\nResults: ${passes.length} passed, ${failures.length} failed, ${skips.length} skipped`);

  if (failures.length > 0) {
    console.error("\nFailing platforms:");
    failures.forEach((f) => console.error(`  ${f.name}: ${f.error}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Health check crashed:", e);
  process.exit(1);
});
