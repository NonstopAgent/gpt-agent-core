import { useState } from 'react'

/**
 * UploadPanel allows users to drag and drop files or select them
 * manually.  After upload the file names are displayed.  The
 * component calls a callback to perform the actual upload.
 */
export default function UploadPanel({ onUpload }) {
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const items = [...e.dataTransfer.files]
    setFiles(prev => [...prev, ...items])
    onUpload(items)
  }
  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }
  function handleDragLeave(e) {
    setDragging(false)
  }
  function handleChange(e) {
    const items = [...(e.target.files || [])]
    setFiles(prev => [...prev, ...items])
    onUpload(items)
    e.target.value = ''
  }

  return (
    <div className="mt-4">
      <div className="text-lg font-semibold mb-2">Upload Files</div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={
          `border-2 border-dashed rounded p-4 text-center ` +
          `${dragging ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}`
        }
      >
        Drag & drop files here or click to select
        <input
          type="file"
          multiple
          onChange={handleChange}
          className="opacity-0 absolute inset-0 cursor-pointer"
        />
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {files.map((f, i) => (
            <li key={i}>📄 {f.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}