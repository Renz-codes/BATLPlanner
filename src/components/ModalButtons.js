'use client';

import { useState } from "react";
import Image from "next/image";
import CreateNewTLModal from "./CreateNewTLModal";
import ReferTLModal from "./ReferTLModal";
import DeleteTLModal from "./DeleteTLModal";
import DeleteIcon from '@mui/icons-material/Delete';

export function CreateNewTLButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-transparent transition-colors 
                   flex items-center justify-center bg-foreground text-background 
                   gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] 
                   text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
      >
        <Image
          src="/vercel.svg"
          alt="Vercel logomark"
          width={20}
          height={20}
          className="dark:invert"
        />
        Create New TL
      </button>
      <CreateNewTLModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export function ReferTLButton({ options }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-black/[.08] dark:border-white/[.145] 
                   transition-colors flex items-center justify-center 
                   hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent 
                   text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
      >
        Refer to Old TLs
      </button>
      <ReferTLModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        options={options} 
      />
    </>
  );
}

export function DeleteTLButton({ tlNames, onDeleteSuccess }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-black/[.08] dark:border-white/[.145] 
                   transition-colors flex items-center justify-center 
                   hover:bg-[#fff0f0] dark:hover:bg-[#1a0000] hover:border-transparent 
                   text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44 text-red-600"
      >
        <DeleteIcon fontSize="small" className="mr-2" />
        Delete TLs
      </button>
      <DeleteTLModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        tlNames={tlNames}
        onDeleteSuccess={onDeleteSuccess}
      />
    </>
  );
} 