import { Link } from "react-router-dom";
import { AudioLines } from "lucide-react";
export function Brand({ to = "/" }) {
  return <Link className="brand" to={to} aria-label="ECHO home"><AudioLines size={30} aria-hidden="true" />ECHO<span aria-hidden="true">®</span></Link>;
}
export function ButtonLink({ to, children, secondary = false }) {
  return <Link className={secondary ? "button-link secondary" : "button-link"} to={to}>{children}</Link>;
}
