// 会員プラン構成フラグ。
//
// 2026-06-23: 一般会員（サロン ¥990 / applicants.plan='salon'）を一旦クローズし、
// 有料は本会員（¥4,980 / plan='pro'）一本に集約する。
//
// このフラグで「990 を新規に売る／見せる導線」だけを隠す。
// DB の plan='salon' 値・既存会員データ・Stripe 決済導線（checkout/webhook）は温存。
//   → 既存の一般会員はそのまま閲覧・コーチ利用が可能（据え置き）。
//   → 990 を再開したくなったら、この値を true に戻すだけで全導線が復活する。
export const SALON_PLAN_ENABLED = false;
