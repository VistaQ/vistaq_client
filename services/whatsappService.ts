/**
 * Send a WhatsApp message via CallMeBot.
 *
 * Each user must opt in once by sending a WhatsApp message to the CallMeBot
 * number to receive their personal apiKey. Details: callmebot.com/blog/free-whatsapp-api
 *
 * Silently no-ops if phone or apiKey are missing.
 */
export const sendWhatsApp = async (
  phone: string,
  apiKey: string,
  message: string
): Promise<void> => {
  if (!phone || !apiKey || !message) return;

  const url =
    `https://api.callmebot.com/whatsapp.php` +
    `?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(message)}` +
    `&apikey=${encodeURIComponent(apiKey)}`;

  await fetch(url);
};
