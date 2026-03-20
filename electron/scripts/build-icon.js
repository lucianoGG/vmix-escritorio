/**
 * Gera logo-256.png (256x256) a partir de logo.png para o electron-builder.
 * O Windows exige ícone de pelo menos 256x256.
 */
const path = require("path");
const sharp = require("sharp");

const ASSETS = path.join(__dirname, "..", "assets", "icons");
const INPUT = path.join(ASSETS, "logo.png");
const OUTPUT = path.join(ASSETS, "logo-256.png");

async function buildIcon() {
    const img = sharp(INPUT);
    const meta = await img.metadata();
    const { width, height } = meta;

    const scale = Math.min(256 / width, 256 / height);
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const left = Math.floor((256 - w) / 2);
    const top = Math.floor((256 - h) / 2);

    const resized = await img.resize(w, h).toBuffer();

    await sharp({
        create: {
            width: 256,
            height: 256,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([{ input: resized, left, top }])
        .png()
        .toFile(OUTPUT);

    console.log("Created assets/icons/logo-256.png (256x256)");
}

buildIcon().catch((err) => {
    console.error(err);
    process.exit(1);
});
