export const formatTime = (time: number): string => {
  if (time < 1000) {
    return `${time.toFixed(0)} ms`;
  } else if (time < 1000 * 60) {
    return `${(time / 1000).toFixed(2)} s`;
  } else {
    return `${(time / (1000 * 60)).toFixed(2)} m`;
  }
};

export const formatSize = (size: number): string => {
  if (size < 1024) {
    return `${size.toFixed(0)} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
};

export const getFileExtension = (contentType: string): string => {
  const extensionMap: { [key: string]: string } = {
    "application/json": ".json",
    "text/plain": ".txt",
    "application/xml": ".xml",
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "audio/mpeg": ".mp3",
    "video/mp4": ".mp4",
    "text/csv": ".csv",
    "text/html": ".html",
    "application/zip": ".zip",
    "application/octet-stream": "",
    "audio/wav": ".wav",
    "video/webm": ".webm",
    "image/gif": ".gif",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/epub+zip": ".epub",
    "text/css": ".css",
    "application/javascript": ".js",
    "audio/aac": ".aac",
    "video/x-msvideo": ".avi",
    "application/java-archive": ".jar",
    "image/bmp": ".bmp",
    "application/vnd.oasis.opendocument.text": ".odt",
    "application/vnd.oasis.opendocument.spreadsheet": ".ods",
    "application/vnd.oasis.opendocument.presentation": ".odp",
    "audio/ogg": ".ogg",
    "video/ogg": ".ogv",
    "application/rtf": ".rtf",
    "application/x-tar": ".tar",
    "image/tiff": ".tiff",
    "audio/webm": ".weba",
    "image/webp": ".webp",
    "audio/flac": ".flac",
    "font/woff": ".woff",
    "font/woff2": ".woff2",
    "application/xhtml+xml": ".xhtml",
    "application/x-shockwave-flash": ".swf",
    "text/calendar": ".ics",
    "application/x-7z-compressed": ".7z",
    "video/x-matroska": ".mkv",
    "video/3gp": ".3gp",
  };
  return extensionMap[contentType] || "";
};

export const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays <= 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
