import { useEffect, useState } from "react";
import { useSettings } from "../../settings/hooks/useSettings";

export function useNerdFont() {
  const { settings } = useSettings();
  const [fontLoaded, setFontLoaded] = useState(false);
  const [fontPath, setFontPath] = useState<string | null>(null);

  useEffect(() => {
    async function loadFont() {
      if (!settings?.terminal?.use_nerd_font || !settings?.terminal?.nerd_font_installed) {
        setFontLoaded(false);
        setFontPath(null);
        return;
      }

      try {
        // Load all font variants as base64
        const [regularBase64, boldBase64, italicBase64, boldItalicBase64] = await Promise.all([
          window.electron?.fonts.getAsBase64("JetBrainsMonoNerdFont-Regular.ttf"),
          window.electron?.fonts.getAsBase64("JetBrainsMonoNerdFont-Bold.ttf"),
          window.electron?.fonts.getAsBase64("JetBrainsMonoNerdFont-Italic.ttf"),
          window.electron?.fonts.getAsBase64("JetBrainsMonoNerdFont-BoldItalic.ttf"),
        ]);

        if (!regularBase64) {
          setFontLoaded(false);
          setFontPath(null);
          return;
        }

        // Create a style element to load the font
        const styleId = "nerd-font-face";
        let styleEl = document.getElementById(styleId) as HTMLStyleElement;

        if (!styleEl) {
          styleEl = document.createElement("style");
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }

        // Define @font-face rules for the Nerd Font using base64 data URLs
        styleEl.textContent = `
          @font-face {
            font-family: 'JetBrainsMono Nerd Font';
            src: url('${regularBase64}') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
          ${boldBase64 ? `
          @font-face {
            font-family: 'JetBrainsMono Nerd Font';
            src: url('${boldBase64}') format('truetype');
            font-weight: bold;
            font-style: normal;
          }
          ` : ''}
          ${italicBase64 ? `
          @font-face {
            font-family: 'JetBrainsMono Nerd Font';
            src: url('${italicBase64}') format('truetype');
            font-weight: normal;
            font-style: italic;
          }
          ` : ''}
          ${boldItalicBase64 ? `
          @font-face {
            font-family: 'JetBrainsMono Nerd Font';
            src: url('${boldItalicBase64}') format('truetype');
            font-weight: bold;
            font-style: italic;
          }
          ` : ''}
        `;

        setFontLoaded(true);
        setFontPath("loaded"); // Just indicate it's loaded
      } catch (error) {
        // console.error("Error loading Nerd Font:", error);
        setFontLoaded(false);
        setFontPath(null);
      }
    }

    loadFont();
  }, [settings?.terminal?.use_nerd_font, settings?.terminal?.nerd_font_installed]);

  return {
    fontLoaded,
    fontPath,
    fontFamily: fontLoaded ? "'JetBrainsMono Nerd Font', monospace" : null,
  };
}
