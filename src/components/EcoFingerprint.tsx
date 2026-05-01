import { useMemo } from "react";
import { motion } from "framer-motion";

interface EcoFingerprintProps {
  recyclable: number;
  compostable: number;
  hazardous: number;
  landfill: number;
  upcyclable: number;
  showLegend?: boolean;
}

const EcoFingerprint = ({ recyclable, compostable, hazardous, landfill, upcyclable, showLegend = true }: EcoFingerprintProps) => {
  const total = recyclable + compostable + hazardous + landfill + upcyclable || 1;

  const rings = useMemo(() => {
    const categories = [
      { value: recyclable, color: "hsl(var(--cat-recycle))", label: "Recycle" },
      { value: compostable, color: "hsl(var(--cat-compost))", label: "Compost" },
      { value: hazardous, color: "hsl(var(--cat-hazard))", label: "Hazardous" },
      { value: landfill, color: "hsl(var(--cat-landfill))", label: "Landfill" },
      { value: upcyclable, color: "hsl(var(--cat-upcycle))", label: "Upcycle" },
    ];

    return categories.map((cat, i) => {
      const ratio = cat.value / total;
      const radius = 28 + i * 12;
      const circumference = 2 * Math.PI * radius;
      const dashLength = circumference * ratio;
      const rotation = (i * 72 + cat.value * 17) % 360;

      return { ...cat, radius, circumference, dashLength, rotation };
    });
  }, [recyclable, compostable, hazardous, landfill, upcyclable, total]);

  // Generate organic "petals" for each category
  const petals = useMemo(() => {
    const result: { angle: number; distance: number; size: number; color: string }[] = [];
    const categories = [
      { value: recyclable, color: "hsl(var(--cat-recycle))" },
      { value: compostable, color: "hsl(var(--cat-compost))" },
      { value: hazardous, color: "hsl(var(--cat-hazard))" },
      { value: landfill, color: "hsl(var(--cat-landfill))" },
      { value: upcyclable, color: "hsl(var(--cat-upcycle))" },
    ];

    categories.forEach((cat, ci) => {
      const count = Math.min(cat.value, 8);
      for (let j = 0; j < count; j++) {
        const baseAngle = (ci * 72) + (j * (360 / Math.max(count, 1)));
        const jitter = Math.sin(ci * 7 + j * 3) * 15;
        result.push({
          angle: (baseAngle + jitter) % 360,
          distance: 35 + (j % 3) * 14 + Math.cos(j * 2) * 6,
          size: 3 + (cat.value / total) * 8,
          color: cat.color,
        });
      }
    });
    return result;
  }, [recyclable, compostable, hazardous, landfill, upcyclable, total]);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-44 h-44">
        {/* Organic petals */}
        {petals.map((petal, i) => {
          const rad = (petal.angle * Math.PI) / 180;
          const cx = 100 + Math.cos(rad) * petal.distance;
          const cy = 100 + Math.sin(rad) * petal.distance;
          return (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r={petal.size}
              fill={petal.color}
              opacity={0.15}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.15 }}
              transition={{ delay: i * 0.03, duration: 0.5 }}
            />
          );
        })}

        {/* Concentric rings */}
        {rings.map((ring, i) => (
          <motion.circle
            key={ring.label}
            cx="100"
            cy="100"
            r={ring.radius}
            fill="none"
            stroke={ring.color}
            strokeWidth={ring.dashLength > 0 ? 3 : 0}
            strokeDasharray={`${ring.dashLength} ${ring.circumference - ring.dashLength}`}
            strokeLinecap="round"
            opacity={0.6}
            transform={`rotate(${ring.rotation} 100 100)`}
            initial={{ strokeDashoffset: ring.circumference }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 1.2, ease: "easeOut" }}
          />
        ))}

        {/* Center dot */}
        <motion.circle
          cx="100"
          cy="100"
          r="6"
          fill="hsl(var(--primary))"
          opacity={0.8}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
        />
        <circle cx="100" cy="100" r="3" fill="hsl(var(--background))" />
      </svg>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
          {rings.filter(r => r.value > 0).map(ring => (
            <div key={ring.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ring.color }} />
              <span className="text-[9px] font-data text-muted-foreground">{ring.label} {ring.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EcoFingerprint;
