// AudioWorklet processor for background audio persistence
class BackgroundAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isPlaying = false;
    this.audioBuffer = null;
    this.bufferPosition = 0;
    this.sampleRate = 44100;
    this.channels = 2;
    
    // Listen for messages from main thread
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'START_AUDIO':
          this.isPlaying = true;
          this.port.postMessage({ type: 'AUDIO_STARTED' });
          break;
          
        case 'STOP_AUDIO':
          this.isPlaying = false;
          this.port.postMessage({ type: 'AUDIO_STOPPED' });
          break;
          
        case 'SET_AUDIO_BUFFER':
          this.audioBuffer = data.buffer;
          this.bufferPosition = 0;
          this.port.postMessage({ type: 'BUFFER_SET' });
          break;
          
        case 'KEEP_ALIVE':
          // Respond to keep-alive pings
          this.port.postMessage({ type: 'ALIVE', timestamp: Date.now() });
          break;
      }
    };
    
    // Send periodic heartbeat to main thread
    this.heartbeatInterval = setInterval(() => {
      this.port.postMessage({ 
        type: 'HEARTBEAT', 
        timestamp: Date.now(),
        isPlaying: this.isPlaying 
      });
    }, 1000);
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    
    if (!this.isPlaying || !this.audioBuffer || !output.length) {
      return true;
    }
    
    // Fill output buffer with audio data
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      
      for (let i = 0; i < outputChannel.length; i++) {
        if (this.audioBuffer && this.bufferPosition < this.audioBuffer.length) {
          // Play audio buffer
          outputChannel[i] = this.audioBuffer[this.bufferPosition] || 0;
        } else {
          // Generate silence or low-volume tone to keep audio context alive
          outputChannel[i] = Math.sin(2 * Math.PI * 440 * (this.bufferPosition / this.sampleRate)) * 0.001;
        }
      }
      
      this.bufferPosition++;
      
      // Loop the buffer
      if (this.audioBuffer && this.bufferPosition >= this.audioBuffer.length) {
        this.bufferPosition = 0;
      }
    }
    
    return true; // Keep processor alive
  }
  
  static get parameterDescriptors() {
    return [];
  }
}

// Register the processor
registerProcessor('background-audio-processor', BackgroundAudioProcessor);

// Keep worklet alive with periodic execution
setInterval(() => {
  // This ensures the worklet thread stays active
}, 100);