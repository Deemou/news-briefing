import { requireUser } from "@/lib/auth/requireUser";
import SummaryPage from "./_components/SummaryPage";

export default async function Home() {
  await requireUser("/");

  return <SummaryPage />;
}
