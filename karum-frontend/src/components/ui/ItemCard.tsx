import { config } from "../../config";

interface ItemCardProps {
  typeId: number;
  name: string;
  quantity: number;
  price?: number;
  highlight?: boolean;
  canBuy?: boolean;
  onClick?: () => void;
  onBuy?: () => void;
  onMobileBuy?: () => void;
}

const API = config.karum.apiUrl;

export function ItemCard({
  typeId,
  name,
  quantity,
  price,
  highlight = false,
  canBuy = false,
  onClick,
  onBuy,
  onMobileBuy,
}: ItemCardProps) {
  const iconUrl = `${API}/api/items/${typeId}/icon`;
  const hasStock = quantity > 0;

  return (
    <div
      className={`relative flex flex-col items-center w-[72px] border transition-all duration-300 ease-in-out ${
        highlight
          ? "bg-amber/10 border-amber shadow-[inset_0_0_12px_rgba(232,168,50,0.15)]"
          : "bg-bg border-border hover:border-border-hover"
      }`}
    >
      {/* Clickable icon area — toggles filter */}
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer w-full flex flex-col items-center"
      >
        <div className="relative w-[64px] h-[64px]">
          <img
            src={iconUrl}
            alt={name}
            width={64}
            height={64}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span
            className={`absolute bottom-0 left-0 px-1 min-w-[20px] text-[11px] font-bold text-center leading-tight ${
              hasStock ? "bg-green/90 text-bg" : "bg-red/80 text-bg"
            }`}
          >
            {hasStock ? quantity.toLocaleString() : "0"}
          </span>
        </div>

        {price != null && (
          <div className="w-full px-1 py-0.5 text-center border-t border-border">
            <span className="text-amber font-bold text-[10px]">
              {(price / 1_000_000_000).toFixed(3)}
            </span>
            <span className="text-text-dim text-[8px] ml-0.5">SUI</span>
          </div>
        )}

        <div className="w-full px-0.5 pb-1 text-center">
          <span
            className={`text-[9px] leading-tight line-clamp-2 transition-colors duration-300 ${
              highlight ? "text-amber" : "text-text-dim"
            }`}
          >
            {name}
          </span>
        </div>
      </button>

      {/* Buy button — desktop triggers buy flow, mobile shows toast */}
      {(onBuy || onMobileBuy) && (
        <>
          {/* Desktop */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBuy?.(); }}
            disabled={!canBuy}
            className={`hidden sm:block w-full py-1 text-[9px] font-bold tracking-wider border-t transition-colors duration-200 ${
              canBuy
                ? "border-amber/30 text-amber hover:bg-amber/15 cursor-pointer"
                : "border-border text-text-dim opacity-30 cursor-not-allowed"
            }`}
          >
            BUY
          </button>
          {/* Mobile — greyed out, shows toast */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMobileBuy?.(); }}
            className="sm:hidden w-full py-1 text-[9px] font-bold tracking-wider border-t border-border text-text-dim opacity-30 cursor-pointer"
          >
            BUY
          </button>
        </>
      )}
    </div>
  );
}
