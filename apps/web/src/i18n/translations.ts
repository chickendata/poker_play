export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

/**
 * Translation table. Keys are dot-namespaced strings (e.g. "table.fold").
 * Each language must have the same set of keys — missing keys fall back to the key itself.
 */
const TABLE: Record<Locale, Record<string, string>> = {
  vi: {
    // Common
    "common.back": "Quay lại",
    "common.cancel": "Huỷ",
    "common.close": "Đóng",
    "common.copy": "Sao chép",
    "common.code": "Mã",
    "common.settings": "Cài đặt",
    "common.language": "Ngôn ngữ",

    // Lobby
    "lobby.welcome": "// Chào mừng trở lại, {name}",
    "lobby.balance": "Số dư",
    "lobby.createRoom": "+ Tạo bàn",
    "lobby.joinByCode": "Vào bằng mã",
    "lobby.availableGames": "Bàn đang mở",
    "lobby.noGames": "Hiện không có bàn công khai. Hãy tạo một bàn hoặc vào bằng mã.",
    "lobby.full": "Hết chỗ",
    "lobby.join": "Vào",
    "lobby.blinds": "Mù",
    "lobby.players": "Số người",
    "lobby.buyIn": "Mua vào",
    "lobby.avgPot": "Pot TB",
    "lobby.promptName": "Nhập tên hiển thị:",

    // Stats panel
    "stats.title": "Thống kê",
    "stats.winRate": "Tỉ lệ thắng",
    "stats.gamesPlayed": "Số ván",
    "stats.totalProfit": "Lãi tích luỹ",
    "stats.maxBuyIn": "Mua vào tối đa",
    "stats.online": "Đang online",
    "stats.houseRules": "Luật nhà",
    "stats.rule.allIn": "Cho phép all-in",
    "stats.rule.noCollusion": "Không câu kết",
    "stats.rule.fairPlay": "Đảm bảo công bằng",

    // Create room dialog
    "create.title": "Tạo bàn",
    "create.yourName": "Tên của bạn",
    "create.tableName": "Tên bàn",
    "create.public": "Công khai",
    "create.private": "Riêng tư",
    "create.password": "Mật khẩu (tuỳ chọn)",
    "create.passwordPlaceholder": "để trống nếu không cần",
    "create.submit": "Tạo bàn",
    "create.creating": "Đang tạo…",
    "create.defaultTableName": "Bàn của tôi",
    "create.defaultName": "Người chơi 1",

    // Join dialog
    "join.title": "Vào bằng mã",
    "join.roomId": "Mã bàn",
    "join.password": "Mật khẩu (nếu cần)",
    "join.submit": "Vào bàn",
    "join.joining": "Đang vào…",

    // Table page
    "table.connecting": "Đang kết nối…",
    "table.failedJoin": "Không vào được: {error}",
    "table.needsName": "Bàn này cần tên (và mật khẩu nếu có).",
    "table.stage.waiting": "Chờ người chơi…",
    "table.stage.preflop": "Tố trước (preflop)",
    "table.stage.flop": "Flop",
    "table.stage.turn": "Turn",
    "table.stage.river": "River",
    "table.stage.showdown": "Lật bài",
    "table.stage.complete": "Ván kết thúc",
    "table.waitingMore": "Cần thêm {n} người chơi để bắt đầu…",
    "table.youFolded": "Bạn đã bỏ. Đang chờ ván kết thúc…",
    "table.waitingOpponent": "Đang chờ đối thủ…",

    // Action bar
    "action.title": "Lượt của bạn",
    "action.fold": "Bỏ",
    "action.check": "Bỏ qua",
    "action.call": "Theo {amount}",
    "action.callShort": "Theo",
    "action.bet": "Đặt",
    "action.raiseTo": "Tố tới",
    "action.allIn": "(All-in)",
    "action.insufficient": "(không đủ)",

    // Private lobby
    "lobby.private.title": "Bàn riêng · {n}/6 người",
    "lobby.private.host": "CHỦ",
    "lobby.private.ready": "✓ sẵn sàng",
    "lobby.private.notReady": "đang chờ",
    "lobby.private.implicitReady": "sẵn sàng",
    "lobby.private.start": "Bắt đầu",
    "lobby.private.startNeedGuest": "Cần thêm 1 khách",
    "lobby.private.startNotReady": "{n} chưa sẵn sàng",
    "lobby.private.btnReady": "Bấm khi đã sẵn sàng",
    "lobby.private.btnReadyOn": "✓ Sẵn sàng (bấm để huỷ)",

    // Winner banner
    "winner.complete": "Ván kết thúc",
    "winner.wins": "{name} thắng ${amount}",
    "winner.next": "Ván tiếp theo bắt đầu sau 5s…",

    // Player seat statuses
    "seat.folded": "Đã bỏ",
    "seat.allIn": "All-in",
    "seat.waiting": "Chờ",
    "seat.you": " (bạn)",

    // Pot display
    "pot.label": "Pot",
    "pot.main": "Pot chính",
    "pot.side": "Pot phụ {n}",

    // Hand categories
    "hand.high_card": "Mậu thầu",
    "hand.pair": "Đôi",
    "hand.two_pair": "Hai đôi",
    "hand.three_of_a_kind": "Sám",
    "hand.straight": "Sảnh",
    "hand.flush": "Thùng",
    "hand.full_house": "Cù lũ",
    "hand.four_of_a_kind": "Tứ quý",
    "hand.straight_flush": "Thùng phá sảnh",

    // Settings
    "settings.title": "Cài đặt",
    "settings.language": "Ngôn ngữ",
  },

  en: {
    // Common
    "common.back": "Back",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.copy": "Copy",
    "common.code": "Code",
    "common.settings": "Settings",
    "common.language": "Language",

    // Lobby
    "lobby.welcome": "// Welcome back, {name}",
    "lobby.balance": "Balance",
    "lobby.createRoom": "+ Create Room",
    "lobby.joinByCode": "Join by Code",
    "lobby.availableGames": "Available Games",
    "lobby.noGames": "No public games right now. Create one or join by code.",
    "lobby.full": "Full",
    "lobby.join": "Join",
    "lobby.blinds": "Blinds",
    "lobby.players": "Players",
    "lobby.buyIn": "Buy-In",
    "lobby.avgPot": "Avg Pot",
    "lobby.promptName": "Enter your display name:",

    // Stats panel
    "stats.title": "Your Stats",
    "stats.winRate": "Win Rate",
    "stats.gamesPlayed": "Games Played",
    "stats.totalProfit": "Total Profit",
    "stats.maxBuyIn": "Max Buy-In",
    "stats.online": "Online",
    "stats.houseRules": "House Rules",
    "stats.rule.allIn": "All-in allowed",
    "stats.rule.noCollusion": "No collusion",
    "stats.rule.fairPlay": "Fair play guaranteed",

    // Create room dialog
    "create.title": "Create Room",
    "create.yourName": "Your name",
    "create.tableName": "Table name",
    "create.public": "Public",
    "create.private": "Private",
    "create.password": "Password (optional)",
    "create.passwordPlaceholder": "leave empty for none",
    "create.submit": "Create Room",
    "create.creating": "Creating…",
    "create.defaultTableName": "My Table",
    "create.defaultName": "Player 1",

    // Join dialog
    "join.title": "Join by Code",
    "join.roomId": "Room Code",
    "join.password": "Password (if any)",
    "join.submit": "Join Room",
    "join.joining": "Joining…",

    // Table page
    "table.connecting": "Connecting…",
    "table.failedJoin": "Failed to join: {error}",
    "table.needsName": "This room requires a name (and possibly password).",
    "table.stage.waiting": "Waiting for players…",
    "table.stage.preflop": "Preflop",
    "table.stage.flop": "Flop",
    "table.stage.turn": "Turn",
    "table.stage.river": "River",
    "table.stage.showdown": "Showdown",
    "table.stage.complete": "Hand complete",
    "table.waitingMore": "Waiting for {n} more player(s) to start…",
    "table.youFolded": "You folded. Waiting for the hand to finish…",
    "table.waitingOpponent": "Waiting for opponent…",

    // Action bar
    "action.title": "Your action",
    "action.fold": "Fold",
    "action.check": "Check",
    "action.call": "Call ${amount}",
    "action.callShort": "Call",
    "action.bet": "Bet",
    "action.raiseTo": "Raise to",
    "action.allIn": "(All-in)",
    "action.insufficient": "(insufficient)",

    // Private lobby
    "lobby.private.title": "Private lobby · {n}/6 players",
    "lobby.private.host": "HOST",
    "lobby.private.ready": "✓ ready",
    "lobby.private.notReady": "waiting",
    "lobby.private.implicitReady": "ready",
    "lobby.private.start": "Start game",
    "lobby.private.startNeedGuest": "Need 1+ guest to start",
    "lobby.private.startNotReady": "{n} not ready",
    "lobby.private.btnReady": "Click when ready",
    "lobby.private.btnReadyOn": "✓ Ready (click to cancel)",

    // Winner banner
    "winner.complete": "Hand complete",
    "winner.wins": "{name} wins ${amount}",
    "winner.next": "Next hand starts in 5s…",

    // Player seat statuses
    "seat.folded": "Folded",
    "seat.allIn": "All-in",
    "seat.waiting": "Waiting",
    "seat.you": " (you)",

    // Pot display
    "pot.label": "Pot",
    "pot.main": "Main",
    "pot.side": "Side {n}",

    // Hand categories
    "hand.high_card": "High Card",
    "hand.pair": "Pair",
    "hand.two_pair": "Two Pair",
    "hand.three_of_a_kind": "Three of a Kind",
    "hand.straight": "Straight",
    "hand.flush": "Flush",
    "hand.full_house": "Full House",
    "hand.four_of_a_kind": "Four of a Kind",
    "hand.straight_flush": "Straight Flush",

    // Settings
    "settings.title": "Settings",
    "settings.language": "Language",
  },
};

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = TABLE[locale][key] ?? TABLE.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}
