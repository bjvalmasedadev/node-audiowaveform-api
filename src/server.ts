import cors from "cors";
import express, { Request, Response } from "express";
import {
  generateWaveformDataFile,
  generateWaveformJSON,
  processAudioBufferToWaveformData,
} from "./service/proccessAudioFile.js";
import { readFileAsBuffer } from "./utils.js";
// import { readFileAsBuffer } from "./utils";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World");
});

app.get("/api/process-audio", async (req: Request, res: Response) => {
  const filePath = "/Users/bjvalmaseda/audio2.mp3";

  try {
    const buffer = await readFileAsBuffer(filePath);
    //const peaks = await processAudioBufferToWaveformData(buffer, 100, 8, true);
    const dat = await generateWaveformDataFile(buffer, 512, true);

    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="peaks.dat"',
    });
    res.end(dat);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: e.message });
    return;
  }
});

app.get("/api/process-audio-json", async (req: Request, res: Response) => {
  const filePath = "/Users/bjvalmaseda/audio.mp3";

  try {
    const buffer = await readFileAsBuffer(filePath);
    const peaks = await processAudioBufferToWaveformData(buffer, 512, 8);
    const json = generateWaveformJSON(peaks);

    res.json(json);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ message: e.message });
    return;
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
