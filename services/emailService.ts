import emailjs from '@emailjs/browser';

// Lazy-initialize EmailJS so a missing key doesn't crash the app on load.
let _initialized = false;

const init = (): boolean => {
  const key = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  if (!key) return false;
  if (!_initialized) {
    emailjs.init(key);
    _initialized = true;
  }
  return true;
};

/**
 * Send an email via EmailJS.
 * Silently no-ops if configuration is missing.
 */
export const sendEmail = async (
  to: string,
  templateId: string,
  params: Record<string, string>
): Promise<void> => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  if (!serviceId || !templateId || !to) return;
  if (!init()) return;

  await emailjs.send(serviceId, templateId, { ...params, to_email: to });
};
