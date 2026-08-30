import { notFound } from "next/navigation";
import { InnerWorldMapPlayer } from "@/components/learn/InnerWorldMapPlayer";

export const dynamic = "force-dynamic";

export default function DevInnerWorldMapPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <InnerWorldMapPlayer userName="淳" />;
}
