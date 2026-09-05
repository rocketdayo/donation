/**
 * Web Speech Synthesis for Voice Calling Announcements
 */

export class VoiceAnnouncer {
  public static enabled: boolean = true;

  public static setEnabled(value: boolean) {
    this.enabled = value;
  }

  public static speak(text: string) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find(v => v.lang.includes('ja') || v.lang.includes('JP'));
      if (jaVoice) {
        utterance.voice = jaVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis failed:', err);
    }
  }

  public static announceCall(ticketNumber: number, name: string) {
    const text = `整理券番号、${ticketNumber}番。${name}様。食堂前の献血バスへお越しください。`;
    this.speak(text);
  }
}
