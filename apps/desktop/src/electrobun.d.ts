type ElectrobunSchemaLike = {
  bun: { requests: object; messages: object };
  webview: { requests: object; messages: object };
};

type ElectrobunRpcRequestOptions = {
  maxRequestTime?: number;
};

type ElectrobunRequestProxy<Requests extends object> = {
  [K in keyof Requests]: (
    params: Requests[K] extends { params: infer Params } ? Params : never,
    options?: ElectrobunRpcRequestOptions,
  ) => Promise<Requests[K] extends { response: infer Response } ? Response : never>;
};

type ElectrobunMessageProxy<Messages extends object> = {
  [K in keyof Messages]: (payload: Messages[K]) => void;
};

type ElectrobunRpcTransport = {
  setTransport(transport: unknown): void;
};

type ElectrobunMainRpc<Schema extends ElectrobunSchemaLike> = ElectrobunRpcTransport & {
  send: ElectrobunMessageProxy<Schema["webview"]["messages"]>;
};

type ElectrobunViewRpc<Schema extends ElectrobunSchemaLike> = ElectrobunRpcTransport & {
  request: ElectrobunRequestProxy<Schema["bun"]["requests"]>;
  addMessageListener<K extends keyof Schema["webview"]["messages"]>(
    name: K,
    handler: (payload: Schema["webview"]["messages"][K]) => void,
  ): void;
  removeMessageListener<K extends keyof Schema["webview"]["messages"]>(
    name: K,
    handler: (payload: Schema["webview"]["messages"][K]) => void,
  ): void;
};

declare module "electrobun/main" {
  export const BrowserView: {
    defineRPC<Schema extends ElectrobunSchemaLike>(config: unknown): ElectrobunMainRpc<Schema>;
  };

  export const BrowserWindow: {
    new <Rpc = unknown>(options: {
      title: string;
      url: string;
      frame: { width: number; height: number; x: number; y: number };
      rpc?: Rpc;
    }): object;
  };

  export const Updater: {
    localInfo: {
      channel(): Promise<string>;
    };
  };

  export const Utils: {
    openFileDialog(options?: {
      startingFolder?: string;
      allowedFileTypes?: string;
      canChooseFiles?: boolean;
      canChooseDirectory?: boolean;
      allowsMultipleSelection?: boolean;
    }): Promise<string[]>;
  };
}

declare module "electrobun/view" {
  export const Electroview: {
    new <Rpc extends ElectrobunRpcTransport>(config: { rpc: Rpc }): object;
    defineRPC<Schema extends ElectrobunSchemaLike>(config: unknown): ElectrobunViewRpc<Schema>;
  };
}
