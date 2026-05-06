import { NeonText } from "@/components/atoms/NeonText";
import { formatChips } from "@/lib/utils";

export interface TableInfoData {
  gameType: string;
  blinds: string;
  players: string;
  pot: number;
  roomCode?: string;
}

export function TableInfoPanel({ info }: { info: TableInfoData }) {
  return (
    <div className="absolute bottom-8 right-8 bg-[#1a1a1a] border border-[#00ff88] rounded-lg p-4 shadow-lg shadow-[#00ff88]/30 max-w-xs">
      <NeonText as="div" className="text-[#00ff88] font-bold mb-3">
        TABLE INFO
      </NeonText>
      <div className="space-y-2 text-xs text-[#a0a0a0]">
        <Row label="Game Type" value={info.gameType} />
        <Row label="Blinds" value={info.blinds} />
        <Row label="Players" value={info.players} />
        <Row label="Total Pot" value={`$${formatChips(info.pot)}`} accent />
        {info.roomCode && <Row label="Code" value={info.roomCode} accent />}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}:</span>
      <span className={accent ? "text-[#00ff88]" : "text-[#f5f5f5]"}>
        {value}
      </span>
    </div>
  );
}
