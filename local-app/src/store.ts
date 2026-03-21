import { writable } from "svelte/store";
import { api } from "~/lib/ipc";
import type { Server } from "~/lib/ipc";

export const servers = writable<Server[]>([]);
export const selectedServer = writable<string>("");

export async function selectServer(serverId: string) {
    await api.selectServer(serverId);
    selectedServer.set(serverId);
}

export async function loadServers() {
    servers.set(await api.getServers());
}
