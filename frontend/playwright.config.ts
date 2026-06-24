import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 360_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 900 },
    video: 'on',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'cd .. && HF_HOME=$HOME/.cache/huggingface TRANSFORMERS_CACHE=$HOME/.cache/huggingface SENTENCE_TRANSFORMERS_HOME=$HOME/.cache/huggingface python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8002',
      url: 'http://127.0.0.1:8002/health',
      timeout: 180_000,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 3000',
      url: 'http://127.0.0.1:3000',
      timeout: 180_000,
      reuseExistingServer: true,
    },
  ],
});
