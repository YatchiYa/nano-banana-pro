class PCMRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      
      // Send the Float32 audio data to the main thread
      this.port.postMessage(inputChannel);
    }
    
    return true;
  }
}

registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
