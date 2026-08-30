import { deflateSync, inflateSync } from "node:zlib";

import type { Anchor } from "@rastry/contracts";

export type Raster = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

export type RasterErrorCode =
  | "INVALID_RASTER"
  | "IMAGE_TOO_LARGE"
  | "INVALID_GEOMETRY"
  | "EMPTY_ALPHA_BOUNDS";

export class RasterError extends Error {
  readonly code: RasterErrorCode;

  constructor(code: RasterErrorCode, message: string) {
    super(message);
    this.name = "RasterError";
    this.code = code;
  }
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! * 0x1000000 +
    bytes[offset + 1]! * 0x10000 +
    bytes[offset + 2]! * 0x100 +
    bytes[offset + 3]!
  );
}

function writeUint32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = Math.floor(value / 0x1000000) & 0xff;
  bytes[offset + 1] = Math.floor(value / 0x10000) & 0xff;
  bytes[offset + 2] = Math.floor(value / 0x100) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function chunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

function concatenate(chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function validateDimensions(width: number, height: number, maxPixels: number): number {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new RasterError("INVALID_RASTER", "Raster dimensions must be positive safe integers.");
  }
  if (width > Math.floor(maxPixels / height)) {
    throw new RasterError(
      "IMAGE_TOO_LARGE",
      "The transformed image exceeds the configured pixel limit.",
    );
  }
  const pixelCount = width * height;
  if (pixelCount > Math.floor(Number.MAX_SAFE_INTEGER / 4)) {
    throw new RasterError("IMAGE_TOO_LARGE", "The transformed image is too large to allocate.");
  }
  return pixelCount;
}

function paeth(a: number, b: number, c: number): number {
  const estimate = a + b - c;
  const pa = Math.abs(estimate - a);
  const pb = Math.abs(estimate - b);
  const pc = Math.abs(estimate - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(bytes: Uint8Array, maxPixels: number): Raster {
  if (bytes.byteLength < PNG_SIGNATURE.byteLength + 12) {
    throw new RasterError("INVALID_RASTER", "The PNG raster is truncated.");
  }
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) {
      throw new RasterError("INVALID_RASTER", "The image engine produced an invalid PNG raster.");
    }
  }

  let width = 0;
  let height = 0;
  let hasHeader = false;
  let hasEnd = false;
  const imageData: Uint8Array[] = [];
  let offset = PNG_SIGNATURE.length;

  while (offset + 12 <= bytes.byteLength) {
    const length = readUint32(bytes, offset);
    offset += 4;
    const type = chunkType(bytes, offset);
    offset += 4;
    if (length > bytes.byteLength - offset - 4) {
      throw new RasterError("INVALID_RASTER", "The PNG raster contains a truncated chunk.");
    }
    const data = bytes.subarray(offset, offset + length);
    offset += length + 4;

    if (type === "IHDR") {
      if (length !== 13) {
        throw new RasterError("INVALID_RASTER", "The PNG raster has an invalid header.");
      }
      width = readUint32(data, 0);
      height = readUint32(data, 4);
      if (data[8] !== 8 || data[9] !== 6 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new RasterError("INVALID_RASTER", "The PNG raster must use 8-bit RGBA pixels.");
      }
      validateDimensions(width, height, maxPixels);
      hasHeader = true;
    } else if (type === "IDAT") {
      imageData.push(data);
    } else if (type === "IEND") {
      hasEnd = true;
      break;
    }
  }

  if (!hasHeader || !hasEnd || imageData.length === 0) {
    throw new RasterError("INVALID_RASTER", "The PNG raster is missing required chunks.");
  }

  const compressed = concatenate(imageData);
  const decoded = new Uint8Array(inflateSync(compressed));
  const stride = width * 4;
  const rowLength = stride + 1;
  const expectedLength = height * rowLength;
  if (decoded.byteLength !== expectedLength) {
    throw new RasterError("INVALID_RASTER", "The PNG raster has an invalid scanline length.");
  }

  const pixels = new Uint8Array(width * height * 4);
  const previous = new Uint8Array(stride);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = decoded[sourceOffset]!;
    sourceOffset += 1;
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const raw = decoded[sourceOffset + x]!;
      const left = x >= 4 ? row[x - 4]! : 0;
      const up = previous[x]!;
      const upLeft = x >= 4 ? previous[x - 4]! : 0;
      if (filter === 0) row[x] = raw;
      else if (filter === 1) row[x] = (raw + left) & 0xff;
      else if (filter === 2) row[x] = (raw + up) & 0xff;
      else if (filter === 3) row[x] = (raw + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[x] = (raw + paeth(left, up, upLeft)) & 0xff;
      else
        throw new RasterError(
          "INVALID_RASTER",
          `The PNG raster uses an unsupported filter: ${filter}.`,
        );
    }
    previous.set(row);
    sourceOffset += stride;
  }

  return { width, height, pixels };
}

const crcTable = new Uint32Array(256);
for (let index = 0; index < crcTable.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(type: Uint8Array, data: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of type) value = crcTable[(value ^ byte) & 0xff]! ^ (value >>> 8);
  for (const byte of data) value = crcTable[(value ^ byte) & 0xff]! ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.byteLength);
  writeUint32(chunk, 0, data.byteLength);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeUint32(chunk, 8 + data.byteLength, crc32(typeBytes, data));
  return chunk;
}

export function encodePng(raster: Raster): Uint8Array {
  validateDimensions(raster.width, raster.height, Number.MAX_SAFE_INTEGER);
  if (raster.pixels.byteLength !== raster.width * raster.height * 4) {
    throw new RasterError("INVALID_RASTER", "Raster pixels do not match the declared dimensions.");
  }

  const stride = raster.width * 4;
  const scanlines = new Uint8Array(raster.height * (stride + 1));
  for (let y = 0; y < raster.height; y += 1) {
    const sourceStart = y * stride;
    const targetStart = y * (stride + 1);
    scanlines[targetStart] = 0;
    scanlines.set(raster.pixels.subarray(sourceStart, sourceStart + stride), targetStart + 1);
  }

  const header = new Uint8Array(13);
  writeUint32(header, 0, raster.width);
  writeUint32(header, 4, raster.height);
  header[8] = 8;
  header[9] = 6;
  const signature = PNG_SIGNATURE;
  return concatenate([
    signature,
    makeChunk("IHDR", header),
    makeChunk("IDAT", new Uint8Array(deflateSync(scanlines))),
    makeChunk("IEND", new Uint8Array()),
  ]);
}

function anchorOffset(
  total: number,
  requested: number,
  anchor: Anchor,
  axis: "horizontal" | "vertical",
): number {
  const centered = Math.floor((total - requested) / 2);
  if (axis === "horizontal") {
    if (anchor.endsWith("left") || anchor === "left") return 0;
    if (anchor.endsWith("right") || anchor === "right") return total - requested;
    return centered;
  }
  if (anchor.startsWith("top") || anchor === "top") return 0;
  if (anchor.startsWith("bottom") || anchor === "bottom") return total - requested;
  return centered;
}

export function cropRaster(
  raster: Raster,
  area: { x: number; y: number; width: number; height: number },
): Raster {
  if (
    area.x < 0 ||
    area.y < 0 ||
    area.width <= 0 ||
    area.height <= 0 ||
    area.x > raster.width - area.width ||
    area.y > raster.height - area.height
  ) {
    throw new RasterError("INVALID_GEOMETRY", "The crop area is outside the source image bounds.");
  }

  const pixels = new Uint8Array(area.width * area.height * 4);
  const sourceStride = raster.width * 4;
  const targetStride = area.width * 4;
  for (let y = 0; y < area.height; y += 1) {
    const sourceStart = (area.y + y) * sourceStride + area.x * 4;
    pixels.set(raster.pixels.subarray(sourceStart, sourceStart + targetStride), y * targetStride);
  }
  return { width: area.width, height: area.height, pixels };
}

export function cropRasterByAnchor(
  raster: Raster,
  width: number,
  height: number,
  anchor: Anchor,
): Raster {
  return cropRaster(raster, {
    x: anchorOffset(raster.width, width, anchor, "horizontal"),
    y: anchorOffset(raster.height, height, anchor, "vertical"),
    width,
    height,
  });
}

export function hasTransparency(raster: Raster): boolean {
  for (let index = 3; index < raster.pixels.length; index += 4) {
    if (raster.pixels[index] !== 255) return true;
  }
  return false;
}

export function trimRaster(raster: Raster, alphaThreshold: number): Raster {
  let left = raster.width;
  let top = raster.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      if (raster.pixels[(y * raster.width + x) * 4 + 3]! <= alphaThreshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < 0) {
    throw new RasterError(
      "EMPTY_ALPHA_BOUNDS",
      "The image has no visible pixels after alpha trimming.",
    );
  }
  return cropRaster(raster, { x: left, y: top, width: right - left + 1, height: bottom - top + 1 });
}

export type Rgba = [red: number, green: number, blue: number, alpha: number];

export function padRaster(
  raster: Raster,
  padding: { top: number; right: number; bottom: number; left: number },
  background: Rgba,
): Raster {
  const width = raster.width + padding.left + padding.right;
  const height = raster.height + padding.top + padding.bottom;
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = background[0];
    pixels[index + 1] = background[1];
    pixels[index + 2] = background[2];
    pixels[index + 3] = background[3];
  }

  const sourceStride = raster.width * 4;
  const targetStride = width * 4;
  for (let y = 0; y < raster.height; y += 1) {
    const sourceStart = y * sourceStride;
    const targetStart = (y + padding.top) * targetStride + padding.left * 4;
    pixels.set(raster.pixels.subarray(sourceStart, sourceStart + sourceStride), targetStart);
  }
  return { width, height, pixels };
}
