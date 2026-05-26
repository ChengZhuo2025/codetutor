import { cn } from "@/lib/utils"

type MarkdownContentProps = {
  content: string
  className?: string
}

function stripMarker(value: string, marker: string) {
  return value.slice(marker.length).trim()
}

function renderInline(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold text-foreground'>$1</strong>")
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "<em>$1</em>")
  html = html.replace(/`([^`\n]+?)`/g, "<code class='rounded bg-muted px-1 py-0.5 text-xs font-mono'>$1</code>")
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="underline decoration-muted-foreground/40 underline-offset-2" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  return html
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return (
    <div className={cn("space-y-4 text-sm leading-7 text-muted-foreground", className)}>
      {blocks.map((block, index) => {
        if (block.startsWith("### ")) {
          return (
            <h3 key={index} className="pt-1 text-base font-semibold text-foreground">
              {stripMarker(block, "### ")}
            </h3>
          )
        }

        if (block.startsWith("## ")) {
          return (
            <h2 key={index} className="pt-2 text-lg font-semibold tracking-tight text-foreground">
              {stripMarker(block, "## ")}
            </h2>
          )
        }

        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean)
        const isOrderedList = lines.every((line) => /^\d+\.\s+/.test(line))
        const isUnorderedList = lines.every((line) => /^[-*]\s+/.test(line))

        if (isOrderedList) {
          return (
            <ol key={index} className="list-decimal space-y-2 pl-5">
              {lines.map((line) => (
                <li
                  key={line}
                  dangerouslySetInnerHTML={{
                    __html: renderInline(line.replace(/^\d+\.\s+/, "")),
                  }}
                />
              ))}
            </ol>
          )
        }

        if (isUnorderedList) {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {lines.map((line) => (
                <li
                  key={line}
                  dangerouslySetInnerHTML={{
                    __html: renderInline(line.replace(/^[-*]\s+/, "")),
                  }}
                />
              ))}
            </ul>
          )
        }

        return (
          <p
            key={index}
            className="whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: renderInline(block) }}
          />
        )
      })}
    </div>
  )
}
