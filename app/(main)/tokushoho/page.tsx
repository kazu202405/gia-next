import { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | ガイアの酒場",
};

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">特定商取引法に基づく表記</h1>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody>
              <tr className="border-b">
                <th className="py-4 pr-4 font-medium text-gray-900 w-1/3">販売事業者名</th>
                <td className="py-4 text-gray-700">Global Information Academy</td>
              </tr>
              <tr className="border-b">
                <th className="py-4 pr-4 font-medium text-gray-900">代表者</th>
                <td className="py-4 text-gray-700">五島</td>
              </tr>
              <tr className="border-b">
                <th className="py-4 pr-4 font-medium text-gray-900">所在地</th>
                <td className="py-4 text-gray-700">〒531-0056 大阪市中央区久太郎町1-7-11</td>
              </tr>
              <tr className="border-b">
                <th className="py-4 pr-4 font-medium text-gray-900">電話番号</th>
                <td className="py-4 text-gray-700">080-1111-1111</td>
              </tr>
              <tr className="border-b">
                <th className="py-4 pr-4 font-medium text-gray-900">メールアドレス</th>
                <td className="py-4 text-gray-700">global.information.academy@gmail.com</td>
              </tr>
              <tr className="border-b">
                <th className="py-4 pr-4 font-medium text-gray-900">販売価格</th>
                <td className="py-4 text-gray-700">月額 4,980円（税込）</td>
              </tr>
              <tr className="border-b">
                <th className="py-4 pr-4 font-medium text-gray-900">お支払い方法</th>
                <td className="py-4 text-gray-700">クレジットカード決済</td>
              </tr>
              <tr className="border-b">
                <th className="py-4 pr-4 font-medium text-gray-900">商品引渡し時期</th>
                <td className="py-4 text-gray-700">決済完了後、直ちにご利用いただけます。</td>
              </tr>
              <tr className="border-b">
                <th className="py-4 pr-4 font-medium text-gray-900">返品・キャンセルについて</th>
                <td className="py-4 text-gray-700">
                  サービスの性質上、決済完了後の返金は承っておりません。
                  <br />
                  退会はいつでも可能ですが、次回の請求日まではサービスをご利用いただけます。日割り返金はございません。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
