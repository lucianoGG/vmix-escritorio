import { BrowserView, BrowserWindow, desktopCapturer, dialog, ipcMain, session } from "electron";
import electronIsDev from "electron-is-dev";
import log from "electron-log";
import windowStateKeeper from "electron-window-state";
import path from "path";
import { APP_DISPLAY_NAME } from "./branding";
import { loadCustomScheme } from "./serve";

const WORKADVENTURE_SESSION_PARTITION = "persist:vmix-workadventure";
const forceInputDebug = process.env.VMIX_INPUT_DEBUG === "1";

let mainWindow: BrowserWindow | undefined;
let appView: BrowserView | undefined;
let appViewUrl = "";
/** Navegação substituída por outra: ignorar ERR_ABORTED da carga anterior. */
let appViewNavGeneration = 0;
/** Utilizador escolheu "Fechar" no diálogo; permitir fechar sem voltar a perguntar. */
let quitConfirmed = false;
let lastInputDebugAt = 0;

function getWorkAdventureSession() {
    return session.fromPartition(WORKADVENTURE_SESSION_PARTITION);
}

function isErrAborted(err: unknown): boolean {
    return (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        String((err as { code: string }).code) === "ERR_ABORTED"
    );
}

const sidebarWidth = 80;

/** Evita que a barra de rolagem fique “cortada” no limite direito do BrowserView. */
const APP_VIEW_SCROLL_GUTTER_PX = 2;

/** Reforço vindo do processo principal (além do preload); só scrollbar, sem mexer em overflow do jogo. */
const WORKADVENTURE_SCROLLBAR_CSS = `
*::-webkit-scrollbar {
  -webkit-appearance: none !important;
  width: 10px !important;
  height: 10px !important;
}
*::-webkit-scrollbar-thumb {
  min-height: 24px !important;
  border-radius: 8px !important;
  border: 2px solid transparent !important;
  background-clip: padding-box !important;
  background-color: rgba(127, 127, 127, 0.55) !important;
}
*::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.12) !important;
}
/* EntityEditor (#map-editor-right): flex + overflow-auto precisa de min-height:0 no WebKit (Electron). */
#map-editor-right .overflow-auto {
  min-height: 0 !important;
}
`;

let workAdventureScrollbarCssKey: string | undefined;

export function getWindow() {
    return mainWindow;
}

export function getAppView() {
    return appView;
}

function isAppViewVisible(): boolean {
    if (!mainWindow || !appView) return false;
    return mainWindow.getBrowserView() === appView;
}

function focusAppViewIfVisible(): void {
    if (!isAppViewVisible() || !appView) return;
    appView.webContents.focus();
}

function ensureAppViewInputFocus(_event: Electron.Event, input: Electron.Input) {
    if (!isAppViewVisible() || !appView) return;
    // Só teclado: refocar em cada mouseWheel quebra o scroll em painéis com overflow-auto
    // (ex.: lista Custom no #map-editor-right), porque focus() no webContents desvia a roda.
    if (input.type !== "keyDown") return;

    const now = Date.now();
    if (now - lastInputDebugAt > 200) {
        const message = `[vmix][input-focus] before-input-event type=${input.type} visible=${String(isAppViewVisible())}`;
        if (forceInputDebug) {
            log.info(message);
        } else {
            log.debug(message);
        }
        lastInputDebugAt = now;
    }

    // Em alguns cenários no macOS, o foco de input volta para o webContents
    // da janela base. Reforçamos o foco do BrowserView para WASD.
    appView.webContents.focus();
}

/** Marca que o utilizador confirmou o encerramento (ex.: Quit no tray). Usado para evitar o diálogo. */
export function confirmQuit(): void {
    quitConfirmed = true;
}

/**
 * No Electron 18, screen share via getDisplayMedia() no BrowserView
 * exige que o renderer chame desktopCapturer via IPC (não tem acesso direto),
 * e a sessão deve liberar as permissões de media/display-capture.
 */
function configureWorkAdventureSession(): void {
    const ses = getWorkAdventureSession();

    // Libera permissões necessárias para media e display capture
    ses.setPermissionRequestHandler((_webContents, permission, callback) => {
        const allowed = new Set([
            "media",
            "display-capture",
            "fullscreen",
            "notifications",
            "geolocation",
            "pointerLock",
        ]);
        callback(allowed.has(permission));
    });

    ses.setPermissionCheckHandler((_webContents, permission) => {
        const allowed = new Set([
            "media",
            "display-capture",
            "fullscreen",
            "notifications",
            "geolocation",
            "pointerLock",
        ]);
        return allowed.has(permission);
    });
}

/**
 * Electron 18: o renderer não consegue chamar desktopCapturer diretamente
 * num BrowserView com contextIsolation. Expõe via IPC.
 */
function registerIpcHandlers(): void {
    ipcMain.removeHandler("app:getDesktopCapturerSources");
    ipcMain.removeHandler("app:selectDesktopSource");

    ipcMain.handle("app:getDesktopCapturerSources", async (_event, options) => {
        const sources = await desktopCapturer.getSources(
            options as Electron.SourcesOptions ?? {
                types: ["screen", "window"],
                thumbnailSize: { width: 320, height: 180 },
                fetchWindowIcons: true,
            }
        );

        return sources.map((s) => ({
            id: s.id,
            name: s.name,
            thumbnailDataURL: s.thumbnail.toDataURL(),
        }));
    });

    // Abre dialog nativo para o usuário escolher qual tela/janela compartilhar
    ipcMain.handle("app:selectDesktopSource", async () => {
        const sources = await desktopCapturer.getSources({
            types: ["screen", "window"],
            thumbnailSize: { width: 320, height: 180 },
            fetchWindowIcons: true,
        });

        if (!sources.length) return null;

        const serialized = sources.map((s) => ({
            id: s.id,
            name: s.name,
            thumbnailDataURL: s.thumbnail.toDataURL(),
            appIconDataURL: s.appIcon?.toDataURL() ?? null,
        }));

        return new Promise<string | null>((resolve) => {
            const picker = new BrowserWindow({
                width: 740,
                height: 520,
                title: "Compartilhar tela",
                resizable: false,
                minimizable: false,
                maximizable: false,
                parent: getWindow() ?? undefined,
                modal: true,
                show: false,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                },
            });

            picker.setMenu(null);

            const sourcesJson = JSON.stringify(serialized);

            const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #1e1e2e; color: #cdd6f4; padding: 16px; }
  h2 { font-size: 14px; font-weight: 500; margin-bottom: 12px; color: #a6adc8; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-height: 380px; overflow-y: auto; padding-right: 4px; }
  .grid::-webkit-scrollbar { width: 6px; }
  .grid::-webkit-scrollbar-track { background: #313244; border-radius: 3px; }
  .grid::-webkit-scrollbar-thumb { background: #585b70; border-radius: 3px; }
  .item { background: #313244; border: 2px solid transparent; border-radius: 8px; padding: 8px; cursor: pointer; transition: border-color .15s, background .15s; }
  .item:hover { background: #3d3f54; border-color: #89b4fa; }
  .item.selected { border-color: #89b4fa; background: #3d3f54; }
  .thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 4px; background: #181825; display: block; }
  .label { font-size: 11px; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; color: #cdd6f4; }
  .footer { margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px; }
  button { padding: 7px 20px; border-radius: 6px; border: none; font-size: 13px; cursor: pointer; }
  .btn-cancel { background: #45475a; color: #cdd6f4; }
  .btn-cancel:hover { background: #585b70; }
  .btn-confirm { background: #89b4fa; color: #1e1e2e; font-weight: 600; }
  .btn-confirm:hover { background: #b4befe; }
  .btn-confirm:disabled { background: #45475a; color: #6c7086; cursor: not-allowed; }
</style>
</head>
<body>
<h2>Selecione o que deseja compartilhar</h2>
<div class="grid" id="grid"></div>
<div class="footer">
  <button class="btn-cancel" onclick="cancel()">Cancelar</button>
  <button class="btn-confirm" id="btnConfirm" disabled onclick="confirm()">Compartilhar</button>
</div>
<script>
  const { ipcRenderer } = require('electron');
  const sources = ${sourcesJson};
  let selectedId = null;

  const grid = document.getElementById('grid');
  const btnConfirm = document.getElementById('btnConfirm');

  sources.forEach(src => {
    const div = document.createElement('div');
    div.className = 'item';
    div.dataset.id = src.id;
    div.innerHTML =
      '<img class="thumb" src="' + src.thumbnailDataURL + '" />' +
      '<div class="label" title="' + src.name + '">' + src.name + '</div>';
    div.addEventListener('click', () => {
      document.querySelectorAll('.item').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      selectedId = src.id;
      btnConfirm.disabled = false;
    });
    // Duplo clique confirma direto
    div.addEventListener('dblclick', () => {
      selectedId = src.id;
      ipcRenderer.send('app:pickerSelected', selectedId);
    });
    grid.appendChild(div);
  });

  function confirm() {
    ipcRenderer.send('app:pickerSelected', selectedId);
  }
  function cancel() {
    ipcRenderer.send('app:pickerSelected', null);
  }
</script>
</body>
</html>`;

            void picker
                .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
                .catch(() => {
                    resolve(null);
                    if (!picker.isDestroyed()) {
                        picker.close();
                    }
                });

            picker.once("ready-to-show", () => {
                picker.show();
            });

            ipcMain.once("app:pickerSelected", (_e, id: string | null) => {
                resolve(id);
                if (!picker.isDestroyed()) picker.close();
            });

            picker.on("closed", () => resolve(null));
        });
    });
}
function resizeAppView(): void {
    if (!mainWindow || !appView) {
        return;
    }
    // Área de cliente (sem moldura). getBounds() inclui moldura e erra no macOS.
    const [cw, ch] = mainWindow.getContentSize();
    const width = Math.max(1, cw - sidebarWidth - APP_VIEW_SCROLL_GUTTER_PX);
    const height = Math.max(1, ch);
    appView.setBounds({ x: sidebarWidth, y: 0, width, height });
}

export async function createWindow() {
    if (mainWindow) return;

    configureWorkAdventureSession();
    registerIpcHandlers();

    const windowState = windowStateKeeper({
        defaultWidth: 1000,
        defaultHeight: 800,
        maximize: true,
    });

    mainWindow = new BrowserWindow({
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        backgroundColor: "#30343d",
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            preload: path.resolve(__dirname, "..", "dist", "preload-local-app", "preload.js"),
        },
    });
    mainWindow.setMenu(null);
    windowState.manage(mainWindow);

    mainWindow.on("close", (event) => {
        if (quitConfirmed) {
            quitConfirmed = false;
            return;
        }
        event.preventDefault();
        void (async () => {
            const { response } = await dialog.showMessageBox(mainWindow!, {
                type: "question",
                title: APP_DISPLAY_NAME,
                message: "Deseja minimizar para a bandeja ou fechar a aplicação?",
                buttons: ["Minimizar para a bandeja", "Fechar aplicação"],
                defaultId: 0,
                cancelId: 0,
            });
            if (response === 0) {
                mainWindow?.hide();
            } else {
                quitConfirmed = true;
                mainWindow?.close();
            }
        })();
    });

    mainWindow.on("closed", () => {
        mainWindow = undefined;
    });

    appView = new BrowserView({
        webPreferences: {
            preload: path.resolve(__dirname, "..", "dist", "preload-app", "preload.js"),
            partition: WORKADVENTURE_SESSION_PARTITION,
            session: getWorkAdventureSession(),
            contextIsolation: true,
            nodeIntegration: false,
            // Electron 18: sandbox false é necessário para o preload funcionar com ipcRenderer
            sandbox: false,
        },
    });

    mainWindow.on("resize", resizeAppView);
    mainWindow.on("resized", resizeAppView);
    mainWindow.on("maximize", resizeAppView);
    mainWindow.on("unmaximize", resizeAppView);

    mainWindow.once("ready-to-show", () => {
        resizeAppView();
        mainWindow?.show();
    });

    mainWindow.on("show", resizeAppView);
    mainWindow.on("show", focusAppViewIfVisible);
    mainWindow.on("focus", focusAppViewIfVisible);
    mainWindow.on("restore", focusAppViewIfVisible);
    mainWindow.webContents.on("before-input-event", ensureAppViewInputFocus);

    appView.webContents.on("did-finish-load", () => {
        void (async () => {
            resizeAppView();
            focusAppViewIfVisible();
            if (!appView) return;
            if (workAdventureScrollbarCssKey) {
                try {
                    await appView.webContents.removeInsertedCSS(workAdventureScrollbarCssKey);
                } catch {
                    /* noop */
                }
                workAdventureScrollbarCssKey = undefined;
            }
            try {
                workAdventureScrollbarCssKey = await appView.webContents.insertCSS(WORKADVENTURE_SCROLLBAR_CSS);
            } catch {
                /* noop */
            }
        })();
    });

    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow?.setTitle(APP_DISPLAY_NAME);
    });

    if (electronIsDev && process.env.LOCAL_APP_URL) {
        try {
            await mainWindow.loadURL(process.env.LOCAL_APP_URL);
        } catch (err) {
            if (!isErrAborted(err)) {
                throw err;
            }
        }
    } else {
        await loadCustomScheme(mainWindow);
        try {
            await mainWindow.loadURL("app://-");
        } catch (err) {
            if (!isErrAborted(err)) {
                throw err;
            }
        }
    }
}

export async function showAppView(url?: string) {
    if (!appView) throw new Error("App view not found");
    if (!mainWindow) throw new Error("Main window not found");

    const current = mainWindow.getBrowserView();
    if (current !== appView) {
        mainWindow.setBrowserView(appView);
    }
    resizeAppView();

    if (url && url !== appViewUrl) {
        const gen = ++appViewNavGeneration;
        try {
            await appView.webContents.loadURL(url);
        } catch (err) {
            if (isErrAborted(err) && gen !== appViewNavGeneration) {
                return;
            }
            throw err;
        }
        if (gen !== appViewNavGeneration) {
            return;
        }
        appViewUrl = url;
        resizeAppView();
    }

    appView.webContents.focus();
}

export function hideAppView() {
    if (!appView) throw new Error("App view not found");
    if (!mainWindow) throw new Error("Main window not found");
    if (mainWindow.getBrowserView() === appView) {
        mainWindow.removeBrowserView(appView);
    }
}