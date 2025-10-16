import { requireAnonymous } from "@/lib/auth/requireAnonymous";
import LoginPage from "./_components/LoginPage";

export default async function Page({
  searchParams,
}: {
  searchParams: { state: string };
}) {
  const { state } = (await searchParams) ?? {};
  await requireAnonymous(state);

  return <LoginPage />;
}
