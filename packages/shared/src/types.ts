export type Stage =
  | "waiting"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "complete";

export type PlayerAction = "fold" | "check" | "call" | "bet" | "raise" | "allin";

export interface ClientActionMessage {
  type: PlayerAction;
  amount?: number;
}
