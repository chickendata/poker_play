export function GameStatusBadge({ status }: { status: "open" | "running" }) {
  const cls =
    status === "running"
      ? "bg-red-900 text-red-200"
      : "bg-green-900 text-green-200";
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>
      {status === "running" ? "RUNNING" : "OPEN"}
    </span>
  );
}
