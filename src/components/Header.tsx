export function Header() {
  return (
    <div className="flex justify-between items-center px-4 py-3 shadow-md bg-background sticky top-0 z-10">
      <div className="text-white text-lg font-semibold bg-card w-10 h-10 rounded-full flex items-center justify-center">AB</div>
      <div className="text-secondaryText">🔔</div>
    </div>
  )
}