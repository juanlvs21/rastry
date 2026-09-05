import { Electroview } from "electrobun/view";

import type { DesktopRpcSchema } from "../rpc";

export const desktopRpc = Electroview.defineRPC<DesktopRpcSchema>({
  // Native file dialogs can remain open while the user browses folders.
  maxRequestTime: Infinity,
  handlers: {
    requests: {},
    messages: {},
  },
});

const electrobunWindow = window as Window & { __electrobun?: unknown };
const nativeBridge = Reflect.get(electrobunWindow, "__electrobun");
export const electroview = nativeBridge ? new Electroview({ rpc: desktopRpc }) : undefined;
