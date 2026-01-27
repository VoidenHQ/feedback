import { cn } from "@/core/lib/utils";

interface KbdProps {
  keys: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Keyboard shortcut display component
 * Automatically converts Mac shortcuts to Windows/Linux equivalents
 *
 * @example
 * <Kbd keys="⌘N" /> // Shows Command+N on Mac, Ctrl+N on Windows/Linux
 * <Kbd keys="⌘⇧P" /> // Shows Command+Shift+P on Mac, Ctrl+Shift+P on Windows/Linux
 */
export const Kbd = ({ keys, className, size = "md" }: KbdProps) => {
  const isMac = navigator?.userAgent?.toLowerCase().includes("mac") ?? false;

  // Convert Mac symbols to readable format for all platforms
  const convertKeys = (macKeys: string): string => {
    let converted = macKeys
      .replace(/⌘/g,  "Ctrl")
      .replace(/⌥/g,  "Alt")
      .replace(/⇧/g, "Shift")
      .replace(/⌃/g, "Ctrl")
      .replace(/↵/g, "Enter")
      .replace(/⌫/g, "Backspace")
      .replace(/⌦/g, "Delete")
      .replace(/⇥/g, "Tab");

    // Split into individual keys and join with +
    // This handles cases like "CommandN" -> "Command+N" and "CommandShiftP" -> "Command+Shift+P"
    const parts: string[] = [];
    let currentPart = "";

    for (let i = 0; i < converted.length; i++) {
      const char = converted[i];

      // Check if this starts a known modifier
      if (converted.substring(i).startsWith("Command")) {
        if (currentPart) parts.push(currentPart);
        parts.push("Command");
        currentPart = "";
        i += 6; // Skip "Command"
      } else if (converted.substring(i).startsWith("Option")) {
        if (currentPart) parts.push(currentPart);
        parts.push("Option");
        currentPart = "";
        i += 5; // Skip "Option"
      } else if (converted.substring(i).startsWith("Ctrl")) {
        if (currentPart) parts.push(currentPart);
        parts.push("Ctrl");
        currentPart = "";
        i += 3; // Skip "Ctrl"
      } else if (converted.substring(i).startsWith("Alt")) {
        if (currentPart) parts.push(currentPart);
        parts.push("Alt");
        currentPart = "";
        i += 2; // Skip "Alt"
      } else if (converted.substring(i).startsWith("Shift")) {
        if (currentPart) parts.push(currentPart);
        parts.push("Shift");
        currentPart = "";
        i += 4; // Skip "Shift"
      } else {
        currentPart += char;
      }
    }

    if (currentPart) parts.push(currentPart);

    return parts.join("+");
  };

  const displayKeys = !isMac ? convertKeys(keys):keys.split('').join(" ");

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-2.5 py-1.5",
  };

  return (
    <kbd
      className={cn(
        "font-mono bg-panel border border-border rounded inline-flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      {displayKeys}
    </kbd>
  );
};
