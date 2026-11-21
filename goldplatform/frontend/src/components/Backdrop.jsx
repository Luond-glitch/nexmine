import { useEffect, useState } from "react";

// Preloads the photo, then cross-fades it in; a light tint keeps text readable without dulling the image.
export default function Backdrop({ src, tint = 0.3, children }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(false); const i = new Image(); i.onload = () => setOk(true); i.src = src; }, [src]);
  return (
    <div className="relative min-h-screen bg-canopy">
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden">
        <div className={`bg-drift absolute inset-0 bg-cover bg-center transition-opacity duration-[1400ms] ${ok ? "opacity-100" : "opacity-0"}`}
          style={{ backgroundImage: `url(${src})` }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(rgba(6,28,18,${tint}),rgba(6,28,18,${tint + 0.25}))` }} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
