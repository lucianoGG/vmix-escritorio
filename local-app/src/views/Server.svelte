<script lang="ts">
  import { onDestroy } from "svelte";
  import { useParams } from "svelte-navigator";

  import { selectServer, servers } from "~/store";
  import { api } from "~/lib/ipc";

  const params = useParams();

  /** Evita vários loadURL seguidos (subscribe dispara várias vezes) → ERR_ABORTED no Electron. */
  let lastLoadedServerId: string | undefined;

  $: {
    const id = $params?.id;
    if (id && id !== lastLoadedServerId) {
      lastLoadedServerId = id;
      void selectServer(id).catch((e) => console.error("selectServer:", e));
    }
  }

  onDestroy(async () => {
    await api.showLocalApp();
  });

  $: server = $servers.find(({ _id }) => _id === $params.id);
</script>

<div class="hidden m-auto text-gray-400">Server: "{server.name}"</div>