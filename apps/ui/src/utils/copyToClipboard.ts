export const copyToClipboard = (textToCopy: string) => {
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {})
    .catch((err) => {
      // console.error("Failed to copy text: ", err);
    });
};
