import React from 'react';

const Page = ({ children }) => {
  return (
    <div className="page-container relative bg-white shadow-lg w-[794px] h-[1123px] overflow-hidden border-2 animate-breathing">
      <div className="edge-hover-zone top-edge absolute z-10 top-[-37px] left-[-37px] right-[-37px] h-[40px]" />
      <div className="edge-hover-zone right-edge absolute z-10 top-[-37px] right-[-37px] bottom-[-37px] w-[40px]" />
      <div className="edge-hover-zone bottom-edge absolute z-10 bottom-[-37px] left-[-37px] right-[-37px] h-[40px]" />
      <div className="edge-hover-zone left-edge absolute z-10 top-[-37px] left-[-37px] bottom-[-37px] w-[40px]" />
      <div className="font-serif text-base leading-relaxed text-gray-800 relative z-0 p-28">
        {children}
      </div>
    </div>
  );
};

export default Page;