import { OrgLoginForm } from "@/components/OrgLoginForm";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans dark:bg-slate-950">
      <main className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            AI Chat Aggregator
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Search and query your AI conversations.
            <br />
            End-to-end encrypted — the server never sees your data.
          </p>
        </div>
        <OrgLoginForm />
      </main>
    </div>
  );
}
