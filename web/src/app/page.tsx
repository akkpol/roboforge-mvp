import { OwnerConsole } from "@/components/owner-console";
import { getDemoWorkspace } from "@/lib/roboforge-data";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    claim?: string | string[];
    lang?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams;
  const locale = firstParam(params.lang) === "th" ? "th" : "en";

  // Serve the live demo. No auth required.
  return (
    <OwnerConsole
      locale={locale}
      workspace={getDemoWorkspace()}
    />
  );
}
