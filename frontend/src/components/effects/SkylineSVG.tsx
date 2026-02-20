import { motion } from 'framer-motion'

export function SkylineSVG() {
    return (
        <div className="absolute inset-x-0 bottom-0 z-0 pointer-events-none opacity-50 dark:opacity-30 flex items-end justify-center w-full">
            <svg
                viewBox="-50 0 1300 300"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto min-w-[1200px]"
                preserveAspectRatio="xMidYMax meet"
            >
                {/* --- San Francisco Section (Left) --- */}

                {/* Salesforce Tower */}
                <motion.path
                    d="M100 300 L100 150 Q115 130 130 150 L130 300 Z"
                    fill="currentColor"
                    className="text-gray-400 dark:text-zinc-700"
                />
                <motion.circle
                    cx="115" cy="155" r="2"
                    fill="#FF0000"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                {/* Transamerica Pyramid */}
                <path
                    d="M150 300 L175 80 L200 300 Z"
                    fill="currentColor"
                    className="text-gray-300 dark:text-zinc-800"
                />

                {/* Coit Tower */}
                <path
                    d="M220 300 L220 220 L235 220 L235 300 Z M222 220 L227.5 200 L233 220 Z"
                    fill="currentColor"
                    className="text-gray-400 dark:text-zinc-700"
                />

                {/* Golden Gate Bridge (Stylized) */}
                <path
                    d="M260 300 L260 190 M380 300 L380 190"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-300 dark:text-zinc-800"
                />
                <path
                    d="M260 200 Q320 240 380 200"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                    className="text-gray-300 dark:text-zinc-800"
                />

                {/* Cable Car (Animated) */}
                <motion.g
                    animate={{ x: [0, 100, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                    <rect x="280" y="285" width="12" height="6" fill="#FF0000" />
                    <rect x="282" y="283" width="8" height="2" fill="#FF0000" />
                </motion.g>


                {/* --- Silicon Valley Section (Right) --- */}

                {/* Tech Campus 1 (Infinite Loop Style) */}
                <circle
                    cx="800" cy="250" r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-200 dark:text-zinc-900"
                />

                {/* Data Center Racks */}
                <rect x="880" y="220" width="12" height="60" fill="currentColor" className="text-gray-400 dark:text-zinc-800" />
                <rect x="898" y="220" width="12" height="60" fill="currentColor" className="text-gray-400 dark:text-zinc-800" />
                <rect x="916" y="220" width="12" height="60" fill="currentColor" className="text-gray-400 dark:text-zinc-800" />

                {/* Racks Activity Lights */}
                {Array.from({ length: 15 }).map((_, i) => (
                    <motion.circle
                        key={i}
                        cx={886 + (Math.floor(i / 5) * 18)}
                        cy={225 + (i % 5 * 10)}
                        r="1.2"
                        fill={Math.random() > 0.5 ? "#00FF00" : "#FFCC00"}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.5 + Math.random(), repeat: Infinity, delay: Math.random() }}
                    />
                ))}

                {/* Stanford-ish Arch */}
                <path
                    d="M960 300 L950 240 Q975 210 1000 240 L990 300"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-gray-300 dark:text-zinc-800"
                />

                {/* Satellite Dish */}
                <g transform="translate(1080, 240)">
                    <path d="M-15 0 Q0 -25 15 0" stroke="currentColor" strokeWidth="2" fill="none" className="text-gray-400 dark:text-zinc-700" />
                    <line x1="0" y1="0" x2="0" y2="15" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-zinc-700" />
                    <motion.line
                        x1="0" y1="-10" x2="0" y2="-25"
                        stroke="#0066CC" strokeWidth="1.5"
                        animate={{ y: [-3, 3, -3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    />
                </g>

                {/* Networking Pulses between SV and SF */}
                <motion.circle
                    r="3"
                    fill="#FF0000"
                    animate={{
                        cx: [800, 115],
                        cy: [250, 155],
                        opacity: [0, 1, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.circle
                    r="2"
                    fill="#0066CC"
                    animate={{
                        cx: [115, 880],
                        cy: [155, 250],
                        opacity: [0, 1, 0]
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />

            </svg>
        </div>
    )
}
