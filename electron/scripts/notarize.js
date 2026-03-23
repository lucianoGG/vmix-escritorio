const path = require("path");
const { notarize } = require("@electron/notarize");

/**
 * Notariza builds macOS quando as credenciais estão definidas.
 * Variáveis esperadas:
 * - APPLE_ID
 * - APPLE_APP_SPECIFIC_PASSWORD
 * - APPLE_TEAM_ID
 */
module.exports = async function notarizeApp(context) {
    const { electronPlatformName, appOutDir } = context;

    if (electronPlatformName !== "darwin") {
        return;
    }

    const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
    if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
        console.warn("[notarize] Credenciais Apple ausentes; ignorando notarização.");
        return;
    }

    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(appOutDir, `${appName}.app`);

    console.log(`[notarize] Notarizando ${appPath}`);
    await notarize({
        appBundleId: "re.workadventu.desktop",
        appPath,
        appleId: APPLE_ID,
        appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
        teamId: APPLE_TEAM_ID,
    });
    console.log("[notarize] Notarização concluída.");
};
