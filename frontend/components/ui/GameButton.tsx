import React from 'react';


export const GameButton: React.FC<{ children: React.ReactNode,color: string, color_hover:string, onClick:()=>void, className?:string, disabled?:boolean }> = ({ children, color = "bg-blue-500", color_hover, onClick, className="", disabled=false }) => {
    
    return (
        <button
        onClick={onClick}
        disabled={disabled}
        className={`relative ${color} text-white font-bold py-3 px-4 rounded-2xl 
        border-b-4
        active:border-b-0 active:border-t-4 active:translate-y-[4px] 
        transition-all duration-100 ${className}`}
        >
        <span className="relative">{children}</span>
        <span className={`absolute inset-0 ${color_hover} rounded-2xl -z-10 translate-y-1`}></span>
        </button>
    )
    
  };