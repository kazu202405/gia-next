import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applicant: vi.fn(),
  create: vi.fn(),
  price: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "test-user", email: "user@example.com" } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.applicant }) }) }),
  }),
}));
vi.mock("./client", () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.create } } }),
  getMembershipPriceId: mocks.price,
  getSiteOrigin: () => "https://example.com",
}));

import { createMembershipCheckout } from "./membership-checkout";
const paths = { successPath: "/success", cancelPath: "/cancel" };

describe("新規申込の価格切替と既存契約の保護", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applicant.mockResolvedValue({ data: { plan: null, subscription_status: null } });
    mocks.create.mockResolvedValue({ url: "https://checkout.stripe.com/test" });
    mocks.price.mockReturnValue("price_1UTBAHBRsf0enSjQlwmGFpdy");
  });

  it("新しい価格と割引コード入力を使い、webhookの会員情報を保つ", async () => {
    expect((await createMembershipCheckout("online", paths)).status).toBe("ok");
    const [params] = mocks.create.mock.calls[0];
    expect(params.line_items).toEqual([{ price: "price_1UTBAHBRsf0enSjQlwmGFpdy", quantity: 1 }]);
    expect(params.allow_promotion_codes).toBe(true);
    expect(params.metadata).toEqual({ purpose: "membership", plan: "online", user_id: "test-user" });
    expect(params.subscription_data.metadata).toEqual(params.metadata);
  });

  it("同日に価格を切り替えても旧価格の決済セッションと鍵が衝突しない", async () => {
    mocks.price.mockReturnValueOnce("price_old").mockReturnValueOnce("price_new");
    await createMembershipCheckout("online", paths);
    await createMembershipCheckout("online", paths);
    expect(mocks.create.mock.calls[0][1].idempotencyKey)
      .not.toEqual(mocks.create.mock.calls[1][1].idempotencyKey);
  });

  it("既存会員の新規決済を作らず既存契約にも触らない", async () => {
    mocks.applicant.mockResolvedValue({ data: { plan: "online", subscription_status: "active" } });
    expect((await createMembershipCheckout("online", paths)).status).toBe("already_active");
    expect(mocks.price).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
