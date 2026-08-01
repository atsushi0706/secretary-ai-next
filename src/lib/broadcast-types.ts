/**
 * 発信スタジオ（SNSアウトプット）の型。クライアント・サーバ共用（DBアクセス禁止）。
 *
 * 設計の芯：
 *  - ワークの体験を「そのまま公開」しない。本人のメソッド×世界観で
 *    フォロワーに役立つ形へ変換してから外に出す。
 *  - 型に流し込まない。編集者AIが毎回、素材に合った企画・枚数・構成を選ぶ。
 */

/** スライドの種類。企画に応じてAIが組み合わせる（毎回同じ構成にしない） */
export type SlideKind =
  | "cover"      // 表紙：フックの一言
  | "body"       // 本文：見出し＋文章
  | "list"       // 箇条書き：チェックリスト・手順・診断
  | "quote"      // 言葉を大きく置く
  | "compare"    // 対比（うまくいく人／止まる人 等）
  | "manga"      // 4コマ（コマごとの場面・セリフ・ナレーション）
  | "ask"        // 問いかけ・チャレンジ
  | "signature"; // 署名：主人公像＋メソッド名＋紹介リンク

export type MangaPanel = {
  scene: string;      // 場面（短く）
  speaker: string;    // 誰（"自分" ならアバターを置く）
  line: string;       // セリフ
  narration?: string; // ナレーション（任意）
};

export type Slide = {
  kind: SlideKind;
  title?: string;
  body?: string;
  items?: string[];          // list / compare(左右を「|」区切り) 用
  panels?: MangaPanel[];     // manga 用（4つ）
  accent?: string;           // 小さな添え書き
};

export type BroadcastPost = {
  id: number;
  date: string;
  angle: string;        // この回の企画（例：常識を覆す／ワークを渡す／世界観）
  format: string;       // 構成の説明（編集者AIの言葉で）
  title: string;        // 管理用タイトル
  slides: Slide[];
  caption: string;      // 投稿本文（キャプション）
  hashtags: string[];
  created_at?: string;
};

/** 育てるメソッド（1ユーザー1つ。使うほど資産がたまる） */
export type MethodAssets = {
  principles: string[];  // 発見した原理
  questions: string[];   // 独自の問い
  works: string[];       // 実践ワーク
  phrases: string[];     // 特徴的な言葉・言い回し
  examples: string[];    // 実例・変化（本人の体験のみ。捏造禁止）
};

export type Method = {
  name: string;          // 例：人生脚本を書き換える
  tagline: string;       // 一言説明（任意）
  assets: MethodAssets;
};

export const EMPTY_ASSETS: MethodAssets = {
  principles: [], questions: [], works: [], phrases: [], examples: [],
};

/** スライドのテーマ（見た目）。ユーザーが切り替えられる */
export type SlideTheme = "night" | "paper" | "light";
export const THEMES: { key: SlideTheme; label: string }[] = [
  { key: "night", label: "夜" },
  { key: "paper", label: "羊皮紙" },
  { key: "light", label: "白" },
];
