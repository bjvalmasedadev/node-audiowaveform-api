import decodeAudioData from "audio-decode";

interface Waveform {
  version: number;
  flags: number;
  sampleRate: number;
  samplesPerPixel: number;
  length: number;
  channels: number;
  data: number[];
}

interface WaveformData {
  version: number;
  channels: number;
  sample_rate: number;
  samples_per_pixel: number;
  bits: number;
  length: number;
  data: number[];
}

export async function processAudioBufferToWaveformData(
  buffer: Buffer,
  samplesPerPixel: number = 512,
  bits: 8 | 16 = 8,
  splitChannels: boolean = false
): Promise<Waveform> {
  const audioBuffer = await decodeAudioData(buffer);
  const sampleRate: number = audioBuffer.sampleRate;
  const channels: number = splitChannels ? audioBuffer.numberOfChannels : 1;
  const length: number = Math.floor(
    audioBuffer.length / samplesPerPixel / channels
  );
  let data: number[] = [];

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
      data.push(min * 128, max * 128);
    }
  }

  return {
    version: 2,
    flags: bits === 8 ? 1 : 0,
    sampleRate,
    samplesPerPixel,
    length,
    channels,
    data,
  };
}

function scaleValue(value: number, bits: 8 | 16): number {
  if (bits === 8) {
    return Math.floor(((value + 1) / 2) * 255);
  } else {
    return Math.floor(value * 32767);
  }
}

export function generateWaveformDatBuffer(waveform: Waveform): Buffer {
  const {
    version,
    sampleRate,
    samplesPerPixel,
    length,
    channels,
    data,
    flags,
  } = waveform;
  const headerLength = version === 1 ? 20 : 24;
  const dataLength = data.length * 2; // Asumiendo 16 bits por dato
  const buffer = Buffer.alloc(headerLength + dataLength);

  let offset = 0;
  // Encabezado
  buffer.writeInt32LE(version, offset);
  offset += 4;
  buffer.writeUInt32LE(flags, offset);
  offset += 4;
  buffer.writeInt32LE(sampleRate, offset);
  offset += 4;
  buffer.writeInt32LE(samplesPerPixel, offset);
  offset += 4;
  buffer.writeUInt32LE(length, offset);
  offset += 4;
  if (version === 2) {
    buffer.writeInt32LE(channels, offset);
    offset += 4;
  }

  // Datos de la forma de onda
  data.forEach((value) => {
    buffer.writeInt16LE(value, offset);
    offset += 2;
  });

  return buffer;
}

function scaleTo8Bit(value: number) {
  // Escalar el valor de -1.0-1.0 (float) a 0-255 (8 bits)
  return Math.floor(((value + 1) / 2) * 255);
}

export function generateWaveformJSON(waveform: Waveform): WaveformData {
  return {
    version: waveform.version,
    channels: waveform.channels,
    sample_rate: waveform.sampleRate,
    samples_per_pixel: waveform.samplesPerPixel,
    bits: waveform.flags === 1 ? 8 : 16,
    length: waveform.length,
    data: waveform.data,
  };
}

/**
 * Decodifica los datos de audio y genera un archivo .dat compatible con audiowaveform.
 *
 * @param {Buffer} buffer Buffer que contiene los datos del archivo de audio.
 * @param {string} outputPath Ruta del archivo de salida .dat.
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
    const channels: number = audioBuffer.numberOfChannels;
    const numChannels: number = splitChannels ? channels : 1; // Usa 1 si splitChannels es false.
    const length: number = Math.floor(
      audioBuffer.length / samplesPerPixel / channels
    );

    const headerBuffer = Buffer.alloc(24); // Preparación del encabezado.
    headerBuffer.writeInt32LE(2, 0); // Versión.
    headerBuffer.writeUInt32LE(bits === 8 ? 1 : 0, 4); // Flags, basado en la resolución de bits.
    headerBuffer.writeInt32LE(sampleRate, 8); // Tasa de muestreo.
    headerBuffer.writeInt32LE(samplesPerPixel, 12); // Muestras por píxel.
    headerBuffer.writeUInt32LE(length, 16); // Longitud.
    headerBuffer.writeInt32LE(numChannels, 20); // Canales, ajustado por splitChannels.

    let dataBuffer: Buffer;
    // Ajusta el tamaño del buffer de datos basado en bits y si se divide en canales.
    if (bits === 8) {
      dataBuffer = Buffer.alloc(length * numChannels * 2);
    } else {
      dataBuffer = Buffer.alloc(length * numChannels * 4);
    }

    let bufferIndex = 0;
    for (let channel = 0; channel < (splitChannels ? channels : 1); channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        let min = 1.0,
          max = -1.0;
        for (let j = i * samplesPerPixel; j < (i + 1) * samplesPerPixel; j++) {
          const value = channelData[j];
          if (value < min) min = value;
          if (value > max) max = value;
        }
        // Escala y escribe los valores en el buffer.
        if (bits === 8) {
          dataBuffer.writeInt8(
            Math.max(-128, Math.min(127, Math.round((min + 1) * 63.5))),
            bufferIndex++
          );
          dataBuffer.writeInt8(
            Math.max(-128, Math.min(127, Math.round((max + 1) * 63.5))),
            bufferIndex++
          );
        } else {
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

    // Concatena el encabezado y los datos, y escribe el archivo.
    const finalBuffer = Buffer.concat([headerBuffer, dataBuffer]);
    return finalBuffer;
  } catch (e: any) {
    console.error(e);
    throw new Error(e);
  }
}
