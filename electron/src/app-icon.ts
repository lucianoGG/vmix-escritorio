import path from "path";

/** PNG incluído no pacote (pasta assets no electron-builder). Não usar logo.png — não existe no repo. */
export function getAppIconPngPath(): string {
    return path.join(__dirname, "..", "assets", "icons", "logo-256.png");
}
