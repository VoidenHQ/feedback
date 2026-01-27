import React, { FC } from "react";
import { useStore } from "@/store";
import { toast } from "sonner";
import { LuAlertCircle } from "react-icons/lu";

const ErrorDetails: FC<{ message: string }> = ({ message }) => {
  const setError = useStore((state) => state.setErrorDetails);
  return (
    <LuAlertCircle
      size={20}
      color="black"
      className="ml-auto"
      onClick={() => {
        setError(message);
        toast.dismiss();
      }}
    />
  );
};

export { ErrorDetails };
