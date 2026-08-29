import { notFound } from "next/navigation";
import "../../learn/learn.css";
import { CardShelf, type PrincipleCatalogEntry } from "@/components/learn/CardShelf";
import { EPISODES } from "@/lib/learn";

export const dynamic = "force-dynamic";

const catalog: PrincipleCatalogEntry[] = Object.values(EPISODES).flatMap((episode) =>
  episode.parts.flatMap((part) => part.kind === "card" ? [{
    ep: episode.key,
    episodeNo: episode.no,
    episodeTitle: episode.title,
    card: part.card,
  }] : []),
);

export default function DevLearnTreasurePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="lrn-vault">
      <div className="lrn-vault-glow" aria-hidden="true" />
      <div className="lrn-vault-inner">
        <header className="lrn-vault-heading">
          <span>PRINCIPLE TREASURE ROOM</span>
          <h1>原理の宝物庫</h1>
          <p>獲得した催眠の原理を、意味・効能・使いどころ・使い方まで、ここで見返せます。</p>
        </header>
        <CardShelf catalog={catalog} previewUnlocked />
      </div>
    </main>
  );
}
