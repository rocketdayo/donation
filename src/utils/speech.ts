/**
 * Speech synthesis has been disabled per user request.
 * Functions remain as no-op stubs to avoid breaking any callers.
 */

export class VoiceAnnouncer {
  public static enabled: boolean = false;

  public static setEnabled(_value: boolean) {
    this.enabled = false;
  }

  public static speak(_text: string) {
    // Disabled
  }

  public static announceCall(_ticketNumber: number, _name: string) {
    // Disabled
  }
}

