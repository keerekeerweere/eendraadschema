#!/usr/bin/env node
import { WebSocketServer, WebSocket } from "ws";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const port = Number(process.env.EDS_MCP_PORT ?? 9234);
const command = process.argv[2] ?? "help";

if (command === "serve") startBridge();
else if (command === "stdio") await startStdioAdapter();
else {
  console.error("Gebruik: eds-mcp serve | eds-mcp stdio");
  process.exitCode = 1;
}

function startBridge() {
  const browserBySocket = new Map();
  const pending = new Map();
  const server = new WebSocketServer({ host: "127.0.0.1", port });
  server.on("connection", (socket, request) => {
    // Browsers send their Origin; stdio adapters do not. Never accept a remote origin.
    const origin = request.headers.origin;
    if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin)) return socket.close(1008, "Local origins only");
    socket.on("message", (raw) => {
      let message;
      try { message = JSON.parse(String(raw)); } catch { return; }
      if (message.kind === "browser.hello") {
        browserBySocket.clear();
        browserBySocket.set(socket, true);
        socket.send(JSON.stringify({ kind: "browser.ready" }));
        return;
      }
      if (message.kind === "adapter.hello") {
        socket.send(JSON.stringify({ kind: "adapter.ready" }));
        return;
      }
      if (message.kind === "request" && typeof message.id === "string") {
        const browser = [...browserBySocket.keys()].find(candidate => candidate.readyState === WebSocket.OPEN);
        if (!browser) return socket.send(JSON.stringify({ kind: "response", id: message.id, ok: false, error: "De browser is niet verbonden met de lokale brug." }));
        pending.set(message.id, socket);
        browser.send(JSON.stringify(message));
        return;
      }
      if (message.kind === "response" && typeof message.id === "string") {
        const adapter = pending.get(message.id);
        pending.delete(message.id);
        if (adapter?.readyState === WebSocket.OPEN) adapter.send(JSON.stringify(message));
      }
    });
    socket.on("close", () => {
      browserBySocket.delete(socket);
      for (const [id, adapter] of pending) if (adapter === socket) pending.delete(id);
    });
  });
  server.on("listening", () => {
    console.error(`EDS MCP bridge actief op ws://127.0.0.1:${port}`);
    console.error("Open de app met ?mcp=on en configureer uw MCP-client met: npm run mcp:stdio");
  });
  server.on("error", (error) => {
    console.error(`EDS MCP bridge kon niet starten: ${error.message}`);
    process.exitCode = 1;
  });
}

async function startStdioAdapter() {
  const bridge = await connectBridge();
  const mcp = new McpServer({ name: "eendraadschema", version: "0.1.0" });
  const text = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
  const request = async (method, params = {}) => text(await bridge.request(method, params));
  mcp.registerTool("get_dossier_summary", { description: "Geeft een samenvatting van het actuele Belgische elektrische dossier, inclusief koppelfouten." }, () => request("get_dossier_summary"));
  mcp.registerTool("list_circuits", { description: "Lijst alle kringen uit het levende eendraadschema." }, () => request("list_circuits"));
  mcp.registerTool("get_item", { description: "Geeft een elektrisch item en zijn koppelingen met situatieplan/bordindeling.", inputSchema: { itemId: z.number().int() } }, ({ itemId }) => request("get_item", { itemId }));
  mcp.registerTool("find_items", { description: "Zoekt elektrische items op naam of type.", inputSchema: { query: z.string().min(1) } }, ({ query }) => request("find_items", { query }));
  mcp.registerTool("list_placement_tasks", { description: "Lijst open fysieke plaatsingstaken voor situatieschema en bordindeling." }, () => request("list_placement_tasks"));
  mcp.registerTool("propose_change_set", {
    description: "Toont de gebruiker een voorstel voor een graphwijziging. Pas alleen toe na duidelijke uitleg; de browser vraagt expliciete goedkeuring.",
    inputSchema: {
      baseRevision: z.number().int(),
      description: z.string().min(1),
      operations: z.array(z.object({ kind: z.enum(["add-item", "update-item", "move-item", "delete-item", "create-placement-task"]) }).passthrough()).min(1),
    },
  }, ({ baseRevision, description, operations }) => request("propose_change_set", { baseRevision, description, operations }));
  await mcp.connect(new StdioServerTransport());
}

function connectBridge() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    const waiting = new Map();
    const timeout = setTimeout(() => reject(new Error("Geen lokale EDS MCP-brug gevonden. Start eerst 'eds-mcp serve'.")), 3000);
    socket.on("open", () => socket.send(JSON.stringify({ kind: "adapter.hello" })));
    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.kind === "adapter.ready") {
        clearTimeout(timeout);
        return resolve({ request(method, params) {
          return new Promise((resolveRequest, rejectRequest) => {
            const id = crypto.randomUUID();
            const timer = setTimeout(() => { waiting.delete(id); rejectRequest(new Error("De browser reageert niet op de MCP-aanvraag.")); }, 30_000);
            waiting.set(id, { resolve: resolveRequest, reject: rejectRequest, timer });
            socket.send(JSON.stringify({ kind: "request", id, method, params }));
          });
        } });
      }
      if (message.kind === "response") {
        const pending = waiting.get(message.id);
        if (!pending) return;
        waiting.delete(message.id); clearTimeout(pending.timer);
        message.ok ? pending.resolve(message.result) : pending.reject(new Error(message.error ?? "MCP-aanvraag mislukt."));
      }
    });
    socket.on("error", error => { clearTimeout(timeout); reject(error); });
  });
}
