import ReactMarkdown from "react-markdown";

/** 메모 마크다운 표시. HTML 태그는 그대로 글자로 보여준다(react-markdown 기본값) */
export function Markdown({ children }: { children: string }) {
  return (
    <div
      className={[
        "text-[15px] leading-relaxed break-words",
        "[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mt-3 [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:font-semibold",
        "[&_a]:text-primary [&_a]:underline [&_strong]:font-semibold",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-sm",
        "[&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
      ].join(" ")}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
