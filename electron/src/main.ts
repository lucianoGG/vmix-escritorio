import "dotenv/config";

import { app as electronApp } from "electron";

// Chromium no Electron usa barras de rolagem em overlay (quase invisíveis) por defeito;
// na web o browser costuma mostrar a faixa lateral como no teu screenshot.
electronApp.commandLine.appendSwitch("disable-features", "OverlayScrollbar,OverlayScrollbarWin");

import app from "./app";
import log from "./log";

log.init();
void app.init();
