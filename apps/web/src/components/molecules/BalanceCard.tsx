export function BalanceCard({ balance }: { balance: number }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#00ff88] rounded-lg p-4 neon-border">
      <p className="text-[#00ff88] text-xs uppercase tracking-wider">Balance</p>
      <p className="text-2xl font-bold text-white mt-1">
        ${balance.toLocaleString()}
      </p>
    </div>
  );
}
