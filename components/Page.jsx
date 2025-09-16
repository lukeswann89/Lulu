import React from 'react';

const Page = ({ children, onLeftWingClick, onRightWingClick, onTopWingClick, onBottomWingClick }) => {
  return (
    <div className="page-container relative bg-white shadow-lg w-[794px] h-[1123px] overflow-hidden border-2 animate-breathing">
      {/* Expanded hover zones that also handle clicks */}
      <div 
        className="edge-hover-zone top-edge absolute z-10 top-[-37px] left-[-37px] right-[-37px] h-[40px] cursor-pointer" 
        onClick={onTopWingClick}
      />
      <div 
        className="edge-hover-zone right-edge absolute z-10 top-[-37px] right-[-37px] bottom-[-37px] w-[80px] cursor-pointer" 
        onClick={onRightWingClick}
      />
      <div 
        className="edge-hover-zone bottom-edge absolute z-10 bottom-[-37px] left-[-37px] right-[-37px] h-[40px] cursor-pointer" 
        onClick={onBottomWingClick}
      />
      <div 
        className="edge-hover-zone left-edge absolute z-10 top-[-37px] left-[-80px] bottom-[-37px] w-[80px] cursor-pointer" 
        onClick={onLeftWingClick}
      />
      <div className="font-serif text-base leading-relaxed text-gray-800 relative z-0 p-28">
        {children}
      </div>
    </div>
  );
};

export default Page;