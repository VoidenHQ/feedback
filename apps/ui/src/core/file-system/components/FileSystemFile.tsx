import { useReadFile, useGetActiveDocument } from "@/core/file-system/hooks";

import { VoidenEditor } from "@/core/editors/voiden/VoidenEditor";

import { CodeEditor } from "@/core/editors/code/CodeEditor";

export const FileSystemFile = () => {
  const { data: activeFile } = useGetActiveDocument();
  const { isPending, error } = useReadFile();

  if (isPending || !activeFile) return null;
  if (error) return <div>Error loading file</div>;

  return (
    <div className="h-full">
      {activeFile.endsWith(".void") && <VoidenEditor path={activeFile} />}
      {!activeFile.endsWith(".void") && <CodeEditor path={activeFile} />}
    </div>
  );
};
