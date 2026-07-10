import { defineConfig } from "@playwright/test";

const host = "127.0.0.1";
const port = 4173;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./node_modules/.cache/playwright/test-results",
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 7_500 },
  reporter: "list",
  use: {
    baseURL: `http://${host}:${port}`,
    permissions: ["camera"],
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `npm run build:demo && npm run preview -- --host ${host} --port ${port}`,
    url: `http://${host}:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
