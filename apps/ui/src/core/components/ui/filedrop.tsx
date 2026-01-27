import { FileDown } from 'lucide-react';
import React, { useState, useCallback } from 'react';

interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  maxFileSize?: number;
  multiple?: boolean;
  className?: string;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesDropped,
  onDragLeave,
  multiple = true,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Left container');
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
    onDragLeave(e);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles: File[] = [];
    files.forEach((file: File) => {
      validFiles.push(file);
    });
    if (validFiles.length > 0) {
      onFilesDropped(validFiles);
    }
  }, [multiple, onFilesDropped]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`absolute top-0 w-full h-full min-h-[200px] flex items-center justify-center border-2 border-accent border-dashed rounded-lg p-10 text-center transition-all duration-200 cursor-pointer`}
    >

      <div className="z-10 space-y-2 pointer-events-none">
        <span className='flex justify-center'><FileDown></FileDown></span>
        {isDragging ? (
          <p className="text-text font-medium">Drag and drop files here</p>
        ) : ('')}
      </div>
      <div className='z-0 absolute bg-bg opacity-80 w-full h-full'>
      </div>

    </div>
  );
};

export default FileDropZone;