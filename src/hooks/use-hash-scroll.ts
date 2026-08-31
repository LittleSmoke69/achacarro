import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useHashScroll = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);
};
