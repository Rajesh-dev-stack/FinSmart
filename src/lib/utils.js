import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number to Indian currency format with ₹ prefix.
 * e.g., 100000 -> ₹1,00,000
 */
export function formatINR(amount, includeSymbol = true) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-IN");
  return includeSymbol ? `₹${formatted}` : formatted;
}

/**
 * Extracts person or category initials (e.g. "Rajesh Sharma" -> "RS", "Salary" -> "SA")
 */
export function getInitials(text) {
  if (!text || typeof text !== "string") return "?";
  const cleaned = text.replace(/^(sent to|received from|transfer to|payment to)\s+/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
