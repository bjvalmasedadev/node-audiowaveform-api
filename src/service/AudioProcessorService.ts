import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileAsBuffer } from "../utils.js";
import { generateWaveformDataFile } from "./proccessAudioFile.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class AudioProcessorService {
  public async processAudio(fileName: string) {
    const filePath = path.join(__dirname, "../../public", fileName as string);

    const buffer = await readFileAsBuffer(filePath);

    return generateWaveformDataFile(buffer, 512, true);
  }
}
