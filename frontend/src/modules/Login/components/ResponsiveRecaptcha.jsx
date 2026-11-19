import { useEffect, useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

// Google always renders the checkbox widget at this size, no matter the
// container (https://developers.google.com/recaptcha/docs/display#config).
// Scaling it with a fixed Tailwind breakpoint guesses the card's width; this
// measures the actual container instead, and scales up to fill it (not
// capped at native size), so it matches the width of the fields above it.
const RECAPTCHA_WIDTH = 304;
const RECAPTCHA_HEIGHT = 78;

// resetKey: change it to redraw a fresh, unticked widget. A reCAPTCHA answer
// can be checked by the server only once, so after a failed attempt the old
// tick is used up and the user has to tick again.
export default function ResponsiveRecaptcha({ sitekey, onChange, theme = 'light', resetKey = 0 }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.offsetWidth;
      if (width > 0) setScale(width / RECAPTCHA_WIDTH);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full flex justify-center" style={{ height: RECAPTCHA_HEIGHT * scale }}>
      <div style={{ width: RECAPTCHA_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        <ReCAPTCHA key={resetKey} sitekey={sitekey} onChange={onChange} theme={theme} />
      </div>
    </div>
  );
}
