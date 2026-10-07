import { EngageShareBox } from "@/components/engage-share-box";
import { PageHeader } from "@/components/page-header";

export const maxDuration = 90;

// The PWA share target, the bookmarklet and the iOS Shortcut all land here. It
// only pre-fills the box: nothing is saved until he taps Draft comments.
export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const text = [one(params.title), one(params.text)].filter(Boolean).join("\n").trim();
  const via = one(params.via) === "bookmarklet" ? "bookmarklet" : "share";

  return (
    <>
      <PageHeader title="Comment on a post" eyebrow="Engage">
        Check the text is the part you want to answer, then draft.
      </PageHeader>
      <EngageShareBox initialUrl={one(params.url)} initialText={text} via={via} autoFocus />
    </>
  );
}
