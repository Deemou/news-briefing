import { requireUser } from "@/lib/auth/requireUser";
import BriefingList from "./_components/BriefingList";

export default async function Page() {
  await requireUser("/briefings");
  return (
    <>
      <h1 className="text-2xl font-bold mb-4">내 브리핑</h1>
      <BriefingList />
    </>
  );
}
