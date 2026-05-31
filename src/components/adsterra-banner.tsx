import { useEffect, useRef } from "react";

export function AdsterraBanner({ format }: { format: "desktop" | "mobile" }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous children
    containerRef.current.innerHTML = "";

    // Set configuration options globally for the script
    const key = format === "desktop" ? "72f11c8c4e08b0fab2e0c06d7f2e9d14" : "774e900b313b6fc02d5b2a22c91e9afe";
    const atOptions = {
      key: key,
      format: "iframe",
      height: format === "desktop" ? 90 : 50,
      width: format === "desktop" ? 728 : 320,
      params: {},
    };

    (window as any).atOptions = atOptions;

    // Create script element
    const script = document.createElement("script");
    script.src = `https://www.highperformanceformat.com/${key}/invoke.js`;
    script.async = true;

    containerRef.current.appendChild(script);
  }, [format]);

  return (
    <div className="flex items-center justify-center my-6 overflow-hidden min-h-[50px] w-full">
      <div ref={containerRef} className="mx-auto" />
    </div>
  );
}
