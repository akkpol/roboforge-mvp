import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const sizes = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
}

async function expectNoSeriousA11yIssues(page: import("@playwright/test").Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = result.violations.filter(({ impact }) =>
    impact === "critical" || impact === "serious",
  );
  expect(blocking).toEqual([]);
}

test("home makes connecting the rover the primary task", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "เชื่อมต่อ Rover" })).toBeVisible();
  await expect(page.getByRole("link", { name: "เชื่อมต่อ Rover" })).toBeVisible();
  await expect(page.getByText("ความพร้อมของฮาร์ดแวร์")).toBeVisible();
  await expect(page.getByText("เร็ว ๆ นี้", { exact: true }).filter({ visible: true })).toHaveCount(3);
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yIssues(page);
});

test("connect presents one guided setup flow", async ({ page }) => {
  await page.goto("/connect");

  await expect(page.getByRole("heading", { level: 1, name: "ตั้งค่า Rover ทีละขั้น" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "เตรียมอุปกรณ์" })).toBeVisible();
  await expect(page.getByRole("button", { name: "พร้อม เริ่มติดตั้ง" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yIssues(page);
});

test("utility dialogs close with Escape and return focus", async ({ page }) => {
  await page.goto("/");
  const lyraButton = page.getByRole("button", { name: "คุยกับ Lyra" });

  await lyraButton.click();
  await expect(page.getByRole("dialog", { name: "คุยกับ Lyra" })).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "คุยกับ Lyra" })).toBeHidden();
  await expect(lyraButton).toBeFocused();

  const supportButton = page.getByRole("button", { name: "เลี้ยงกาแฟผู้พัฒนา" });
  await supportButton.click();
  await expect(page.getByRole("dialog", { name: "เลี้ยงกาแฟผู้พัฒนา" })).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "เลี้ยงกาแฟผู้พัฒนา" })).toBeHidden();
  await expect(supportButton).toBeFocused();
});

test("keyboard navigation starts with a visible, meaningful control", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "RoboForge home" })).toBeFocused();
});

test("auth and guest profile share the new product language", async ({ page }) => {
  await page.goto("/login?lang=th");
  await expect(page.getByRole("link", { name: "กลับหน้าหลัก RoboForge" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "กลับเข้าสู่ RoboForge" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yIssues(page);

  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "โปรไฟล์ของคุณ" })).toBeVisible();
  await expect(page.getByText("บัญชีและหุ่นยนต์ของคุณอยู่ในที่เดียว")).toBeVisible();
  await expect(page.getByRole("link", { name: "เข้าสู่ระบบ" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yIssues(page);
});

test("install keeps old links working through the canonical connect route", async ({ page }) => {
  await page.goto("/install");
  await expect(page).toHaveURL(/\/connect$/);
});

test("theme control applies the selected design tokens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ตั้งค่า" }).click();
  await page.getByLabel("ธีม").selectOption("mint");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "mint");
  await expect(page.getByRole("link", { name: "เชื่อมต่อ Rover" })).toHaveCSS(
    "background-color",
    "rgb(15, 143, 120)",
  );
});

test("connect explains how to continue when Web Serial is unsupported", async ({ page }) => {
  await page.route("https://unpkg.com/**", (route) => route.fulfill({
    body: "customElements.define('esp-web-install-button', class extends HTMLElement {});",
    contentType: "text/javascript",
  }));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "serial", { configurable: true, value: undefined });
  });

  await page.goto("/connect");
  await page.getByRole("button", { name: "พร้อม เริ่มติดตั้ง" }).click();
  await page.getByRole("button", { name: "ติดตั้ง MicroPython เสร็จแล้ว" }).click();
  await page.getByRole("button", { name: "อัปโหลด Agent" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Chrome หรือ Edge desktop" })).toBeVisible();
  await expect(page.getByRole("button", { name: "คัดลอกลิงก์ไปคอม" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "อัปโหลด RoboForge Agent" })).toBeVisible();
});

test("connect keeps the user on upload failure, retries, and restores progress", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The mocked Web Serial flow targets desktop browsers.");

  await page.route("https://unpkg.com/**", (route) => route.fulfill({
    body: "customElements.define('esp-web-install-button', class extends HTMLElement {});",
    contentType: "text/javascript",
  }));
  await page.route("https://raw.githubusercontent.com/**", (route) => route.fulfill({
    body: 'print("mock agent")',
    contentType: "text/plain",
  }));
  await page.addInitScript(() => {
    let requestCount = 0;
    const port = {
      close: async () => undefined,
      open: async () => undefined,
      writable: new WritableStream<Uint8Array>({ write: async () => undefined }),
    };
    Object.defineProperty(navigator, "serial", {
      configurable: true,
      value: {
        requestPort: async () => {
          requestCount += 1;
          if (requestCount === 1) throw new Error("ผู้ใช้ยกเลิกการเลือกพอร์ต");
          return port;
        },
      },
    });
  });

  await page.goto("/connect");
  await page.getByRole("button", { name: "พร้อม เริ่มติดตั้ง" }).click();
  await page.getByRole("button", { name: "ติดตั้ง MicroPython เสร็จแล้ว" }).click();
  await page.getByRole("button", { name: "อัปโหลด Agent" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "ผู้ใช้ยกเลิกการเลือกพอร์ต" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "อัปโหลด RoboForge Agent" })).toBeVisible();
  await page.getByRole("button", { name: "ลองอัปโหลดอีกครั้ง" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "เชื่อมต่อผ่าน Wi-Fi" })).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "เชื่อมต่อผ่าน Wi-Fi" })).toBeVisible();
});
