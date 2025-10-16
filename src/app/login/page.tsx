import { requireAnonymous } from "@/lib/auth/requireAnonymous";
import LoginPage from "./_components/LoginPage";

export default async function Page({
  searchParams,
}: {
  searchParams: { state: string };
}) {
  const { state } = (await searchParams) ?? {};
  const { response, redirected } = await requireAnonymous(state);
  if (redirected) return response;

  return <LoginPage />;
}
