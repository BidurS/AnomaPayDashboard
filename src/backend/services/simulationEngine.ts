/**
 * Simulation Engine — Phase 2 Intelligence Layer
 *
 * Uses Gemini AI to analyze intents, predict optimal routes,
 * estimate outcomes, and track prediction accuracy.
 */
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, desc, isNull, and, gt } from 'drizzle-orm';
import { simulationResults, intentAnnotations, intentLifecycle } from '../db/schema';

// ─── Types ───────────────────────────────────────────────

interface SimulationInput {
    intentId?: string;
    chainId: number;
    intentType?: string;
    inputToken?: string;
    outputToken?: string;
    inputAmountUsd?: number;
    solver?: string;
    isShielded?: boolean;
    gasUsed?: number;
    payloadTypes?: string;
}

interface RouteStep {
    stepIndex: number;
    action: string;
    protocol: string;
    inputToken: string;
    outputToken: string;
    estimatedGas: number;
    description: string;
}

interface SimulationOutput {
    routeType: string;
    routeSteps: RouteStep[];
    predictedOutputUsd: number;
    predictedGas: number;
    predictedGasCostUsd: number;
    predictedSlippage: number;
    predictedProfitUsd: number;
    riskScore: number;
    confidence: number;
    riskFactors: string[];
    aiReasoning: string;
    annotations: { type: string; severity: string; title: string; description: string }[];
}

// ─── Gemini AI Integration ───────────────────────────────

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json',
                },
            }),
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${err}`);
    }

    const data: any = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');
    return text;
}

function buildSimulationPrompt(input: SimulationInput): string {
    return `You are an Anoma protocol intent simulation engine. Analyze this intent and predict the optimal execution route.

## Intent Details
- Chain ID: ${input.chainId}
- Intent Type: ${input.intentType || 'unknown'}
- Input Token: ${input.inputToken || 'unknown'}
- Output Token: ${input.outputToken || 'unknown'}
- Input Value (USD): $${input.inputAmountUsd?.toFixed(2) || '0'}
- Solver: ${input.solver || 'unassigned'}
- Is Shielded: ${input.isShielded ? 'yes' : 'no'}
- Gas Used: ${input.gasUsed || 'unknown'}
- Payload Types: ${input.payloadTypes || 'none'}

## Instructions
Analyze this Anoma intent and provide:
1. The optimal execution route (direct swap, multi-hop, cross-chain, or internal match)
2. Predicted outcome metrics
3. Risk assessment
4. Any notable annotations (MEV opportunities, batching candidates, anomalies)

Respond with this exact JSON structure:
{
  "routeType": "direct|multi-hop|cross-chain|internal|arbitrage",
  "routeSteps": [{"stepIndex": 1, "action": "swap|bridge|transfer", "protocol": "string", "inputToken": "string", "outputToken": "string", "estimatedGas": 0, "description": "string"}],
  "predictedOutputUsd": 0.0,
  "predictedGas": 0,
  "predictedGasCostUsd": 0.0,
  "predictedSlippage": 0.0,
  "predictedProfitUsd": 0.0,
  "riskScore": 50,
  "confidence": 0.7,
  "riskFactors": ["string"],
  "aiReasoning": "Detailed explanation of route selection and risk analysis",
  "annotations": [{"type": "mev_opportunity|batch_candidate|anomaly|insight|warning", "severity": "info|warning|critical", "title": "string", "description": "string"}]
}`;
}

// ─── Core Simulation Functions ───────────────────────────

/**
 * Simulate a specific intent by ID
 */
export async function simulateIntent(
    db: DrizzleD1Database<any>,
    intentId: string,
    env: { GEMINI_API_KEY?: string }
): Promise<SimulationOutput | null> {
    if (!env.GEMINI_API_KEY) {
        console.log('[SimEngine] No GEMINI_API_KEY configured, using heuristic simulation');
        return null;
    }

    // Fetch the intent
    const intents = await db
        .select()
        .from(intentLifecycle)
        .where(eq(intentLifecycle.id, intentId))
        .limit(1);

    if (intents.length === 0) return null;
    const intent = intents[0];

    const input: SimulationInput = {
        intentId: intent.id,
        chainId: intent.chainId,
        intentType: intent.intentType,
        inputAmountUsd: intent.inputValueUsd ?? 0,
        solver: intent.solver ?? undefined,
        isShielded: intent.isShielded === 1,
        gasUsed: intent.gasUsed ?? undefined,
        payloadTypes: intent.payloadTypes ?? undefined,
    };

    return simulateRaw(db, input, env);
}

/**
 * Simulate from raw parameters (for hypothetical intents)
 */
export async function simulateRaw(
    db: DrizzleD1Database<any>,
    input: SimulationInput,
    env: { GEMINI_API_KEY?: string }
): Promise<SimulationOutput> {
    const startTime = Date.now();

    // If no API key, generate heuristic simulation
    if (!env.GEMINI_API_KEY) {
        return generateHeuristicSimulation(input);
    }

    try {
        const prompt = buildSimulationPrompt(input);
        const rawResponse = await callGemini(prompt, env.GEMINI_API_KEY);
        const result: SimulationOutput = JSON.parse(rawResponse);

        // Validate and sanitize
        result.riskScore = Math.max(0, Math.min(100, result.riskScore || 50));
        result.confidence = Math.max(0, Math.min(1, result.confidence || 0.5));
        result.predictedSlippage = Math.max(0, result.predictedSlippage || 0);
        result.routeSteps = result.routeSteps || [];
        result.riskFactors = result.riskFactors || [];
        result.annotations = result.annotations || [];

        const duration = Date.now() - startTime;

        // Store the simulation result
        if (input.intentId) {
            await db.insert(simulationResults).values({
                intentId: input.intentId,
                chainId: input.chainId,
                routeJson: JSON.stringify(result.routeSteps),
                routeType: result.routeType,
                routeSteps: result.routeSteps.length,
                predictedOutputUsd: result.predictedOutputUsd,
                predictedGas: result.predictedGas,
                predictedGasCostUsd: result.predictedGasCostUsd,
                predictedSlippage: result.predictedSlippage,
                predictedProfitUsd: result.predictedProfitUsd,
                riskScore: result.riskScore,
                confidence: result.confidence,
                riskFactors: JSON.stringify(result.riskFactors),
                aiModel: 'gemini-2.0-flash',
                aiReasoning: result.aiReasoning,
                aiTokensUsed: 0,
                createdAt: Math.floor(Date.now() / 1000),
                simulationDurationMs: duration,
            });

            // Store annotations
            for (const annot of result.annotations) {
                await db.insert(intentAnnotations).values({
                    intentId: input.intentId,
                    chainId: input.chainId,
                    annotationType: annot.type,
                    severity: annot.severity,
                    title: annot.title,
                    description: annot.description,
                    aiConfidence: result.confidence,
                    createdAt: Math.floor(Date.now() / 1000),
                });
            }
        }

        return result;
    } catch (err) {
        console.error('[SimEngine] Gemini call failed, falling back to heuristic:', err);
        return generateHeuristicSimulation(input);
    }
}

/**
 * Heuristic simulation when AI is unavailable
 */
function generateHeuristicSimulation(input: SimulationInput): SimulationOutput {
    const isSwap = input.intentType === 'swap';
    const isBridge = input.intentType === 'bridge';
    const amount = input.inputAmountUsd || 0;

    // Estimate gas costs based on chain
    const gasPrice: Record<number, number> = { 1: 30, 10: 0.01, 8453: 0.01, 42161: 0.1 };
    const chainGasPrice = gasPrice[input.chainId] || 1;
    const estimatedGas = isSwap ? 200_000 : isBridge ? 350_000 : 150_000;
    const gasCostUsd = (estimatedGas * chainGasPrice * 1e-9) * 2500; // ETH at ~$2500

    // Slippage estimation
    const slippage = amount > 10_000 ? 0.5 : amount > 1_000 ? 0.2 : 0.05;

    // Solver profit estimation (0.1-0.3% of volume)
    const profitMargin = isSwap ? 0.002 : isBridge ? 0.003 : 0.001;
    const profit = amount * profitMargin;

    const riskFactors: string[] = [];
    let riskScore = 30;

    if (amount > 50_000) { riskFactors.push('Large order — high slippage risk'); riskScore += 20; }
    if (input.isShielded) { riskFactors.push('Shielded intent — limited liquidity data'); riskScore += 10; }
    if (isBridge) { riskFactors.push('Cross-chain bridge — additional settlement risk'); riskScore += 15; }

    const routeType = isBridge ? 'cross-chain' : isSwap ? 'direct' : 'direct';

    return {
        routeType,
        routeSteps: [{
            stepIndex: 1,
            action: isSwap ? 'swap' : isBridge ? 'bridge' : 'transfer',
            protocol: isSwap ? 'DEX Aggregator' : isBridge ? 'Bridge Protocol' : 'Direct Transfer',
            inputToken: input.inputToken || 'INPUT',
            outputToken: input.outputToken || 'OUTPUT',
            estimatedGas,
            description: `${routeType} execution via Anoma protocol adapter`,
        }],
        predictedOutputUsd: amount * (1 - slippage / 100),
        predictedGas: estimatedGas,
        predictedGasCostUsd: gasCostUsd,
        predictedSlippage: slippage,
        predictedProfitUsd: profit,
        riskScore: Math.min(100, riskScore),
        confidence: 0.6,
        riskFactors,
        aiReasoning: `Heuristic simulation: ${routeType} route for ${input.intentType || 'generic'} intent. Volume: $${amount.toFixed(2)}, estimated slippage: ${slippage}%, gas cost: $${gasCostUsd.toFixed(4)}.`,
        annotations: [],
    };
}

// ─── Batch Processing ────────────────────────────────────

/**
 * Process simulations for recent unsimulated intents
 */
export async function processSimulationsForNewIntents(
    db: DrizzleD1Database<any>,
    env: { GEMINI_API_KEY?: string },
    limit = 10
): Promise<number> {
    // Find intents without simulation results
    const intentsToSim = await db
        .select({ id: intentLifecycle.id })
        .from(intentLifecycle)
        .where(
            and(
                eq(intentLifecycle.status, 'settled'),
                gt(intentLifecycle.inputValueUsd, 0)
            )
        )
        .orderBy(desc(intentLifecycle.createdAt))
        .limit(limit * 2);

    // Filter out already simulated
    let simulated = 0;
    for (const intent of intentsToSim) {
        if (simulated >= limit) break;

        const existing = await db
            .select({ id: simulationResults.id })
            .from(simulationResults)
            .where(eq(simulationResults.intentId, intent.id))
            .limit(1);

        if (existing.length > 0) continue;

        try {
            await simulateIntent(db, intent.id, env);
            simulated++;
        } catch (err) {
            console.error(`[SimEngine] Failed to simulate ${intent.id}:`, err);
        }
    }

    console.log(`[SimEngine] Simulated ${simulated} new intents`);
    return simulated;
}

/**
 * Backfill prediction accuracy for settled intents
 */
export async function backfillAccuracy(db: DrizzleD1Database<any>): Promise<number> {
    // Find simulations without accuracy that have settled intents
    const pending = await db
        .select({
            simId: simulationResults.id,
            intentId: simulationResults.intentId,
            predictedOutputUsd: simulationResults.predictedOutputUsd,
            predictedGas: simulationResults.predictedGas,
            predictedGasCostUsd: simulationResults.predictedGasCostUsd,
        })
        .from(simulationResults)
        .where(isNull(simulationResults.predictionAccuracy))
        .limit(50);

    let updated = 0;
    for (const sim of pending) {
        const intents = await db
            .select({
                outputValueUsd: intentLifecycle.outputValueUsd,
                gasUsed: intentLifecycle.gasUsed,
                gasCostUsd: intentLifecycle.gasCostUsd,
                status: intentLifecycle.status,
            })
            .from(intentLifecycle)
            .where(eq(intentLifecycle.id, sim.intentId))
            .limit(1);

        if (intents.length === 0 || intents[0].status !== 'settled') continue;
        const actual = intents[0];

        // Calculate accuracy as 1 - |predicted - actual| / max(predicted, actual, 1)
        const outputAccuracy = actual.outputValueUsd
            ? 1 - Math.abs((sim.predictedOutputUsd ?? 0) - actual.outputValueUsd) / Math.max(sim.predictedOutputUsd ?? 1, actual.outputValueUsd, 1)
            : 0.5;

        const gasAccuracy = actual.gasUsed
            ? 1 - Math.abs((sim.predictedGas ?? 0) - actual.gasUsed) / Math.max(sim.predictedGas ?? 1, actual.gasUsed, 1)
            : 0.5;

        const overallAccuracy = Math.max(0, Math.min(1, (outputAccuracy + gasAccuracy) / 2));

        await db
            .update(simulationResults)
            .set({
                actualOutputUsd: actual.outputValueUsd ?? 0,
                actualGas: actual.gasUsed ?? 0,
                actualGasCostUsd: actual.gasCostUsd ?? 0,
                predictionAccuracy: overallAccuracy,
                accuracyComputedAt: Math.floor(Date.now() / 1000),
            })
            .where(eq(simulationResults.id, sim.simId));

        updated++;
    }

    console.log(`[SimEngine] Backfilled accuracy for ${updated} simulations`);
    return updated;
}
