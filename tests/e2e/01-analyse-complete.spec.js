/**
 * Test e2e #1 : Analyse dossier CEE complet
 *
 * Workflow testé :
 * 1. Login
 * 2. Upload des 4 PDFs (Audit, Synthèse, CEE, Fiche technique)
 * 3. Lancer l'analyse
 * 4. Vérifier affichage des résultats
 * 5. Vérifier bannière page de garde
 * 6. Vérifier présence des checks
 */

import { test, expect } from '@playwright/test';
import {
  login,
  uploadFile,
  launchAnalysis,
  countChecksByLevel,
  getPageGardeBannerColor
} from './helpers.js';
import path from 'path';

test.describe('Analyse complète dossier CEE', () => {

  test.beforeEach(async ({ page }) => {
    // Login avant chaque test
    await login(page);
  });

  test('should complete full analysis workflow', async ({ page }) => {
    // Step 1: Upload des 4 PDFs
    console.log('📤 Upload des PDFs...');

    const fixturesPath = path.join(__dirname, '../fixtures');

    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-exemple.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    // Step 2: Vérifier que le bouton Analyser est activé
    const analyzeBtn = page.locator('#analyzeBtn');
    await expect(analyzeBtn).toBeEnabled();

    // Step 3: Lancer l'analyse
    console.log('🔍 Lancement de l\'analyse...');
    await launchAnalysis(page);

    // Step 4: Vérifier que les résultats sont affichés
    console.log('✅ Vérification des résultats...');
    await expect(page.locator('#results')).toBeVisible();

    // Step 5: Vérifier la bannière page de garde
    const bannerColor = await getPageGardeBannerColor(page);
    expect(bannerColor).toBeTruthy(); // Doit avoir une couleur (verte ou rouge)

    // Step 6: Vérifier présence de checks
    const checksContainer = page.locator('.checks-container');
    await expect(checksContainer).toBeVisible();

    // Vérifier qu'il y a au moins quelques checks
    const checkCards = page.locator('.check-card');
    const checkCount = await checkCards.count();
    expect(checkCount).toBeGreaterThan(0);

    console.log(`✅ ${checkCount} checks générés`);

    // Step 7: Vérifier compteurs par niveau
    const bloquantCount = await countChecksByLevel(page, 'bloquant');
    const majeurCount = await countChecksByLevel(page, 'majeur');
    const infoCount = await countChecksByLevel(page, 'info');

    console.log(`📊 Répartition : ${bloquantCount} bloquant(s), ${majeurCount} majeur(s), ${infoCount} info(s)`);

    // Au moins un de chaque niveau devrait être présent dans un dossier typique
    expect(bloquantCount + majeurCount + infoCount).toBeGreaterThan(0);
  });

  test('should display message auditeur', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload et analyse
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-exemple.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Vérifier message auditeur
    const messageAuditeur = page.locator('#message-auditeur');
    await expect(messageAuditeur).toBeVisible();

    const messageText = await messageAuditeur.textContent();
    expect(messageText).toBeTruthy();
    expect(messageText.length).toBeGreaterThan(50); // Message substantiel

    console.log('✅ Message auditeur présent');
  });

  test('should show page garde banner correctly', async ({ page }) => {
    const fixturesPath = path.join(__dirname, '../fixtures');

    // Upload et analyse
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));
    await uploadFile(page, '#synthese-input', path.join(fixturesPath, 'synthese-exemple.pdf'));
    await uploadFile(page, '#cee-input', path.join(fixturesPath, 'cee-exemple.pdf'));
    await uploadFile(page, '#fiche-input', path.join(fixturesPath, 'fiche-led-exemple.pdf'));

    await launchAnalysis(page);

    // Vérifier présence de la bannière
    const banner = page.locator('#page-garde-banner');
    await expect(banner).toBeVisible();

    // Vérifier qu'elle contient du texte
    const bannerText = await banner.textContent();
    expect(bannerText).toContain('Page de garde');

    console.log('✅ Bannière page de garde affichée');
  });

  test('should handle missing files gracefully', async ({ page }) => {
    // Ne pas uploader tous les fichiers
    const fixturesPath = path.join(__dirname, '../fixtures');
    await uploadFile(page, '#audit-input', path.join(fixturesPath, 'audit-exemple.pdf'));

    // Le bouton Analyser devrait être désactivé
    const analyzeBtn = page.locator('#analyzeBtn');
    await expect(analyzeBtn).toBeDisabled();

    console.log('✅ Bouton Analyser désactivé si fichiers manquants');
  });
});
