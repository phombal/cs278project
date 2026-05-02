import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[640px] px-6 py-24 text-center">
      <h1 className="text-[44px] font-light tracking-[-0.025em] text-ink">
        Lost in the city
      </h1>
      <p className="mt-3 text-[16px] text-slate">
        That page doesn't exist. Maybe it was renting month-to-month.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/">
          <Button>Back home</Button>
        </Link>
        <Link href="/b/sf-housing">
          <Button variant="secondary">Go to megathread</Button>
        </Link>
      </div>
    </main>
  );
}
