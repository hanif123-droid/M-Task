/**
 * Browser Audio and Haptic Feedback Utility
 * Uses Web Audio API and HTML5 Vibration API for zero-dependency sound and vibration.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (e.g., due to user interaction policies)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a high-quality synthesized "Click / Pop / Tap" sound
 */
export function playClickSound() {
  // Sound effect has been disabled per user request
}

/**
 * Play a high-quality synthesized "Double Chime" notification sound
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Tone 2: A5 (880.00 Hz) lagging slightly behind
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.08);
    gain2.gain.setValueAtTime(0.0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.3);
    
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
  } catch (error) {
    console.warn("Feedback: Audio chime failed:", error);
  }
}

/**
 * Trigger vibration haptics on the client device (such as mobile phone screens)
 * @param pattern ms of vibration, or array [vibrate, pause, vibrate...]
 */
export function triggerVibration(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    // Avoid crashing on sandboxed frames or non-supporting browsers
    console.debug("Feedback: Vibration haptic turned off or blocked on device", error);
  }
}

/**
 * Unified feedback functions: Sound + Vibration
 */
export function triggerClickFeedback() {
  playClickSound();
  triggerVibration(12); // Short crisp tap
}

export function triggerNotificationFeedback() {
  playNotificationSound();
  triggerVibration([100, 60, 120]); // Double-tap vibration pattern
}

/**
 * Request notification permission from the browser/device.
 * Returns true if granted successfully.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.debug('Feedback: This device/browser environment does not support Notification APIs.');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Send a test notification to verify it works instantly
      sendDeviceNotification('Notifikasi Aktif 🔔', 'Notifikasi sistem dan suara getar berhasil diaktifkan pada perangkat Anda!');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Feedback: Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Send a native device notification banner that pops up on the system tray.
 * Also plays high-fidelity sound and triggers vibration feedback.
 */
export function sendDeviceNotification(title: string, body: string, iconUrl?: string) {
  try {
    // 1. Play synthesized sound & vibration instantly
    triggerNotificationFeedback();

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // 2. Dispatch actual os/native browser system notification banner if permission is granted
    if (Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body: body,
        icon: iconUrl || 'https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20M-TASK.png', // Fallback high-quality icon
        badge: 'https://unhwnznhwltgpyzdzfah.supabase.co/storage/v1/object/public/Mtask/logo%20icon%26avatar%20user/LOGO%20M-TASK.png',
        silent: false, // Ensure system sound goes off if supported
        tag: 'app-notification-' + Date.now(),
      };

      // Try using Service Worker registration first (Required for Chrome on Android & works backgrounded)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            reg.showNotification(title, options);
          } else {
            // Fallback to standard local constructor (required for iOS Safari / older desktops)
            const notification = new Notification(title, options);
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }
        }).catch(() => {
          const notification = new Notification(title, options);
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        });
      } else {
        const notification = new Notification(title, options);
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } else {
      console.log('Feedback: Native notification blocked because permission state is:', Notification.permission);
    }
  } catch (err) {
    console.warn('Feedback: Failed to send native system notification:', err);
  }
}
