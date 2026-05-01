import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Flame, Trophy, TrendingUp, Award, Crown, Shield, Star, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const badges = [
  { name: "Eco Starter", threshold: 100, icon: Star, color: "text-category-compost" },
  { name: "Green Guardian", threshold: 500, icon: Shield, color: "text-category-recycle" },
  { name: "Planet Protector", threshold: 1000, icon: Crown, color: "text-category-upcycle" },
  { name: "Earth Champion", threshold: 5000, icon: Award, color: "text-[hsl(var(--cat-hazard))]" },
];

const weeklyMock = [
  { day: "Mon", credits: 24 },
  { day: "Tue", credits: 36 },
  { day: "Wed", credits: 18 },
  { day: "Thu", credits: 45 },
  { day: "Fri", credits: 30 },
  { day: "Sat", credits: 52 },
  { day: "Sun", credits: 12 },
];

const CarbonWallet = () => {
  const { user, profile } = useAuth();
  const [credits, setCredits] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [verifiedRecent, setVerifiedRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("carbon_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();
      setCredits(data);

      const { data: verified } = await (supabase
        .from("scan_history") as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("source", "verified_dropoff")
        .order("created_at", { ascending: false });
      setVerifiedCount(verified?.length || 0);
      setVerifiedRecent((verified || []).slice(0, 5));

      setLoading(false);
    };
    fetch();
  }, [user]);

  const streakMultiplier = credits
    ? credits.current_streak >= 7 ? 3 : credits.current_streak >= 5 ? 2 : credits.current_streak >= 3 ? 1.5 : 1
    : 1;

  const totalCredits = credits?.total_credits ?? 0;
  const currentBadge = [...badges].reverse().find((b) => totalCredits >= b.threshold);
  const nextBadge = badges.find((b) => totalCredits < b.threshold);
  const maxBar = weeklyMock.reduce((m, d) => Math.max(m, d.credits), 1);

  return (
    <div className="min-h-screen bg-background pb-24 pt-6 lg:pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">Carbon Wallet</h1>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Main credit card */}
            <motion.div
              className="relative p-6 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground overflow-hidden mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary-foreground/10 -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-primary-foreground/5 translate-y-6 -translate-x-6" />
              <p className="text-xs font-data uppercase tracking-wider opacity-80">Total Carbon Credits</p>
              <p className="text-5xl font-display font-bold mt-1">{totalCredits}</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                  <Flame size={14} />
                  <span className="text-xs font-data">{credits?.current_streak ?? 0} day streak</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap size={14} />
                  <span className="text-xs font-data">{streakMultiplier}x multiplier</span>
                </div>
              </div>
            </motion.div>

            {/* Streak & multiplier */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <motion.div className="p-4 rounded-xl glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <Flame size={18} className="text-destructive mb-2" />
                <p className="text-2xl font-display font-bold text-foreground">{credits?.current_streak ?? 0}</p>
                <p className="text-[10px] font-data text-muted-foreground">Current Streak</p>
              </motion.div>
              <motion.div className="p-4 rounded-xl glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <Trophy size={18} className="text-category-upcycle mb-2" />
                <p className="text-2xl font-display font-bold text-foreground">{credits?.longest_streak ?? 0}</p>
                <p className="text-[10px] font-data text-muted-foreground">Longest Streak</p>
              </motion.div>
            </div>

            {/* Weekly graph */}
            <motion.div
              className="p-4 rounded-xl glass-card mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-display font-bold text-foreground">This Week</h3>
                <TrendingUp size={14} className="text-primary" />
              </div>
              <div className="flex items-end justify-between gap-2 h-28">
                {weeklyMock.map((d, i) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t-md bg-primary/20"
                      style={{ height: `${(d.credits / maxBar) * 100}%` }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                    >
                      <div
                        className="w-full h-full rounded-t-md bg-primary"
                        style={{ opacity: 0.4 + (d.credits / maxBar) * 0.6 }}
                      />
                    </motion.div>
                    <span className="text-[9px] font-data text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Badges */}
            <div className="mb-6">
              <h3 className="text-sm font-display font-bold text-foreground mb-3">Badges</h3>
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge, i) => {
                  const Icon = badge.icon;
                  const earned = totalCredits >= badge.threshold;
                  return (
                    <motion.div
                      key={badge.name}
                      className={`p-4 rounded-xl border ${
                        earned ? "glass-card border-primary/30" : "bg-muted/30 border-border opacity-50"
                      }`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: earned ? 1 : 0.5, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                    >
                      <Icon size={20} className={earned ? badge.color : "text-muted-foreground"} />
                      <p className="text-xs font-display font-bold text-foreground mt-2">{badge.name}</p>
                      <p className="text-[10px] font-data text-muted-foreground">{badge.threshold} CC</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Next milestone */}
            {nextBadge && (
              <motion.div
                className="p-4 rounded-xl glass-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-xs font-data text-muted-foreground uppercase tracking-wider mb-2">Next Milestone</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-display font-bold text-foreground">{nextBadge.name}</span>
                  <span className="text-xs font-data text-primary">{totalCredits}/{nextBadge.threshold} CC</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalCredits / nextBadge.threshold) * 100)}%` }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  />
                </div>
              </motion.div>
            )}

            {/* Credit rates */}
            <div className="mt-6 p-4 rounded-xl glass-card">
              <p className="text-xs font-data text-muted-foreground uppercase tracking-wider mb-3">Credit Rates</p>
              <div className="space-y-2">
                {[
                  { cat: "Recyclable", cc: 10, color: "bg-category-recycle" },
                  { cat: "Compostable", cc: 8, color: "bg-category-compost" },
                  { cat: "Upcyclable", cc: 12, color: "bg-category-upcycle" },
                  { cat: "Hazardous", cc: 15, color: "bg-category-hazard" },
                  { cat: "Landfill", cc: 2, color: "bg-category-landfill" },
                ].map((r) => (
                  <div key={r.cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                      <span className="text-xs text-foreground">{r.cat}</span>
                    </div>
                    <span className="text-xs font-data text-primary font-bold">+{r.cc} CC</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Drop-offs */}
            <div className="mt-6 p-4 rounded-xl glass-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-data text-muted-foreground uppercase tracking-wider">Verified Drop-offs</p>
                <span className="text-xs font-data text-category-compost font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> {verifiedCount}
                </span>
              </div>
              {verifiedRecent.length === 0 ? (
                <p className="text-xs text-muted-foreground">Log a drop-off at a facility to earn 2x CC.</p>
              ) : (
                <div className="space-y-2">
                  {verifiedRecent.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-data bg-category-compost/15 text-category-compost border border-category-compost/30 flex-shrink-0">
                          Verified ✓
                        </span>
                        <span className="text-foreground truncate">{v.item_name}</span>
                      </div>
                      <span className="font-data text-primary font-bold flex-shrink-0">+{v.credits_earned}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CarbonWallet;
