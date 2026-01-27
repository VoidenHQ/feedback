import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { generateGrpcurlFromJson } from '../lib/grpcurlGenerator';
import { PluginContext } from '@voiden/sdk';


interface CopyGrpcurlButtonProps {
    tab?: {
        title?: string;
        content?: string;
        tabId?: string;
        [key: string]: any;
    };
    context: PluginContext
}

export const CopyGrpcurlButton: React.FC<CopyGrpcurlButtonProps> = ({ tab, context }) => {
    const [copied, setCopied] = useState(false);


    const readActiveEditorJSON = () => {
        try {
            const voiden = context.project.getActiveEditor?.("voiden");
            const value =
                (voiden && typeof voiden.getJSON === "function" && voiden.getJSON()) ||
                [];
            return value || [];
        } catch {
            return [];
        }
    };
    const handleCopyGrpcurl = async () => {
        try {
            const jsonContent = readActiveEditorJSON();

            if (!jsonContent || jsonContent.length === 0) {
                console.warn('No content available to copy');
                return;
            }

            // Generate grpcurl command
            const grpcurlCommand = await generateGrpcurlFromJson(jsonContent);

            if (!grpcurlCommand) {
                console.warn('Failed to generate grpcurl command');
                return;
            }

            // Copy to clipboard
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(grpcurlCommand);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = grpcurlCommand;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            // Show feedback
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Error copying grpcurl command:', error);
        }
    };

    return (
        <button
            onClick={handleCopyGrpcurl}
            className="w-full flex items-center gap-1 px-2 py-1 rounded hover:bg-button-primary text-text transition-colors"
            title="Copy as grpcurl"
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4" />
                    <span className="text-xs">Copied</span>
                </>
            ) : (
                <>
                    <Copy className="w-4 h-4" />
                    <span className="text-xs">grpcurl</span>
                </>
            )}
        </button>
    );
};
