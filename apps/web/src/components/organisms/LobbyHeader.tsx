import { BalanceCard } from "@/components/molecules/BalanceCard";
import { NeonText } from "@/components/atoms/NeonText";

export function LobbyHeader({
  username,
  balance,
}: {
  username: string;
  balance: number;
}) {
  return (
    <header className="border-b border-[#1a7f5f] bg-gradient-to-b from-[#0f5f3f] to-black p-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <NeonText as="h1" className="text-4xl font-bold">
            {`>`}POKER_LOBBY
          </NeonText>
          <p className="text-[#00ff88] text-sm mt-1">
            // Welcome back, {username}
          </p>
        </div>
        <div className="flex gap-4">
          <BalanceCard balance={balance} />
        </div>
      </div>
    </header>
  );
}
