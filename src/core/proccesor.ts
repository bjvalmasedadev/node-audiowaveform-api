import decodeAudioData from "audio-decode";
/**
 * Decodifica los datos de audio y genera un archivo .dat compatible con audiowaveform.
 *
 * @param {Buffer} buffer Buffer que contiene los datos del archivo de audio.
 * @param {number} samplesPerPixel Número de muestras por píxel para la visualización de la forma de onda.
 * @param {boolean} splitChannels Indica si se deben separar los canales en la forma de onda.
 * @param {number} bits Resolución de los datos de la forma de onda (8 o 16 bits).
 */
export async function generateWaveformDataFile(
  buffer: Buffer,
  samplesPerPixel = 512,
  splitChannels = false,
  bits = 8
) {
  try {
    const audioBuffer = await decodeAudioData(buffer); // Asume que esta función devuelve un AudioBuffer
    const sampleRate: number = audioBuffer.sampleRate;
    const channels: number = splitChannels ? audioBuffer.numberOfChannels : 1;
    // Usa 1 si splitChannels es false para generar mono.
    const length: number = Math.floor(
      audioBuffer.length / samplesPerPixel / channels
    );

    const headerBuffer = Buffer.alloc(24);
    headerBuffer.writeInt32LE(2, 0); // Versión
    headerBuffer.writeUInt32LE(bits === 8 ? 1 : 0, 4); // Flags
    headerBuffer.writeInt32LE(sampleRate, 8); // Tasa de muestreo
    headerBuffer.writeInt32LE(samplesPerPixel, 12); // Muestras por píxel
    headerBuffer.writeUInt32LE(length, 16); // Longitud
    headerBuffer.writeInt32LE(channels, 20); // Canales

    // Calcula el tamaño correcto del dataBuffer basado en 'bits' y si los canales están separados
    let dataSizePerChannel = length * 2; // *2 por min/max para cada punto
    if (bits === 16) {
      dataSizePerChannel *= 2; // *2 porque cada muestra de 16 bits necesita 2 bytes
    }

    // Multiplica por el número de canales si los canales están separados
    let totalDataSize = dataSizePerChannel * (splitChannels ? channels : 1);
    let dataBuffer = Buffer.alloc(totalDataSize);

    let bufferIndex = 0;

    for (
      let channel = 0;
      channel < (splitChannels ? audioBuffer.numberOfChannels : 1);
      channel++
    ) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = i * samplesPerPixel; j < (i + 1) * samplesPerPixel; j++) {
          const value = channelData[j];
          if (value < min) min = value;
          if (value > max) max = value;
        }
        // Escala y escribe los valores min y max al rango apropiado
        const scaledMin = Math.round((min + 1) * 127.5) - 128;
        const scaledMax = Math.round((max + 1) * 127.5) - 128;

        if (bits === 8) {
          dataBuffer.writeInt8(
            Math.max(-128, Math.min(127, scaledMin)),
            bufferIndex++
          );
          dataBuffer.writeInt8(
            Math.max(-128, Math.min(127, scaledMax)),
            bufferIndex++
          );
        } else {
          // Para datos de 16 bits
          dataBuffer.writeInt16LE(
            Math.max(-32768, Math.min(32767, Math.round((min + 1) * 32767.5))),
            bufferIndex
          );
          bufferIndex += 2;
          dataBuffer.writeInt16LE(
            Math.max(-32768, Math.min(32767, Math.round((max + 1) * 32767.5))),
            bufferIndex
          );
          bufferIndex += 2;
        }
      }
    }

    // Concatena el encabezado y los datos, y escribe el archivo
    const finalBuffer = Buffer.concat([headerBuffer, dataBuffer]);
    return finalBuffer;
  } catch (e: any) {
    console.error(e);
    throw new Error(e);
  }
}
