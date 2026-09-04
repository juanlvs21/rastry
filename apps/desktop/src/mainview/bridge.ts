import { Electroview } from "electrobun/view";

import type { DesktopRpcSchema } from "../rpc";

export const desktopRpc = Electroview.defineRPC<DesktopRpcSchema>({
  handlers: {
    requests: {},
    messages: {},
  },
});

const electrobunWindow = window as Window & { __electrobun?: unknown };
const nativeBridge = Reflect.get(electrobunWindow, "__electrobun");
export const electroview = nativeBridge ? new Electroview({ rpc: desktopRpc }) : undefined;
