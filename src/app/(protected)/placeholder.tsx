import { PageHeading } from "@/components/ui";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <PageHeading title={title} description={description} />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-900">
          Modul ini akan segera tersedia.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Saat ini fokus pengembangan ada pada menu Master Data.
        </p>
      </div>
    </>
  );
}
