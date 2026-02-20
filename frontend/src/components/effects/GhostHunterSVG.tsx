import { motion } from 'framer-motion'

export function GhostHunterSVG() {
    return (
        <div className="absolute inset-x-0 bottom-0 z-0 pointer-events-none opacity-80 dark:opacity-60 flex items-end justify-center w-full overflow-hidden">
            <svg
                viewBox="-50 0 1300 350"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto min-w-[1000px] max-w-[1440px]"
                preserveAspectRatio="xMidYMax meet"
                overflow="visible"
            >
                {/* --- Haunted Bay Area / Silicon Valley Background --- */}

                {/* Spooky Golden Gate Bridge */}
                <path d="M 50 300 L 50 150 M 200 300 L 200 150" stroke="currentColor" strokeWidth="6" className="text-red-900/40 dark:text-red-900/30" />
                <path d="M -50 200 Q 125 250 200 150 Q 275 250 400 200" stroke="currentColor" strokeWidth="2" fill="none" className="text-red-900/40 dark:text-red-900/30" />
                {/* Bridge Cables */}
                <line x1="125" y1="200" x2="125" y2="300" stroke="currentColor" strokeWidth="1" className="text-red-900/30 dark:text-red-900/20" />
                <line x1="87.5" y1="180" x2="87.5" y2="300" stroke="currentColor" strokeWidth="1" className="text-red-900/30 dark:text-red-900/20" />
                <line x1="162.5" y1="180" x2="162.5" y2="300" stroke="currentColor" strokeWidth="1" className="text-red-900/30 dark:text-red-900/20" />

                {/* Transamerica Pyramid (Dark) */}
                <path d="M 280 300 L 320 80 L 360 300 Z" fill="currentColor" className="text-gray-400 dark:text-zinc-900" />
                <path d="M 320 80 L 320 300 L 360 300 Z" fill="currentColor" className="text-gray-300 dark:text-zinc-800" />
                {/* Glowing ominous tip */}
                <motion.circle cx="320" cy="80" r="4" fill="#FF0055" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />

                {/* Salesforce Tower (Eye of Sauron vibe) */}
                <path d="M 400 300 L 400 120 Q 420 90 440 120 L 440 300 Z" fill="currentColor" className="text-gray-300 dark:text-zinc-800" />
                <path d="M 420 90 Q 420 300 420 300" stroke="currentColor" strokeWidth="2" fill="none" className="text-gray-400 dark:text-zinc-900" />
                <motion.ellipse cx="420" cy="110" rx="8" ry="4" fill="#FF0000" animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
                <circle cx="420" cy="110" r="2" fill="#FFFF00" />

                {/* Sutro Tower (Spooky silhouette) */}
                <g className="text-gray-400 dark:text-zinc-800">
                    <path d="M 520 300 L 540 100 L 560 100 L 580 300 M 530 150 L 570 150 M 525 220 L 575 220" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path d="M 540 100 L 540 60 M 560 100 L 560 70 M 550 100 L 550 50" stroke="currentColor" strokeWidth="2" fill="none" />
                    {/* Blinking red lights on Sutro */}
                    {[540, 550, 560].map((x, i) => (
                        <motion.circle key={`sutro-${i}`} cx={x} cy={50 + (i % 2) * 20} r="2" fill="#FF0000" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }} />
                    ))}
                </g>

                {/* Silicon Valley Campus - "Infinite Loop" / Spaceship HQ */}
                <ellipse cx="800" cy="270" rx="150" ry="30" fill="currentColor" className="text-gray-200 dark:text-zinc-900" />
                <ellipse cx="800" cy="270" rx="130" ry="25" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-400 dark:text-zinc-800" />
                {/* Glowing mysterious lights around the campus ring */}
                {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2;
                    const x = 800 + Math.cos(angle) * 140;
                    const y = 270 + Math.sin(angle) * 28;
                    return (
                        <motion.circle key={`ring-${i}`} cx={x} cy={y} r="2" fill="#00FF00" animate={{ opacity: [0.1, 0.8, 0.1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }} />
                    )
                })}

                {/* Spooky Dead Trees / Antennas scattered in the valley */}
                <path d="M 650 300 L 650 240 M 650 270 L 635 250 M 650 255 L 665 235" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-zinc-700" strokeLinecap="round" />
                <path d="M 980 300 L 980 200 M 980 260 L 960 220 M 980 230 L 1000 190" stroke="currentColor" strokeWidth="3" className="text-gray-500 dark:text-zinc-800" strokeLinecap="round" fill="none" />

                {/* Data Center "Tombstones" (Representing Silicon Valley servers) */}
                <rect x="1050" y="220" width="25" height="80" rx="5" fill="currentColor" className="text-gray-300 dark:text-zinc-900" />
                <rect x="1085" y="190" width="25" height="110" rx="5" fill="currentColor" className="text-gray-400 dark:text-zinc-800" />
                <rect x="1120" y="240" width="25" height="60" rx="5" fill="currentColor" className="text-gray-300 dark:text-zinc-900" />
                {Array.from({ length: 9 }).map((_, i) => (
                    <motion.circle
                        key={`server-${i}`}
                        cx={1062 + (i % 3 * 35)}
                        cy={230 + Math.floor(i / 3) * 15}
                        r="1.5"
                        fill={Math.random() > 0.5 ? "#00FF00" : "#FF0000"}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: Math.random() }}
                    />
                ))}


                {/* --- Glowing Intents (Gems) Floating --- */}
                {['#00FF00', '#00FFFF', '#FF00FF', '#FFFF00', '#FF0000'].map((color, i) => (
                    <motion.g
                        key={`gem-${i}`}
                        animate={{
                            y: [0, -20, 0],
                            x: [0, 10, -10, 0],
                            rotate: [0, 180, 360]
                        }}
                        transition={{ duration: 5 + i * 2, repeat: Infinity, ease: "easeInOut" }}
                        transform={`translate(${300 + i * 200}, ${100 + (i % 3) * 50})`}
                    >
                        <path d="M 0,-15 L 10,0 L 0,15 L -10,0 Z" fill={color} opacity="0.8" />
                        <motion.circle cx="0" cy="0" r="20" fill={color} opacity="0.1" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 3, repeat: Infinity }} />
                    </motion.g>
                ))}


                {/* --- Red Ghost Hunter Wizard Characters --- */}
                {/* Character 1 (Raised shadow to prevent clipping) */}
                <motion.g
                    initial={{ x: -150 }}
                    animate={{ x: [-150, 1400], y: [0, -20, 0, -15, 0] }}
                    transition={{
                        x: { duration: 30, repeat: Infinity, ease: "linear" },
                        y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                    }}
                >
                    <g transform="translate(0, 190) scale(1.6)">
                        {/* Shadow underneath */}
                        <motion.ellipse
                            cx="0" cy="55" rx="20" ry="5" fill="black" opacity="0.2"
                            animate={{ scale: [1, 0.8, 1, 0.9, 1] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        />

                        {/* Red Cloak / Body */}
                        <path d="M -15,20 C -5,40 5,40 15,20 L 25,0 C 20,-20 0,-25 -25,0 Z" fill="#CC0000" />
                        <path d="M -10,20 Q 0,30 10,20" stroke="#800000" strokeWidth="2" fill="none" />
                        <path d="M -5,5 L -5,25 M 5,5 L 5,22" stroke="#800000" strokeWidth="1.5" strokeOpacity="0.5" fill="none" />

                        {/* Face Area */}
                        <path d="M -15,-5 L 15,-5 L 10,10 L -10,10 Z" fill="#0A0A0A" />
                        <rect x="-8" y="4" width="16" height="8" fill="#111111" />

                        {/* Glowing Green/Yellow Eyes */}
                        <motion.circle cx="-5" cy="0" r="2.5" fill="#ADFF2F" animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} />
                        <motion.circle cx="5" cy="0" r="2.5" fill="#ADFF2F" animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} />

                        {/* Pointy Wizard Hat */}
                        <path d="M -20,-5 L 20,-5 L 0,-40 Z" fill="#D30000" />
                        <path d="M 0,-40 Q 5,-45 10,-30" stroke="#CC0000" strokeWidth="3" fill="none" />
                        <ellipse cx="0" cy="-5" rx="26" ry="6" fill="#A00000" />

                        {/* Amulet */}
                        <g transform="translate(0, 15) scale(0.4)">
                            <rect x="-5" y="-5" width="10" height="10" fill="none" stroke="white" strokeWidth="2" />
                        </g>

                        {/* Hands / Gem */}
                        <g transform="translate(-18, 5)">
                            <circle cx="0" cy="0" r="4" fill="#0A0A0A" />
                        </g>
                        <g transform="translate(18, 5)">
                            <circle cx="0" cy="0" r="4" fill="#0A0A0A" />
                            <g transform="translate(0, -10)">
                                <path d="M 0,-6 L 4,0 L 0,6 L -4,0 Z" fill="#FF0055" />
                                <motion.circle cx="0" cy="0" r="8" fill="#FF0055" opacity="0.4" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                            </g>
                        </g>
                    </g>
                </motion.g>

                {/* Character 2 */}
                <motion.g
                    initial={{ x: -250 }}
                    animate={{ x: [-250, 1300], y: [0, -15, 0, -25, 0] }}
                    transition={{
                        x: { duration: 30, repeat: Infinity, ease: "linear", delay: 0.5 },
                        y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }
                    }}
                >
                    <g transform="translate(0, 205) scale(1.1)">
                        <motion.ellipse cx="0" cy="45" rx="15" ry="4" fill="black" opacity="0.2" />
                        <path d="M -12,15 C -4,30 4,30 12,15 L 20,0 C 15,-15 0,-20 -20,0 Z" fill="#CC0000" />
                        <path d="M -12,-5 L 12,-5 L 8,8 L -8,8 Z" fill="#0A0A0A" />
                        <motion.circle cx="-4" cy="0" r="2" fill="#ADFF2F" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }} />
                        <motion.circle cx="4" cy="0" r="2" fill="#ADFF2F" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }} />
                        <path d="M -15,-5 L 15,-5 L 0,-30 Z" fill="#D30000" />
                        <ellipse cx="0" cy="-5" rx="20" ry="4.5" fill="#A00000" />
                        <g transform="translate(-15, 2)">
                            <circle cx="0" cy="0" r="3" fill="#0A0A0A" />
                            <g transform="translate(0, -8)">
                                <path d="M 0,-5 L 3,0 L 0,5 L -3,0 Z" fill="#00FFFF" />
                                <motion.circle cx="0" cy="0" r="6" fill="#00FFFF" opacity="0.4" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
                            </g>
                        </g>
                    </g>
                </motion.g>

            </svg>
        </div>
    )
}
