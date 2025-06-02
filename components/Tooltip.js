import React, { useState } from 'react'

function Tooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative">
      <span className="ml-2 text-purple-600 cursor-pointer" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
        <span className="inline-block w-5 h-5 bg-purple-200 text-center rounded-full font-bold text-base leading-5">?</span>
      </span>
      {show && (
        <span className="absolute left-0 top-6 bg-white border border-purple-200 rounded shadow p-2 text-sm w-72 z-20 whitespace-pre-line text-gray-900">
          {text}
        </span>
      )}
    </span>
  )
}

export default Tooltip
