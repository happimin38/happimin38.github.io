/**
 * The asset groups, shared by every page.
 *
 * They used to be created only by the dashboard, so opening the salary page
 * first left the savings dropdown with nothing to point at. Bootstrapping
 * lives here instead, and each page calls ensure() before reading them.
 */
(function (global) {
  "use strict";

  // Groups with these names track individual holdings rather than one lump sum.
  const HOLDING_NAMES = [
    "주식", "isa", "퇴직연금", "연금저축", "irp", "비트코인",
    "코인", "가상화폐", "암호화폐", "etf", "펀드",
  ];

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function normalizeName(name) {
    return (name || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function looksLikeHolding(name) {
    return HOLDING_NAMES.includes(normalizeName(name));
  }

  // A plain amount becomes one unit priced at that amount, so the row keeps
  // the value it had while the quantity and prices wait to be filled in.
  function toHoldingItem(it) {
    const amount = Number(it.amount) || 0;
    return {
      id: it.id || genId(),
      name: it.name || "",
      qty: amount ? 1 : 0,
      avgPrice: amount,
      curPrice: amount,
    };
  }

  function emptyHolding() {
    return [{ id: genId(), name: "", qty: 0, avgPrice: 0, curPrice: 0 }];
  }

  function defaults() {
    return [
      { id: genId(), name: "저축", type: "simple", items: [{ id: genId(), name: "", amount: 0 }] },
      { id: genId(), name: "주식", type: "holding", items: emptyHolding() },
      { id: genId(), name: "ISA", type: "holding", items: emptyHolding() },
      { id: genId(), name: "퇴직연금", type: "holding", items: emptyHolding() },
      { id: genId(), name: "비트코인", type: "holding", items: emptyHolding() },
    ];
  }

  /**
   * Bring data.assetGroups up to date in place.
   * Returns true when something changed and the caller should save.
   */
  function ensure(data) {
    let changed = false;

    // Migrate older shapes so nothing already entered is lost:
    //  - assetItems (flat list) -> each becomes its own group with one item
    //  - startingAssets (single number) -> a "현금" group
    if (!Array.isArray(data.assetGroups)) {
      if (Array.isArray(data.assetItems) && data.assetItems.length) {
        data.assetGroups = data.assetItems.map((it) => ({
          id: genId(),
          name: it.name || "기타",
          items: [{ id: genId(), name: it.name || "기타", amount: Number(it.amount) || 0 }],
        }));
      } else if (typeof data.startingAssets === "number" && data.startingAssets > 0) {
        data.assetGroups = [
          { id: genId(), name: "현금", items: [{ id: genId(), name: "현금", amount: data.startingAssets }] },
        ];
      } else {
        data.assetGroups = defaults();
      }
      changed = true;
    }

    // Groups predating the investment mode carry no type yet.
    data.assetGroups.forEach((g) => {
      if (!Array.isArray(g.items)) {
        g.items = [];
        changed = true;
      }
      if (g.type === "simple" || g.type === "holding") return;
      g.type = looksLikeHolding(g.name) ? "holding" : "simple";
      if (g.type === "holding") g.items = g.items.map((it) => toHoldingItem(it));
      changed = true;
    });

    // One-time pass so investment-style groups saved before that change switch
    // over too. An amount already entered becomes a single unit priced at that
    // amount, which keeps the group's total exactly as it was; the quantity and
    // prices are then the user's to correct. Recorded so a group deliberately
    // set back to "금액만" is not flipped again on the next visit.
    if (!data.holdingModeUpgrade) {
      data.assetGroups.forEach((g) => {
        if (g.type === "holding" || !looksLikeHolding(g.name)) return;
        g.type = "holding";
        g.items = g.items.map((it) => toHoldingItem(it));
      });
      data.holdingModeUpgrade = true;
      changed = true;
    }

    return changed;
  }

  global.AssetGroups = {
    HOLDING_NAMES,
    genId,
    normalizeName,
    looksLikeHolding,
    toHoldingItem,
    defaults,
    ensure,
  };
})(window);
