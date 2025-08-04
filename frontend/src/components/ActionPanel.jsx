export default function ActionPanel({ actions, onRun }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map(a => (
        <button
          key={a.action}
          onClick={() => onRun(a.action)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
