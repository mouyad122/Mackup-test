import type { ReactNode } from 'react';

type RawaqProductFrameProps = {
  children: ReactNode;
  className?: string;
  variant?: 'card' | 'gallery';
  showBottomAccent?: boolean;
};

/**
 * A decorative shell for storefront product media. It deliberately contains
 * no image or product logic, so any current or future product image inherits
 * the same Rawaq visual treatment without modifying the image file.
 */
export function RawaqProductFrame({
  children,
  className = '',
}: RawaqProductFrameProps) {
  return (
    <div className={`relative overflow-hidden aspect-[4/5] rounded-[1.5rem] rounded-tr-[2.5rem] rounded-bl-[2.5rem] border-[4px] border-[#F7F3EA] ring-1 ring-[#E9DDCC] bg-[#F7F3EA] shadow-sm transition-all duration-300 hover:shadow-md hover:ring-[#B7935F]/50 ${className}`}>
      {children}
    </div>
  );
}
