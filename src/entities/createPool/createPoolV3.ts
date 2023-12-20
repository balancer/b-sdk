import {
    CreatePoolBase,
    CreatePoolBuildCallOutput,
    CreatePoolInput,
} from './types';

export class CreatePoolV3 implements CreatePoolBase {
    public buildCall(input: CreatePoolInput): CreatePoolBuildCallOutput {
        console.log(input);
        throw new Error('Method not implemented.');
    }
}
