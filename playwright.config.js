// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Configuration Playwright pour tests e2e CEE Vérif
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',

  /* Timeout par test */
  timeout: 60 * 1000,

  /* Configuration des tests */
  fullyParallel: false, // Tests séquentiels pour éviter conflits
  forbidOnly: !!process.env.CI, // Interdire .only en CI
  retries: process.env.CI ? 2 : 0, // 2 retries en CI, 0 en local
  workers: 1, // 1 seul worker (tests séquentiels)

  /* Reporter */
  reporter: 'html',

  /* Configuration partagée pour tous les projets */
  use: {
    /* URL de base */
    baseURL: 'http://localhost:3000',

    /* Traces en cas d'échec */
    trace: 'on-first-retry',

    /* Screenshots en cas d'échec */
    screenshot: 'only-on-failure',

    /* Vidéos en cas d'échec */
    video: 'retain-on-failure',
  },

  /* Projets de tests */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Décommenter pour tester sur Firefox et Safari
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Serveur de développement */
  webServer: {
    command: 'vercel dev --listen 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
