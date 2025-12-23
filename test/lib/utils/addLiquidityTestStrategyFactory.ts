import { Test } from '../../v3/addLiquidity/addLiquidityTestConfig';
import {
    isRegularTest,
    isBufferTest,
    isBoostedTest,
    isNestedTest,
} from '../../v3/addLiquidity/addLiquidityTestConfig';
import { AddLiquidityTestStrategy } from './addLiquidityTestStrategy';
import { RegularTestStrategy } from './addLiquidityTestStrategies/regularTestStrategy';
import { BufferTestStrategy } from './addLiquidityTestStrategies/bufferTestStrategy';
import { BoostedTestStrategy } from './addLiquidityTestStrategies/boostedTestStrategy';
import { NestedTestStrategy } from './addLiquidityTestStrategies/nestedTestStrategy';

/**
 * Factory function to get the correct strategy based on test type.
 * @param test - The test configuration
 * @returns The appropriate strategy implementation
 * @throws Error if test type is unknown
 */
export function getTestStrategy(test: Test): AddLiquidityTestStrategy {
    if (isRegularTest(test)) {
        return new RegularTestStrategy();
    }
    if (isBufferTest(test)) {
        return new BufferTestStrategy();
    }
    if (isBoostedTest(test)) {
        return new BoostedTestStrategy();
    }
    if (isNestedTest(test)) {
        return new NestedTestStrategy();
    }
    throw new Error(`Unknown test type: ${(test as Test).testType}`);
}

