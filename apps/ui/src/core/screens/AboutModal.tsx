import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import logo from "@/assets/logo-dark.png";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [version, setVersion] = React.useState<string>("");

  React.useEffect(() => {
    window.electron?.getVersion().then(setVersion);
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" />}
      <DialogContent
        className="max-w-[500px] p-8 bg-[#1f2430] border border-border overflow-hidden"
        datatype="no-close"
      >
        <VisuallyHidden>
          <DialogTitle>About Voiden</DialogTitle>
          <DialogDescription>Version information and copyright details for Voiden</DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col items-center text-center">
          {/* Centered Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Voiden Logo" className="w-24 h-24 object-contain" />
          </div>

          {/* App Name and Version */}
          <h2 className="text-2xl font-semibold text-text mb-4">
            Voiden {version}
          </h2>

          {/* Description */}
          <p className="text-comment text-sm mb-6 leading-relaxed">
            Your all-in-one workspace for building, testing, and documenting APIs — designed from the ground up for power, control, and creativity.
          </p>

          {/* Copyright */}
          <p className="text-comment text-xs mb-6">
            © {currentYear} Voiden by ApyHub
          </p>

          {/* OK Button */}
          <Button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded"
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
