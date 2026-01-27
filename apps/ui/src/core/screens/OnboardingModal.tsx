import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/core/lib/utils";

import img1 from "@/assets/log.png";
import img2 from "@/assets/command.gif";
import img3 from "@/assets/getUser.gif";
import img4 from "@/assets/terminal-img.gif";

interface OnboardingStep {
  title: string;
  img: string;
  graphic: string;
  copy: string;
}

export default function OnboardingModal() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const steps: OnboardingStep[] = [
    {
      title: "Git-native. Markdown files. 100% local.",
      img: img1,
      graphic: "A file system tree with .md files, Git log next to it, and no cloud icons in sight.",
      copy: "Voiden works like your code editor — because it is one. Every request, response, and doc is just Markdown. Fully local. Versioned with Git. No sync buttons. No hidden formats. No vendor lock-in. It's your API workspace, in your repo.",
    },
    {
      title: "Everything is a Slash Command",
      img: img2,
      graphic: "A command palette with /request, /doc, /test, /mock, /env being typed into a rich text area.",
      copy: "One editor. One surface. Infinite blocks. Type /request to define an API call. Add /doc for contextual documentation. Mix in /test, /env, or /mock. All in one place. No tab switching. No scattered UIs. Just type. Like you mean it.",
    },
    {
      title: "Reuse Anything with @",
      img: img3,
      graphic: "Markdown with @getUser reused in multiple places, showing auto-complete and reference tracking.",
      copy: "Voiden is the first API editor built for reusability. Reference any block with @. Use the same request in 10 places. Change it once. Done. Cross-link docs, mocks, and tests like code. Say goodbye to duplicate requests and version mismatches.",
    },
    {
      title: "The One Editor That Does It All",
      img: img4,
      graphic: "A terminal where a user pastes a curl, hits enter, and a structured request appears; openAPI and Postman imports on the side.",
      copy: "Voiden speaks fluent API. Paste a curl — it converts it. Import OpenAPI or Postman files. Create everything from one clean editor. You don't need five tools. You need one that gets out of your way.",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40" />}
      <DialogContent
        className="max-w-[1150px] h-[550px] p-4 bg-[#0c0f1a] border-0 shadow-[0_0_10px_1px_#48cfff] overflow-hidden"
        style={{ width: "95%" }}
        datatype="no-close"
      >
        <VisuallyHidden>
          <DialogTitle>Voiden Onboarding</DialogTitle>
          <DialogDescription>Learn about Voiden's key features and capabilities</DialogDescription>
        </VisuallyHidden>
        <div className="flex items-center overflow-hidden">
          <img
            src={steps[currentStep].img}
            alt={steps[currentStep].graphic}
            className={cn("w-[60%] h-fit max-h-[545px] scale-125", currentStep === 0 && "scale-100 h-[470px] object-cover object-left")}
          />
          <div className="pl-4 flex flex-col justify-center h-full relative bg-[#0c0f1a]">
            <div className="pt-4">
              <h2 className="text-[#48cfff] bg-gradient-to-r from-[#48cfff] to-[#b36dff] bg-clip-text text-transparent font-medium text-4xl mb-4">
                {steps[currentStep].title}
              </h2>
              <p className="text-md text-white">{steps[currentStep].copy}</p>
            </div>

            <div className="flex justify-between mt-6 absolute bottom-0 right-0 w-full pl-4">
              {currentStep > 0 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  variant="outline"
                  size="sm"
                  className="w-[120px] text-white border-[#48cfff] hover:bg-[#0c0f1a]"
                >
                  Back
                </Button>
              ) : (
                <div className="w-[120px]" />
              )}
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  variant="outline"
                  size="sm"
                  className="w-[120px] text-white border-[#48cfff] bg-[#48cfff] hover:bg-[#38b3e0]"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    setIsOpen(false);
                    await window.electron?.state.updateOnboarding(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-[120px] text-white border-[#48cfff] bg-[#48cfff] hover:bg-[#38b3e0]"
                >
                  Finish
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
