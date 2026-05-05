export function StatRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-xl font-bold text-white ${valueClassName ?? ""}`}>
        {value}
      </p>
    </div>
  );
}
