import BackLink from "@/components/BackLink";
import { getMyProfile } from "../actions";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const profile = await getMyProfile();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-12">
      <header className="space-y-1">
        <BackLink />
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="muted">How you show up across your nights.</p>
      </header>

      <SettingsForm nickname={profile.nickname} defaultName={profile.defaultName} />
    </main>
  );
}
