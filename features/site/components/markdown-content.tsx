import { cn } from "@/lib/utils"
import { parseMarkdownBlocks, renderMarkdownInlineHtml } from "@/features/site/lib/markdown"

type MarkdownContentProps = {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = parseMarkdownBlocks(content)

  return (
    <div className={cn("space-y-4 text-sm leading-7 text-muted-foreground", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading" && block.level === 3) {
          return (
            <h3 key={index} className="pt-1 text-base font-semibold text-foreground">
              {block.text}
            </h3>
          )
        }

        if (block.type === "heading" && block.level === 2) {
          return (
            <h2 key={index} className="pt-2 text-lg font-semibold tracking-tight text-foreground">
              {block.text}
            </h2>
          )
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={index} className="list-decimal space-y-2 pl-5">
              {block.items.map((line) => (
                <li
                  key={line}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownInlineHtml(line),
                  }}
                />
              ))}
            </ol>
          )
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {block.items.map((line) => (
                <li
                  key={line}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownInlineHtml(line),
                  }}
                />
              ))}
            </ul>
          )
        }

        if (block.type === "paragraph") {
          return (
            <p
              key={index}
              className="whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: renderMarkdownInlineHtml(block.text) }}
            />
          )
        }

        return null
      })}
    </div>
  )
}
