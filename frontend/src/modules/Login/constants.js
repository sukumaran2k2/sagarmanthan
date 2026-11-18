export const PUBLIC_KEY_PEM = (import.meta.env.VITE_RSA_PUBLIC_KEY || "").replace(/\\n/g, "\n");
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://sagarmanthan.ntcpwc.net:8443/api";
export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export const BG_IMAGES = [
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1920&q=80", // Ocean container port loading cranes
  "https://images.unsplash.com/photo-1766792852426-350350437f9e?auto=format&fit=crop&w=1920&q=80", // Industrial port with cranes under a cloudy sky
  "https://images.unsplash.com/photo-1767358603377-ac96bb38a99d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Harbor loading docks and port cranes on the water
];
