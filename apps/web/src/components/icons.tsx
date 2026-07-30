import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const defaults = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ArrowIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

export function CheckIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m5 12 4 4L19 6" /></svg>;
}

export function CompassIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>;
}

export function FileIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5M10 13h5M10 17h5" /></svg>;
}

export function ShieldIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>;
}

export function SparkIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8zM18.5 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" /></svg>;
}
