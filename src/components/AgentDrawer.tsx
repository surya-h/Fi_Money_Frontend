export function AgentDrawer({ agents }: { agents: string[] }) {
  return (
    <div className="flex overflow-x-auto p-2 space-x-2">
      {agents.map(agent => (
        <div key={agent} className="bg-card px-4 py-2 rounded-xl shadow text-sm text-white">
          {agent}
        </div>
      ))}
      <button className="bg-neonGreen text-black rounded-xl px-3">＋</button>
    </div>
  );
}