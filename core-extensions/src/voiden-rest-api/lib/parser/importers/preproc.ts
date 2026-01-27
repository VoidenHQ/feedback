const multipartFunctions = {
  getBoundary(rawData: string, rawContentType: string | undefined): string | null {
    if (!rawContentType || rawContentType.length === 0) {
      return this.getBoundaryFromRawData(rawData);
    }
    return this.getBoundaryFromRawContentType(rawData, rawContentType);
  },

  getBoundaryFromRawData(rawData: string): string | null {
    const match = rawData.match(/(-{2,}[A-Za-z0-9]+)\r\n/g);
    return match && match.length > 0 ? match[0].slice(0, -4) : null;
  },

  getBoundaryFromRawContentType(rawData: string, rawContentType: string): string | null {
    const match = rawContentType.match(/boundary=(.+)/);
    if (match && match.length > 1) {
      const boundary = `--${match[1]}`;
      const sanitizedData = rawData.replace(/\\r\\n/g, "");
      if (sanitizedData.endsWith(`${boundary}--`)) {
        return boundary;
      }
    }
    return null;
  },

  splitUsingBoundaryAndNewLines(rawData: string, boundary: string): string[][] {
    return rawData
      .split(new RegExp(`${boundary}-*`))
      .filter((part) => part !== "" && part.includes("name"))
      .map((part) =>
        part
          .replace(/\\r\\n+/g, "\r\n")
          .split("\r\n")
          .filter((line) => line !== ""),
      );
  },

  getNameValuePair(pair: string[]): [string, string] | null {
    if (pair.length < 1) return null;

    const nameMatch = pair[0].match(/ name="(\w+)"/);
    if (!nameMatch || nameMatch.length === 0) return null;

    const name = nameMatch[1];
    const value = pair[0].includes("filename") ? "" : pair[1];
    return [name, value];
  },
};

const tupleToRecord = (tuples: [string, string][]) => {
  return tuples.map((t) => `${t[0]}=${t[1]}`);
};

export const getFormDataBody = (rawData: string, rawContentType?: string | undefined) => {
  const boundary = multipartFunctions.getBoundary(rawData, rawContentType);

  if (!boundary) return null;

  const parts = multipartFunctions.splitUsingBoundaryAndNewLines(rawData, boundary);
  const nameValuePairs = parts.map((p) => multipartFunctions.getNameValuePair(p)).filter((pair): pair is [string, string] => pair !== null);

  if (nameValuePairs.length === 0) return null;

  return tupleToRecord(nameValuePairs);
};
