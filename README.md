# Desktop app

## O que é cada URL?

| URL | O que é |
|-----|---------|
| **`http://localhost:3000`** | Só aparece se você usar **modo dev** com Vite (`LOCAL_APP_URL`). É a **interface local** (barra lateral, configurações), **não** é o mapa WorkAdventure. |
| **`http://escritorio.vmix.chat/`** (ou `https://`) | O **mundo WorkAdventure** no **BrowserView**. Já vem como servidor padrão em `electron/src/settings.ts`. |

Para usar **só** o Escritório Vmix na web, **não** defina `LOCAL_APP_URL`: faça build do `local-app`, build do `electron` e rode o app — a interface lateral vem do pacote `app://` e o mapa carrega [escritorio.vmix.chat](http://escritorio.vmix.chat/) ao abrir (com um único servidor, o app entra direto nele).

```bash
# Produção / debug sem Vite (recomendado para “só o link vmix”)
cd local-app && yarn build
cd ../electron && yarn build
cd electron && yarn electron dist/main.js

# ou executável:
cd electron && yarn bundle
```

```bash
# Modo dev da interface lateral (opcional — só para editar Svelte/CSS do menu)
cd local-app && yarn dev
cd electron && LOCAL_APP_URL=http://localhost:3000 yarn dev
```

## Depuração no Cursor / VS Code

Use **Run and Debug** (F5) com `.vscode/launch.json`:

- **Electron: app:// (sem localhost)** — **Use este** para depurar como no instalador: `local-app` empacotado + Electron. O WorkAdventure vem da URL em `settings.ts` (ex.: escritorio.vmix.chat). **Não** use `LOCAL_APP_URL` no `electron/.env` a menos que queira forçar o Vite.
- **Electron + Vite** — compila o Electron, sobe o Vite na porta **3000** e só depois inicia o Electron com `LOCAL_APP_URL` (hot-reload do menu lateral).
- **Electron: Vite manual** — você sobe `yarn dev` no `local-app` e depura o Electron com `LOCAL_APP_URL`.

O Vite, quando usado, fica na porta **3000** (`vite.config.ts`), alinhado ao `LOCAL_APP_URL`.

### Tela cinza no mapa / sem DevTools

- A área grande à direita é o **BrowserView** (WorkAdventure). Se ficar cinza após atualizar o Electron, o projeto usa **`getContentBounds()`** para o tamanho da vista (evita erro com `getBounds()` + moldura da janela).
- Em **modo dev**, **F12** ou **Ctrl+Shift+I** abre o DevTools da janela lateral **ou** do mapa (consoante o foco), porque atalhos normais não chegam ao BrowserView.
- Confirme o URL do servidor (**https://** em Definições). Erros de carga aparecem no log (`electron-log`) e no terminal.

## Atualizações automáticas (electron-updater)

O instalador gerado aponta para **GitHub Releases** do repositório público [lucianoGG/vmix-escritorio](https://github.com/lucianoGG/vmix-escritorio). Para o auto-updater funcionar nos PCs dos usuários:

1. Suba a **versão** em `electron/package.json`.
2. Rode `cd electron && yarn bundle`.
3. Crie uma **Release** no GitHub e anexe os artefatos da pasta `electron/build/` (por exemplo o `.exe` / instalador e o `latest.yml` no Windows), normalmente publicados pelo `electron-builder` se você configurar token ou usar `electron-builder --publish always`.

Enquanto não houver releases publicadas, o app pode exibir que não há atualização ou falhar silenciosamente ao buscar o feed.

## Compartilhamento de tela

O `BrowserView` que carrega o WorkAdventure precisa de **`session.setDisplayMediaRequestHandler`** (Electron 15+; este projeto usa **Electron 28**). Só liberar permissão não basta: a página chama `navigator.mediaDevices.getDisplayMedia`, e o processo principal precisa entregar a fonte via `desktopCapturer`.

Com **vários monitores**, pode abrir um diálogo nativo para escolher qual tela compartilhar. No **Windows**, confira também **Configurações → Privacidade e segurança → Captura de tela** e permita o app, se a opção existir na sua versão do sistema.

## API for front

```

```
