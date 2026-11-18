import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export { assetPath } from "./site-config.mjs";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
