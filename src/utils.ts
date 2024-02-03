import fs from "node:fs/promises";

export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  try {
    const buffer = await fs.readFile(filePath);
    return buffer;
  } catch (e) {
    console.error(e);
    throw new Error("Error reading file as buffer");
  }
}
