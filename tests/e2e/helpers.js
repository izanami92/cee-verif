/**
 * Helpers pour tests e2e CEE Vérif
 */

/**
 * Login dans l'application
 */
export async function login(page, password = process.env.APP_PASSWORD) {
  await page.goto('/');
  await page.fill('#password-input', password);
  await page.click('#loginBtn');
  await page.waitForSelector('#app', { state: 'visible' });
}

/**
 * Upload un fichier PDF
 */
export async function uploadFile(page, inputSelector, filePath) {
  const fileInput = page.locator(inputSelector);
  await fileInput.setInputFiles(filePath);

  // Attendre que l'extraction soit terminée
  await page.waitForTimeout(1000);
}

/**
 * Lancer l'analyse
 */
export async function launchAnalysis(page) {
  await page.click('#analyzeBtn');

  // Attendre l'affichage des résultats
  await page.waitForSelector('#results', { state: 'visible', timeout: 60000 });
}

/**
 * Vérifier présence d'un check
 */
export async function checkExists(page, checkText) {
  const check = page.locator(`.check-card:has-text("${checkText}")`);
  return await check.count() > 0;
}

/**
 * Compter les checks par niveau
 */
export async function countChecksByLevel(page, niveau) {
  const checks = page.locator(`.check-card[data-niveau="${niveau}"]`);
  return await checks.count();
}

/**
 * Vérifier couleur bannière page de garde
 */
export async function getPageGardeBannerColor(page) {
  const banner = page.locator('#page-garde-banner');
  const bgColor = await banner.evaluate(el =>
    window.getComputedStyle(el).backgroundColor
  );
  return bgColor;
}

/**
 * Cliquer sur un bouton de navigation chantier
 */
export async function switchToChantier(page, chantierIndex) {
  await page.click(`button[data-chantier="${chantierIndex}"]`);
  await page.waitForTimeout(500);
}

/**
 * Saisir une surface manuellement
 */
export async function enterManualSurface(page, chantierIndex, surface) {
  const input = page.locator(`#surface-manuelle-${chantierIndex}`);
  await input.fill(surface.toString());
  await page.click('#validate-manual-surfaces');

  // Attendre recalcul
  await page.waitForTimeout(2000);
}

/**
 * Reset complet de l'application
 */
export async function resetApp(page) {
  await page.click('#resetBtn');
  await page.waitForTimeout(500);
}
