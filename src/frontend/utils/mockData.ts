export const MOCK_STATS = {
    totalVolume: 1250430,
    intentCount: 8432,
    uniqueSolvers: 145,
    avgGasPrice: "0.25",
};

export const MOCK_DAILY_ACTIVITY = [
    { date: 'Jan 22', volume: 45000, txs: 120 },
    { date: 'Jan 23', volume: 52000, txs: 132 },
    { date: 'Jan 24', volume: 49000, txs: 101 },
    { date: 'Jan 25', volume: 63000, txs: 154 },
    { date: 'Jan 26', volume: 58000, txs: 142 },
    { date: 'Jan 27', volume: 81000, txs: 198 },
    { date: 'Jan 28', volume: 92000, txs: 210 },
];

export const MOCK_TRANSACTIONS = [
    { id: 1, txHash: '0xabc123...789', solver: '0xSolverA...1', value: '150 USDC', time: '2 mins ago', status: 'Settled' },
    { id: 2, txHash: '0xdef456...012', solver: '0xSolverB...2', value: '500 DAI', time: '5 mins ago', status: 'Settled' },
    { id: 3, txHash: '0xghi789...345', solver: '0xSolverA...1', value: '1.2 ETH', time: '8 mins ago', status: 'Pending' },
    { id: 4, txHash: '0xjkl012...678', solver: '0xSolverC...3', value: '2500 USDC', time: '12 mins ago', status: 'Settled' },
    { id: 5, txHash: '0xmno345...901', solver: '0xSolverB...2', value: '0.5 ETH', time: '15 mins ago', status: 'Settled' },
];
