// 新規申込の表示料金。既存のSubscriptionの金額はこの設定で変更しない。
// Stripe Priceとstock/app.pyの公開プランに合わせる。
export const ONLINE_MEMBERSHIP_PRICE_YEN = 9980;
export const ONLINE_REFERRAL_DISCOUNT_YEN = 5000;
export const ONLINE_REFERRAL_PRICE_YEN =
  ONLINE_MEMBERSHIP_PRICE_YEN - ONLINE_REFERRAL_DISCOUNT_YEN;
export const ONLINE_MEMBERSHIP_PRICE_LABEL =
  `¥${ONLINE_MEMBERSHIP_PRICE_YEN.toLocaleString("ja-JP")}`;
export const ONLINE_REFERRAL_PRICE_LABEL =
  `¥${ONLINE_REFERRAL_PRICE_YEN.toLocaleString("ja-JP")}`;
