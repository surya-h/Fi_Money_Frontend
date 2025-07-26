export function InputBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background px-4 py-3 flex items-center shadow-md">
      <input className="flex-1 bg-card rounded-xl p-3 text-white placeholder-secondaryText" placeholder="Ask your question..." />
      <span className="ml-3 text-secondaryText">🎙️</span>
    </div>
  );
}