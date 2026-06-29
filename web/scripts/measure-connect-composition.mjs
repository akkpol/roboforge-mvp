import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..");

const url = process.env.CONNECT_QA_URL ?? "http://127.0.0.1:3000/connect";
const viewport = {
  width: Number(process.env.CONNECT_QA_WIDTH ?? 430),
  height: Number(process.env.CONNECT_QA_HEIGHT ?? 900),
};
const strict = process.env.CONNECT_QA_STRICT === "1";
const screenshotPath = path.resolve(webRoot, ".qa-connect", "connect-measured-mobile.png");
const outputPath = path.resolve(repoRoot, "docs", "design-reference", "connection-quest", "composition-measurement.json");

const reference = {
  source: "docs/design-reference/connection-quest/prototype.png",
  intrinsicWidth: 866,
  intrinsicHeight: 1815,
  inferredCssWidth: 430,
  inferredCssHeight: 908,
  shellPaddingBottom: 24,
  scale: 866 / 430,
};

const targets = [
  {
    key: "topbar",
    label: "Top bar",
    selector: ".lumina-topbar",
    target: { top: 18, height: 54, bottom: 72 },
    tolerance: 8,
  },
  {
    key: "hero",
    label: "Title copy",
    selector: ".connection-hero-copy",
    target: { top: 70, height: 90, bottom: 160 },
    tolerance: 12,
  },
  {
    key: "progress",
    label: "Progress rail",
    selector: ".connection-progress-card",
    target: { top: 160, height: 52, bottom: 212 },
    tolerance: 10,
  },
  {
    key: "visual",
    label: "Rover map card",
    selector: ".connection-visual-card",
    target: { top: 218, height: 220, bottom: 438 },
    tolerance: 16,
  },
  {
    key: "steps",
    label: "Step cards",
    selector: ".connection-step-list",
    target: { top: 445, height: 170, bottom: 615 },
    tolerance: 16,
  },
  {
    key: "advanced",
    label: "Advanced drawer",
    selector: ".advanced-details",
    target: { top: 624, height: 50, bottom: 674 },
    tolerance: 10,
  },
  {
    key: "lyra",
    label: "Lyra tip",
    selector: ".lyra-tip",
    target: { top: 684, height: 78, bottom: 762 },
    tolerance: 12,
  },
  {
    key: "actions",
    label: "CTA buttons",
    selector: ".connection-actions",
    target: { top: 772, height: 48, bottom: 820 },
    tolerance: 12,
  },
  {
    key: "safety",
    label: "Safety note",
    selector: ".connection-safety-note",
    target: { top: 830, height: 26, bottom: 856 },
    tolerance: 8,
  },
  {
    key: "bottomNav",
    label: "Bottom nav",
    selector: ".bottom-nav",
    target: { top: 864, height: 58, bottom: 922 },
    tolerance: 12,
  },
];

function round(value) {
  return Number(value.toFixed(1));
}

function scoreMeasurement(rect, target) {
  if (!rect) {
    return {
      topDelta: null,
      heightDelta: null,
      bottomDelta: null,
      maxAbsDelta: null,
      status: "missing",
    };
  }

  const topDelta = round(rect.top - target.top);
  const heightDelta = round(rect.height - target.height);
  const bottomDelta = round(rect.bottom - target.bottom);
  const maxAbsDelta = Math.max(Math.abs(topDelta), Math.abs(heightDelta), Math.abs(bottomDelta));

  return {
    topDelta,
    heightDelta,
    bottomDelta,
    maxAbsDelta: round(maxAbsDelta),
    status: maxAbsDelta <= target.tolerance ? "ok" : "tune",
  };
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport });
  await page.emulateMedia({ reducedMotion: "reduce" });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(350);

    const measurement = await page.evaluate((targetList) => {
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
      );

      const sections = targetList.map((target) => {
        const element = document.querySelector(target.selector);
        if (!element) {
          return { key: target.key, label: target.label, selector: target.selector, rect: null };
        }

        const rect = element.getBoundingClientRect();
        return {
          key: target.key,
          label: target.label,
          selector: target.selector,
          rect: {
            top: rect.top,
            height: rect.height,
            bottom: rect.bottom,
            width: rect.width,
          },
        };
      });

      return {
        documentHeight,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        sections,
      };
    }, targets);

    const sectionResults = measurement.sections.map((section, index) => {
      const target = targets[index].target;
      const scored = scoreMeasurement(section.rect, { ...target, tolerance: targets[index].tolerance });
      return {
        ...section,
        rect: section.rect
          ? {
              top: round(section.rect.top),
              height: round(section.rect.height),
              bottom: round(section.rect.bottom),
              width: round(section.rect.width),
            }
          : null,
        target,
        tolerance: targets[index].tolerance,
        ...scored,
      };
    });

    const targetDocumentHeight = reference.inferredCssHeight + reference.shellPaddingBottom;
    const documentHeight = round(measurement.documentHeight);
    const documentOverflow = round(documentHeight - targetDocumentHeight);
    const summary = {
      status: documentOverflow <= 0 && sectionResults.every((item) => item.status === "ok") ? "ok" : "tune",
      url,
      reference,
      viewport: measurement.viewport,
      documentHeight,
      targetDocumentHeight,
      documentOverflow,
      worstSections: [...sectionResults]
        .filter((item) => item.maxAbsDelta !== null)
        .sort((a, b) => b.maxAbsDelta - a.maxAbsDelta)
        .slice(0, 4)
        .map(({ key, label, maxAbsDelta, heightDelta, bottomDelta }) => ({ key, label, maxAbsDelta, heightDelta, bottomDelta })),
    };

    await mkdir(path.dirname(screenshotPath), { recursive: true });
    await mkdir(path.dirname(outputPath), { recursive: true });
    await page.screenshot({ fullPage: true, path: screenshotPath });

    const payload = {
      generatedAt: new Date().toISOString(),
      summary,
      sections: sectionResults,
      screenshotPath: path.relative(repoRoot, screenshotPath).replaceAll("\\", "/"),
    };

    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

    console.log(`Connect composition QA: ${summary.status}`);
    console.log(`URL: ${url}`);
    console.log(`Document: ${documentHeight}px / target ${targetDocumentHeight}px (${documentOverflow >= 0 ? "+" : ""}${documentOverflow}px)`);
    console.table(
      sectionResults.map(({ key, label, rect, target, topDelta, heightDelta, bottomDelta, status }) => ({
        key,
        label,
        top: rect?.top ?? "missing",
        height: rect?.height ?? "missing",
        bottom: rect?.bottom ?? "missing",
        targetBottom: target.bottom,
        dTop: topDelta,
        dHeight: heightDelta,
        dBottom: bottomDelta,
        status,
      })),
    );
    console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
    console.log(`Screenshot ${path.relative(process.cwd(), screenshotPath)}`);

    if (strict && summary.status !== "ok") {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
