import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";

export const Logo = ({ className = "h-10" }: { className?: string }) => (
  <Link to="/" className="inline-flex items-center">
    <img src={logo} alt="Achacarro" className={className} />
  </Link>
);
