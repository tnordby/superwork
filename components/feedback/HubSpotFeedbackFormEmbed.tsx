"use client";

import { useEffect, useRef } from "react";

const HUBSPOT_FORM_EMBED_SCRIPT_SRC =
  "https://js.hsforms.net/forms/embed/506440.js";

export function HubSpotFeedbackFormEmbed() {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }

    const script = document.createElement("script");
    script.src = HUBSPOT_FORM_EMBED_SCRIPT_SRC;
    script.defer = true;
    script.setAttribute("data-superwork-hubspot-form", "feedback");
    document.body.appendChild(script);

    return () => {
      script.remove();
      frame.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="hs-form-frame w-full min-h-[280px]"
      data-region="na1"
      data-form-id="12945b2e-f804-477c-af99-2c796525cc82"
      data-portal-id="506440"
    />
  );
}
