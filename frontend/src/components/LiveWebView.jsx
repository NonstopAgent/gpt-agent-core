/**
 * LiveWebView displays current task status with a spinner when running.
 */
export default function LiveWebView({ status, running }) {
  return (
    <aside className="w-full md:w-64 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 flex items-center justify-center">
      {running ? (
        <div className="flex items-center gap-2 text-sm">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          <span>{status}</span>
        </div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">{status}</div>
      )}
    </aside>
  )
}
