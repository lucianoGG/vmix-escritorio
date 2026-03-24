<script lang="ts">
    import { onMount } from "svelte";
    import { useNavigate } from "svelte-navigator";
    import { get } from "svelte/store";

    import Logo from "~/../../electron/assets/icons/logo.svg";
    import { api } from "~/lib/ipc";
    import { loadServers, servers } from "~/store";

    const navigate = useNavigate();

    let version = "";

    onMount(async () => {
        await loadServers();
        const list = get(servers);
        /** Preferir o servidor “Escritório Vmix” (nome por defeito no Electron); senão o primeiro da lista. */
        const target =
            list.find((s) => /vmix/i.test(s.name)) ?? list[0];

        if (target) {
            navigate(`/server/${target._id}`, { replace: true });
            return;
        }

        version = await api.getVersion();
    });
</script>

<div class="flex flex-col w-full h-full justify-center items-center bg-[#30343d]">
    <Logo height="100" class="my-auto" />
    <div class="flex my-4 items-center space-x-4">
        <span class="text-gray-300 text-lg ">Desktop-App Version: {version}</span>
    </div>
    {#if version}
        <p class="text-gray-400 text-xs text-center px-4 max-w-md">
            Nenhum servidor configurado. Verifique as definições na app ou os ficheiros de dados do Electron.
        </p>
    {/if}
</div>
