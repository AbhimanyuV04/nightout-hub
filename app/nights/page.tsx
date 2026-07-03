import BackLink from "@/components/BackLink";
import { getMyNights } from "../actions";
import MyNights from "@/components/MyNights";

export default async function NightsPage() {
  const nights = await getMyNights();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-12">
      <header className="space-y-1">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">My Nights</h1>
        <p className="muted">Your ongoing and past nightouts.</p>
      </header>

      <MyNights nights={nights} />
    </main>
  );
}
