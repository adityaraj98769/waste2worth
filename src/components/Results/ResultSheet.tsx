import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Share2, RotateCcw, Leaf, ShoppingBag, Building2, Layers } from "lucide-react";
import CategoryBadge from "./CategoryBadge";
import VideoSuggestions from "./VideoSuggestions";
import ShareScanModal from "./ShareScanModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { MultiScanResult, ScanItem } from "@/lib/scanApi";
import { getMunicipalRule } from "@/data/municipalRules";

// Re-export legacy alias for back-compat
export type ScanResult = MultiScanResult;

const categoryDisplay: Record<string, "Recyclable" | "Compostable" | "Hazardous" | "Landfill" | "Upcyclable"> = {
  recyclable: "Recyclable",
  compostable: "Compostable",
  hazardous: "Hazardous",
  landfill: "Landfill",
  upcyclable: "Upcyclable",
};

interface ResultSheetProps {
  result: MultiScanResult | null;
  onClose: () => void;
  onScanAgain: () => void;
}

const ResultSheet = ({ result, onClose, onScanAgain }: ResultSheetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const [city, setCity] = useState<string>("");

  useEffect(() => {
    if (!result) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const j = await r.json();
          const c = j?.address?.city || j?.address?.town || j?.address?.village || j?.address?.state_district || "";
          setCity(c);
        } catch {
          /* silent */
        }
      },
      () => {/* denied — skip */}
    );
  }, [result]);

  if (!result) return null;

  const isMulti = result.scan_type === "multi";
  const firstItem = result.items[0];

  const renderItemCard = (item: ScanItem, idx: number) => {
    const displayCat = categoryDisplay[item.category] || "Landfill";
    const rule = city ? getMunicipalRule(city, item.category) : null;
    return (
      <motion.div
        key={idx}
        className="p-4 rounded-xl bg-surface-alt border border-border mb-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.06 }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-base font-display font-bold text-foreground">{item.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <CategoryBadge category={displayCat} />
              <span className="text-[10px] font-data text-muted-foreground">{item.confidence}% match</span>
            </div>
            <p className="text-[10px] font-data text-muted-foreground mt-1">Material: {item.material}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-display font-bold ${item.reduced_credits ? "text-muted-foreground line-through" : "text-primary"}`}>
              +{item.credits_awarded} CC
            </p>
            {item.reduced_credits && (
              <p className="text-[9px] font-data text-destructive">rate-limited</p>
            )}
          </div>
        </div>

        {item.disposal_steps.length > 0 && (
          <ol className="space-y-1.5 mt-3">
            {item.disposal_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-data font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-xs text-foreground/80">{step}</span>
              </li>
            ))}
          </ol>
        )}

        {rule && (
          <div className="mt-3 p-3 rounded-lg bg-category-compost/10 border border-category-compost/20">
            <div className="flex items-center gap-1.5 mb-1">
              <Building2 size={12} className="text-category-compost" />
              <span className="text-[10px] font-display font-bold text-category-compost uppercase tracking-wider">
                As per {rule.authority}
              </span>
            </div>
            <p className="text-[11px] text-foreground/80 leading-relaxed">{rule.local_instruction}</p>
          </div>
        )}

        {item.upcycle_ideas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.upcycle_ideas.map((idea, i) => (
              <span key={i} className="text-[10px] font-data px-2 py-1 rounded-md bg-category-upcycle/15 text-category-upcycle border border-category-upcycle/20">
                💡 {idea}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-3 text-[10px] font-data text-muted-foreground">
          <span className="flex items-center gap-1"><Leaf size={10} className="text-category-compost" />{item.co2_saved_kg}kg CO₂</span>
          <span>💧 {item.water_saved_liters}L water</span>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {result && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-card border-t border-border lg:inset-x-auto lg:right-6 lg:bottom-6 lg:left-auto lg:w-[480px] lg:rounded-2xl lg:border lg:max-h-[85vh]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="p-6 pb-24 lg:pb-6">
              {/* Handle (mobile) */}
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4 lg:hidden" />

              {isMulti && (
                <motion.div
                  className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-category-compost/15 border border-category-compost/30"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Layers size={12} className="text-category-compost" />
                  <span className="text-[10px] font-display font-bold text-category-compost uppercase tracking-wider">
                    Mixed Waste Detected • {result.items.length} items
                  </span>
                </motion.div>
              )}

              {!isMulti && firstItem && (
                <h2 className="text-2xl font-display font-bold text-foreground mb-4">
                  {firstItem.name}
                </h2>
              )}

              {/* Render all items */}
              <div>
                {result.items.map((it, i) => renderItemCard(it, i))}
              </div>

              {/* Total summary */}
              <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-xs font-data text-muted-foreground uppercase tracking-wider">Total earned</p>
                <p className="text-2xl font-display font-bold text-primary">
                  {result.total_credits} CC <span className="text-sm text-muted-foreground font-normal">across {result.items.length} item{result.items.length > 1 ? "s" : ""}</span>
                </p>
              </div>

              {/* YouTube Videos for first item */}
              {firstItem && (
                <VideoSuggestions
                  category={categoryDisplay[firstItem.category] || "Landfill"}
                  itemName={firstItem.name}
                />
              )}

              {/* Actions */}
              <div className="flex gap-3 mb-3">
                <button
                  onClick={onScanAgain}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold"
                >
                  <RotateCcw size={16} />
                  Scan Again
                </button>
                <button
                  onClick={() => navigate("/facilities")}
                  className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground border border-border"
                >
                  <MapPin size={16} />
                </button>
                <button
                  onClick={() => {
                    if (!user) { toast.error("Login to share scans"); return; }
                    setShareOpen(true);
                  }}
                  className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground border border-border hover:border-primary/30 transition-colors"
                >
                  <Share2 size={16} />
                </button>
              </div>

              {firstItem && (
                <button
                  onClick={() => navigate(`/marketplace/new?waste_type=${encodeURIComponent(firstItem.material || firstItem.name)}`)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-category-upcycle/15 text-category-upcycle border border-category-upcycle/20 font-display font-bold text-sm hover:bg-category-upcycle/25 transition-colors"
                >
                  <ShoppingBag size={16} />
                  List This as Upcycled
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ShareScanModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        scanId={null}
        itemName={firstItem?.name || ""}
      />
    </>
  );
};

export default ResultSheet;
