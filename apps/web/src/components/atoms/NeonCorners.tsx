export function NeonCorners() {
  return (
    <>
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-[#00ff88]/50 rounded-tl-lg pointer-events-none" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-[#00ff88]/50 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-[#00ff88]/50 rounded-br-lg pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-[#00ff88]/50 rounded-bl-lg pointer-events-none" />
    </>
  );
}
