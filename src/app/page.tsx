import { requireUser } from "@/lib/auth/requireUser";
import SummaryPage from "./_components/SummaryPage";

export default async function Home() {
  const { response, redirected } = await requireUser("/");
  if (redirected) return response;

  return <SummaryPage />;
}
