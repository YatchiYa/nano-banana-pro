class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Ring buffer for 180 seconds of 24kHz audio
    this.bufferSize = 24000 * 180;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.availableSamples = 0;
    
    // Listen for incoming audio data
    this.port.onmessage = (event) => {
      const int16Data = event.data;
      
      // Convert Int16 to Float32 and add to buffer
      for (let i = 0; i < int16Data.length; i++) {
        this.buffer[this.writeIndex] = int16Data[i] / 32768.0;
        this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
        
        // Handle buffer overflow
        if (this.availableSamples < this.bufferSize) {
          this.availableSamples++;
        } else {
          // Buffer is full, overwrite oldest samples
          this.readIndex = (this.readIndex + 1) % this.bufferSize;
        }
      }
    };
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    
    if (output.length > 0) {
      const outputChannel = output[0];
      
      for (let i = 0; i < outputChannel.length; i++) {
        if (this.availableSamples > 0) {
          outputChannel[i] = this.buffer[this.readIndex];
          this.readIndex = (this.readIndex + 1) % this.bufferSize;
          this.availableSamples--;
        } else {
          // No data available, output silence
          outputChannel[i] = 0;
        }
      }
      
      // Copy to all output channels
      for (let channel = 1; channel < output.length; channel++) {
        output[channel].set(outputChannel);
      }
    }
    
    return true;
  }
}

registerProcessor('pcm-player-processor', PCMPlayerProcessor);
