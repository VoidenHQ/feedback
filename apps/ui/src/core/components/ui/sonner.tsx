import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-panel group-[.toaster]:text-text group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-text",
          description: "group-[.toast]:text-comment",
          actionButton:
            "group-[.toast]:bg-active group-[.toast]:text-text",
          cancelButton:
            "group-[.toast]:bg-active group-[.toast]:text-comment",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
