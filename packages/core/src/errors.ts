export class RastryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RastryError";
    this.code = code;
  }
}

