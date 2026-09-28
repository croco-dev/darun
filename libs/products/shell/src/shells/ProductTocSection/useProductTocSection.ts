import { useEffect, useState } from "react";

export function useProductTocSection() {
  const [isFixed, setIsFixed] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      const detailContent = document.getElementById("detail-content");
      const threshold = detailContent
        ? detailContent.getBoundingClientRect().top + window.scrollY - 120
        : 240;
      const nextIsFixed = window.scrollY > threshold;

      setIsFixed((prevIsFixed) =>
        prevIsFixed === nextIsFixed ? prevIsFixed : nextIsFixed,
      );
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return { isFixed };
}
