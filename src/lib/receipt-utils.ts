export type ReceiptKind = "pdf" | "image" | "unknown";

export interface ReceiptMeta {
    kind: ReceiptKind;
    mimeType: string;
    extension: string;
    sizeBytes: number;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
};

const SIZE_UNITS = ["B", "KB", "MB", "GB"];

export function getReceiptMeta(dataUrl: string | undefined | null): ReceiptMeta | null {
    if (!dataUrl || !dataUrl.startsWith("data:")) return null;

    const [metaPart = "", base64Part = ""] = dataUrl.split(",", 2);
    const mimeMatch = metaPart.match(/^data:([^;]+)/);
    const mimeType = mimeMatch?.[1] ?? "application/octet-stream";

    let kind: ReceiptKind = "unknown";
    let extension = "bin";
    if (mimeType === "application/pdf") {
        kind = "pdf";
        extension = "pdf";
    } else if (IMAGE_EXTENSIONS[mimeType]) {
        kind = "image";
        extension = IMAGE_EXTENSIONS[mimeType];
    }

    const paddingMatch = base64Part.match(/=+$/);
    const padding = paddingMatch ? paddingMatch[0].length : 0;
    const sizeBytes = Math.max(0, Math.floor((base64Part.length * 3) / 4) - padding);

    return { kind, mimeType, extension, sizeBytes };
}

export function formatReceiptSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < SIZE_UNITS.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    const decimals = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(decimals)} ${SIZE_UNITS[unitIndex]}`;
}

function slugify(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase()
        .slice(0, 60) || "documento";
}

export function buildReceiptFilename(provider: string, date: Date | string, extension: string): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    const isoDate = Number.isNaN(dateObj.getTime())
        ? "sin-fecha"
        : dateObj.toISOString().slice(0, 10);
    return `recibo-${slugify(provider)}-${isoDate}.${extension}`;
}
