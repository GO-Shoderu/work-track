import type { ReactNode } from "react";

type RichNode = {
  type?: string;
  attrs?: { level?: number; start?: number };
  text?: string;
  marks?: { type?: string }[];
  content?: RichNode[];
};

function applyMarks(text: ReactNode, marks: RichNode["marks"]) {
  return (marks ?? []).reduce<ReactNode>((value, mark, index) => {
    if (mark.type === "bold") return <strong key={`b-${index}`}>{value}</strong>;
    if (mark.type === "italic") return <em key={`i-${index}`}>{value}</em>;
    if (mark.type === "strike") return <s key={`s-${index}`}>{value}</s>;
    if (mark.type === "code") return <code key={`c-${index}`} className="rounded bg-subtle px-1 py-0.5">{value}</code>;
    return value;
  }, text);
}

function renderInline(node: RichNode, key: string): ReactNode {
  if (node.type === "text") return <span key={key}>{applyMarks(node.text ?? "", node.marks)}</span>;
  if (node.type === "hardBreak") return <br key={key} />;
  return null;
}

function renderBlocks(nodes: RichNode[] = [], prefix = "n"): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${prefix}-${index}`;
    if (node.type === "paragraph") {
      return <p key={key}>{(node.content ?? []).map((child, i) => renderInline(child, `${key}-${i}`))}</p>;
    }
    if (node.type === "heading") {
      const content = (node.content ?? []).map((child, i) => renderInline(child, `${key}-${i}`));
      return node.attrs?.level === 3 ? <h3 key={key}>{content}</h3> : <h2 key={key}>{content}</h2>;
    }
    if (node.type === "bulletList") {
      return <ul key={key}>{renderListItems(node.content, key)}</ul>;
    }
    if (node.type === "orderedList") {
      return <ol key={key} start={node.attrs?.start ?? 1}>{renderListItems(node.content, key)}</ol>;
    }
    return null;
  });
}

function renderListItems(nodes: RichNode[] = [], prefix: string): ReactNode[] {
  return nodes.map((item, index) => (
    <li key={`${prefix}-li-${index}`}>{renderBlocks(item.content, `${prefix}-li-${index}`)}</li>
  ));
}

function deadline(value: string | null) {
  if (!value) return "Open until filled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Closing date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" }).format(date);
}

export function PublicJobDetail({
  title,
  organisationName,
  closesAt,
  descriptionRich,
  applyHref,
}: {
  title: string;
  organisationName: string;
  closesAt: string | null;
  descriptionRich: RichNode | null;
  applyHref: string;
}) {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="rounded-3xl border border-border bg-white p-6 shadow-[0_1px_4px_rgb(13_15_20/0.05)] sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {organisationName}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-sm font-medium text-muted">{deadline(closesAt)}</p>

        <div className="mt-8 border-t border-border pt-8">
          <div className="prose prose-neutral max-w-none text-sm leading-7
            [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold
            [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold
            [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6
            [&_p]:my-3 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6
            [&_li]:my-1.5">
            {descriptionRich?.type === "doc" ? renderBlocks(descriptionRich.content) : (
              <p>Role details are temporarily unavailable.</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-4 mt-10 rounded-2xl border border-border bg-white/95 p-3 shadow-[0_12px_32px_rgb(13_15_20/0.12)] backdrop-blur sm:flex sm:items-center sm:justify-between">
          <div className="px-2 py-1">
            <p className="text-sm font-semibold">Interested in this role?</p>
            <p className="mt-0.5 text-xs text-muted">Submit your details and CV securely.</p>
          </div>
          <a
            href={applyHref}
            className="mt-3 block rounded-xl bg-lime px-5 py-3 text-center text-sm font-semibold text-sidebar transition hover:bg-lime-hover sm:mt-0"
          >
            Apply for this role
          </a>
        </div>
      </div>
    </div>
  );
}
