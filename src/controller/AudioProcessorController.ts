import { Controller, Get, Query, Res, Route, TsoaResponse } from "tsoa";
import { AudioProcessorService } from "../service/AudioProcessorService.js";

@Route("audio-processor")
export class AudioProcessorController extends Controller {
  @Get("process-audio")
  public async processAudio(
    @Res()
    res: TsoaResponse<
      200,
      { file: Buffer },
      { "Content-Type": string; "Content-Disposition": string }
    >,
    @Query() fileName: string
  ): Promise<void> {
    const buffer = await new AudioProcessorService().processAudio(fileName);

    res(
      200,
      { file: buffer },
      {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="peaks.dat"',
      }
    );
  }
}
