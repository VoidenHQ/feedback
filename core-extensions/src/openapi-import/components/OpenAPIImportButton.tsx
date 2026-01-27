import { Rows } from "lucide-react";
import React from "react";

interface OpenAPIImportButtonProps {
  context: any;
  onClickCallback?: () => void;
}

export const OpenAPIImportButton: React.FC<OpenAPIImportButtonProps> = ({ context, onClickCallback }) => {
  return (
    <button className="bg-bg flex items-center bg-accent cursor-pointer px-2 py-0.5 text-comment hover:text-text rounded-sm text-sm gap-2 shadow-md hover:shadow-lg " onClick={onClickCallback}>
      <Rows size={14}/> <span>OpenAPI Preview</span>
    </button>
  );
};
