import { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | ガイアの酒場",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">利用規約</h1>
        <div className="prose prose-lg max-w-none">
          <p>
            この利用規約（以下、「本規約」といいます。）は、Global Information
            Academy（以下、「当方」といいます。）がこのウェブサイト上で提供するオンラインコミュニティサービス（以下、「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下、「ユーザー」といいます。）には、本規約に従って、本サービスをご利用いただきます。
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">第1条（適用）</h2>
          <p>
            本規約は、ユーザーと当方との間の本サービスの利用に関わる一切の関係に適用されるものとします。
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">第2条（利用登録）</h2>
          <p>
            本サービスにおいては、登録希望者が本規約に同意の上、当方の定める方法によって利用登録を申請し、当方がこれを承認することによって、利用登録が完了するものとします。
          </p>
          
          {/* 以下、ダミーテキスト */}
          <h2 className="text-2xl font-bold mt-8 mb-4">第3条（料金および支払方法）</h2>
          <p>
            ユーザーは、本サービスの有料部分の対価として、当方が別途定め、本ウェブサイトに表示する利用料金を、当方が指定する方法により支払うものとします。
          </p>

          <p>
            （ここにさらに規約が続きます）
          </p>
        </div>
      </div>
    </div>
  );
}
