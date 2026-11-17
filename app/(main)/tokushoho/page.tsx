import { Metadata } from "next";
import { ONLINE_MEMBERSHIP_PRICE_LABEL } from "@/lib/membership/pricing";
import { ProtectedEmail } from "@/components/protected-email";

export const metadata: Metadata = {
  title: { absolute: "特定商取引法に基づく表記 | 紹介設計研究所" },
};

// 所在地は 2026-11-17 五島さん確認済み。電話番号は「ご請求に応じて遅滞なく開示」の形で載せる
// （2026-11-17 五島さんの指示で「準備中の仮表示」の注記を外した）。価格・支払/解約/返金条件は利用規約と整合。

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-200 align-top">
      <th className="py-4 pr-4 font-medium text-gray-900 w-1/3 whitespace-nowrap">
        {label}
      </th>
      <td className="py-4 text-gray-700 leading-relaxed">{children}</td>
    </tr>
  );
}

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          特定商取引法に基づく表記
        </h1>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[15px]">
            <tbody>
              <Row label="販売事業者名">
                株式会社グローバル・インフォメーション・アカデミー
              </Row>
              {/* 2026-11-17 Company Note（note.gia2018.com）の課金はこの会員と同じ1本の契約。
                  Company Note の登録・申込・アカウント設定からこのページへリンクしている。 */}
              <Row label="サービス名">
                Company Note（企業分析・学習支援の月額制Webサービス。note.gia2018.com）
              </Row>
              <Row label="運営統括責任者">五島 一将</Row>
              <Row label="所在地">
                〒541-0056 大阪府大阪市中央区久太郎町1-7-11
              </Row>
              <Row label="電話番号">
                ご請求に応じて遅滞なく開示いたします（お問い合わせは下記メールにて承ります）。
              </Row>
              <Row label="メールアドレス">
                {/* 迷惑メール対策：アドレスはHTMLに置かず、画面に出す直前に組み立てる */}
                <ProtectedEmail />
              </Row>
              {/* ⚠️ Stripe の価格は税込（2026-09-12 実測: tax_behavior=inclusive・
                  自動課税なし・請求合計4,980円・税額0）。それまで「税別4,980／
                  税込5,478」と書いていたが、5,478円は請求されない。 */}
              <Row label="販売価格">
                Company Note（オンライン会員）：月額 {ONLINE_MEMBERSHIP_PRICE_LABEL}（税込）
                <br />
                割引適用時および既存契約の継続時は、各契約に適用される料金とします。
                <br />
                ※ 各プランの価格は申込画面に表示します。
              </Row>
              <Row label="商品代金以外の必要料金">
                インターネット接続に必要な通信料、決済に係る手数料等はお客様のご負担となります。
              </Row>
              <Row label="お支払い方法">クレジットカード決済</Row>
              <Row label="お支払い時期・自動更新">
                お申し込み時に初回分を決済し、以降は解約のない限り、毎月同日に自動的に更新（継続課金）されます。
              </Row>
              <Row label="役務の提供時期">
                決済完了後、直ちにご利用いただけます。
              </Row>
              <Row label="解約について">
                いつでも解約いただけます。解約は次回更新日の前日までに所定の方法でお手続きください。お手続きがない場合は自動的に更新されます。解約された場合も、当該利用期間の満了日まではご利用いただけます（日割りでの返金はございません）。
              </Row>
              <Row label="返品・返金について">
                本サービスは役務およびデジタルコンテンツの提供という性質上、当社の責めに帰すべき事由がある場合を除き、お申し込み後のキャンセル、ならびに既にお支払いいただいた料金の返品・返金は一切お受けできません。
              </Row>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
