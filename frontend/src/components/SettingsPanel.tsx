import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Gauge, Grid3X3, Minimize2, RotateCcw } from 'lucide-react';
import { usePreferences, type EffectIntensity } from '../context/PreferencesContext';
import { cn } from '../lib/utils';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

function Toggle({ checked, onChange, label, description, icon: Icon }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description: string;
    icon: React.ElementType;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-4 border-b border-white/5 last:border-0">
            <div className="flex gap-3">
                <div className="mt-0.5 p-1.5 bg-white/5 rounded">
                    <Icon className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-200">{label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{description}</div>
                </div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={cn(
                    "relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200 mt-1",
                    checked ? "bg-[#FF0000]" : "bg-zinc-700"
                )}
            >
                <span className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                    checked ? "translate-x-[22px]" : "translate-x-[2px]"
                )} />
            </button>
        </div>
    );
}

function IntensitySelector({ value, onChange }: {
    value: EffectIntensity;
    onChange: (v: EffectIntensity) => void;
}) {
    const options: { value: EffectIntensity; label: string; desc: string }[] = [
        { value: 'off', label: 'Off', desc: 'No particles' },
        { value: 'subtle', label: 'Subtle', desc: 'Reduced' },
        { value: 'full', label: 'Full', desc: 'All effects' },
    ];

    return (
        <div className="py-4 border-b border-white/5">
            <div className="flex gap-3 mb-3">
                <div className="p-1.5 bg-white/5 rounded">
                    <Gauge className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-200">Effect Intensity</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Control particle density and animation speed</div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 ml-10">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "px-3 py-2.5 text-center transition-all duration-200 border",
                            value === opt.value
                                ? "bg-[#FF0000]/15 border-[#FF0000] text-[#FF0000]"
                                : "bg-white/[0.03] border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
                        )}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-widest">{opt.label}</div>
                        <div className="text-[9px] mt-0.5 opacity-60">{opt.desc}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
    const { preferences, updatePreference, resetPreferences } = usePreferences();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#0a0a0a] border-l-2 border-white/10 z-[61] flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b-2 border-white/10">
                            <div>
                                <h2 className="text-sm font-extrabold uppercase tracking-widest text-white">Settings</h2>
                                <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">Display Preferences</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-2">
                            {/* Animations Section */}
                            <div className="mb-2">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1 mt-4">Visual Effects</div>

                                <Toggle
                                    checked={preferences.animationsEnabled}
                                    onChange={(v) => {
                                        updatePreference('animationsEnabled', v);
                                        if (!v) updatePreference('effectIntensity', 'off');
                                        if (v && preferences.effectIntensity === 'off') updatePreference('effectIntensity', 'full');
                                    }}
                                    label="Animations"
                                    description="Particle effects: fireflies (dark) and snow (light)"
                                    icon={Sparkles}
                                />

                                {preferences.animationsEnabled && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <IntensitySelector
                                            value={preferences.effectIntensity}
                                            onChange={(v) => updatePreference('effectIntensity', v)}
                                        />
                                    </motion.div>
                                )}
                            </div>

                            {/* Display Section */}
                            <div className="mb-2">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1 mt-4">Display</div>

                                <Toggle
                                    checked={preferences.showGridBackground}
                                    onChange={(v) => updatePreference('showGridBackground', v)}
                                    label="Grid Background"
                                    description="Swiss-style grid pattern behind content"
                                    icon={Grid3X3}
                                />

                                <Toggle
                                    checked={preferences.compactMode}
                                    onChange={(v) => updatePreference('compactMode', v)}
                                    label="Compact Mode"
                                    description="Denser layout with reduced spacing"
                                    icon={Minimize2}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-white/5">
                            <button
                                onClick={resetPreferences}
                                className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-colors border border-white/5 hover:border-white/10"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset to Defaults
                            </button>
                            <div className="text-center text-[9px] text-zinc-700 mt-3 uppercase tracking-wider">
                                Preferences saved automatically
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
